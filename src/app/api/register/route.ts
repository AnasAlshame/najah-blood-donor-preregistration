import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  donorRegistrationSchema,
  normalizePhoneNumber,
  CURRENT_CONSENT_VERSION,
  OFFICIAL_CONSENT_TEXT,
} from '@/lib/validation';
import { getServiceSupabase } from '@/lib/supabase';
import { getLocalDatabase } from '@/lib/localDb';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    // 1. Identify Client IP for abuse prevention
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';

    // 2. Anti-abuse Rate Limiting
    const rateLimit = checkRateLimit(clientIp);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'تم تجاوز الحد الأقصى للمحاولات المسموح بها مؤقتاً. يرجى الانتظار والمحاولة لاحقاً.',
        },
        { status: 429 }
      );
    }

    // 3. Parse JSON Body
    const body = await request.json();

    // 4. Honeypot check (Silent bot trap)
    if (body.honeypot && body.honeypot.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'تم استلام طلب التسجيل بنجاح.',
        referenceId: 'REF-AN-CONFIRMED',
      });
    }

    // 5. Server-side Schema Validation
    const validationResult = donorRegistrationSchema.safeParse(body);
    if (!validationResult.success) {
      const issues = validationResult.error.issues;
      const firstError = issues && issues.length > 0 ? issues[0].message : 'البيانات المدخلة غير صحيحة';
      return NextResponse.json(
        {
          success: false,
          error: firstError,
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const validData = validationResult.data;
    const normalizedPhone = normalizePhoneNumber(validData.phoneNumber);
    const ipHash = crypto.createHash('sha256').update(clientIp + 'AN-SALT-2026').digest('hex');

    // 6. Connect to Persistence (Cloud Supabase OR Automatic Persistent Local Database)
    const supabase = getServiceSupabase();

    if (supabase) {
      // Check duplicate in Supabase
      const { data: existingDonor, error: checkError } = await supabase
        .from('donor_registrations')
        .select('id, university_id')
        .eq('university_id', validData.universityId)
        .maybeSingle();

      if (checkError) {
        console.error('Supabase check error:', checkError);
      } else if (existingDonor) {
        return NextResponse.json(
          {
            success: false,
            duplicate: true,
            error:
              'الرقم الجامعي أو الوظيفي مسجل مسبقاً في الحملة. لا يمكن تعديل السجلات تلقائياً لأسباب أمنية؛ يرجى مراجعة منسق الحملة عند الرغبة في التحديث.',
          },
          { status: 409 }
        );
      }

      // Insert into Supabase
      const { data: insertedDonor, error: insertError } = await supabase
        .from('donor_registrations')
        .insert({
          full_name: validData.fullName,
          university_id: validData.universityId,
          campus: validData.campus,
          phone_number: normalizedPhone,
          age: validData.age,
          gender: validData.gender,
          blood_type: validData.bloodType,
          blood_type_verification: 'SELF_REPORTED',
          governorate: validData.governorate,
          city_or_village: validData.cityOrVillage,
          availability_status: validData.availabilityStatus,
          last_donation_date: validData.lastDonationDate || null,
          health_disclosure: validData.healthDisclosure || null,
          registration_source: 'QR_CAMPAIGN_2026',
          status: 'ACTIVE',
        })
        .select('id')
        .single();

      if (!insertError && insertedDonor) {
        await supabase.from('consent_records').insert({
          registration_id: insertedDonor.id,
          consent_version: CURRENT_CONSENT_VERSION,
          consent_text_snapshot: OFFICIAL_CONSENT_TEXT,
          explicit_consent_given: true,
          ip_hash: ipHash,
        });

        return NextResponse.json({
          success: true,
          message: 'تم تسجيل بياناتكم بنجاح في الحملة الرسمية لجامعة النجاح الوطنية.',
          referenceId: insertedDonor.id.substring(0, 8).toUpperCase(),
        });
      }
    }

    // Fallback: Real, persistent SQLite database (Runs instantly without waiting for cloud setup)
    const localDb = getLocalDatabase();

    // Check duplicate
    const existing = localDb
      .prepare('SELECT id FROM donor_registrations WHERE university_id = ?')
      .get(validData.universityId);

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          duplicate: true,
          error:
            'الرقم الجامعي أو الوظيفي مسجل مسبقاً في الحملة. لا يمكن تعديل السجلات تلقائياً لأسباب أمنية؛ يرجى مراجعة منسق الحملة عند الرغبة في التحديث.',
        },
        { status: 409 }
      );
    }

    const donorId = crypto.randomUUID();
    const consentId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const insertDonorStmt = localDb.prepare(`
      INSERT INTO donor_registrations (
        id, full_name, university_id, campus, phone_number, age, gender,
        blood_type, blood_type_verification, governorate, city_or_village,
        availability_status, last_donation_date, health_disclosure,
        registration_source, status, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, 'SELF_REPORTED', ?, ?,
        ?, ?, ?,
        'QR_CAMPAIGN_2026', 'ACTIVE', ?, ?
      )
    `);

    insertDonorStmt.run(
      donorId,
      validData.fullName,
      validData.universityId,
      validData.campus,
      normalizedPhone,
      validData.age,
      validData.gender,
      validData.bloodType,
      validData.governorate,
      validData.cityOrVillage,
      validData.availabilityStatus,
      validData.lastDonationDate || null,
      validData.healthDisclosure || null,
      nowIso,
      nowIso
    );

    const insertConsentStmt = localDb.prepare(`
      INSERT INTO consent_records (
        id, registration_id, consent_version, consent_text_snapshot,
        explicit_consent_given, consent_timestamp, ip_hash
      ) VALUES (?, ?, ?, ?, 1, ?, ?)
    `);

    insertConsentStmt.run(
      consentId,
      donorId,
      CURRENT_CONSENT_VERSION,
      OFFICIAL_CONSENT_TEXT,
      nowIso,
      ipHash
    );

    console.log(`[DB SUCCESS] New donor successfully registered & persisted in database: ${validData.fullName} (${validData.universityId})`);

    return NextResponse.json({
      success: true,
      message: 'تم تسجيل وحفظ بياناتكم بنجاح في قاعدة بيانات الحملة الرسمية لجامعة النجاح الوطنية.',
      referenceId: donorId.substring(0, 8).toUpperCase(),
    });
  } catch (err: unknown) {
    console.error('Unexpected registration exception:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'حدث خطأ أثناء حفظ البيانات. يرجى مراجعة الاتصال والمحاولة لاحقاً.',
      },
      { status: 500 }
    );
  }
}

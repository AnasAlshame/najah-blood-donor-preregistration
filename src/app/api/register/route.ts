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

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';

    // Anti-abuse Rate Limiting
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

    const body = await request.json();

    // Honeypot check
    if (body.honeypot && body.honeypot.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'تم استلام طلب التسجيل بنجاح.',
        referenceId: 'REF-AN-CONFIRMED',
      });
    }

    // Schema Validation
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

    // 1. Supabase Cloud Persistence
    const supabase = getServiceSupabase();

    if (supabase) {
      // Check duplicate
      const { data: existingDonor, error: checkError } = await supabase
        .from('donor_registrations')
        .select('id, university_id')
        .eq('university_id', validData.universityId)
        .maybeSingle();

      if (!checkError && existingDonor) {
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

      // Combine detailed address into health_disclosure or store cleanly
      const combinedNotes = [
        validData.detailedAddress ? `العنوان التفصيلي: ${validData.detailedAddress}` : null,
        validData.healthDisclosure ? `ملاحظات صحية: ${validData.healthDisclosure}` : null,
      ].filter(Boolean).join(' | ');

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
          health_disclosure: combinedNotes || null,
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

    // 2. Fallback local SQLite persistence
    const localDb = getLocalDatabase();
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

    const combinedNotesLocal = [
      validData.detailedAddress ? `العنوان التفصيلي: ${validData.detailedAddress}` : null,
      validData.healthDisclosure ? `ملاحظات صحية: ${validData.healthDisclosure}` : null,
    ].filter(Boolean).join(' | ');

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
      combinedNotesLocal || null,
      nowIso,
      nowIso
    );

    localDb.prepare(`
      INSERT INTO consent_records (
        id, registration_id, consent_version, consent_text_snapshot,
        explicit_consent_given, consent_timestamp, ip_hash
      ) VALUES (?, ?, ?, ?, 1, ?, ?)
    `).run(
      consentId,
      donorId,
      CURRENT_CONSENT_VERSION,
      OFFICIAL_CONSENT_TEXT,
      nowIso,
      ipHash
    );

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

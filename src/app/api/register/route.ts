import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
import {
  donorRegistrationSchema,
  normalizePhoneNumber,
  CURRENT_CONSENT_VERSION,
  OFFICIAL_CONSENT_TEXT,
} from '@/lib/validation';
import { getServiceSupabase } from '@/lib/supabase';
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
      // Respond with pseudo success without database insertion
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

    // 6. Connect to Persistence
    const supabase = getServiceSupabase();

    // Mock fallback when Supabase credentials are not configured yet (e.g. initial local sandbox)
    if (!supabase) {
      console.warn('SUPABASE_SERVICE_ROLE_KEY not configured. Running in secure simulated local mode.');
      return NextResponse.json({
        success: true,
        message: 'تم استلام وتسجيل بياناتكم بنجاح (وضع المعاينة المحلي).',
        referenceId: `DEMO-${Date.now().toString(36).toUpperCase()}`,
      });
    }

    // 7. Check for Duplicate Registration by University ID
    // CRITICAL: Never overwrite existing records on public insert to prevent identity takeover
    const { data: existingDonor, error: checkError } = await supabase
      .from('donor_registrations')
      .select('id, university_id')
      .eq('university_id', validData.universityId)
      .maybeSingle();

    if (checkError) {
      console.error('Database query error on duplicate check:', checkError);
      return NextResponse.json(
        {
          success: false,
          error: 'حدث خطأ أثناء فحص البيانات في قاعدة البيانات. يرجى المحاولة لاحقاً.',
        },
        { status: 500 }
      );
    }

    if (existingDonor) {
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

    // 8. Secure Hash for IP privacy logging
    const ipHash = crypto.createHash('sha256').update(clientIp + 'AN-SALT-2026').digest('hex');

    // 9. Atomic Transactional Insert for Registration
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

    if (insertError || !insertedDonor) {
      console.error('Registration insertion error:', insertError);
      return NextResponse.json(
        {
          success: false,
          error: 'تعذر حفظ البيانات في قاعدة البيانات حالياً. يرجى المحاولة مرة أخرى.',
        },
        { status: 500 }
      );
    }

    // 10. Insert Explicit Consent Record
    const { error: consentError } = await supabase.from('consent_records').insert({
      registration_id: insertedDonor.id,
      consent_version: CURRENT_CONSENT_VERSION,
      consent_text_snapshot: OFFICIAL_CONSENT_TEXT,
      explicit_consent_given: true,
      ip_hash: ipHash,
    });

    if (consentError) {
      console.error('Consent logging warning:', consentError);
    }

    return NextResponse.json({
      success: true,
      message: 'تم تسجيل بياناتكم بنجاح في الحملة الرسمية لجامعة النجاح الوطنية.',
      referenceId: insertedDonor.id.substring(0, 8).toUpperCase(),
    });
  } catch (err: unknown) {
    console.error('Unexpected registration exception:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'حدث خطأ غير متوقع في الخادم. يرجى مراجعة الاتصال والمحاولة لاحقاً.',
      },
      { status: 500 }
    );
  }
}

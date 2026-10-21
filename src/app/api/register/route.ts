import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  donorRegistrationSchema,
  normalizePhoneNumber,
  CURRENT_CONSENT_VERSION,
  OFFICIAL_CONSENT_TEXT,
} from '@/lib/validation';
import { getServiceSupabase } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

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

    // 3. Parse Body
    const body = await request.json();

    // 4. Honeypot check (Silent bot trap)
    if (body.honeypot && body.honeypot.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'تم استلام طلب التسجيل بنجاح.',
        referenceId: 'REF-AN-CONFIRMED',
      });
    }

    // 5. Schema Validation & Cross-field Consistency
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

    // 6. Connect to Authoritative Cloud Persistence
    const supabase = getServiceSupabase();

    // Fail closed: Production must never pretend to succeed without the authoritative database
    if (!supabase) {
      console.error('[CRITICAL] Authoritative Supabase service connection is missing or not configured.');
      return NextResponse.json(
        {
          success: false,
          error: 'خدمة حفظ البيانات غير متوفرة حالياً. يرجى مراجعة إدارة الحملة والمحاولة لاحقاً.',
        },
        { status: 503 }
      );
    }

    // 7. Atomic Insert with Automatic Rollback on Failure
    // Attempts RPC first if migration 002 is run in Supabase SQL editor.
    // Falls back safely to atomic multi-step with explicit rollback if RPC is not yet created.
    let donorId: string | null = null;

    const { data: rpcResult, error: rpcError } = await supabase.rpc('register_donor_atomic', {
      p_full_name: validData.fullName,
      p_university_id: validData.universityId,
      p_university_email: validData.universityEmail,
      p_campus: validData.campus,
      p_phone_number: normalizedPhone,
      p_age: validData.age,
      p_gender: validData.gender,
      p_blood_type: validData.bloodType,
      p_governorate: validData.governorate,
      p_city_or_village: validData.cityOrVillage,
      p_detailed_address: validData.detailedAddress,
      p_availability_status: validData.availabilityStatus,
      p_last_donation_date: validData.lastDonationDate || null,
      p_health_disclosure: validData.healthDisclosure || null,
      p_consent_version: CURRENT_CONSENT_VERSION,
      p_consent_text: OFFICIAL_CONSENT_TEXT,
      p_ip_hash: ipHash,
    });

    if (!rpcError && rpcResult) {
      const outcome = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
      if (outcome && outcome.success) {
        donorId = outcome.donor_id;
      } else if (outcome && outcome.error_code === 'DUPLICATE_ID') {
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
    } else {
      // Standard safe multi-step execution with duplicate check & explicit rollback
      const { data: existingDonor, error: checkError } = await supabase
        .from('donor_registrations')
        .select('id, university_id')
        .eq('university_id', validData.universityId)
        .maybeSingle();

      if (checkError) {
        console.error('[DATABASE ERROR] Check query failed:', checkError);
        return NextResponse.json(
          { success: false, error: 'حدث خطأ أثناء فحص البيانات في قاعدة البيانات.' },
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

      // Step A: Insert Donor Record
      const { data: insertedDonor, error: insertError } = await supabase
        .from('donor_registrations')
        .insert({
          full_name: validData.fullName,
          university_id: validData.universityId,
          university_email: validData.universityEmail,
          campus: validData.campus,
          phone_number: normalizedPhone,
          age: validData.age,
          gender: validData.gender,
          blood_type: validData.bloodType,
          blood_type_verification: 'SELF_REPORTED',
          governorate: validData.governorate,
          city_or_village: validData.cityOrVillage,
          detailed_address: validData.detailedAddress,
          availability_status: validData.availabilityStatus,
          last_donation_date: validData.lastDonationDate || null,
          health_disclosure: validData.healthDisclosure || null,
          registration_source: 'QR_CAMPAIGN_2026',
          status: 'ACTIVE',
        })
        .select('id')
        .single();

      if (insertError || !insertedDonor) {
        console.error('[DATABASE ERROR] Donor insert failed:', insertError);
        return NextResponse.json(
          { success: false, error: 'تعذر إتمام التسجيل في قاعدة البيانات حالياً.' },
          { status: 500 }
        );
      }

      // Step B: Insert Consent Record
      const { error: consentError } = await supabase.from('consent_records').insert({
        registration_id: insertedDonor.id,
        consent_version: CURRENT_CONSENT_VERSION,
        consent_text_snapshot: OFFICIAL_CONSENT_TEXT,
        explicit_consent_given: true,
        ip_hash: ipHash,
      });

      if (consentError) {
        // Rollback: delete the inserted donor immediately to prevent orphaned records without consent
        console.error('[CRITICAL] Consent logging failed, executing rollback on donor:', insertedDonor.id, consentError);
        await supabase.from('donor_registrations').delete().eq('id', insertedDonor.id);
        return NextResponse.json(
          { success: false, error: 'فشل توثيق إقرار الموافقة الصريحة. تم إلغاء التسجيل لضمان الخصوصية.' },
          { status: 500 }
        );
      }

      donorId = insertedDonor.id;
    }

    return NextResponse.json({
      success: true,
      message: 'تم تسجيل بياناتكم بنجاح في الحملة الرسمية لجامعة النجاح الوطنية.',
      referenceId: donorId ? donorId.substring(0, 8).toUpperCase() : 'CONFIRMED',
    });
  } catch (err: unknown) {
    console.error('[UNEXPECTED EXCEPTION] register route error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'حدث خطأ غير متوقع في الخادم. يرجى مراجعة الاتصال والمحاولة لاحقاً.',
      },
      { status: 500 }
    );
  }
}

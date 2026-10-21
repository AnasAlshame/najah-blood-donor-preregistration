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
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'صيغة البيانات المرسلة غير صالحة.' },
        { status: 400 }
      );
    }

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

    // Strict Fail-Closed: Production must never acknowledge success without database availability
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

    // 7. Atomic Server-Controlled Transaction via Database RPC
    // Enforces single-transaction commit: donor and consent commit together or fail together.
    // Non-atomic client multi-step simulations are completely prohibited.
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

    if (rpcError) {
      console.error('[DATABASE ERROR] Atomic registration RPC failed or missing:', rpcError);
      return NextResponse.json(
        {
          success: false,
          error: 'حدث خطأ في الاتصال بقاعدة البيانات. تعذر إتمام التسجيل.',
        },
        { status: 500 }
      );
    }

    const outcome = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;

    // Fail-Closed on EVERY unsuccessful outcome
    if (!outcome || outcome.success !== true) {
      if (outcome && outcome.error_code === 'DUPLICATE_ID') {
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

      console.error('[DATABASE REJECTION] Atomic transaction rejected with outcome:', outcome);
      return NextResponse.json(
        {
          success: false,
          error: 'تعذر حفظ البيانات في قاعدة البيانات بشكل آمن. يرجى المحاولة لاحقاً.',
        },
        { status: 500 }
      );
    }

    // Invariant Verification: Must have confirmed non-empty donor ID from database
    if (!outcome.donor_id || typeof outcome.donor_id !== 'string') {
      console.error('[INVARIANT ERROR] RPC succeeded but returned invalid donor_id:', outcome);
      return NextResponse.json(
        {
          success: false,
          error: 'تعذر تأكيد حفظ السجل في قاعدة البيانات. تم إلغاء العملية.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'تم تسجيل بياناتكم بنجاح في الحملة الرسمية لجامعة النجاح الوطنية.',
      referenceId: outcome.donor_id.substring(0, 8).toUpperCase(),
    });
  } catch (err: unknown) {
    console.error('[UNEXPECTED EXCEPTION] register route exception:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'حدث خطأ غير متوقع في الخادم. يرجى مراجعة الاتصال والمحاولة لاحقاً.',
      },
      { status: 500 }
    );
  }
}

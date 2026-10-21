import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Strict Authorization Verification (Fail-closed)
    const expectedKey = process.env.ADMIN_SECRET_KEY;
    if (!expectedKey || expectedKey.trim().length < 16) {
      console.error('[CRITICAL SECURITY] ADMIN_SECRET_KEY is not configured or too weak. Blocking access.');
      return NextResponse.json(
        { success: false, error: 'Administrative service temporarily unavailable due to security configuration.' },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Bearer token required.' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Constant-time token comparison to prevent timing side-channel attacks
    const tokenBuffer = Buffer.from(token);
    const expectedBuffer = Buffer.from(expectedKey);

    const isTokenValid =
      tokenBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(tokenBuffer, expectedBuffer);

    if (!isTokenValid) {
      // Security Audit: Log failed administrative authorization attempts
      try {
        const supabase = getServiceSupabase();
        if (supabase) {
          const clientIp = request.headers.get('x-forwarded-for') || 'direct';
          const { error: auditErr } = await supabase.from('admin_audit_logs').insert({
            actor: 'UNAUTHORIZED_ATTEMPT',
            action: 'EXPORT_FAILED_AUTH',
            resource_type: 'donor_registrations',
            metadata: {
              client_ip_hash: crypto.createHash('sha256').update(clientIp).digest('hex'),
              token_length: token.length,
            },
          });
          if (auditErr) {
            console.error('[AUDIT WARNING] Failed to record unauthorized attempt in audit log:', auditErr);
          }
        }
      } catch (logErr) {
        console.error('[AUDIT ERROR] Exception recording unauthorized attempt:', logErr);
      }

      return NextResponse.json(
        { success: false, error: 'Unauthorized. Invalid administrator credentials.' },
        { status: 401 }
      );
    }

    // 2. Authoritative Supabase Connection (Sole source of truth)
    const supabase = getServiceSupabase();
    if (!supabase) {
      console.error('[CRITICAL] Supabase client unavailable for admin export.');
      return NextResponse.json(
        { success: false, error: 'Database service unavailable.' },
        { status: 503 }
      );
    }

    // 3. Batch Retrieval with Pagination to prevent missing records
    const PAGE_SIZE = 1000;
    let allRecords: Record<string, unknown>[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('donor_registrations')
        .select(`
          id,
          full_name,
          university_id,
          university_email,
          campus,
          phone_number,
          age,
          gender,
          blood_type,
          blood_type_verification,
          governorate,
          city_or_village,
          detailed_address,
          availability_status,
          last_donation_date,
          health_disclosure,
          registration_source,
          status,
          schema_version,
          created_at
        `)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('[DATABASE ERROR] Failed fetching records during admin export:', error);
        return NextResponse.json(
          { success: false, error: 'Failed retrieving donor records.' },
          { status: 500 }
        );
      }

      if (data && data.length > 0) {
        allRecords = allRecords.concat(data);
        if (data.length < PAGE_SIZE) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        hasMore = false;
      }
    }

    // 4. Log Audit Event
    const { error: logErr } = await supabase.from('admin_audit_logs').insert({
      actor: 'AUTHENTICATED_ADMIN_SECRET_KEY',
      action: 'EXPORT_ALL_RECORDS',
      resource_type: 'donor_registrations',
      metadata: {
        record_count: allRecords.length,
        client_ip_hash: crypto.createHash('sha256').update(request.headers.get('x-forwarded-for') || 'direct').digest('hex'),
      },
    });
    if (logErr) {
      console.error('[AUDIT WARNING] Failed to record successful export audit log:', logErr);
    }

    const format = request.nextUrl.searchParams.get('format');

    // 5. Output CSV or JSON
    if (format === 'csv') {
      const headers = [
        'ID',
        'Full Name',
        'University ID',
        'University Email',
        'Campus',
        'Phone Number',
        'Age',
        'Gender',
        'Blood Type',
        'Verification',
        'Governorate',
        'City/Village',
        'Detailed Address',
        'Availability',
        'Last Donation Date',
        'Health Disclosure',
        'Registration Source',
        'Status',
        'Schema Version',
        'Created At',
      ];

      const csvRows = [headers.join(',')];

      // Sanitizer to prevent CSV / Formula Injection attacks (=, +, -, @, \t, \r)
      const sanitizeCsvField = (val: unknown): string => {
        if (val === null || val === undefined) return '""';
        let str = String(val).replace(/"/g, '""');
        // If string starts with formula trigger characters, prefix with single quote
        if (/^[=+\-@\t\r]/.test(str)) {
          str = `'${str}`;
        }
        return `"${str}"`;
      };

      for (const row of allRecords) {
        const values = [
          sanitizeCsvField(row.id),
          sanitizeCsvField(row.full_name),
          sanitizeCsvField(row.university_id),
          sanitizeCsvField(row.university_email),
          sanitizeCsvField(row.campus),
          sanitizeCsvField(row.phone_number),
          sanitizeCsvField(row.age),
          sanitizeCsvField(row.gender),
          sanitizeCsvField(row.blood_type),
          sanitizeCsvField(row.blood_type_verification),
          sanitizeCsvField(row.governorate),
          sanitizeCsvField(row.city_or_village),
          sanitizeCsvField(row.detailed_address),
          sanitizeCsvField(row.availability_status),
          sanitizeCsvField(row.last_donation_date),
          sanitizeCsvField(row.health_disclosure),
          sanitizeCsvField(row.registration_source),
          sanitizeCsvField(row.status),
          sanitizeCsvField(row.schema_version),
          sanitizeCsvField(row.created_at),
        ];
        csvRows.push(values.join(','));
      }

      return new NextResponse(csvRows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="najah_wasel_donors_${Date.now()}.csv"`,
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store',
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        count: allRecords.length,
        records: allRecords,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store',
        },
      }
    );
  } catch (err: unknown) {
    console.error('[UNEXPECTED EXCEPTION] admin export route error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error during export' },
      { status: 500 }
    );
  }
}

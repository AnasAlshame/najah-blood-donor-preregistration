import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Enforce strict authorization header check
    const authHeader = request.headers.get('authorization');
    const expectedKey = process.env.ADMIN_SECRET_KEY;

    if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized access. Valid administrator credentials required.' },
        { status: 401 }
      );
    }

    const supabase = getServiceSupabase();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database service not configured.' },
        { status: 503 }
      );
    }

    // 2. Fetch all active donor registrations
    const { data: records, error } = await supabase
      .from('donor_registrations')
      .select(`
        id,
        full_name,
        university_id,
        campus,
        phone_number,
        age,
        gender,
        blood_type,
        blood_type_verification,
        governorate,
        city_or_village,
        availability_status,
        last_donation_date,
        registration_source,
        status,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Error fetching records for export.' },
        { status: 500 }
      );
    }

    // 3. Log Audit Event
    await supabase.from('admin_audit_logs').insert({
      actor: 'ADMIN_SECRET_KEY_HOLDER',
      action: 'EXPORT_ALL_RECORDS',
      resource_type: 'donor_registrations',
      metadata: { count: records?.length || 0, ip: request.headers.get('x-forwarded-for') || 'direct' },
    });

    const format = request.nextUrl.searchParams.get('format');

    // 4. Return CSV if requested
    if (format === 'csv') {
      const headers = [
        'ID',
        'Full Name',
        'University ID',
        'Campus',
        'Phone Number',
        'Age',
        'Gender',
        'Blood Type',
        'Verification',
        'Governorate',
        'City/Village',
        'Availability',
        'Last Donation Date',
        'Registration Source',
        'Status',
        'Created At',
      ];

      const csvRows = [headers.join(',')];

      for (const row of records || []) {
        const values = [
          row.id,
          `"${(row.full_name || '').replace(/"/g, '""')}"`,
          `"${row.university_id}"`,
          `"${(row.campus || '').replace(/"/g, '""')}"`,
          `"${row.phone_number}"`,
          row.age,
          `"${row.gender}"`,
          `"${row.blood_type}"`,
          `"${row.blood_type_verification}"`,
          `"${(row.governorate || '').replace(/"/g, '""')}"`,
          `"${(row.city_or_village || '').replace(/"/g, '""')}"`,
          `"${row.availability_status}"`,
          `"${row.last_donation_date || ''}"`,
          `"${row.registration_source}"`,
          `"${row.status}"`,
          `"${row.created_at}"`,
        ];
        csvRows.push(values.join(','));
      }

      return new NextResponse(csvRows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="najah_blood_donors_${Date.now()}.csv"`,
        },
      });
    }

    // Default JSON response
    return NextResponse.json({
      success: true,
      count: records?.length || 0,
      records: records || [],
    });
  } catch (err: unknown) {
    console.error('Export exception:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error during export' },
      { status: 500 }
    );
  }
}

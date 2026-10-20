import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getLocalDatabase } from '@/lib/localDb';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Enforce strict authorization header check
    const authHeader = request.headers.get('authorization');
    const expectedKey = process.env.ADMIN_SECRET_KEY || 'najah_admin_default_key_2026';

    if (authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized access. Valid administrator credentials required.' },
        { status: 401 }
      );
    }

    let records: any[] = [];

    const supabase = getServiceSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('donor_registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        records = data;
      }
    }

    // If no records from supabase or not configured, load from local database
    if (records.length === 0) {
      const localDb = getLocalDatabase();
      records = localDb.prepare('SELECT * FROM donor_registrations ORDER BY created_at DESC').all();
    }

    const format = request.nextUrl.searchParams.get('format');

    // Return CSV if requested
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

      for (const row of records) {
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
      count: records.length,
      records: records,
    });
  } catch (err: unknown) {
    console.error('Export exception:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error during export' },
      { status: 500 }
    );
  }
}

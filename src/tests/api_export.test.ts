import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/admin/export/route';
import * as supabaseModule from '@/lib/supabase';

describe('Admin Export API Authentication & Security Tests', () => {
  const originalEnv = process.env.ADMIN_SECRET_KEY;

  beforeEach(() => {
    process.env.ADMIN_SECRET_KEY = 'test_admin_super_secret_key_at_least_32_chars';
    vi.restoreAllMocks();
  });

  it('fails closed with 500 when ADMIN_SECRET_KEY environment variable is missing or short', async () => {
    delete process.env.ADMIN_SECRET_KEY;

    const req = new NextRequest('http://localhost:3000/api/admin/export', {
      method: 'GET',
      headers: { Authorization: 'Bearer some_token' },
    });

    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('rejects with 401 when Authorization header is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/export', {
      method: 'GET',
    });

    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('rejects with 401 when invalid Bearer token is provided', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/export', {
      method: 'GET',
      headers: { Authorization: 'Bearer invalid_wrong_token' },
    });

    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('authenticates and exports records when valid Bearer token is provided', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'uuid-1',
                  full_name: 'طالب جامعي',
                  university_id: '12323975',
                  university_email: 's12323975@stu.najah.edu',
                  campus: 'الحرم الجديد (الأكاديمية)',
                  phone_number: '0599123456',
                  age: 21,
                  gender: 'ذكر',
                  blood_type: 'O+',
                  blood_type_verification: 'SELF_REPORTED',
                  governorate: 'نابلس',
                  city_or_village: 'رفيديا',
                  detailed_address: 'شارع 16',
                  availability_status: 'AVAILABLE',
                  last_donation_date: null,
                  health_disclosure: null,
                  registration_source: 'QR_CAMPAIGN_2026',
                  status: 'ACTIVE',
                  schema_version: '2.0',
                  created_at: '2026-10-21T10:00:00Z',
                },
              ],
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(supabaseModule, 'getServiceSupabase').mockReturnValue(mockSupabase as any);

    const req = new NextRequest('http://localhost:3000/api/admin/export', {
      method: 'GET',
      headers: { Authorization: 'Bearer test_admin_super_secret_key_at_least_32_chars' },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.count).toBe(1);
    expect(body.records[0].university_id).toBe('12323975');
  });

  it('escapes CSV formula injection characters (=, +, -, @, tab, cr) to prevent spreadsheet code execution', async () => {
    process.env.ADMIN_SECRET_KEY = 'test_admin_super_secret_key_at_least_32_chars';

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'd1111111-2222-3333-4444-555555555555',
                  full_name: '=cmd|"/c calc"!A0',
                  university_id: '+12345678',
                  university_email: '@stu.najah.edu',
                  campus: '-Main Campus',
                  phone_number: '0599123456',
                  age: 20,
                  gender: 'ذكر',
                  blood_type: 'O+',
                  blood_type_verification: 'SELF_REPORTED',
                  governorate: 'نابلس',
                  city_or_village: 'رفيديا',
                  detailed_address: 'العنوان',
                  availability_status: 'AVAILABLE',
                  last_donation_date: null,
                  health_disclosure: null,
                  registration_source: 'QR_CAMPAIGN_2026',
                  status: 'ACTIVE',
                  schema_version: '2.0',
                  created_at: '2026-10-21T10:00:00Z',
                },
              ],
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(supabaseModule, 'getServiceSupabase').mockReturnValue(mockSupabase as any);

    const req = new NextRequest('http://localhost:3000/api/admin/export?format=csv', {
      method: 'GET',
      headers: { Authorization: 'Bearer test_admin_super_secret_key_at_least_32_chars' },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const csv = await res.text();

    // Verify formula prefixes were neutralized with a leading single-quote inside quotes
    expect(csv).toContain("\"'=cmd|\"\"/c calc\"\"!A0\"");
    expect(csv).toContain("\"'+12345678\"");
    expect(csv).toContain("\"'@stu.najah.edu\"");
    expect(csv).toContain("\"'-Main Campus\"");
  });

  it('records audit log on failed authorization attempts', async () => {
    process.env.ADMIN_SECRET_KEY = 'test_admin_super_secret_key_at_least_32_chars';
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        insert: insertMock,
      }),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(supabaseModule, 'getServiceSupabase').mockReturnValue(mockSupabase as any);

    const req = new NextRequest('http://localhost:3000/api/admin/export', {
      method: 'GET',
      headers: { Authorization: 'Bearer INVALID_ATTEMPT_TOKEN_HERE_1234567890' },
    });

    const res = await GET(req);
    expect(res.status).toBe(401);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: 'UNAUTHORIZED_ATTEMPT',
        action: 'EXPORT_FAILED_AUTH',
      })
    );
  });
});

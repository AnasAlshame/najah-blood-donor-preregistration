import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/register/route';
import * as supabaseModule from '@/lib/supabase';
import { resetRateLimitStore } from '@/lib/rateLimit';

describe('Registration API Endpoint Security & Reliability Tests', () => {
  beforeEach(() => {
    resetRateLimitStore();
    vi.restoreAllMocks();
  });

  const validRegistrationPayload = {
    fullName: 'سامر أحمد خليل',
    universityId: '12345678',
    universityEmail: 's12345678@stu.najah.edu',
    campus: 'الحرم الجديد (الأكاديمية)',
    phoneNumber: '0599123456',
    age: 21,
    gender: 'ذكر',
    bloodType: 'O+',
    governorate: 'نابلس',
    cityOrVillage: 'رفيديا',
    detailedAddress: 'شارع 15 عمارة النور',
    availabilityStatus: 'AVAILABLE',
    consentGiven: true,
  };

  it('fails closed with 503 when authoritative Supabase client is not configured', async () => {
    vi.spyOn(supabaseModule, 'getServiceSupabase').mockReturnValue(null);

    const req = new NextRequest('http://localhost:3000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validRegistrationPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('غير متوفرة حالياً');
  });

  it('fails closed with 500 when atomic RPC fails or returns exception (e.g. missing migration 003)', async () => {
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST202', message: 'Could not find the function public.register_donor_atomic' },
      }),
    };
    vi.spyOn(supabaseModule, 'getServiceSupabase').mockReturnValue(mockSupabase as any);

    const req = new NextRequest('http://localhost:3000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validRegistrationPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('حدث خطأ في الاتصال بقاعدة البيانات');
  });

  it('fails closed when RPC returns success: false with DATABASE_ERROR (Never returns success without confirmed ID)', async () => {
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: [{ success: false, donor_id: null, error_code: 'DATABASE_ERROR', error_message: 'Disk failure' }],
        error: null,
      }),
    };
    vi.spyOn(supabaseModule, 'getServiceSupabase').mockReturnValue(mockSupabase as any);

    const req = new NextRequest('http://localhost:3000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validRegistrationPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.referenceId).toBeUndefined();
  });

  it('returns 409 Conflict when atomic RPC detects DUPLICATE_ID without creating or updating records', async () => {
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: [{ success: false, donor_id: null, error_code: 'DUPLICATE_ID', error_message: 'Duplicate ID' }],
        error: null,
      }),
    };
    vi.spyOn(supabaseModule, 'getServiceSupabase').mockReturnValue(mockSupabase as any);

    const req = new NextRequest('http://localhost:3000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validRegistrationPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.duplicate).toBe(true);
    expect(body.error).toContain('مسجل مسبقاً');
  });

  it('successfully commits when RPC confirms transaction and returns valid donor ID', async () => {
    const mockDonorId = '11223344-5566-7788-99aa-bbccddeeff00';
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: [{ success: true, donor_id: mockDonorId, error_code: null, error_message: null }],
        error: null,
      }),
    };
    vi.spyOn(supabaseModule, 'getServiceSupabase').mockReturnValue(mockSupabase as any);

    const req = new NextRequest('http://localhost:3000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validRegistrationPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.referenceId).toBe('11223344');
  });

  it('rejects registration when consent is missing', async () => {
    const payloadWithoutConsent = {
      ...validRegistrationPayload,
      consentGiven: false,
    };

    const req = new NextRequest('http://localhost:3000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadWithoutConsent),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});

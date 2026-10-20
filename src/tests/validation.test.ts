import { describe, it, expect } from 'vitest';
import {
  donorRegistrationSchema,
  normalizePhoneNumber,
  isValidPalestinianPhone,
} from '@/lib/validation';

describe('Validation Logic and Phone Normalization Tests', () => {
  it('correctly normalizes and validates Palestinian phone numbers', () => {
    // Standard local Jawwal / Ooredoo
    expect(isValidPalestinianPhone('0599123456')).toBe(true);
    expect(isValidPalestinianPhone('0568123456')).toBe(true);

    // International +970 / +972 formats
    expect(normalizePhoneNumber('+970599123456')).toBe('0599123456');
    expect(isValidPalestinianPhone('+970599123456')).toBe(true);
    expect(normalizePhoneNumber('+972568123456')).toBe('0568123456');
    expect(isValidPalestinianPhone('+972568123456')).toBe(true);

    // Formatted with spaces and dashes
    expect(normalizePhoneNumber('059-912-3456')).toBe('0599123456');
    expect(isValidPalestinianPhone('059-912-3456')).toBe(true);

    // Invalid phone numbers
    expect(isValidPalestinianPhone('0521234567')).toBe(false);
    expect(isValidPalestinianPhone('12345')).toBe(false);
    expect(isValidPalestinianPhone('059912345')).toBe(false); // only 9 digits
  });

  it('validates a complete, valid donor registration payload', () => {
    const validPayload = {
      fullName: 'أحمد خليل عبد الرحمن',
      universityId: '12015890',
      campus: 'الحرم الجديد (الجنيد)',
      phoneNumber: '0599876543',
      age: 21,
      gender: 'ذكر',
      bloodType: 'O+',
      governorate: 'نابلس',
      cityOrVillage: 'رفيديا',
      availabilityStatus: 'AVAILABLE',
      lastDonationDate: '2025-10-15',
      healthDisclosure: 'لا توجد أي أمراض مزمنة بحمد الله',
      consentGiven: true,
    };

    const result = donorRegistrationSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('rejects submissions without explicit consent', () => {
    const payloadWithoutConsent = {
      fullName: 'فاطمة محمود علي',
      universityId: '11924560',
      campus: 'الحرم القديم',
      phoneNumber: '0568765432',
      age: 22,
      gender: 'أنثى',
      bloodType: 'A-',
      governorate: 'طولكرم',
      cityOrVillage: 'المدينة',
      availabilityStatus: 'AVAILABLE',
      consentGiven: false, // Refused consent
    };

    const result = donorRegistrationSchema.safeParse(payloadWithoutConsent);
    expect(result.success).toBe(false);
  });

  it('rejects future donation dates', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const dateStr = futureDate.toISOString().split('T')[0];

    const payload = {
      fullName: 'محمد يوسف',
      universityId: '12133445',
      campus: 'كليات الطب وعلوم الصحة / المستشفى الجامعي',
      phoneNumber: '0599112233',
      age: 20,
      gender: 'ذكر',
      bloodType: 'B+',
      governorate: 'جنين',
      cityOrVillage: 'يعبد',
      availabilityStatus: 'RECENTLY_DONATED',
      lastDonationDate: dateStr,
      consentGiven: true,
    };

    const result = donorRegistrationSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('detects honeypot bot trap submissions', () => {
    const botPayload = {
      fullName: 'Spam Bot',
      universityId: '99999999',
      campus: 'الحرم القديم',
      phoneNumber: '0599000000',
      age: 25,
      gender: 'ذكر',
      bloodType: 'AB+',
      governorate: 'نابلس',
      cityOrVillage: 'نابلس',
      availabilityStatus: 'AVAILABLE',
      consentGiven: true,
      honeypot: 'i-am-a-bot',
    };

    const result = donorRegistrationSchema.safeParse(botPayload);
    expect(result.success).toBe(false);
  });
});

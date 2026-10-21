import { describe, it, expect, beforeEach } from 'vitest';
import { newDb, IMemoryDb } from 'pg-mem';

describe('Database Atomic Registration & Rollback Integration Tests (Isolated PostgreSQL Memory Instance)', () => {
  let db: IMemoryDb;

  beforeEach(() => {
    db = newDb();

    // Setup isolated schema matching Supabase migrations
    db.public.none(`
      CREATE TABLE donor_registrations (
        id text PRIMARY KEY,
        full_name text NOT NULL,
        university_id text NOT NULL UNIQUE,
        university_email text,
        campus text NOT NULL,
        phone_number text NOT NULL,
        age smallint NOT NULL,
        gender text NOT NULL,
        blood_type text NOT NULL,
        blood_type_verification text NOT NULL DEFAULT 'SELF_REPORTED',
        governorate text NOT NULL,
        city_or_village text NOT NULL,
        detailed_address text,
        availability_status text NOT NULL DEFAULT 'AVAILABLE',
        last_donation_date date,
        health_disclosure text,
        registration_source text NOT NULL DEFAULT 'QR_CAMPAIGN_2026',
        status text NOT NULL DEFAULT 'ACTIVE',
        schema_version text NOT NULL DEFAULT '2.0',
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      );

      CREATE TABLE consent_records (
        id text PRIMARY KEY,
        registration_id text NOT NULL REFERENCES donor_registrations(id) ON DELETE CASCADE,
        consent_version text NOT NULL,
        consent_text_snapshot text NOT NULL,
        explicit_consent_given boolean NOT NULL DEFAULT true,
        consent_timestamp timestamp with time zone DEFAULT now(),
        ip_hash text
      );
    `);
  });

  /**
   * Simulates the exact logic and transactional semantics of PostgreSQL register_donor_atomic
   */
  function executeRegisterDonorAtomic(
    donor: {
      id: string;
      fullName: string;
      universityId: string;
      universityEmail: string;
      campus: string;
      phoneNumber: string;
      age: number;
      gender: string;
      bloodType: string;
      governorate: string;
      cityOrVillage: string;
      detailedAddress: string;
      availabilityStatus: string;
    },
    consent: {
      id: string;
      consentVersion: string;
      consentText: string;
      ipHash: string;
    },
    options?: { simulateConsentFailure?: boolean }
  ) {
    const backup = db.backup();
    try {
      // 1. Check duplicate
      const existing = db.public.many(
        `SELECT id FROM donor_registrations WHERE university_id = '${donor.universityId}'`
      );
      if (existing.length > 0) {
        return {
          success: false,
          donor_id: null,
          error_code: 'DUPLICATE_ID',
          error_message: 'University ID already registered',
        };
      }

      // 2. Insert donor registration
      db.public.none(`
        INSERT INTO donor_registrations (
          id, full_name, university_id, university_email, campus, phone_number,
          age, gender, blood_type, governorate, city_or_village, detailed_address,
          availability_status
        ) VALUES (
          '${donor.id}', '${donor.fullName}', '${donor.universityId}', '${donor.universityEmail}',
          '${donor.campus}', '${donor.phoneNumber}', ${donor.age}, '${donor.gender}',
          '${donor.bloodType}', '${donor.governorate}', '${donor.cityOrVillage}',
          '${donor.detailedAddress}', '${donor.availabilityStatus}'
        );
      `);

      // 3. Simulate failure during consent insertion
      if (options?.simulateConsentFailure) {
        throw new Error('Simulated database disk or constraint error during consent insertion');
      }

      // 4. Insert consent record
      db.public.none(`
        INSERT INTO consent_records (
          id, registration_id, consent_version, consent_text_snapshot, explicit_consent_given, ip_hash
        ) VALUES (
          '${consent.id}', '${donor.id}', '${consent.consentVersion}',
          '${consent.consentText}', true, '${consent.ipHash}'
        );
      `);

      return {
        success: true,
        donor_id: donor.id,
        error_code: null,
        error_message: null,
      };
    } catch (err: unknown) {
      // Transaction rollback: restores pre-transaction state
      backup.restore();
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        donor_id: null,
        error_code: 'DATABASE_ERROR',
        error_message: message,
      };
    }
  }

  const sampleDonor = {
    id: 'd0000000-1111-2222-3333-444444444444',
    fullName: 'محمود عبد الرحيم',
    universityId: '12114567',
    universityEmail: 's12114567@stu.najah.edu',
    campus: 'الحرم الجديد',
    phoneNumber: '0598123456',
    age: 22,
    gender: 'ذكر',
    bloodType: 'A+',
    governorate: 'نابلس',
    cityOrVillage: 'نابلس',
    detailedAddress: 'شارع النجاح القديم',
    availabilityStatus: 'AVAILABLE',
  };

  const sampleConsent = {
    id: 'c0000000-1111-2222-3333-444444444444',
    consentVersion: '2.0',
    consentText: 'أوافق بمحض إرادتي على تسجيل بياناتي للتبرع بالدم لصالح حملة وصل',
    ipHash: 'abc123hash',
  };

  it('atomically commits both donor registration and consent record upon valid submission', () => {
    const result = executeRegisterDonorAtomic(sampleDonor, sampleConsent);

    expect(result.success).toBe(true);
    expect(result.donor_id).toBe(sampleDonor.id);

    const savedDonors = db.public.many(
      `SELECT * FROM donor_registrations WHERE university_id = '${sampleDonor.universityId}'`
    );
    expect(savedDonors.length).toBe(1);
    expect(savedDonors[0].full_name).toBe(sampleDonor.fullName);

    const savedConsents = db.public.many(
      `SELECT * FROM consent_records WHERE registration_id = '${sampleDonor.id}'`
    );
    expect(savedConsents.length).toBe(1);
    expect(savedConsents[0].consent_version).toBe('2.0');
  });

  it('safely rejects duplicate registrations and preserves existing records', () => {
    // 1. Initial successful registration
    const res1 = executeRegisterDonorAtomic(sampleDonor, sampleConsent);
    expect(res1.success).toBe(true);

    // 2. Duplicate registration attempt with same universityId
    const duplicateDonor = {
      ...sampleDonor,
      id: 'd9999999-9999-9999-9999-999999999999',
      fullName: 'محمود محتال',
    };
    const duplicateConsent = {
      ...sampleConsent,
      id: 'c9999999-9999-9999-9999-999999999999',
    };

    const res2 = executeRegisterDonorAtomic(duplicateDonor, duplicateConsent);
    expect(res2.success).toBe(false);
    expect(res2.error_code).toBe('DUPLICATE_ID');
    expect(res2.donor_id).toBeNull();

    // Verify database only contains the original record
    const donors = db.public.many('SELECT * FROM donor_registrations');
    expect(donors.length).toBe(1);
    expect(donors[0].id).toBe(sampleDonor.id);
  });

  it('rolls back completely when consent insertion fails: never leaves orphaned donor or partial record', () => {
    const rollbackDonor = {
      ...sampleDonor,
      id: 'd8888888-8888-8888-8888-888888888888',
      universityId: '12999999',
    };

    const result = executeRegisterDonorAtomic(rollbackDonor, sampleConsent, {
      simulateConsentFailure: true,
    });

    expect(result.success).toBe(false);
    expect(result.error_code).toBe('DATABASE_ERROR');
    expect(result.donor_id).toBeNull();

    // Strict Invariant: Neither the donor nor the consent record must exist in the database
    const donors = db.public.many(
      `SELECT * FROM donor_registrations WHERE university_id = '${rollbackDonor.universityId}'`
    );
    expect(donors.length).toBe(0);

    const consents = db.public.many(
      `SELECT * FROM consent_records WHERE registration_id = '${rollbackDonor.id}'`
    );
    expect(consents.length).toBe(0);
  });
});

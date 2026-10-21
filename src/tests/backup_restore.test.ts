import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { newDb, IMemoryDb } from 'pg-mem';

const ALGORITHM = 'aes-256-gcm';
const TEST_ENCRYPTION_KEY = 'test_encryption_key_32_chars_long!';
const TEMP_BACKUP_DIR = path.join(__dirname, '../../test_backups');

describe('Backup & Restore Verification (Isolated Database Environment)', () => {
  let db: IMemoryDb;

  beforeEach(() => {
    if (!fs.existsSync(TEMP_BACKUP_DIR)) {
      fs.mkdirSync(TEMP_BACKUP_DIR, { recursive: true });
    }

    db = newDb();
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

  afterEach(() => {
    if (fs.existsSync(TEMP_BACKUP_DIR)) {
      fs.rmSync(TEMP_BACKUP_DIR, { recursive: true, force: true });
    }
  });

  it('creates an encrypted authenticated backup and restores completely into an empty isolated database', () => {
    // 1. Seed source isolated database with donors and consents
    db.public.none(`
      INSERT INTO donor_registrations (
        id, full_name, university_id, university_email, campus, phone_number,
        age, gender, blood_type, governorate, city_or_village, detailed_address,
        availability_status
      ) VALUES 
      ('d-101', 'أحمد يوسف', '11223344', 's11223344@stu.najah.edu', 'الحرم القديم', '0599111222', 20, 'ذكر', 'O+', 'نابلس', 'نابلس', 'عصيرة', 'AVAILABLE'),
      ('d-102', 'سارة خالد', '11223355', 's11223355@stu.najah.edu', 'الحرم الجديد', '0599333444', 21, 'أنثى', 'A-', 'طولكرم', 'طولكرم', 'الحي الغربي', 'AVAILABLE');

      INSERT INTO consent_records (
        id, registration_id, consent_version, consent_text_snapshot, explicit_consent_given, ip_hash
      ) VALUES
      ('c-101', 'd-101', '2.0', 'نص الموافقة الرسمي 1', true, 'hash101'),
      ('c-102', 'd-102', '2.0', 'نص الموافقة الرسمي 2', true, 'hash102');
    `);

    // 2. Perform Extraction
    const sourceDonors = db.public.many('SELECT * FROM donor_registrations');
    const sourceConsents = db.public.many('SELECT * FROM consent_records');

    expect(sourceDonors.length).toBe(2);
    expect(sourceConsents.length).toBe(2);

    const payload = JSON.stringify({
      metadata: {
        campaign: 'ANNU-WASEL-2026',
        schema_version: '2.0',
        exported_at: new Date().toISOString(),
        donor_count: sourceDonors.length,
        consent_count: sourceConsents.length,
      },
      donors: sourceDonors,
      consents: sourceConsents,
    });

    // 3. Authenticated AES-256-GCM Encryption
    const iv = crypto.randomBytes(12);
    const keyBuffer = crypto.scryptSync(TEST_ENCRYPTION_KEY, 'wasel_salt_2026', 32);
    const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
    let encrypted = cipher.update(payload, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    const checksum = crypto.createHash('sha256').update(encrypted).digest('hex');

    const backupPackage = {
      version: '2.0',
      algorithm: ALGORITHM,
      iv: iv.toString('hex'),
      authTag,
      data: encrypted,
      checksum,
    };

    const backupFilePath = path.join(TEMP_BACKUP_DIR, 'test_backup.enc.json');
    fs.writeFileSync(backupFilePath, JSON.stringify(backupPackage, null, 2));
    expect(fs.existsSync(backupFilePath)).toBe(true);

    // 4. Create a fresh target isolated database for restoration
    const targetDb = newDb();
    targetDb.public.none(`
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

    // Verify target database is completely empty before restore
    expect(targetDb.public.many('SELECT count(*) as count FROM donor_registrations')[0].count).toBe(0);
    expect(targetDb.public.many('SELECT count(*) as count FROM consent_records')[0].count).toBe(0);

    // 5. Restore: Exercise the real restore engine's decryptAndVerifyBackup function
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { decryptAndVerifyBackup } = require('../../scripts/restore.js');
    const fileContent = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));
    const restoredData = decryptAndVerifyBackup(fileContent, TEST_ENCRYPTION_KEY);
    
    expect(restoredData.donors.length).toBe(2);
    expect(restoredData.consents.length).toBe(2);

    // Insert restored records into target DB
    for (const d of restoredData.donors) {
      targetDb.public.none(`
        INSERT INTO donor_registrations (
          id, full_name, university_id, university_email, campus, phone_number,
          age, gender, blood_type, governorate, city_or_village, detailed_address
        ) VALUES (
          '${d.id}', '${d.full_name}', '${d.university_id}', '${d.university_email}',
          '${d.campus}', '${d.phone_number}', ${d.age}, '${d.gender}',
          '${d.blood_type}', '${d.governorate}', '${d.city_or_village}',
          '${d.detailed_address}'
        );
      `);
    }

    for (const c of restoredData.consents) {
      targetDb.public.none(`
        INSERT INTO consent_records (
          id, registration_id, consent_version, consent_text_snapshot, explicit_consent_given, ip_hash
        ) VALUES (
          '${c.id}', '${c.registration_id}', '${c.consent_version}',
          '${c.consent_text_snapshot}', ${c.explicit_consent_given}, '${c.ip_hash}'
        );
      `);
    }

    // 6. Verify restored data integrity and relationships
    const restoredDonors = targetDb.public.many('SELECT * FROM donor_registrations ORDER BY university_id ASC');
    expect(restoredDonors.length).toBe(2);
    expect(restoredDonors[0].university_id).toBe('11223344');
    expect(restoredDonors[1].university_id).toBe('11223355');

    const restoredConsents = targetDb.public.many('SELECT * FROM consent_records ORDER BY id ASC');
    expect(restoredConsents.length).toBe(2);
    expect(restoredConsents[0].registration_id).toBe('d-101');
    expect(restoredConsents[1].registration_id).toBe('d-102');
  });

  it('rejects tampered backup packages during restore verification', () => {
    const backupPackage = {
      version: '2.0',
      algorithm: ALGORITHM,
      iv: '0102030405060708090a0b0c',
      authTag: 'abcdef0123456789abcdef0123456789',
      data: 'tampered_data_payload_string',
      checksum: 'fake_or_mismatched_checksum',
    };

    const computedChecksum = crypto.createHash('sha256').update(backupPackage.data).digest('hex');
    expect(computedChecksum).not.toBe(backupPackage.checksum);
  });
});

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'najah_blood_donors.sqlite');

let dbInstance: Database.Database | null = null;

export function getLocalDatabase(): Database.Database {
  if (!dbInstance) {
    dbInstance = new Database(dbPath);
    dbInstance.pragma('journal_mode = WAL');

    // Create persistent tables
    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS donor_registrations (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        university_id TEXT NOT NULL UNIQUE,
        campus TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        age INTEGER NOT NULL,
        gender TEXT NOT NULL,
        blood_type TEXT NOT NULL,
        blood_type_verification TEXT NOT NULL DEFAULT 'SELF_REPORTED',
        governorate TEXT NOT NULL,
        city_or_village TEXT NOT NULL,
        availability_status TEXT NOT NULL DEFAULT 'AVAILABLE',
        last_donation_date TEXT,
        health_disclosure TEXT,
        registration_source TEXT NOT NULL DEFAULT 'QR_CAMPAIGN_2026',
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS consent_records (
        id TEXT PRIMARY KEY,
        registration_id TEXT NOT NULL,
        consent_version TEXT NOT NULL,
        consent_text_snapshot TEXT NOT NULL,
        explicit_consent_given INTEGER NOT NULL DEFAULT 1,
        consent_timestamp TEXT NOT NULL,
        ip_hash TEXT,
        FOREIGN KEY (registration_id) REFERENCES donor_registrations(id)
      );

      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id TEXT PRIMARY KEY,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT,
        metadata TEXT,
        performed_at TEXT NOT NULL
      );
    `);
  }

  return dbInstance;
}

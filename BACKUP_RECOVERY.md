# Encrypted Backup & Disaster Recovery Runbook

## 1. Objectives & Metrics
- **RPO (Recovery Point Objective)**: 24 Hours (or manual trigger immediately following major on-campus registration days).
- **RTO (Recovery Time Objective)**: Under 30 minutes.
- **Budget**: $0 (Runs locally or via scheduled GitHub Actions).

## 2. Encryption Strategy
Backups are encrypted using **AES-256-GCM**, providing both confidentiality and cryptographic integrity verification (AuthTag).

## 3. Running an Encrypted Backup

Ensure your environment variables are loaded:
```bash
export NEXT_PUBLIC_SUPABASE_URL="https://your-id.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJhb..."
export BACKUP_ENCRYPTION_KEY="your-32-char-secret-passphrase-here"

node scripts/backup.js ./backups
```
This produces an encrypted file: `backups/backup_annu_blood_<timestamp>.enc.json`.

## 4. Disaster Recovery & Restoration Verification

To verify the integrity of a backup without modifying the database (Dry-run):
```bash
node scripts/restore.js backups/backup_annu_blood_xxx.enc.json --dry-run
```

To perform a complete restoration into the database:
```bash
node scripts/restore.js backups/backup_annu_blood_xxx.enc.json
```
The script uses `upsert` keyed on `university_id` to restore registrations safely without creating duplicates.

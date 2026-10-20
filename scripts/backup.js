/**
 * An-Najah National University - Blood Donor Pre-Registration Campaign
 * Encrypted Backup Script (Zero-Budget Compliant)
 * 
 * Usage:
 *   node scripts/backup.js [output_dir]
 * 
 * Requires:
 *   BACKUP_ENCRYPTION_KEY environment variable (32 characters / 256 bits)
 *   SUPABASE_SERVICE_ROLE_KEY & NEXT_PUBLIC_SUPABASE_URL
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const ALGORITHM = 'aes-256-gcm';

async function runBackup() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const encryptionKey = process.env.BACKUP_ENCRYPTION_KEY;

  if (!encryptionKey || encryptionKey.length < 32) {
    console.error('Error: BACKUP_ENCRYPTION_KEY must be provided and be at least 32 characters long.');
    process.exit(1);
  }

  if (!supabaseUrl || !serviceKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  console.log('Fetching donor registrations and consent records...');
  const { data: donors, error: donorError } = await supabase.from('donor_registrations').select('*');
  const { data: consents, error: consentError } = await supabase.from('consent_records').select('*');

  if (donorError || consentError) {
    console.error('Failed to extract records:', donorError || consentError);
    process.exit(1);
  }

  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    campaign: 'ANNU-BLOOD-2026',
    count: donors.length,
    donors,
    consents,
  });

  // AES-256-GCM Encryption
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(encryptionKey.slice(0, 32)), iv);
  
  let encrypted = cipher.update(payload, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  const backupPackage = {
    algorithm: ALGORITHM,
    iv: iv.toString('hex'),
    authTag,
    data: encrypted,
  };

  const outputDir = process.argv[2] || path.join(__dirname, '../backups');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filename = `backup_annu_blood_${Date.now()}.enc.json`;
  const filePath = path.join(outputDir, filename);

  fs.writeFileSync(filePath, JSON.stringify(backupPackage, null, 2));
  console.log(`Successfully created encrypted backup with ${donors.length} records at: ${filePath}`);
}

runBackup().catch((err) => {
  console.error('Backup exception:', err);
  process.exit(1);
});

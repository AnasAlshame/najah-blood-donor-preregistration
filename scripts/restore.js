/**
 * An-Najah National University - Blood Donor Pre-Registration Campaign
 * Encrypted Backup Restoration & Verification Script
 * 
 * Usage:
 *   node scripts/restore.js <path_to_backup_file> [--dry-run]
 */

const fs = require('fs');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const ALGORITHM = 'aes-256-gcm';

async function runRestore() {
  const backupFile = process.argv[2];
  const isDryRun = process.argv.includes('--dry-run');

  if (!backupFile || !fs.existsSync(backupFile)) {
    console.error('Usage: node scripts/restore.js <path_to_backup_file> [--dry-run]');
    process.exit(1);
  }

  const encryptionKey = process.env.BACKUP_ENCRYPTION_KEY;
  if (!encryptionKey || encryptionKey.length < 32) {
    console.error('Error: BACKUP_ENCRYPTION_KEY must be provided and be at least 32 characters long.');
    process.exit(1);
  }

  const rawPackage = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

  // Decrypt
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(encryptionKey.slice(0, 32)),
    Buffer.from(rawPackage.iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(rawPackage.authTag, 'hex'));

  let decrypted = decipher.update(rawPackage.data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  const restoredData = JSON.parse(decrypted);
  console.log(`✓ Backup successfully decrypted and verified.`);
  console.log(`Campaign: ${restoredData.campaign} | Timestamp: ${restoredData.timestamp}`);
  console.log(`Total donor records in package: ${restoredData.donors.length}`);
  console.log(`Total consent records in package: ${restoredData.consents.length}`);

  if (isDryRun) {
    console.log('✓ Dry-run validation passed. Database was not modified.');
    return;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.log('Note: SUPABASE credentials not provided. Decryption integrity verified successfully without DB injection.');
    return;
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  console.log('Restoring donor records into database...');
  for (const donor of restoredData.donors) {
    await supabase.from('donor_registrations').upsert(donor, { onConflict: 'university_id' });
  }

  console.log('✓ Database restoration completed successfully.');
}

runRestore().catch((err) => {
  console.error('Restore verification failed:', err);
  process.exit(1);
});

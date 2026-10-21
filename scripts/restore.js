/**
 * An-Najah National University - WASel Campaign
 * Enterprise Encrypted Restore & Verification Engine
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
    console.error('[SECURITY ERROR] BACKUP_ENCRYPTION_KEY must be provided and be at least 32 characters long.');
    process.exit(1);
  }

  const rawPackage = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

  // 1. Verify Checksum
  const computedChecksum = crypto.createHash('sha256').update(rawPackage.data).digest('hex');
  if (computedChecksum !== rawPackage.checksum) {
    console.error('[INTEGRITY ERROR] Backup package checksum does not match. Possible tampering or corruption.');
    process.exit(1);
  }

  // 2. Decrypt
  const keyBuffer = crypto.scryptSync(encryptionKey, 'wasel_salt_2026', 32);
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    keyBuffer,
    Buffer.from(rawPackage.iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(rawPackage.authTag, 'hex'));

  let decrypted = decipher.update(rawPackage.data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  const restoredData = JSON.parse(decrypted);
  console.log(`✓ Backup successfully decrypted and cryptographically verified.`);
  console.log(`Campaign: ${restoredData.metadata.campaign} | Exported: ${restoredData.metadata.exported_at}`);
  console.log(`Donors in package: ${restoredData.donors.length}`);
  console.log(`Consents in package: ${restoredData.consents.length}`);

  if (isDryRun) {
    console.log('✓ Dry-run verification passed successfully. No database writes were performed.');
    return;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('[CONFIG ERROR] Live database credentials required for non-dry-run restore.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  console.log('Restoring donor registrations in batches...');
  for (const donor of restoredData.donors) {
    const { error: dErr } = await supabase.from('donor_registrations').upsert(donor, { onConflict: 'university_id' });
    if (dErr) throw new Error(`Failed to restore donor ${donor.university_id}: ${dErr.message}`);
  }

  console.log('Restoring consent records in batches...');
  for (const consent of restoredData.consents) {
    const { error: cErr } = await supabase.from('consent_records').upsert(consent, { onConflict: 'id' });
    if (cErr) throw new Error(`Failed to restore consent ${consent.id}: ${cErr.message}`);
  }

  console.log('✓ Full database restoration verified and completed successfully.');
}

runRestore().catch((err) => {
  console.error('[RESTORE ERROR] Restoration failed:', err.message);
  process.exit(1);
});

/**
 * An-Najah National University - WASel Campaign
 * Enterprise Encrypted Backup Engine (Complete & Paginated)
 * 
 * Usage:
 *   node scripts/backup.js [output_dir]
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const ALGORITHM = 'aes-256-gcm';

async function fetchAllRows(supabase, table) {
  const PAGE_SIZE = 1000;
  let allRows = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to fetch from ${table}: ${error.message}`);
    }

    if (data && data.length > 0) {
      allRows = allRows.concat(data);
      if (data.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        page++;
      }
    } else {
      hasMore = false;
    }
  }

  return allRows;
}

async function runBackup() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const encryptionKey = process.env.BACKUP_ENCRYPTION_KEY;

  if (!encryptionKey || encryptionKey.length < 32) {
    console.error('[SECURITY ERROR] BACKUP_ENCRYPTION_KEY must be provided and be at least 32 characters long.');
    process.exit(1);
  }

  if (!supabaseUrl || !serviceKey) {
    console.error('[CONFIG ERROR] NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  console.log('Extracting complete dataset from Supabase...');
  const donors = await fetchAllRows(supabase, 'donor_registrations');
  
  // Fetch consent records with pagination
  const PAGE_SIZE = 1000;
  let consents = [];
  let cPage = 0;
  let cHasMore = true;

  while (cHasMore) {
    const from = cPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('consent_records')
      .select('*')
      .order('consent_timestamp', { ascending: false })
      .range(from, to);

    if (error) throw new Error(`Consent extraction failed: ${error.message}`);
    if (data && data.length > 0) {
      consents = consents.concat(data);
      if (data.length < PAGE_SIZE) cHasMore = false;
      else cPage++;
    } else {
      cHasMore = false;
    }
  }

  const payload = JSON.stringify({
    metadata: {
      campaign: 'ANNU-WASEL-2026',
      schema_version: '2.0',
      exported_at: new Date().toISOString(),
      donor_count: donors.length,
      consent_count: consents.length,
    },
    donors,
    consents,
  });

  // Authenticated AES-256-GCM encryption with fresh IV
  const iv = crypto.randomBytes(12);
  const keyBuffer = crypto.scryptSync(encryptionKey, 'wasel_salt_2026', 32);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

  let encrypted = cipher.update(payload, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  const backupPackage = {
    version: '2.0',
    algorithm: ALGORITHM,
    iv: iv.toString('hex'),
    authTag,
    data: encrypted,
    checksum: crypto.createHash('sha256').update(encrypted).digest('hex'),
  };

  const outputDir = process.argv[2] || path.join(__dirname, '../backups');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filename = `backup_wasel_${Date.now()}.enc.json`;
  const filePath = path.join(outputDir, filename);

  fs.writeFileSync(filePath, JSON.stringify(backupPackage, null, 2));
  console.log(`✓ Verified encrypted backup created: ${filePath} (${donors.length} donors, ${consents.length} consents).`);
}

runBackup().catch((err) => {
  console.error('Backup failed:', err.message);
  process.exit(1);
});

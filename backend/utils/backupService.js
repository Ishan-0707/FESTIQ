import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const BACKUPS_DIR = path.resolve(DATA_DIR, 'backups');

const CRITICAL_DATA_FILES = [
  'events.json',
  'registrations.json',
  'users.json',
  'gallery.json',
  'eventProposals.json',
  'processedWebhooks.json'
];

/**
 * Ensure the backups directory exists.
 */
async function ensureBackupsDir() {
  if (!fsSync.existsSync(BACKUPS_DIR)) {
    await fs.mkdir(BACKUPS_DIR, { recursive: true });
  }
}

/**
 * Calculate SHA-256 checksum of a file or buffer.
 */
function calculateSha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Create a timestamped backup snapshot of all core JSON data.
 * @param {Object} options
 * @param {string} [options.label] - Optional tag/label for the backup
 * @param {string} [options.sourceDir] - Optional custom source directory (defaults to DATA_DIR)
 * @param {string} [options.targetDir] - Optional custom target directory (defaults to BACKUPS_DIR)
 * @returns {Promise<{success: boolean, backupId: string, backupPath: string, manifest: Object}>}
 */
export async function createBackup(options = {}) {
  const sourceDir = options.sourceDir || DATA_DIR;
  const targetBaseDir = options.targetDir || BACKUPS_DIR;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupId = options.label ? `backup_${options.label}_${timestamp}` : `backup_${timestamp}`;
  const backupPath = path.join(targetBaseDir, backupId);

  await fs.mkdir(backupPath, { recursive: true });

  const manifest = {
    backupId,
    createdAt: new Date().toISOString(),
    version: '1.0.0',
    platform: 'FESTIQ Platform Storage',
    files: {},
    recordSummary: {}
  };

  for (const filename of CRITICAL_DATA_FILES) {
    const srcFile = path.join(sourceDir, filename);
    const destFile = path.join(backupPath, filename);

    if (fsSync.existsSync(srcFile)) {
      const content = await fs.readFile(srcFile);
      const hash = calculateSha256(content);
      await fs.writeFile(destFile, content);

      let recordCount = null;
      try {
        const parsed = JSON.parse(content.toString('utf-8'));
        if (Array.isArray(parsed)) {
          recordCount = parsed.length;
        } else if (typeof parsed === 'object' && parsed !== null) {
          recordCount = Object.keys(parsed).length;
        }
      } catch {
        // Non-JSON or empty
      }

      manifest.files[filename] = {
        bytes: content.length,
        sha256: hash,
        recordCount
      };

      if (recordCount !== null) {
        manifest.recordSummary[filename.replace('.json', '')] = recordCount;
      }
    }
  }

  // Write manifest
  const manifestPath = path.join(backupPath, 'manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

  return {
    success: true,
    backupId,
    backupPath,
    manifest
  };
}

/**
 * Verify integrity of a backup snapshot using its manifest.
 * @param {string} backupPath
 * @returns {Promise<{valid: boolean, errors: string[], manifest: Object}>}
 */
export async function verifyBackup(backupPath) {
  const manifestPath = path.join(backupPath, 'manifest.json');
  if (!fsSync.existsSync(manifestPath)) {
    return { valid: false, errors: ['Manifest file manifest.json is missing'], manifest: null };
  }

  const manifestContent = await fs.readFile(manifestPath, 'utf-8');
  let manifest;
  try {
    manifest = JSON.parse(manifestContent);
  } catch (err) {
    return { valid: false, errors: ['Corrupted manifest.json'], manifest: null };
  }

  const errors = [];
  for (const [filename, meta] of Object.entries(manifest.files || {})) {
    const filePath = path.join(backupPath, filename);
    if (!fsSync.existsSync(filePath)) {
      errors.push(`Missing backup file: ${filename}`);
      continue;
    }
    const content = await fs.readFile(filePath);
    const computedHash = calculateSha256(content);
    if (computedHash !== meta.sha256) {
      errors.push(`Integrity mismatch for ${filename}: expected ${meta.sha256}, got ${computedHash}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    manifest
  };
}

/**
 * Restore data files from a backup snapshot.
 * @param {string} backupPath
 * @param {Object} options
 * @param {boolean} [options.dryRun] - If true, only verifies without overwriting files
 * @param {string} [options.targetDir] - Optional custom target directory (defaults to DATA_DIR)
 * @returns {Promise<{success: boolean, restoredFiles: string[], errors: string[]}>}
 */
export async function restoreBackup(backupPath, options = {}) {
  const targetDir = options.targetDir || DATA_DIR;
  const dryRun = Boolean(options.dryRun);

  // 1. Verify source backup integrity first
  const verification = await verifyBackup(backupPath);
  if (!verification.valid) {
    return {
      success: false,
      restoredFiles: [],
      errors: verification.errors
    };
  }

  if (dryRun) {
    return {
      success: true,
      restoredFiles: Object.keys(verification.manifest.files),
      errors: [],
      dryRun: true
    };
  }

  // 2. Perform atomic restoration
  const restoredFiles = [];
  for (const filename of Object.keys(verification.manifest.files)) {
    const srcFile = path.join(backupPath, filename);
    const targetFile = path.join(targetDir, filename);

    const content = await fs.readFile(srcFile);
    const tmpTarget = `${targetFile}.tmp_restore_${Date.now()}`;
    await fs.writeFile(tmpTarget, content);
    await fs.rename(tmpTarget, targetFile);
    restoredFiles.push(filename);
  }

  return {
    success: true,
    restoredFiles,
    errors: []
  };
}

/**
 * List all existing backups.
 */
export async function listBackups(backupsDir = BACKUPS_DIR) {
  await ensureBackupsDir();
  const entries = await fs.readdir(backupsDir, { withFileTypes: true });
  const backups = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const fullPath = path.join(backupsDir, entry.name);
      const manifestPath = path.join(fullPath, 'manifest.json');
      if (fsSync.existsSync(manifestPath)) {
        try {
          const raw = await fs.readFile(manifestPath, 'utf-8');
          const manifest = JSON.parse(raw);
          backups.push({
            id: entry.name,
            path: fullPath,
            manifest
          });
        } catch {
          // Skip invalid
        }
      }
    }
  }

  backups.sort((a, b) => new Date(b.manifest.createdAt) - new Date(a.manifest.createdAt));
  return backups;
}

// CLI runner if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  (async () => {
    try {
      console.log('Initiating FESTIQ Data Backup Snapshot...');
      const res = await createBackup({ label: 'manual' });
      console.log('Backup created successfully at:', res.backupPath);
      console.log('Manifest:', JSON.stringify(res.manifest, null, 2));

      const ver = await verifyBackup(res.backupPath);
      console.log('Verification check:', ver.valid ? 'PASSED (100% SHA-256 match)' : 'FAILED: ' + ver.errors.join(', '));
    } catch (e) {
      console.error('Backup error:', e);
      process.exit(1);
    }
  })();
}


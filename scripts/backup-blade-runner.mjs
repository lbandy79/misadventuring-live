/**
 * scripts/backup-blade-runner.mjs
 *
 * Read-only snapshot of the entire `blade-runner-characters` collection.
 * Run before every session, or any time you want a recoverable point-in-time
 * copy of the personal campaign roster.
 *
 * Usage:
 *   node scripts/backup-blade-runner.mjs
 *
 * Output:
 *   tmp/blade-runner-backups/blade-runner-YYYY-MM-DDTHH-mm-ss.json
 *
 * Recovery:
 *   To restore a single character, open the JSON, copy the `data` object
 *   for the character you want, and paste it back into the Firestore
 *   console at blade-runner-characters/<id>. Manual on purpose — we don't
 *   want a "restore" script that could overwrite live edits by accident.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const raw = readFileSync(path, 'utf8');
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const envLocal = loadEnvFile(resolve(repoRoot, '.env.local'));
const env = { ...envLocal, ...process.env };

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('✖  Missing Firebase env vars in .env.local.');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Firestore Timestamps don't JSON.stringify cleanly.
function deepConvert(value) {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  if (typeof value.toDate === 'function') {
    return { __timestamp: value.toDate().toISOString() };
  }
  if (Array.isArray(value)) return value.map(deepConvert);
  const out = {};
  for (const [k, v] of Object.entries(value)) out[k] = deepConvert(v);
  return out;
}

console.log(`→ Project: ${firebaseConfig.projectId}`);
console.log(`→ Reading blade-runner-characters…`);

const snap = await getDocs(collection(db, 'blade-runner-characters'));
const docs = snap.docs.map((d) => ({ id: d.id, data: deepConvert(d.data()) }));

console.log(`  ${docs.length} character${docs.length === 1 ? '' : 's'} found:`);
for (const c of docs) {
  const name = c.data?.name || c.data?.characterName || '(unnamed)';
  const player = c.data?.playerName || c.data?.player || '—';
  console.log(`    • ${name}  (player: ${player})`);
}

const backupDir = resolve(repoRoot, 'tmp', 'blade-runner-backups');
if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outPath = resolve(backupDir, `blade-runner-${stamp}.json`);

writeFileSync(
  outPath,
  JSON.stringify(
    {
      backedUpAt: new Date().toISOString(),
      projectId: firebaseConfig.projectId,
      collection: 'blade-runner-characters',
      count: docs.length,
      docs,
    },
    null,
    2
  ),
  'utf8'
);

const relPath = outPath.replace(repoRoot + '\\', '').replace(repoRoot + '/', '');
console.log(`\n✓ Backup saved: ${relPath}`);
console.log('  (gitignored — lives only on this machine)');

process.exit(0);

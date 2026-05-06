/**
 * scripts/backup-betawave.mjs
 *
 * Read-only full snapshot of every doc associated with the Apr 18 2026
 * Betawave Tapes show. Output is UNREDACTED (this is your own data on
 * your own machine) so you can rebuild the recap page or restore docs
 * later if anything is overwritten.
 *
 * Usage:
 *   node scripts/backup-betawave.mjs
 *
 * Output:
 *   tmp/betawave-backups/betawave-YYYY-MM-DDTHH-mm-ss.json
 *
 * What it captures:
 *   - All reservations where showId == betawave-last-call-2026-04-18
 *   - All npcs where showId == betawave-last-call-2026-04-18
 *   - The current state of every singleton interaction doc
 *     (monster-builder, villagers, decoder-ring, ship-combat, votes,
 *     group-roll, players/assignments) — even if they no longer relate
 *     to Betawave, we capture them once just in case.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';

const SHOW_ID = 'betawave-last-call-2026-04-18';

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

async function getByShowId(collectionName, showId) {
  const q = query(collection(db, collectionName), where('showId', '==', showId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, data: deepConvert(d.data()) }));
}

async function getOne(collectionName, docId) {
  const snap = await getDoc(doc(db, collectionName, docId));
  return snap.exists() ? deepConvert(snap.data()) : null;
}

console.log(`→ Project: ${firebaseConfig.projectId}`);
console.log(`→ Show:    ${SHOW_ID}\n`);

console.log('Pulling show-stamped collections…');
const reservations = await getByShowId('reservations', SHOW_ID);
console.log(`  reservations: ${reservations.length}`);
const npcs = await getByShowId('npcs', SHOW_ID);
console.log(`  npcs:         ${npcs.length}`);

console.log('\nPulling singleton snapshots (last-state-wins)…');
const singletons = {
  monsterBuilderCurrent: await getOne('monster-builder', 'current'),
  villagersCurrent:      await getOne('villagers', 'current'),
  decoderRingCurrent:    await getOne('decoder-ring', 'current'),
  shipCombatCurrent:     await getOne('ship-combat', 'current'),
  votesCurrent:          await getOne('votes', 'current-vote'),
  groupRollCurrent:      await getOne('group-roll', 'current'),
  playersAssignments:    await getOne('players', 'assignments'),
};
for (const [k, v] of Object.entries(singletons)) {
  console.log(`  ${k.padEnd(22)} ${v ? 'captured' : '— missing'}`);
}

const backupDir = resolve(repoRoot, 'tmp', 'betawave-backups');
if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outPath = resolve(backupDir, `betawave-${stamp}.json`);
writeFileSync(
  outPath,
  JSON.stringify(
    {
      backedUpAt: new Date().toISOString(),
      projectId: firebaseConfig.projectId,
      showId: SHOW_ID,
      counts: {
        reservations: reservations.length,
        npcs: npcs.length,
      },
      reservations,
      npcs,
      singletons,
    },
    null,
    2
  ),
  'utf8'
);

const relPath = outPath.replace(repoRoot + '\\', '').replace(repoRoot + '/', '');
console.log(`\n✓ Backup saved: ${relPath}`);
console.log('  (gitignored — full data, no redaction)\n');

process.exit(0);

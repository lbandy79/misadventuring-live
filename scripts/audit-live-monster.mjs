/**
 * scripts/audit-live-monster.mjs
 *
 * Read-only Firestore audit for a live-monster show. Dumps the session doc,
 * type votes, slot votes, bystander submissions, and any npcs/beats for the
 * given showId, then prints a tally summary.
 *
 * Usage (from repo root):
 *   node scripts/audit-live-monster.mjs <showId>
 *   node scripts/audit-live-monster.mjs monster-of-the-week-2026-07-25
 *
 * Output:
 *   tmp/live-monster-audit-<showId>.json  — full structured dump (gitignored)
 *   stdout                                — tally summary
 *
 * IMPORTANT: read-only — no setDoc/updateDoc/deleteDoc calls. Uses anonymous
 * web access; every collection it touches has public read in firestore.rules.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const showId = process.argv[2];
if (!showId) {
  console.error('Usage: node scripts/audit-live-monster.mjs <showId>');
  process.exit(1);
}

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

const env = { ...loadEnvFile(resolve(repoRoot, '.env.local')), ...process.env };

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('✖  Missing Firebase env vars. Make sure .env.local is filled in.');
  process.exit(1);
}

console.log(`→ Firestore project: ${firebaseConfig.projectId}`);
console.log(`→ Auditing showId:  ${showId}\n`);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function getAll(collectionName) {
  try {
    const snap = await getDocs(collection(db, collectionName));
    return snap.docs.map((d) => ({ id: d.id, data: d.data() }));
  } catch (err) {
    console.warn(`  ! ${collectionName} read failed: ${err.message}`);
    return [];
  }
}

async function getOne(collectionName, docId) {
  try {
    const snap = await getDoc(doc(db, collectionName, docId));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.warn(`  ! ${collectionName}/${docId} read failed: ${err.message}`);
    return null;
  }
}

function forShow(docs) {
  return docs.filter(
    (d) => d.data?.showId === showId || d.id.startsWith(`${showId}__`)
  );
}

function tally(docs, field) {
  const counts = new Map();
  for (const d of docs) {
    const v = d.data?.[field];
    if (v == null) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

console.log('Reading collections…');
const session = await getOne('live-monster-session', showId);
console.log(`  live-monster-session/${showId}: ${session ? 'exists' : 'MISSING'}`);
const typeVotes = forShow(await getAll('live-monster-type-votes'));
console.log(`  type votes:            ${typeVotes.length}`);
const slotVotes = forShow(await getAll('live-monster-slot-votes'));
console.log(`  slot votes:            ${slotVotes.length}`);
const bystanders = forShow(await getAll('live-bystander-submissions'));
console.log(`  bystander submissions: ${bystanders.length}`);
const npcs = forShow(await getAll('npcs'));
console.log(`  npcs:                  ${npcs.length}`);
const beats = forShow(await getAll('beats'));
console.log(`  beats:                 ${beats.length}`);
const platformConfig = await getOne('config', 'platform');

// ── Summary ────────────────────────────────────────────────────────
console.log('\n┌──────────────────────────────────────────────────────────────');
console.log('│ Session state');
console.log('└──────────────────────────────────────────────────────────────');
if (session) {
  console.log(`  phase:          ${session.phase ?? '—'}`);
  console.log(`  lockedTypeId:   ${session.lockedTypeId ?? '—'}`);
  console.log(`  linkedThreatId: ${session.linkedThreatId ?? '—'}`);
  for (const [slot, result] of Object.entries(session.slotResults ?? {})) {
    console.log(`  slotResults.${slot}: ${JSON.stringify(result)}`);
  }
}
console.log(`  config/platform.currentShowId: ${platformConfig?.currentShowId ?? '—'}`);

console.log('\n┌──────────────────────────────────────────────────────────────');
console.log('│ Type vote tally');
console.log('└──────────────────────────────────────────────────────────────');
for (const [typeId, n] of tally(typeVotes, 'typeId')) {
  console.log(`  ${String(typeId).padEnd(20)} ${n}`);
}

console.log('\n┌──────────────────────────────────────────────────────────────');
console.log('│ Slot votes by slot (preset vs write-in)');
console.log('└──────────────────────────────────────────────────────────────');
const bySlot = new Map();
for (const v of slotVotes) {
  const slotId = v.data?.slotId ?? v.id.split('__')[1] ?? '?';
  if (!bySlot.has(slotId)) bySlot.set(slotId, []);
  bySlot.get(slotId).push(v);
}
for (const [slotId, votes] of bySlot) {
  const writeIns = votes.filter((v) => v.data?.isWriteIn || v.data?.writeIn);
  console.log(`\n  slot: ${slotId}  (${votes.length} votes, ${writeIns.length} write-ins)`);
  for (const [option, n] of tally(votes, 'optionText')) {
    console.log(`    ${String(option).padEnd(36)} ${n}`);
  }
  for (const w of writeIns) {
    const text = w.data?.writeInText ?? w.data?.writeIn ?? w.data?.optionText;
    console.log(`    ✎ write-in: ${JSON.stringify(text)}`);
  }
}

// ── Dump ───────────────────────────────────────────────────────────
const tmpDir = resolve(repoRoot, 'tmp');
if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

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

const dump = {
  generatedAt: new Date().toISOString(),
  projectId: firebaseConfig.projectId,
  showId,
  session,
  typeVotes,
  slotVotes,
  bystanders,
  npcs,
  beats,
  platformConfig,
};

const outPath = resolve(tmpDir, `live-monster-audit-${showId}.json`);
writeFileSync(outPath, JSON.stringify(deepConvert(dump), null, 2), 'utf8');
console.log(`\n✓ Full dump written to: tmp/live-monster-audit-${showId}.json\n`);

process.exit(0);

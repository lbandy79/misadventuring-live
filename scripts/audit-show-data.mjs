/**
 * scripts/audit-show-data.mjs
 *
 * Read-only Firestore audit. Dumps every relevant collection grouped by
 * showId so we can pick which past show has the cleanest data for the
 * recap-page experiment.
 *
 * Usage (from repo root):
 *   node scripts/audit-show-data.mjs
 *
 * Output:
 *   tmp/show-data-audit.json   — full structured dump (gitignored)
 *   stdout                      — per-show summary table
 *
 * IMPORTANT: This script ONLY reads. There are no setDoc/updateDoc/
 * deleteDoc calls. It also uses anonymous Firebase web access — your
 * Firestore rules already allow read on every collection it touches,
 * so no admin sign-in is required.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

// ── Load .env.local manually (no dotenv dependency) ───────────────
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
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error(
    '✖  Missing Firebase env vars. Make sure .env.local is filled in.'
  );
  process.exit(1);
}

console.log(`→ Connecting to Firestore project: ${firebaseConfig.projectId}\n`);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ── Helpers ────────────────────────────────────────────────────────
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

function tsToIso(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number')
    return new Date(value).toISOString();
  if (typeof value.toDate === 'function')
    return value.toDate().toISOString();
  if (typeof value.seconds === 'number')
    return new Date(value.seconds * 1000).toISOString();
  return null;
}

function groupByShow(docs, showIdField = 'showId') {
  const out = new Map();
  for (const d of docs) {
    const showId = d.data?.[showIdField] ?? '__no_showId__';
    if (!out.has(showId)) out.set(showId, []);
    out.get(showId).push(d);
  }
  return out;
}

function pct(n, total) {
  if (!total) return '0%';
  return `${Math.round((n / total) * 100)}%`;
}

// ── Pull data ──────────────────────────────────────────────────────
console.log('Reading collections…');
const reservations = await getAll('reservations');
console.log(`  reservations:   ${reservations.length}`);
const npcs = await getAll('npcs');
console.log(`  npcs:           ${npcs.length}`);
const bladeRunnerCharacters = await getAll('blade-runner-characters');
console.log(`  blade-runner-characters: ${bladeRunnerCharacters.length}  (personal campaign)`);

// Singleton "current" docs — these get overwritten each show, so only
// the LAST show's state survives. Still useful to record what's there.
const villagersCurrent = await getOne('villagers', 'current');
console.log(`  villagers/current:        ${villagersCurrent ? 'exists' : 'missing'}`);
const monsterBuilderCurrent = await getOne('monster-builder', 'current');
console.log(`  monster-builder/current:  ${monsterBuilderCurrent ? 'exists' : 'missing'}`);
const decoderRingCurrent = await getOne('decoder-ring', 'current');
console.log(`  decoder-ring/current:     ${decoderRingCurrent ? 'exists' : 'missing'}`);
const shipCombatCurrent = await getOne('ship-combat', 'current');
console.log(`  ship-combat/current:      ${shipCombatCurrent ? 'exists' : 'missing'}`);
const votesCurrent = await getOne('votes', 'current-vote');
console.log(`  votes/current-vote:       ${votesCurrent ? 'exists' : 'missing'}`);
const groupRollCurrent = await getOne('group-roll', 'current');
console.log(`  group-roll/current:       ${groupRollCurrent ? 'exists' : 'missing'}`);
const playersAssignments = await getOne('players', 'assignments');
console.log(`  players/assignments:      ${playersAssignments ? 'exists' : 'missing'}`);
const platformConfig = await getOne('config', 'platform');
console.log(`  config/platform:          ${platformConfig ? 'exists' : 'missing'}`);

// ── Group by show ──────────────────────────────────────────────────
const reservationsByShow = groupByShow(reservations);
const npcsByShow = groupByShow(npcs);

const allShowIds = new Set([
  ...reservationsByShow.keys(),
  ...npcsByShow.keys(),
]);

// Per-show stats
const perShow = {};
for (const showId of allShowIds) {
  const r = reservationsByShow.get(showId) ?? [];
  const n = npcsByShow.get(showId) ?? [];
  const npcsWithName = n.filter(
    (x) => x.data?.name && String(x.data.name).trim().length > 0
  );
  const npcsCreatedFlag = r.filter((x) => x.data?.npcCreated === true).length;

  // Date range (from createdAt fields)
  const createdAts = [
    ...r.map((x) => tsToIso(x.data?.createdAt)),
    ...n.map((x) => tsToIso(x.data?.createdAt)),
  ].filter(Boolean).sort();
  perShow[showId] = {
    reservations: r.length,
    npcs: n.length,
    npcsWithName: npcsWithName.length,
    reservationsMarkedNpcCreated: npcsCreatedFlag,
    earliestCreatedAt: createdAts[0] ?? null,
    latestCreatedAt: createdAts[createdAts.length - 1] ?? null,
  };
}

// ── Pretty summary ─────────────────────────────────────────────────
console.log('\n┌──────────────────────────────────────────────────────────────');
console.log('│ Per-show summary');
console.log('└──────────────────────────────────────────────────────────────');
const rows = Object.entries(perShow).sort(
  (a, b) => (b[1].reservations + b[1].npcs) - (a[1].reservations + a[1].npcs)
);
for (const [showId, stats] of rows) {
  console.log(`\n  showId: ${showId}`);
  console.log(`    reservations:                ${stats.reservations}`);
  console.log(
    `    npcs:                        ${stats.npcs}` +
      (stats.npcs > 0
        ? `  (${stats.npcsWithName} with name = ${pct(
            stats.npcsWithName,
            stats.npcs
          )})`
        : '')
  );
  console.log(`    reservations w/ npcCreated:  ${stats.reservationsMarkedNpcCreated}`);
  console.log(`    earliest createdAt:          ${stats.earliestCreatedAt ?? 'n/a'}`);
  console.log(`    latest createdAt:            ${stats.latestCreatedAt ?? 'n/a'}`);
}

console.log('\n┌──────────────────────────────────────────────────────────────');
console.log('│ Singleton "current" docs (last-show-wins; lacks showId stamping)');
console.log('└──────────────────────────────────────────────────────────────');
console.log(
  `  villagers/current:       ${
    villagersCurrent
      ? `${(villagersCurrent.submissions ?? []).length} submissions, status=${villagersCurrent.status ?? '—'}`
      : '—'
  }`
);
console.log(
  `  monster-builder/current: ${
    monsterBuilderCurrent
      ? `status=${monsterBuilderCurrent.status ?? '—'}, results=${
          monsterBuilderCurrent.results
            ? Object.keys(monsterBuilderCurrent.results).length + ' parts'
            : 'none'
        }`
      : '—'
  }`
);
console.log(
  `  decoder-ring/current:    ${
    decoderRingCurrent
      ? `status=${decoderRingCurrent.status ?? '—'}, phrase=${
          decoderRingCurrent.phrase ?? decoderRingCurrent.targetPhrase ?? '—'
        }`
      : '—'
  }`
);
console.log(
  `  ship-combat/current:     ${
    shipCombatCurrent ? `status=${shipCombatCurrent.status ?? '—'}` : '—'
  }`
);
console.log(
  `  votes/current-vote:      ${
    votesCurrent
      ? `totalVotes=${votesCurrent.totalVotes ?? 0}, isOpen=${votesCurrent.isOpen ?? '—'}`
      : '—'
  }`
);
console.log(
  `  config/platform:         ${
    platformConfig
      ? JSON.stringify(platformConfig)
      : '—'
  }`
);

// ── Blade Runner roster (personal campaign — not show data) ────────
console.log('\n┌──────────────────────────────────────────────────────────────');
console.log('│ Blade Runner roster (personal campaign — separate collection)');
console.log('└──────────────────────────────────────────────────────────────');
if (bladeRunnerCharacters.length === 0) {
  console.log('  (no characters found)');
} else {
  for (const c of bladeRunnerCharacters) {
    const name = c.data?.name || c.data?.characterName || '(unnamed)';
    const player = c.data?.playerName || c.data?.player || '—';
    const created = tsToIso(c.data?.createdAt) ?? '—';
    const updated = tsToIso(c.data?.updatedAt) ?? '—';
    console.log(`  • ${name.padEnd(28)} player=${String(player).padEnd(16)} created=${created}  updated=${updated}`);
  }
}

// ── Dump full data ─────────────────────────────────────────────────
const tmpDir = resolve(repoRoot, 'tmp');
if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

// Strip access codes from reservations for the JSON dump (still PII-ish).
function redactReservation(r) {
  return {
    id: r.id,
    data: {
      ...r.data,
      accessCode: r.data?.accessCode
        ? `${String(r.data.accessCode).slice(0, 2)}****`
        : null,
      email: r.data?.email
        ? String(r.data.email).replace(/(.).+(@.+)/, '$1***$2')
        : null,
    },
  };
}

const dump = {
  generatedAt: new Date().toISOString(),
  projectId: firebaseConfig.projectId,
  perShow,
  reservations: reservations.map(redactReservation),
  npcs,
  bladeRunnerCharacters,
  singletons: {
    villagersCurrent,
    monsterBuilderCurrent,
    decoderRingCurrent,
    shipCombatCurrent,
    votesCurrent,
    groupRollCurrent,
    playersAssignments,
    platformConfig,
  },
};

// Firestore Timestamp objects don't JSON.stringify cleanly — convert.
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

const outPath = resolve(tmpDir, 'show-data-audit.json');
writeFileSync(outPath, JSON.stringify(deepConvert(dump), null, 2), 'utf8');
console.log(`\n✓ Full dump written to: tmp/show-data-audit.json`);
console.log('  (gitignored; reservations redacted for emails/codes)\n');

process.exit(0);

/**
 * Firestore security-rules tests for the SBP (Misadventuring Labs) collections,
 * plus regression coverage for the Sept 2026 Step 0 hardening.
 *
 * Runs against the Firestore emulator: `npm run test:rules`. Not part of
 * `npm test` (see vitest.rules.config.ts).
 *
 * The whole team-only model rests on these rules. The rules content is
 * unpublished IP that exists only in Firestore, so "who can read sbp-rules"
 * is the entire access control story. Every fixture here is synthetic.
 */

import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const ADMIN = { uid: 'admin-uid', email: 'gm@example.com' };
const CAST_A = { uid: 'cast-a-uid', email: 'player-a@example.com' };
const CAST_B = { uid: 'cast-b-uid', email: 'player-b@example.com' };
const OUTSIDER = { uid: 'outsider-uid', email: 'nobody@example.com' };

let env: RulesTestEnvironment;

function emulatorHost(): { host: string; port: number } {
  const fromEnv = process.env.FIRESTORE_EMULATOR_HOST;
  if (fromEnv) {
    const [host, port] = fromEnv.split(':');
    return { host, port: Number(port) };
  }
  return { host: '127.0.0.1', port: 8089 };
}

// ─── Contexts ─────────────────────────────────────────────────────────────────

const asAdmin = () =>
  env.authenticatedContext(ADMIN.uid, { email: ADMIN.email, email_verified: true }).firestore();
const asCastA = () =>
  env.authenticatedContext(CAST_A.uid, { email: CAST_A.email, email_verified: true }).firestore();
const asCastB = () =>
  env.authenticatedContext(CAST_B.uid, { email: CAST_B.email, email_verified: true }).firestore();
const asOutsider = () =>
  env.authenticatedContext(OUTSIDER.uid, { email: OUTSIDER.email, email_verified: true }).firestore();
/** Signed in via signInAnonymously: a uid but no email at all. */
const asAnonymous = () =>
  env.authenticatedContext('anon-uid', { firebase: { sign_in_provider: 'anonymous' } }).firestore();
/** A self-registered account claiming a cast address without verifying it. */
const asImpostor = () =>
  env.authenticatedContext('impostor-uid', { email: CAST_A.email, email_verified: false }).firestore();
const asNobody = () => env.unauthenticatedContext().firestore();

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const rulesDoc = (uploadedBy: string) => ({
  meta: { kind: 'classes', schemaVersion: '0.1.0', uploadedBy, uploadedAt: 1, counts: {} },
  data: { $schema_version: '0.1.0', classes: [], archetypes: {} },
});

const character = (ownerUid: string, extra: Record<string, unknown> = {}) => ({
  ownerUid,
  ownerEmail: 'x@example.com',
  name: 'Test Build',
  level: 1,
  speciesId: 'species.test',
  backgroundId: 'background.test',
  classId: 'class.test',
  abilityScores: { method: 'standard_array', base: {} },
  choices: {},
  rulesVersion: { classes: 1, origins: 1 },
  createdAt: 1,
  updatedAt: 1,
  ...extra,
});

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-sbp-rules',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      ...emulatorHost(),
    },
  });
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'config', 'admins'), { emails: [ADMIN.email] });
    await setDoc(doc(db, 'config', 'cast'), { emails: [CAST_A.email, CAST_B.email] });
    await setDoc(doc(db, 'sbp-rules', 'classes'), rulesDoc(ADMIN.uid));
    await setDoc(doc(db, 'sbp-rules-history', 'h1'), {
      kind: 'classes', replacedAt: 1, replacedBy: ADMIN.uid, previous: rulesDoc(ADMIN.uid),
    });
    await setDoc(doc(db, 'sbp-characters', 'char-a'), character(CAST_A.uid));
    await setDoc(doc(db, 'hunter-sheets', 'sheet-1'), { castMemberUid: CAST_A.uid, hunterName: 'H' });
  });
});

afterAll(async () => {
  await env.cleanup();
});

// ─── sbp-rules ────────────────────────────────────────────────────────────────

describe('sbp-rules (the sourcebook content)', () => {
  const ref = (db: ReturnType<typeof asAdmin>) => doc(db, 'sbp-rules', 'classes');

  it('is unreadable when signed out', async () => {
    await assertFails(getDoc(ref(asNobody())));
  });

  it('is unreadable to an anonymous (audience) session', async () => {
    await assertFails(getDoc(ref(asAnonymous())));
  });

  it('is unreadable to a verified user who is not on the cast list', async () => {
    await assertFails(getDoc(ref(asOutsider())));
  });

  it('is unreadable to an unverified account that claims a cast email', async () => {
    await assertFails(getDoc(ref(asImpostor())));
  });

  it('is readable by cast', async () => {
    await assertSucceeds(getDoc(ref(asCastA())));
  });

  it('is readable by admin', async () => {
    await assertSucceeds(getDoc(ref(asAdmin())));
  });

  it('cannot be written by cast', async () => {
    await assertFails(setDoc(ref(asCastA()), rulesDoc(CAST_A.uid)));
  });

  it('can be written by admin with meta + data', async () => {
    await assertSucceeds(setDoc(ref(asAdmin()), rulesDoc(ADMIN.uid)));
  });

  it('rejects an admin write missing the meta/data envelope', async () => {
    await assertFails(setDoc(ref(asAdmin()), { classes: [] }));
  });

  it('rejects an admin write whose meta.uploadedBy is someone else', async () => {
    await assertFails(setDoc(ref(asAdmin()), rulesDoc(CAST_A.uid)));
  });

  it('cannot be deleted by cast', async () => {
    await assertFails(deleteDoc(ref(asCastA())));
  });
});

// ─── sbp-rules-history ────────────────────────────────────────────────────────

describe('sbp-rules-history (append-only backups)', () => {
  it('is unreadable to cast', async () => {
    await assertFails(getDoc(doc(asCastA(), 'sbp-rules-history', 'h1')));
  });

  it('is readable by admin', async () => {
    await assertSucceeds(getDoc(doc(asAdmin(), 'sbp-rules-history', 'h1')));
  });

  it('accepts a new entry from admin', async () => {
    await assertSucceeds(
      setDoc(doc(asAdmin(), 'sbp-rules-history', 'h2'), {
        kind: 'classes', replacedAt: 2, replacedBy: ADMIN.uid, previous: rulesDoc(ADMIN.uid),
      }),
    );
  });

  it('refuses to let even an admin rewrite an entry', async () => {
    await assertFails(updateDoc(doc(asAdmin(), 'sbp-rules-history', 'h1'), { replacedAt: 99 }));
  });

  it('refuses to let even an admin delete an entry', async () => {
    await assertFails(deleteDoc(doc(asAdmin(), 'sbp-rules-history', 'h1')));
  });

  it('cannot be created by cast', async () => {
    await assertFails(
      setDoc(doc(asCastA(), 'sbp-rules-history', 'h3'), { kind: 'classes', replacedAt: 3 }),
    );
  });
});

// ─── sbp-characters ───────────────────────────────────────────────────────────

describe('sbp-characters', () => {
  describe('read', () => {
    it('lets cast read each other\'s characters', async () => {
      await assertSucceeds(getDoc(doc(asCastB(), 'sbp-characters', 'char-a')));
    });

    it('lets admin read', async () => {
      await assertSucceeds(getDoc(doc(asAdmin(), 'sbp-characters', 'char-a')));
    });

    it('denies non-cast, anonymous and signed-out readers', async () => {
      await assertFails(getDoc(doc(asOutsider(), 'sbp-characters', 'char-a')));
      await assertFails(getDoc(doc(asAnonymous(), 'sbp-characters', 'char-a')));
      await assertFails(getDoc(doc(asNobody(), 'sbp-characters', 'char-a')));
    });
  });

  describe('create', () => {
    it('lets a cast member create a character they own', async () => {
      await assertSucceeds(setDoc(doc(asCastB(), 'sbp-characters', 'new-b'), character(CAST_B.uid)));
    });

    it('lets an admin create a character they own', async () => {
      await assertSucceeds(setDoc(doc(asAdmin(), 'sbp-characters', 'new-gm'), character(ADMIN.uid)));
    });

    it('rejects a character whose ownerUid is someone else', async () => {
      await assertFails(setDoc(doc(asCastB(), 'sbp-characters', 'forged'), character(CAST_A.uid)));
    });

    it('rejects a character missing required fields', async () => {
      const { choices: _omit, ...partial } = character(CAST_B.uid);
      await assertFails(setDoc(doc(asCastB(), 'sbp-characters', 'partial'), partial));
    });

    it('rejects a level outside 1–20', async () => {
      await assertFails(setDoc(doc(asCastB(), 'sbp-characters', 'lvl0'), character(CAST_B.uid, { level: 0 })));
      await assertFails(setDoc(doc(asCastB(), 'sbp-characters', 'lvl21'), character(CAST_B.uid, { level: 21 })));
      await assertFails(setDoc(doc(asCastB(), 'sbp-characters', 'lvlx'), character(CAST_B.uid, { level: '5' })));
    });

    it('rejects creation by anonymous, outsider and impostor sessions', async () => {
      await assertFails(setDoc(doc(asAnonymous(), 'sbp-characters', 'x1'), character('anon-uid')));
      await assertFails(setDoc(doc(asOutsider(), 'sbp-characters', 'x2'), character(OUTSIDER.uid)));
      await assertFails(setDoc(doc(asImpostor(), 'sbp-characters', 'x3'), character('impostor-uid')));
    });
  });

  describe('update', () => {
    it('lets the owner update', async () => {
      await assertSucceeds(updateDoc(doc(asCastA(), 'sbp-characters', 'char-a'), { level: 5 }));
    });

    it('lets an admin update anyone\'s', async () => {
      await assertSucceeds(updateDoc(doc(asAdmin(), 'sbp-characters', 'char-a'), { level: 5 }));
    });

    it('stops another cast member from updating', async () => {
      await assertFails(updateDoc(doc(asCastB(), 'sbp-characters', 'char-a'), { level: 5 }));
    });

    it('stops the owner from handing the character to someone else', async () => {
      await assertFails(updateDoc(doc(asCastA(), 'sbp-characters', 'char-a'), { ownerUid: CAST_B.uid }));
    });
  });

  describe('delete', () => {
    it('lets the owner delete their own', async () => {
      await assertSucceeds(deleteDoc(doc(asCastA(), 'sbp-characters', 'char-a')));
    });

    it('lets an admin delete anyone\'s', async () => {
      await assertSucceeds(deleteDoc(doc(asAdmin(), 'sbp-characters', 'char-a')));
    });

    it('stops another cast member from deleting', async () => {
      await assertFails(deleteDoc(doc(asCastB(), 'sbp-characters', 'char-a')));
    });
  });
});

// ─── Step 0 regression (Sept 2026 hardening) ─────────────────────────────────

describe('Step 0 hardening stays in place', () => {
  it('hunter-sheets: anonymous audience sessions cannot read', async () => {
    await assertFails(getDoc(doc(asAnonymous(), 'hunter-sheets', 'sheet-1')));
  });

  it('hunter-sheets: cast can read', async () => {
    await assertSucceeds(getDoc(doc(asCastA(), 'hunter-sheets', 'sheet-1')));
  });

  it('config/cast: only admins can change the allowlist', async () => {
    await assertFails(updateDoc(doc(asNobody(), 'config', 'cast'), { emails: ['evil@example.com'] }));
    await assertFails(updateDoc(doc(asCastA(), 'config', 'cast'), { emails: ['evil@example.com'] }));
    await assertFails(updateDoc(doc(asAnonymous(), 'config', 'cast'), { emails: ['evil@example.com'] }));
    await assertSucceeds(updateDoc(doc(asAdmin(), 'config', 'cast'), { emails: [CAST_A.email] }));
  });

  it('an unverified email cannot claim admin', async () => {
    const impostorAdmin = env
      .authenticatedContext('fake-admin', { email: ADMIN.email, email_verified: false })
      .firestore();
    await assertFails(updateDoc(doc(impostorAdmin, 'config', 'cast'), { emails: [] }));
  });

  it('unknown collections are denied by default', async () => {
    await assertFails(getDoc(doc(asAdmin(), 'sbp-secret-stuff', 'x')));
  });
});

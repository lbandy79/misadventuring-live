/**
 * Firestore security-rules tests for audience personal data: magic-tokens,
 * reservations, audience-profiles, and the email field on npcs.
 *
 * Migration steps 2 and 3 in docs/ARCHITECTURE.md. The audit found audience
 * emails were publicly listable from npcs, magic-tokens and reservations,
 * and that anyone could overwrite any audience profile.
 *
 * Runs against the Firestore emulator: `npm run test:rules`.
 */

import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

const ADMIN = { uid: 'admin-uid', email: 'gm@example.com' };
const OWNER_UID = 'anon-owner-uid';
const TOKEN = '11111111-2222-4333-8444-555555555555';
const EMAIL = 'fan@example.com';

let env: RulesTestEnvironment;

function emulatorHost(): { host: string; port: number } {
  const fromEnv = process.env.FIRESTORE_EMULATOR_HOST;
  if (fromEnv) {
    const [host, port] = fromEnv.split(':');
    return { host, port: Number(port) };
  }
  return { host: '127.0.0.1', port: 8089 };
}

const asAdmin = () =>
  env.authenticatedContext(ADMIN.uid, { email: ADMIN.email, email_verified: true }).firestore();
const asOwner = () =>
  env.authenticatedContext(OWNER_UID, { firebase: { sign_in_provider: 'anonymous' } }).firestore();
const asStranger = () =>
  env.authenticatedContext('anon-stranger', { firebase: { sign_in_provider: 'anonymous' } }).firestore();
const asNobody = () => env.unauthenticatedContext().firestore();

const npcRef = { showId: 'greenoaks-2026-11-28', npcId: 'npc-1', savedAt: '2026-11-07T00:00:00Z' };

/** What upsertAudienceProfile writes from the join page's save-your-character flow. */
const profileFromJoin = (email = EMAIL, extra: Record<string, unknown> = {}) => ({
  email,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  npcs: arrayUnion(npcRef),
  magicToken: TOKEN,
  accessCode: 'ABC234',
  optedInForNotebook: true,
  optedInForAnnouncements: true,
  ...extra,
});

/** What the footer notify-me form writes (no sign-in on most pages). */
const profileFromFooter = (email = EMAIL) => ({
  email,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  optedInForNotebook: true,
  optedInForAnnouncements: true,
});

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-audience-pii-rules',
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
    await setDoc(doc(db, 'magic-tokens', TOKEN), { email: EMAIL, npcs: [npcRef], createdAt: 1 });
    await setDoc(doc(db, 'reservations', 'r1'), {
      name: 'Fan', email: EMAIL, accessCode: 'ABC234', showId: 's', createdAt: 1, npcCreated: false,
    });
    await setDoc(doc(db, 'npcs', 'npc-1'), {
      showId: 'greenoaks-2026-11-28', systemId: 'green-oaks', displayName: 'Dolores',
      fieldValues: {}, deviceToken: 'd', ownerUid: OWNER_UID, createdAt: 1,
      isActive: true, hasBeenTagged: false, isArchived: false, showOnDisplay: false,
    });
    await setDoc(doc(db, 'audience-profiles', EMAIL), {
      email: EMAIL, createdAt: 1, updatedAt: 1, npcs: [npcRef], magicToken: TOKEN,
      accessCode: 'ABC234', optedInForNotebook: true, optedInForAnnouncements: true,
    });
  });
});

afterAll(async () => {
  await env.cleanup();
});

// ─── magic-tokens ─────────────────────────────────────────────────────────────

describe('magic-tokens', () => {
  it('can be opened by anyone holding the token (the /return link)', async () => {
    await assertSucceeds(getDoc(doc(asNobody(), 'magic-tokens', TOKEN)));
  });

  it('cannot be listed by the audience', async () => {
    await assertFails(getDocs(collection(asNobody(), 'magic-tokens')));
    await assertFails(getDocs(collection(asStranger(), 'magic-tokens')));
  });

  it('can be listed by an admin', async () => {
    await assertSucceeds(getDocs(collection(asAdmin(), 'magic-tokens')));
  });

  it('lets a signed-in audience member create a new token', async () => {
    const t = '99999999-2222-4333-8444-555555555555';
    await assertSucceeds(
      setDoc(doc(asOwner(), 'magic-tokens', t), { email: EMAIL, npcs: [npcRef], createdAt: serverTimestamp() }),
    );
  });

  it('rejects a token created while signed out', async () => {
    const t = '99999999-2222-4333-8444-555555555555';
    await assertFails(setDoc(doc(asNobody(), 'magic-tokens', t), { email: EMAIL, npcs: [], createdAt: 1 }));
  });

  it('rejects malformed tokens', async () => {
    const t = '99999999-2222-4333-8444-555555555555';
    await assertFails(setDoc(doc(asOwner(), 'magic-tokens', t), { email: 'nope', npcs: [], createdAt: 1 }));
    await assertFails(
      setDoc(doc(asOwner(), 'magic-tokens', t), { email: EMAIL, npcs: [], createdAt: 1, admin: true }),
    );
    await assertFails(setDoc(doc(asOwner(), 'magic-tokens', 'short'), { email: EMAIL, npcs: [], createdAt: 1 }));
  });

  it('cannot be overwritten or deleted by the audience', async () => {
    await assertFails(
      setDoc(doc(asStranger(), 'magic-tokens', TOKEN), { email: 'evil@example.com', npcs: [], createdAt: 1 }),
    );
    await assertFails(deleteDoc(doc(asStranger(), 'magic-tokens', TOKEN)));
  });
});

// ─── reservations ─────────────────────────────────────────────────────────────

describe('reservations (retired May 2026)', () => {
  it('cannot be read or listed by the audience', async () => {
    await assertFails(getDoc(doc(asNobody(), 'reservations', 'r1')));
    await assertFails(getDocs(collection(asStranger(), 'reservations')));
  });

  it('can be read by an admin', async () => {
    await assertSucceeds(getDocs(collection(asAdmin(), 'reservations')));
  });
});

// ─── npcs email ───────────────────────────────────────────────────────────────

describe('npcs email', () => {
  it('can no longer be written onto an NPC, even by its owner', async () => {
    await assertFails(updateDoc(doc(asOwner(), 'npcs', 'npc-1'), { email: 'fan@example.com' }));
  });
});

// ─── audience-profiles ────────────────────────────────────────────────────────

describe('audience-profiles', () => {
  const NEW_EMAIL = 'new@example.com';

  it('stays unreadable to the audience', async () => {
    await assertFails(getDoc(doc(asStranger(), 'audience-profiles', EMAIL)));
    await assertFails(getDocs(collection(asNobody(), 'audience-profiles')));
  });

  it('accepts a new profile from the join page', async () => {
    await assertSucceeds(
      setDoc(doc(asOwner(), 'audience-profiles', NEW_EMAIL), profileFromJoin(NEW_EMAIL), { merge: true }),
    );
  });

  it('accepts a footer sign-up while signed out', async () => {
    await assertSucceeds(
      setDoc(doc(asNobody(), 'audience-profiles', NEW_EMAIL), profileFromFooter(NEW_EMAIL), { merge: true }),
    );
  });

  it('accepts a repeat save that adds a character', async () => {
    const second = { ...npcRef, npcId: 'npc-2' };
    await assertSucceeds(
      setDoc(
        doc(asOwner(), 'audience-profiles', EMAIL),
        { ...profileFromJoin(EMAIL), npcs: arrayUnion(second) },
        { merge: true },
      ),
    );
  });

  it('rejects a profile filed under a different email', async () => {
    await assertFails(
      setDoc(doc(asOwner(), 'audience-profiles', NEW_EMAIL), profileFromJoin('other@example.com'), { merge: true }),
    );
  });

  it('rejects a malformed email', async () => {
    await assertFails(
      setDoc(doc(asOwner(), 'audience-profiles', 'not-an-email'), profileFromFooter('not-an-email'), { merge: true }),
    );
  });

  it('rejects unexpected fields and wrong types', async () => {
    await assertFails(
      setDoc(doc(asOwner(), 'audience-profiles', NEW_EMAIL), { ...profileFromFooter(NEW_EMAIL), isAdmin: true }),
    );
    await assertFails(
      setDoc(doc(asOwner(), 'audience-profiles', NEW_EMAIL), { ...profileFromFooter(NEW_EMAIL), optedInForNotebook: 'yes' }),
    );
    await assertFails(
      setDoc(doc(asOwner(), 'audience-profiles', NEW_EMAIL), profileFromJoin(NEW_EMAIL, { accessCode: 'TOOLONGCODE' })),
    );
  });

  it('caps the saved-character list at 50', async () => {
    const many = Array.from({ length: 51 }, (_, i) => ({ ...npcRef, npcId: `n${i}` }));
    await assertFails(
      setDoc(doc(asOwner(), 'audience-profiles', NEW_EMAIL), { ...profileFromFooter(NEW_EMAIL), npcs: many }),
    );
  });

  it('does not let a stranger wipe someone else\'s saved characters', async () => {
    await assertFails(
      setDoc(doc(asStranger(), 'audience-profiles', EMAIL), { ...profileFromFooter(EMAIL), npcs: [] }, { merge: true }),
    );
  });

  it('does not let a stranger turn someone else\'s opt-ins off', async () => {
    await assertFails(
      updateDoc(doc(asStranger(), 'audience-profiles', EMAIL), { optedInForAnnouncements: false }),
    );
  });

  it('cannot be deleted by the audience', async () => {
    await assertFails(deleteDoc(doc(asStranger(), 'audience-profiles', EMAIL)));
  });

  it('can be edited and deleted by an admin', async () => {
    await assertSucceeds(updateDoc(doc(asAdmin(), 'audience-profiles', EMAIL), { optedInForAnnouncements: false }));
    await assertSucceeds(deleteDoc(doc(asAdmin(), 'audience-profiles', EMAIL)));
  });
});

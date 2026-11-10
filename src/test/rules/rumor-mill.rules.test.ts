/**
 * Firestore security-rules tests for the Rumor Mill (Green Oaks).
 *
 *   rumors/{showId}__{uid}__{slot}  audience-written, GM-moderated
 *   rumor-draws/{rumorId}           the secret card draw; admin only
 *   rumor-mill/{showId}             open/closed, Trump Suit, board on/off
 *
 * The secret matters: Green Oaks has the Narrator test each Rumor with a
 * hidden card draw, so the audience must never be able to read a draw.
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
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

const ADMIN = { uid: 'admin-uid', email: 'gm@example.com' };
const CAST = { uid: 'cast-uid', email: 'player@example.com' };
const OWNER = 'anon-owner';
const STRANGER = 'anon-stranger';
const SHOW = 'greenoaks-2026-11-28';
const CLOSED_SHOW = 'closed-show';

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
const asCast = () =>
  env.authenticatedContext(CAST.uid, { email: CAST.email, email_verified: true }).firestore();
const anon = (uid: string) =>
  env.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } }).firestore();
const asOwner = () => anon(OWNER);
const asStranger = () => anon(STRANGER);
const asNobody = () => env.unauthenticatedContext().firestore();

const rumorId = (uid: string, slot: number, showId = SHOW) => `${showId}__${uid}__${slot}`;

/** Exactly what rumorApi.submitRumor writes. */
const newRumor = (uid: string, slot: number, extra: Record<string, unknown> = {}) => ({
  showId: SHOW,
  ownerUid: uid,
  slot,
  npcId: 'npc-1',
  npcName: 'Dolores, the very sweaty bingo caller',
  text: 'the new friars only come out at night',
  status: 'pending',
  createdAt: 1,
  ...extra,
});

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-rumor-mill-rules',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), ...emulatorHost() },
  });
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'config', 'admins'), { emails: [ADMIN.email] });
    await setDoc(doc(db, 'config', 'cast'), { emails: [CAST.email] });
    await setDoc(doc(db, 'rumor-mill', SHOW), { open: true, trumpSuit: 'hearts', boardOn: false });
    await setDoc(doc(db, 'rumor-mill', CLOSED_SHOW), { open: false });
    await setDoc(doc(db, 'rumors', rumorId(OWNER, 0)), newRumor(OWNER, 0));
    await setDoc(doc(db, 'rumors', rumorId('someone', 0)), newRumor('someone', 0, { status: 'circulating' }));
    await setDoc(doc(db, 'rumors', rumorId('someone', 1)), newRumor('someone', 1, { status: 'rejected' }));
    await setDoc(doc(db, 'rumor-draws', rumorId('someone', 0)), {
      showId: SHOW, card: { rank: 'Q', suit: 'hearts' }, isTrue: true, overridden: false,
    });
  });
});

afterAll(async () => {
  await env.cleanup();
});

// ─── rumor-mill session ───────────────────────────────────────────────────────

describe('rumor-mill session doc', () => {
  it('is readable by everyone', async () => {
    await assertSucceeds(getDoc(doc(asNobody(), 'rumor-mill', SHOW)));
  });

  it('cannot be written by the audience or cast', async () => {
    await assertFails(setDoc(doc(asStranger(), 'rumor-mill', SHOW), { open: true, boardOn: true }));
    await assertFails(setDoc(doc(asCast(), 'rumor-mill', SHOW), { open: false }));
    await assertFails(setDoc(doc(asNobody(), 'rumor-mill', 'new-show'), { open: true }));
  });

  it('can be written by an admin', async () => {
    await assertSucceeds(setDoc(doc(asAdmin(), 'rumor-mill', SHOW), { open: false }, { merge: true }));
  });
});

// ─── rumors: create ───────────────────────────────────────────────────────────

describe('rumors create', () => {
  it('lets a signed-in audience member start a rumor', async () => {
    await assertSucceeds(setDoc(doc(asOwner(), 'rumors', rumorId(OWNER, 1)), newRumor(OWNER, 1)));
  });

  it('allows three rumors per person and no more', async () => {
    await assertSucceeds(setDoc(doc(asStranger(), 'rumors', rumorId(STRANGER, 0)), newRumor(STRANGER, 0)));
    await assertSucceeds(setDoc(doc(asStranger(), 'rumors', rumorId(STRANGER, 2)), newRumor(STRANGER, 2)));
    await assertFails(setDoc(doc(asStranger(), 'rumors', rumorId(STRANGER, 3)), newRumor(STRANGER, 3)));
    await assertFails(setDoc(doc(asStranger(), 'rumors', rumorId(STRANGER, -1)), newRumor(STRANGER, -1)));
  });

  it('rejects a doc id that does not match show, owner and slot', async () => {
    await assertFails(setDoc(doc(asOwner(), 'rumors', 'anything-goes'), newRumor(OWNER, 1)));
    await assertFails(setDoc(doc(asOwner(), 'rumors', rumorId(STRANGER, 1)), newRumor(OWNER, 1)));
    await assertFails(setDoc(doc(asOwner(), 'rumors', rumorId(OWNER, 1)), newRumor(OWNER, 2)));
  });

  it('rejects a rumor filed under someone else', async () => {
    await assertFails(setDoc(doc(asOwner(), 'rumors', rumorId(STRANGER, 1)), newRumor(STRANGER, 1)));
  });

  it('rejects a rumor while signed out', async () => {
    await assertFails(setDoc(doc(asNobody(), 'rumors', rumorId(OWNER, 1)), newRumor(OWNER, 1)));
  });

  it('rejects a rumor that skips the GM queue', async () => {
    await assertFails(
      setDoc(doc(asOwner(), 'rumors', rumorId(OWNER, 1)), newRumor(OWNER, 1, { status: 'circulating' })),
    );
    await assertFails(
      setDoc(doc(asOwner(), 'rumors', rumorId(OWNER, 1)), newRumor(OWNER, 1, { verdict: 'true' })),
    );
  });

  it('caps the rumor at 140 characters and requires some text', async () => {
    await assertSucceeds(
      setDoc(doc(asOwner(), 'rumors', rumorId(OWNER, 1)), newRumor(OWNER, 1, { text: 'x'.repeat(140) })),
    );
    await assertFails(
      setDoc(doc(asOwner(), 'rumors', rumorId(OWNER, 2)), newRumor(OWNER, 2, { text: 'x'.repeat(141) })),
    );
    await assertFails(setDoc(doc(asOwner(), 'rumors', rumorId(OWNER, 2)), newRumor(OWNER, 2, { text: '' })));
  });

  it('caps the byline and rejects unexpected fields', async () => {
    await assertFails(
      setDoc(doc(asOwner(), 'rumors', rumorId(OWNER, 1)), newRumor(OWNER, 1, { npcName: 'x'.repeat(161) })),
    );
    await assertFails(
      setDoc(doc(asOwner(), 'rumors', rumorId(OWNER, 1)), newRumor(OWNER, 1, { html: '<b>' })),
    );
  });

  it('rejects rumors when the mill is closed or was never opened', async () => {
    const closed = { ...newRumor(OWNER, 0), showId: CLOSED_SHOW };
    await assertFails(setDoc(doc(asOwner(), 'rumors', rumorId(OWNER, 0, CLOSED_SHOW)), closed));
    const never = { ...newRumor(OWNER, 0), showId: 'no-such-show' };
    await assertFails(setDoc(doc(asOwner(), 'rumors', rumorId(OWNER, 0, 'no-such-show')), never));
  });

  it('cannot overwrite a rumor already sent (no editing after the fact)', async () => {
    await assertFails(
      setDoc(doc(asOwner(), 'rumors', rumorId(OWNER, 0)), newRumor(OWNER, 0, { text: 'swapped' })),
    );
  });
});

// ─── rumors: read ─────────────────────────────────────────────────────────────

describe('rumors read', () => {
  it('lets anyone list rumors in circulation (the big screen)', async () => {
    await assertSucceeds(
      getDocs(query(collection(asNobody(), 'rumors'), where('showId', '==', SHOW), where('status', '==', 'circulating'))),
    );
  });

  it('hides pending and rejected rumors from other people', async () => {
    await assertFails(getDoc(doc(asStranger(), 'rumors', rumorId(OWNER, 0))));
    await assertFails(getDoc(doc(asStranger(), 'rumors', rumorId('someone', 1))));
    await assertFails(getDocs(query(collection(asStranger(), 'rumors'), where('showId', '==', SHOW))));
  });

  it('lets the owner see their own rumors whatever the status', async () => {
    await assertSucceeds(getDoc(doc(asOwner(), 'rumors', rumorId(OWNER, 0))));
    await assertSucceeds(
      getDocs(query(collection(asOwner(), 'rumors'), where('showId', '==', SHOW), where('ownerUid', '==', OWNER))),
    );
  });

  it('lets an admin list everything', async () => {
    await assertSucceeds(getDocs(query(collection(asAdmin(), 'rumors'), where('showId', '==', SHOW))));
  });
});

// ─── rumors: update / delete ──────────────────────────────────────────────────

describe('rumors moderation', () => {
  it('does not let the audience approve, reveal, edit or delete', async () => {
    await assertFails(updateDoc(doc(asOwner(), 'rumors', rumorId(OWNER, 0)), { status: 'circulating' }));
    await assertFails(updateDoc(doc(asOwner(), 'rumors', rumorId(OWNER, 0)), { text: 'edited' }));
    await assertFails(updateDoc(doc(asStranger(), 'rumors', rumorId('someone', 0)), { verdict: 'true' }));
    await assertFails(deleteDoc(doc(asOwner(), 'rumors', rumorId(OWNER, 0))));
  });

  it('does not treat cast as admin', async () => {
    await assertFails(updateDoc(doc(asCast(), 'rumors', rumorId(OWNER, 0)), { status: 'circulating' }));
  });

  it('lets an admin approve, reveal and delete', async () => {
    await assertSucceeds(updateDoc(doc(asAdmin(), 'rumors', rumorId(OWNER, 0)), { status: 'circulating' }));
    await assertSucceeds(updateDoc(doc(asAdmin(), 'rumors', rumorId(OWNER, 0)), { verdict: 'false' }));
    await assertSucceeds(deleteDoc(doc(asAdmin(), 'rumors', rumorId(OWNER, 0))));
  });
});

// ─── rumor-draws (the secret) ─────────────────────────────────────────────────

describe('rumor-draws', () => {
  it('cannot be read by anyone but an admin', async () => {
    const id = rumorId('someone', 0);
    await assertFails(getDoc(doc(asNobody(), 'rumor-draws', id)));
    await assertFails(getDoc(doc(asStranger(), 'rumor-draws', id)));
    await assertFails(getDoc(doc(anon('someone'), 'rumor-draws', id)));
    await assertFails(getDoc(doc(asCast(), 'rumor-draws', id)));
    await assertFails(getDocs(query(collection(asStranger(), 'rumor-draws'), where('showId', '==', SHOW))));
  });

  it('cannot be written by the audience', async () => {
    await assertFails(
      setDoc(doc(asOwner(), 'rumor-draws', rumorId(OWNER, 0)), { showId: SHOW, isTrue: true }),
    );
  });

  it('can be read and written by an admin', async () => {
    await assertSucceeds(getDocs(query(collection(asAdmin(), 'rumor-draws'), where('showId', '==', SHOW))));
    await assertSucceeds(
      setDoc(doc(asAdmin(), 'rumor-draws', rumorId(OWNER, 0)), {
        showId: SHOW, card: { rank: '7', suit: 'clubs' }, isTrue: false, overridden: false,
      }),
    );
  });
});

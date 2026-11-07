/**
 * Firestore security-rules tests for the live-show collections the audience
 * touches: npcs, beats, config/*, mad-lib-locks, mad-lib-active.
 *
 * Migration step 1 in docs/ARCHITECTURE.md (Green Oaks rules hotfix). The
 * audit found that `npcs` ownership was checked against a public device
 * token, so any phone could edit any NPC and flip `showOnDisplay` to put
 * unmoderated text on the projector. Ownership is now the anonymous auth uid
 * stamped at create time (`ownerUid`).
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
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const ADMIN = { uid: 'admin-uid', email: 'gm@example.com' };
const CAST = { uid: 'cast-uid', email: 'player@example.com' };
const OWNER_UID = 'anon-owner-uid';
const STRANGER_UID = 'anon-stranger-uid';
const DEVICE_TOKEN = 'device-token-1';

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
const asCast = () =>
  env.authenticatedContext(CAST.uid, { email: CAST.email, email_verified: true }).firestore();
/** The audience member who built the NPC (anonymous session on the join page). */
const asOwner = () =>
  env.authenticatedContext(OWNER_UID, { firebase: { sign_in_provider: 'anonymous' } }).firestore();
/** Another anonymous phone in the room. */
const asStranger = () =>
  env.authenticatedContext(STRANGER_UID, { firebase: { sign_in_provider: 'anonymous' } }).firestore();
const asNobody = () => env.unauthenticatedContext().firestore();

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** Exactly what npcApi.createNpc writes. */
const newNpc = (extra: Record<string, unknown> = {}) => ({
  showId: 'greenoaks-2026-11-28',
  systemId: 'green-oaks',
  displayName: 'Dolores',
  fieldValues: { adjective: 'Nosy', occupation: 'Retired Dentist', reputation: 'bites' },
  deviceToken: DEVICE_TOKEN,
  ownerUid: OWNER_UID,
  createdAt: 1,
  isActive: true,
  hasBeenTagged: false,
  isArchived: false,
  showOnDisplay: false,
  ...extra,
});

const pendingBeat = {
  showId: 'greenoaks-2026-11-28',
  npcId: 'npc-1',
  npcDisplayName: 'Dolores',
  promptText: 'What did Dolores find?',
  responseTemplate: '{thing}',
  responseSlots: [],
  status: 'pending',
  triggeredAt: 1,
  respondedAt: null,
  moderatedAt: null,
  moderatedBy: null,
};

const response = (assembledText = 'A haunted denture.', slotCount = 1) => ({
  response: {
    slotValues: Object.fromEntries(
      Array.from({ length: slotCount }, (_, i) => [`slot${i}`, 'x']),
    ),
    assembledText,
  },
  status: 'responded',
  respondedAt: 2,
});

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-live-show-rules',
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
    await setDoc(doc(db, 'config', 'cast'), { emails: [CAST.email] });
    await setDoc(doc(db, 'config', 'platform'), { currentShowId: 'greenoaks-2026-11-28' });
    await setDoc(doc(db, 'config', 'active-interaction'), { type: 'none' });
    await setDoc(doc(db, 'config', 'live-cues'), { type: 'none' });
    await setDoc(doc(db, 'config', 'theme'), { themeId: 'tmp-base' });
    await setDoc(doc(db, 'npcs', 'npc-1'), newNpc());
    await setDoc(doc(db, 'npcs', 'npc-onscreen'), newNpc({ showOnDisplay: true }));
    // Submitted before the hotfix: no ownerUid.
    const legacy: Record<string, unknown> = newNpc();
    delete legacy.ownerUid;
    await setDoc(doc(db, 'npcs', 'npc-legacy'), legacy);
    await setDoc(doc(db, 'beats', 'beat-1'), pendingBeat);
    await setDoc(doc(db, 'beats', 'beat-responded'), { ...pendingBeat, ...response() });
    await setDoc(doc(db, 'mad-lib-locks', 'show__ml1'), { locked: false });
    await setDoc(doc(db, 'mad-lib-active', 'show'), { madLibId: 'ml1' });
  });
});

afterAll(async () => {
  await env.cleanup();
});

// ─── npcs: create ─────────────────────────────────────────────────────────────

describe('npcs create', () => {
  it('lets an anonymous audience member create an NPC they own', async () => {
    await assertSucceeds(setDoc(doc(asOwner(), 'npcs', 'new'), newNpc()));
  });

  it('rejects an NPC owned by someone else', async () => {
    await assertFails(setDoc(doc(asStranger(), 'npcs', 'new'), newNpc()));
  });

  it('rejects an NPC with no ownerUid', async () => {
    const npc: Record<string, unknown> = newNpc();
    delete npc.ownerUid;
    await assertFails(setDoc(doc(asOwner(), 'npcs', 'new'), npc));
  });

  it('rejects creation while signed out', async () => {
    await assertFails(setDoc(doc(asNobody(), 'npcs', 'new'), newNpc()));
  });

  it('rejects an NPC that puts itself on the projector', async () => {
    await assertFails(setDoc(doc(asOwner(), 'npcs', 'new'), newNpc({ showOnDisplay: true })));
  });

  it('rejects an NPC created archived or already tagged', async () => {
    await assertFails(setDoc(doc(asOwner(), 'npcs', 'a'), newNpc({ isArchived: true })));
    await assertFails(setDoc(doc(asOwner(), 'npcs', 'b'), newNpc({ hasBeenTagged: true })));
  });

  it('rejects fields outside the expected set', async () => {
    await assertFails(setDoc(doc(asOwner(), 'npcs', 'new'), newNpc({ email: 'a@b.co' })));
    await assertFails(setDoc(doc(asOwner(), 'npcs', 'new'), newNpc({ avatarUrl: 'x' })));
  });

  it('accepts optional fieldWriteIns', async () => {
    await assertSucceeds(
      setDoc(doc(asOwner(), 'npcs', 'new'), newNpc({ fieldWriteIns: { reputation: true } })),
    );
  });

  it('caps displayName at 120 characters', async () => {
    await assertSucceeds(setDoc(doc(asOwner(), 'npcs', 'a'), newNpc({ displayName: 'x'.repeat(120) })));
    await assertFails(setDoc(doc(asOwner(), 'npcs', 'b'), newNpc({ displayName: 'x'.repeat(121) })));
  });

  it('caps fieldValues at 20 fields', async () => {
    const many = Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`f${i}`, 'x']));
    await assertFails(setDoc(doc(asOwner(), 'npcs', 'new'), newNpc({ fieldValues: many })));
  });
});

// ─── npcs: update ─────────────────────────────────────────────────────────────

describe('npcs update', () => {
  it('lets the owner edit name and field values', async () => {
    await assertSucceeds(
      updateDoc(doc(asOwner(), 'npcs', 'npc-1'), {
        displayName: 'Gus',
        fieldValues: { adjective: 'Loud' },
        fieldWriteIns: { adjective: true },
      }),
    );
  });

  it('rejects an owner name over 120 characters', async () => {
    await assertFails(updateDoc(doc(asOwner(), 'npcs', 'npc-1'), { displayName: 'x'.repeat(121) }));
  });

  it('does not let the owner put their NPC on the projector', async () => {
    await assertFails(updateDoc(doc(asOwner(), 'npcs', 'npc-1'), { showOnDisplay: true }));
  });

  it('does not let the owner change moderation or lifecycle flags', async () => {
    await assertFails(updateDoc(doc(asOwner(), 'npcs', 'npc-1'), { isActive: false }));
    await assertFails(updateDoc(doc(asOwner(), 'npcs', 'npc-1'), { hasBeenTagged: true }));
    await assertFails(updateDoc(doc(asOwner(), 'npcs', 'npc-1'), { isArchived: true }));
    await assertFails(updateDoc(doc(asOwner(), 'npcs', 'npc-1'), { ownerUid: STRANGER_UID }));
  });

  it('does not let the owner edit while the NPC is on the projector', async () => {
    await assertFails(updateDoc(doc(asOwner(), 'npcs', 'npc-onscreen'), { displayName: 'Swapped' }));
  });

  it('denies a stranger who knows the public device token', async () => {
    // The token is readable by anyone (npcs is public-read).
    const snap = await getDoc(doc(asStranger(), 'npcs', 'npc-1'));
    const token = snap.data()?.deviceToken;
    await assertFails(
      updateDoc(doc(asStranger(), 'npcs', 'npc-1'), { displayName: 'Hijacked', deviceToken: token }),
    );
    await assertFails(
      updateDoc(doc(asStranger(), 'npcs', 'npc-1'), { showOnDisplay: true, deviceToken: token }),
    );
  });

  it('denies a stranger overwriting the email', async () => {
    await assertFails(updateDoc(doc(asStranger(), 'npcs', 'npc-1'), { email: 'evil@example.com' }));
  });

  it('locks audience edits on NPCs submitted before the hotfix', async () => {
    await assertFails(updateDoc(doc(asOwner(), 'npcs', 'npc-legacy'), { displayName: 'Gus' }));
    await assertFails(updateDoc(doc(asStranger(), 'npcs', 'npc-legacy'), { displayName: 'Gus' }));
  });

  it('lets an admin display, hide, archive and tag any NPC, legacy included', async () => {
    await assertSucceeds(updateDoc(doc(asAdmin(), 'npcs', 'npc-1'), { showOnDisplay: true }));
    await assertSucceeds(updateDoc(doc(asAdmin(), 'npcs', 'npc-onscreen'), { showOnDisplay: false }));
    await assertSucceeds(
      updateDoc(doc(asAdmin(), 'npcs', 'npc-legacy'), { isArchived: true, isActive: false }),
    );
    await assertSucceeds(updateDoc(doc(asAdmin(), 'npcs', 'npc-legacy'), { showOnDisplay: true }));
  });

  it('does not treat cast as admin', async () => {
    await assertFails(updateDoc(doc(asCast(), 'npcs', 'npc-1'), { showOnDisplay: true }));
  });
});

// ─── beats ────────────────────────────────────────────────────────────────────

describe('beats responses', () => {
  it('lets an audience member answer a pending beat', async () => {
    await assertSucceeds(updateDoc(doc(asOwner(), 'beats', 'beat-1'), response()));
  });

  it('caps the assembled text at 500 characters', async () => {
    await assertSucceeds(updateDoc(doc(asOwner(), 'beats', 'beat-1'), response('x'.repeat(500))));
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'beats', 'beat-1'), pendingBeat));
    await assertFails(updateDoc(doc(asOwner(), 'beats', 'beat-1'), response('x'.repeat(501))));
  });

  it('caps the response at 10 slots', async () => {
    await assertFails(updateDoc(doc(asOwner(), 'beats', 'beat-1'), response('ok', 11)));
  });

  it('rejects a response with extra keys inside it', async () => {
    await assertFails(
      updateDoc(doc(asOwner(), 'beats', 'beat-1'), {
        ...response(),
        response: { slotValues: {}, assembledText: 'ok', html: '<b>' },
      }),
    );
  });

  it('does not let the audience touch other beat fields while answering', async () => {
    await assertFails(
      updateDoc(doc(asOwner(), 'beats', 'beat-1'), { ...response(), npcDisplayName: 'Someone else' }),
    );
    await assertFails(
      updateDoc(doc(asOwner(), 'beats', 'beat-1'), { ...response(), moderatedBy: OWNER_UID }),
    );
  });

  it('does not let the audience approve a response', async () => {
    await assertFails(updateDoc(doc(asOwner(), 'beats', 'beat-responded'), { status: 'approved' }));
    await assertFails(updateDoc(doc(asOwner(), 'beats', 'beat-1'), { ...response(), status: 'approved' }));
  });

  it('rejects a response while signed out', async () => {
    await assertFails(updateDoc(doc(asNobody(), 'beats', 'beat-1'), response()));
  });

  it('lets an admin moderate', async () => {
    await assertSucceeds(
      updateDoc(doc(asAdmin(), 'beats', 'beat-responded'), {
        status: 'approved', moderatedAt: 3, moderatedBy: ADMIN.uid,
      }),
    );
  });
});

// ─── config/* ─────────────────────────────────────────────────────────────────

describe('config docs', () => {
  const LEGACY_CONTROL_DOCS = ['active-interaction', 'live-cues', 'theme'];

  it('are readable by everyone, signed in or not', async () => {
    for (const id of [...LEGACY_CONTROL_DOCS, 'platform', 'admins', 'cast']) {
      await assertSucceeds(getDoc(doc(asNobody(), 'config', id)));
    }
  });

  it('legacy control docs cannot be written by the audience', async () => {
    for (const id of LEGACY_CONTROL_DOCS) {
      await assertFails(setDoc(doc(asStranger(), 'config', id), { type: 'pwned' }));
      await assertFails(setDoc(doc(asNobody(), 'config', id), { type: 'pwned' }));
      await assertFails(setDoc(doc(asCast(), 'config', id), { type: 'pwned' }));
    }
  });

  it('legacy control docs can be written by an admin', async () => {
    for (const id of LEGACY_CONTROL_DOCS) {
      await assertSucceeds(setDoc(doc(asAdmin(), 'config', id), { type: 'none' }));
    }
  });

  it('unknown config docs cannot be created by the audience', async () => {
    await assertFails(setDoc(doc(asStranger(), 'config', 'anything-new'), { x: 1 }));
    await assertSucceeds(setDoc(doc(asAdmin(), 'config', 'anything-new'), { x: 1 }));
  });

  it('platform, admins and cast stay admin-write (regression)', async () => {
    for (const id of ['platform', 'admins', 'cast']) {
      await assertFails(setDoc(doc(asStranger(), 'config', id), { emails: ['x@example.com'] }));
      await assertFails(setDoc(doc(asCast(), 'config', id), { emails: ['x@example.com'] }));
    }
    await assertSucceeds(updateDoc(doc(asAdmin(), 'config', 'platform'), { currentShowId: 'idle' }));
  });
});

// ─── mad-lib control docs ─────────────────────────────────────────────────────

describe('mad-lib-locks and mad-lib-active', () => {
  for (const [coll, id] of [['mad-lib-locks', 'show__ml1'], ['mad-lib-active', 'show']] as const) {
    it(`${coll} is publicly readable`, async () => {
      await assertSucceeds(getDoc(doc(asNobody(), coll, id)));
    });

    it(`${coll} cannot be written by the audience`, async () => {
      await assertFails(setDoc(doc(asStranger(), coll, id), { locked: true }));
      await assertFails(setDoc(doc(asNobody(), coll, id), { locked: true }));
      await assertFails(setDoc(doc(asCast(), coll, id), { locked: true }));
    });

    it(`${coll} can be written by an admin`, async () => {
      await assertSucceeds(setDoc(doc(asAdmin(), coll, id), { locked: true }));
    });
  }
});

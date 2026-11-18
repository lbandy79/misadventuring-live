/**
 * Rumor Mill API (Green Oaks).
 *
 * Collections (rules + tests: firestore.rules, src/test/rules/rumor-mill.rules.test.ts):
 *   rumor-mill/{showId}              { open, trumpSuit, boardOn }  public read, admin write
 *   rumors/{showId}__{uid}__{slot}   audience-written, create-only, GM-moderated
 *   rumor-draws/{rumorId}            the secret card draw, admin only
 *
 * Flow: a townie's player sends a rumor (pending) → the GM approves it into
 * circulation and the app secretly draws its card in the same write → the
 * projector shows rumors in circulation with no verdict → when the story
 * proves one, the GM reveals it and `verdict` is stamped on the rumor.
 *
 * `showId` here is always the Firestore episode id (showConfig.showId), the
 * same value as config/platform.currentShowId.
 */

import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Timestamp,
} from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { drawCard, isTrump, type Card, type Suit } from './cards';

export const RUMOR_MILL_COLLECTION = 'rumor-mill';
export const RUMORS_COLLECTION = 'rumors';
export const RUMOR_DRAWS_COLLECTION = 'rumor-draws';

/** Slots 0..2: the doc id caps each person at this many rumors per show. */
export const MAX_RUMORS_PER_PERSON = 3;
export const RUMOR_MAX_LENGTH = 140;

export type RumorStatus = 'pending' | 'circulating' | 'rejected';
export type RumorVerdict = 'true' | 'false';

export interface RumorMillSession {
  /** Phones can send rumors only while this is true. */
  open: boolean;
  /** The session's Trump Suit, as drawn on stage. Needed before approving. */
  trumpSuit: Suit | null;
  /** When true, the projector shows the Rumor Mill board. */
  boardOn: boolean;
}

export const DEFAULT_SESSION: RumorMillSession = { open: false, trumpSuit: null, boardOn: false };

export interface Rumor {
  id: string;
  showId: string;
  ownerUid: string;
  /** 0..2 for audience rumors; absent on rumors the GM added. */
  slot?: number;
  /** 'gm' when the GM added it from /admin. */
  source?: 'gm';
  /** Townie it came from; '' when the GM signed it with a free-text name. */
  npcId: string;
  /** Byline, e.g. "Dolores, the very sweaty bingo caller". */
  npcName: string;
  text: string;
  status: RumorStatus;
  /** Set only when the GM reveals the rumor on stage. */
  verdict?: RumorVerdict | null;
  createdAt: Timestamp | null;
  approvedAt?: Timestamp | null;
  revealedAt?: Timestamp | null;
}

/** GM-only: the secret draw for one rumor. */
export interface RumorDraw {
  id: string;
  showId: string;
  card: Card;
  isTrue: boolean;
  /** True when the GM set the result by hand (the "all false, pick one" rule). */
  overridden: boolean;
}

export function buildRumorId(showId: string, uid: string, slot: number): string {
  return `${showId}__${uid}__${slot}`;
}

function byCreatedAt(a: Rumor, b: Rumor): number {
  return (a.createdAt?.toMillis?.() ?? Infinity) - (b.createdAt?.toMillis?.() ?? Infinity);
}

// ─── Session ──────────────────────────────────────────────────────────────────

export function subscribeToRumorMill(
  showId: string,
  onChange: (session: RumorMillSession) => void,
  onError?: (err: Error) => void,
): () => void {
  return onSnapshot(
    doc(db, RUMOR_MILL_COLLECTION, showId),
    (snap) => onChange({ ...DEFAULT_SESSION, ...(snap.data() as Partial<RumorMillSession> | undefined) }),
    onError,
  );
}

/** GM: open/close the mill, set the Trump Suit, or toggle the projector board. */
export async function setRumorMill(showId: string, patch: Partial<RumorMillSession>): Promise<void> {
  await setDoc(
    doc(db, RUMOR_MILL_COLLECTION, showId),
    { ...patch, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

// ─── Audience ─────────────────────────────────────────────────────────────────

/** Send one rumor into the GM's queue. Throws if not signed in. */
export async function submitRumor(input: {
  showId: string;
  slot: number;
  npcId: string;
  npcName: string;
  text: string;
}): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('submitRumor: not signed in');
  await setDoc(doc(db, RUMORS_COLLECTION, buildRumorId(input.showId, uid, input.slot)), {
    showId: input.showId,
    ownerUid: uid,
    slot: input.slot,
    npcId: input.npcId,
    npcName: input.npcName.trim().slice(0, 160),
    text: input.text.trim().slice(0, RUMOR_MAX_LENGTH),
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}

function subscribeToRumorQuery(
  q: ReturnType<typeof query>,
  onChange: (rumors: Rumor[]) => void,
  onError?: (err: Error) => void,
): () => void {
  return onSnapshot(
    q,
    (snap) =>
      onChange(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Rumor, 'id'>) })).sort(byCreatedAt),
      ),
    onError,
  );
}

/** One person's own rumors for a show, whatever their status. */
export function subscribeToMyRumors(
  showId: string,
  uid: string,
  onChange: (rumors: Rumor[]) => void,
  onError?: (err: Error) => void,
): () => void {
  return subscribeToRumorQuery(
    query(collection(db, RUMORS_COLLECTION), where('showId', '==', showId), where('ownerUid', '==', uid)),
    onChange,
    onError,
  );
}

/** Rumors in circulation: what the projector and everyone's phone may see. */
export function subscribeToCirculatingRumors(
  showId: string,
  onChange: (rumors: Rumor[]) => void,
  onError?: (err: Error) => void,
): () => void {
  return subscribeToRumorQuery(
    query(
      collection(db, RUMORS_COLLECTION),
      where('showId', '==', showId),
      where('status', '==', 'circulating'),
    ),
    onChange,
    onError,
  );
}

// ─── GM ───────────────────────────────────────────────────────────────────────

/** GM: every rumor for a show, including pending and rejected. */
export function subscribeToAllRumors(
  showId: string,
  onChange: (rumors: Rumor[]) => void,
  onError?: (err: Error) => void,
): () => void {
  return subscribeToRumorQuery(
    query(collection(db, RUMORS_COLLECTION), where('showId', '==', showId)),
    onChange,
    onError,
  );
}

/** GM: the secret draws for a show, keyed by rumor id. */
export function subscribeToRumorDraws(
  showId: string,
  onChange: (draws: Record<string, RumorDraw>) => void,
  onError?: (err: Error) => void,
): () => void {
  return onSnapshot(
    query(collection(db, RUMOR_DRAWS_COLLECTION), where('showId', '==', showId)),
    (snap) => {
      const out: Record<string, RumorDraw> = {};
      snap.docs.forEach((d) => {
        out[d.id] = { id: d.id, ...(d.data() as Omit<RumorDraw, 'id'>) };
      });
      onChange(out);
    },
    onError,
  );
}

/**
 * GM: approve a rumor into circulation and secretly test it in one write.
 * Returns the draw so the panel can show the GM the card straight away.
 */
export async function approveRumor(rumor: Rumor, trumpSuit: Suit): Promise<RumorDraw> {
  const card = drawCard();
  const draw: Omit<RumorDraw, 'id'> = {
    showId: rumor.showId,
    card,
    isTrue: isTrump(card, trumpSuit),
    overridden: false,
  };
  const batch = writeBatch(db);
  batch.set(doc(db, RUMOR_DRAWS_COLLECTION, rumor.id), { ...draw, trumpSuit, drawnAt: serverTimestamp() });
  batch.update(doc(db, RUMORS_COLLECTION, rumor.id), {
    status: 'circulating',
    approvedAt: serverTimestamp(),
  });
  await batch.commit();
  return { id: rumor.id, ...draw };
}

export async function rejectRumor(rumorId: string): Promise<void> {
  await updateDoc(doc(db, RUMORS_COLLECTION, rumorId), { status: 'rejected' });
}

/** GM: pull a rumor back out of circulation (off the board), keeping its draw. */
export async function withdrawRumor(rumorId: string): Promise<void> {
  await updateDoc(doc(db, RUMORS_COLLECTION, rumorId), { status: 'rejected', verdict: null });
}

/**
 * GM: add a rumor of your own. The rulebook's Narrator may add rumors
 * "whispered by some other Green Oaks resident". Goes into the queue like
 * any other; not bound by the per-person limit or the mill being open.
 */
export async function addGmRumor(input: {
  showId: string;
  /** A townie's id, or '' when signed with a free-text name. */
  npcId: string;
  npcName: string;
  text: string;
}): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('addGmRumor: not signed in');
  await addDoc(collection(db, RUMORS_COLLECTION), {
    showId: input.showId,
    ownerUid: uid,
    source: 'gm',
    npcId: input.npcId,
    npcName: input.npcName.trim().slice(0, 160),
    text: input.text.trim().slice(0, RUMOR_MAX_LENGTH),
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}

/** GM: delete rumors for good, with their secret draws. */
export async function deleteRumors(rumorIds: string[]): Promise<void> {
  // A batch holds 500 writes; two per rumor.
  for (let i = 0; i < rumorIds.length; i += 200) {
    const batch = writeBatch(db);
    for (const id of rumorIds.slice(i, i + 200)) {
      batch.delete(doc(db, RUMORS_COLLECTION, id));
      batch.delete(doc(db, RUMOR_DRAWS_COLLECTION, id));
    }
    await batch.commit();
  }
}

/** GM: every rumor started by one townie (any status). */
export async function listRumorsForNpc(showId: string, npcId: string): Promise<Rumor[]> {
  const snap = await getDocs(
    query(collection(db, RUMORS_COLLECTION), where('showId', '==', showId), where('npcId', '==', npcId)),
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Rumor, 'id'>) }));
}

/** GM: take every rumor a townie started out of play (kept, not deleted). */
export async function withdrawRumorsForNpc(showId: string, npcId: string): Promise<number> {
  const live = (await listRumorsForNpc(showId, npcId)).filter((r) => r.status !== 'rejected');
  if (live.length === 0) return 0;
  const batch = writeBatch(db);
  for (const r of live) batch.update(doc(db, RUMORS_COLLECTION, r.id), { status: 'rejected', verdict: null });
  await batch.commit();
  return live.length;
}

/** GM: set the secret result by hand (the "all false, pick one" rule). */
export async function overrideRumorDraw(rumorId: string, isTrue: boolean): Promise<void> {
  await updateDoc(doc(db, RUMOR_DRAWS_COLLECTION, rumorId), { isTrue, overridden: true });
}

/** GM: stamp the verdict on the projector and the author's phone, or clear it. */
export async function revealRumor(rumorId: string, verdict: RumorVerdict | null): Promise<void> {
  await updateDoc(doc(db, RUMORS_COLLECTION, rumorId), {
    verdict,
    revealedAt: verdict ? serverTimestamp() : null,
  });
}

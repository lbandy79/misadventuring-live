/**
 * Mad Libs voting API — the engine behind the reusable Mad Libs template.
 *
 * ─── Reusability ───────────────────────────────────────────────────────
 * This module is the public contract for the Mad Libs feature template.
 * Any system (Honey Heist, Kids on Bikes, etc.) that conforms by adding
 * a `showConfig.madLibs[]` array to its `*.system.json` automatically
 * gets the full UX — gateway, audience phone, GM admin panel, projector.
 *
 * Three Firestore collections, all keyed by `showId` so multiple shows
 * can run in parallel:
 *   - `mad-lib-votes`  — one doc per (show, madLib, field, voter); upsert
 *                        on re-vote via deterministic doc id.
 *   - `mad-lib-locks`  — one doc per (show, madLib); GM "close voting".
 *   - `mad-lib-active` — one doc per show; GM "now showing" pointer.
 *
 * ─── Identity ──────────────────────────────────────────────────────────
 *   - reservation: voterId = `res:{reservationId}`
 *   - anonymous:   voterId = `anon:{uuid}` (localStorage)
 *
 * ─── Bandwagon avoidance ───────────────────────────────────────────────
 * Tallies are intentionally NOT exposed to audience phones during open
 * voting. Consumers should subscribe to all votes for a (showId, madLibId)
 * after lock, then `tallyVotes()` client-side.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';

export const MAD_LIB_VOTES_COLLECTION = 'mad-lib-votes';
export const MAD_LIB_LOCKS_COLLECTION = 'mad-lib-locks';
export const MAD_LIB_ACTIVE_COLLECTION = 'mad-lib-active';
const VOTER_ID_STORAGE_KEY = 'mtp_madlibs_voter_id';
const VOTER_RESERVATION_STORAGE_KEY = 'mtp_madlibs_reservation';

export interface MadLibVote {
  /** Deterministic id; see file header. */
  id: string;
  showId: string;
  madLibId: string;
  fieldId: string;
  optionIndex: number;
  /** `res:{reservationId}` or `anon:{uuid}` */
  voterId: string;
  reservationId?: string | null;
  timestamp: Timestamp | null;
}

export interface FieldTally {
  fieldId: string;
  totalVotes: number;
  /** Vote counts per option index. Length matches the field's options array. */
  counts: number[];
  /** Index of the option with the most votes (lowest index wins ties). */
  winnerIndex: number;
  /** True when there is at least one vote in this field. */
  hasVotes: boolean;
}

/** Build the deterministic doc id used for upsert. */
export function buildVoteDocId(
  showId: string,
  madLibId: string,
  fieldId: string,
  voterId: string,
): string {
  return `${showId}__${madLibId}__${fieldId}__${voterId}`;
}

/**
 * Get or create a stable per-browser voter id. Stored in localStorage so a
 * single device counts as a single voter even across reloads.
 */
export function getOrCreateAnonVoterId(): string {
  if (typeof window === 'undefined') {
    // SSR safety; not actually used in this app.
    return `anon:ssr-${Math.random().toString(36).slice(2)}`;
  }
  try {
    const existing = window.localStorage.getItem(VOTER_ID_STORAGE_KEY);
    if (existing) return existing;
    const uuid =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const id = `anon:${uuid}`;
    window.localStorage.setItem(VOTER_ID_STORAGE_KEY, id);
    return id;
  } catch {
    return `anon:${Math.random().toString(36).slice(2)}`;
  }
}

/** Build a reservation-scoped voter id. */
export function buildReservationVoterId(reservationId: string): string {
  return `res:${reservationId}`;
}

/**
 * Persisted voter identity. Set by the gateway page; consumed by the
 * vote page. Lives in localStorage so it survives reloads on the same
 * device, and is intentionally NOT scoped per-show (a single device
 * has one voter identity at a time across the platform).
 */
export interface VoterIdentity {
  /** `res:{reservationId}` or `anon:{uuid}` */
  voterId: string;
  kind: 'reservation' | 'anon';
  /** Set when kind === 'reservation'. */
  reservation?: {
    id: string;
    showId: string;
    name: string;
    accessCode: string;
  };
}

/** Read the persisted voter identity, if any. */
export function loadVoterIdentity(): VoterIdentity | null {
  if (typeof window === 'undefined') return null;
  try {
    const voterId = window.localStorage.getItem(VOTER_ID_STORAGE_KEY);
    if (!voterId) return null;
    if (voterId.startsWith('res:')) {
      const raw = window.localStorage.getItem(VOTER_RESERVATION_STORAGE_KEY);
      const reservation = raw ? JSON.parse(raw) : null;
      if (
        reservation &&
        typeof reservation.id === 'string' &&
        typeof reservation.showId === 'string' &&
        typeof reservation.name === 'string' &&
        typeof reservation.accessCode === 'string'
      ) {
        return { voterId, kind: 'reservation', reservation };
      }
      // Fallthrough: corrupted reservation blob, treat as raw id.
      return { voterId, kind: 'reservation' };
    }
    if (voterId.startsWith('anon:')) {
      return { voterId, kind: 'anon' };
    }
    return null;
  } catch {
    return null;
  }
}

/** Persist a reservation-backed voter identity. */
export function saveReservationIdentity(reservation: {
  id: string;
  showId: string;
  name: string;
  accessCode: string;
}): VoterIdentity {
  const voterId = buildReservationVoterId(reservation.id);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(VOTER_ID_STORAGE_KEY, voterId);
      window.localStorage.setItem(
        VOTER_RESERVATION_STORAGE_KEY,
        JSON.stringify(reservation),
      );
    } catch {
      /* ignore storage failures */
    }
  }
  return { voterId, kind: 'reservation', reservation };
}

/** Persist an anonymous voter identity. Reuses an existing anon id if present. */
export function saveAnonIdentity(): VoterIdentity {
  const voterId = getOrCreateAnonVoterId();
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(VOTER_ID_STORAGE_KEY, voterId);
      window.localStorage.removeItem(VOTER_RESERVATION_STORAGE_KEY);
    } catch {
      /* ignore storage failures */
    }
  }
  return { voterId, kind: 'anon' };
}

/** Clear the persisted voter identity (used by the gateway's switch flow). */
export function clearVoterIdentity(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(VOTER_ID_STORAGE_KEY);
    window.localStorage.removeItem(VOTER_RESERVATION_STORAGE_KEY);
  } catch {
    /* ignore storage failures */
  }
}

/**
 * Upsert a single vote. Re-voting the same field with a new optionIndex
 * overwrites the previous vote (one vote per voter per field).
 */
export async function castVote(input: {
  showId: string;
  madLibId: string;
  fieldId: string;
  optionIndex: number;
  voterId: string;
  reservationId?: string | null;
}): Promise<void> {
  const { showId, madLibId, fieldId, optionIndex, voterId, reservationId } =
    input;
  const id = buildVoteDocId(showId, madLibId, fieldId, voterId);
  await setDoc(doc(db, MAD_LIB_VOTES_COLLECTION, id), {
    showId,
    madLibId,
    fieldId,
    optionIndex,
    voterId,
    reservationId: reservationId ?? null,
    timestamp: serverTimestamp(),
  });
}

/**
 * Fetch the caller's existing votes for a single (showId, madLibId), keyed
 * by fieldId. Used to pre-fill the form on revisit.
 */
export async function fetchOwnVotes(input: {
  showId: string;
  madLibId: string;
  fieldIds: string[];
  voterId: string;
}): Promise<Record<string, number>> {
  const { showId, madLibId, fieldIds, voterId } = input;
  const result: Record<string, number> = {};
  await Promise.all(
    fieldIds.map(async (fieldId) => {
      const id = buildVoteDocId(showId, madLibId, fieldId, voterId);
      const snap = await getDoc(doc(db, MAD_LIB_VOTES_COLLECTION, id));
      if (snap.exists()) {
        const data = snap.data() as MadLibVote;
        if (typeof data.optionIndex === 'number') {
          result[fieldId] = data.optionIndex;
        }
      }
    }),
  );
  return result;
}

/**
 * Subscribe to all votes for a (showId, madLibId). Used post-lock to render
 * winners + tallies live. Caller is responsible for unsubscribing.
 */
export function subscribeToMadLibVotes(
  input: { showId: string; madLibId: string },
  onChange: (votes: MadLibVote[]) => void,
  onError?: (err: Error) => void,
): () => void {
  const q = query(
    collection(db, MAD_LIB_VOTES_COLLECTION),
    where('showId', '==', input.showId),
    where('madLibId', '==', input.madLibId),
  );
  return onSnapshot(
    q,
    (snap) => {
      const votes = snap.docs.map(
        (d) => ({ id: d.id, ...(d.data() as Omit<MadLibVote, 'id'>) }),
      );
      onChange(votes);
    },
    (err) => {
      if (onError) onError(err);
      else console.warn('mad-lib-votes subscription failed:', err);
    },
  );
}

/**
 * Delete every vote in a (showId, madLibId). Admin-only utility for
 * testing/resetting between rehearsals. Uses batched deletes (≤500 per
 * batch) and short-circuits when there is nothing to delete.
 *
 * Returns the number of vote documents removed.
 */
export async function deleteAllMadLibVotes(input: {
  showId: string;
  madLibId: string;
}): Promise<number> {
  const q = query(
    collection(db, MAD_LIB_VOTES_COLLECTION),
    where('showId', '==', input.showId),
    where('madLibId', '==', input.madLibId),
  );
  const snap = await getDocs(q);
  if (snap.empty) return 0;

  const docs = snap.docs;
  const BATCH_SIZE = 400;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const slice = docs.slice(i, i + BATCH_SIZE);
    if (slice.length === 1) {
      await deleteDoc(slice[0].ref);
    } else {
      const batch = writeBatch(db);
      for (const d of slice) batch.delete(d.ref);
      await batch.commit();
    }
  }
  return docs.length;
}

/**
 * Delete a single vote by deterministic doc id. Used by the admin
 * panel's "remove this submission" panic control.
 */
export async function deleteMadLibVote(voteId: string): Promise<void> {
  await deleteDoc(doc(db, MAD_LIB_VOTES_COLLECTION, voteId));
}

// ── Manual lock (admin override of the time-based showtime lock) ────
//
// One doc per (showId, madLibId) at `mad-lib-locks/{showId}__{madLibId}`.
// `manualLockedAt` is set when an admin manually closes voting and
// cleared (set to null) when they reopen. The vote page treats either
// the time-based showtime lock OR the manual lock as "closed".

export interface MadLibLock {
  manualLockedAt: Timestamp | null;
  lockedBy?: string | null;
  updatedAt?: Timestamp | null;
}

function buildLockDocId(showId: string, madLibId: string): string {
  return `${showId}__${madLibId}`;
}

/** Subscribe to the manual-lock state for a (showId, madLibId). */
export function subscribeToMadLibLock(
  input: { showId: string; madLibId: string },
  onChange: (lock: MadLibLock | null) => void,
  onError?: (err: Error) => void,
): () => void {
  const ref = doc(
    db,
    MAD_LIB_LOCKS_COLLECTION,
    buildLockDocId(input.showId, input.madLibId),
  );
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      onChange(snap.data() as MadLibLock);
    },
    (err) => {
      if (onError) onError(err);
      else console.warn('mad-lib-lock subscription failed:', err);
    },
  );
}

/**
 * Set or clear the manual lock. `locked: true` closes voting now;
 * `locked: false` reopens voting (revoking any earlier manual lock).
 */
export async function setMadLibLock(input: {
  showId: string;
  madLibId: string;
  locked: boolean;
  lockedBy?: string | null;
}): Promise<void> {
  const ref = doc(
    db,
    MAD_LIB_LOCKS_COLLECTION,
    buildLockDocId(input.showId, input.madLibId),
  );
  await setDoc(
    ref,
    {
      manualLockedAt: input.locked ? serverTimestamp() : null,
      lockedBy: input.lockedBy ?? null,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

// ── Active Mad Lib pointer (admin-controlled "now showing") ──────────
//
// One doc per show at `mad-lib-active/{showId}`. When set, the audience
// vote page renders that Mad Lib's form. When unset/null, the page falls
// back to its caller's default (typically the first pre-show Mad Lib).
//
// Admin uses this to "push" each live-interactive Mad Lib to phones at
// the right narrative cue.

export interface ActiveMadLibPointer {
  activeMadLibId: string | null;
  updatedBy?: string | null;
  updatedAt?: Timestamp | null;
}

/** Subscribe to which Mad Lib (if any) the admin is currently pushing. */
export function subscribeToActiveMadLib(
  input: { showId: string },
  onChange: (pointer: ActiveMadLibPointer | null) => void,
  onError?: (err: Error) => void,
): () => void {
  const ref = doc(db, MAD_LIB_ACTIVE_COLLECTION, input.showId);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      onChange(snap.data() as ActiveMadLibPointer);
    },
    (err) => {
      if (onError) onError(err);
      else console.warn('mad-lib-active subscription failed:', err);
    },
  );
}

/**
 * Set the active Mad Lib pointer. Pass `madLibId: null` to clear (audience
 * phones return to the show's default / idle state).
 */
export async function setActiveMadLib(input: {
  showId: string;
  madLibId: string | null;
  updatedBy?: string | null;
}): Promise<void> {
  const ref = doc(db, MAD_LIB_ACTIVE_COLLECTION, input.showId);
  await setDoc(
    ref,
    {
      activeMadLibId: input.madLibId,
      updatedBy: input.updatedBy ?? null,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/**
 * Tally votes by field. Returns one entry per fieldId in the order given.
 * Lowest option index wins ties (deterministic).
 */
export function tallyVotes(
  votes: MadLibVote[],
  fields: Array<{ id: string; options: unknown[] }>,
): FieldTally[] {
  return fields.map((field) => {
    const counts = new Array<number>(field.options.length).fill(0);
    let totalVotes = 0;
    for (const vote of votes) {
      if (vote.fieldId !== field.id) continue;
      if (
        typeof vote.optionIndex !== 'number' ||
        vote.optionIndex < 0 ||
        vote.optionIndex >= counts.length
      )
        continue;
      counts[vote.optionIndex] += 1;
      totalVotes += 1;
    }
    let winnerIndex = 0;
    for (let i = 1; i < counts.length; i += 1) {
      if (counts[i] > counts[winnerIndex]) winnerIndex = i;
    }
    return {
      fieldId: field.id,
      totalVotes,
      counts,
      winnerIndex,
      hasVotes: totalVotes > 0,
    };
  });
}

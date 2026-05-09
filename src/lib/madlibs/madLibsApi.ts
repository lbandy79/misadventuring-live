/**
 * Mad Libs voting API — Phase 11 / Phase 2.
 *
 * Pre-show audience voting for Mad Libs–format shows (e.g., Honey Heist).
 * One vote per (showId, madLibId, fieldId, voter). Voters can change their
 * vote until the field is locked (at showtime).
 *
 * Document IDs are deterministic so a re-vote upserts in place:
 *   `${showId}__${madLibId}__${fieldId}__${voterId}`
 *
 * Identity:
 *   - If a reservation accessCode resolves, voterId = `res:{reservationId}`.
 *   - Otherwise voterId = `anon:{uuid}` stored in localStorage.
 *
 * Tallies are intentionally NOT exposed during open voting (no bandwagon).
 * Consumers should subscribe to all votes for a (showId, madLibId) once
 * the field is locked, then tally client-side.
 */

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';

export const MAD_LIB_VOTES_COLLECTION = 'mad-lib-votes';
const VOTER_ID_STORAGE_KEY = 'mtp_madlibs_voter_id';

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

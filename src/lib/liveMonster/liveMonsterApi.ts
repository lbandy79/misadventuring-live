/**
 * Live Monster Builder API — Firestore layer for the audience-driven
 * monster description system.
 *
 * Two collections, keyed by showId:
 *   live-monster-session/{showId}  — one doc; GM writes, everyone subscribes
 *   live-monster-slot-votes        — one doc per (show, slot, voter); upsert on re-vote
 *                                    slotId also covers 'bystander-name' and 'bystander-move'
 *
 * Reusable across shows: swap the MonsterBuilderConfig and use a different showId.
 */

import {
  collection,
  deleteField,
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
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../firebase';

// ─── Collections ──────────────────────────────────────────────────────────────

const SESSION_COLLECTION = 'live-monster-session';
const SLOT_VOTES_COLLECTION = 'live-monster-slot-votes';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MonsterPhase =
  | 'idle'
  | 'active'
  | 'reveal'
  | 'bystander-name'
  | 'bystander-move'
  | 'done';

export interface MonsterSession {
  phase: MonsterPhase;
  /**
   * slotId → winning text. null means result still pending.
   */
  slotResults: Record<string, string | null>;
  /** Admin toggle: display renders emoji-only labels (true) vs emoji + text (false). */
  emojiMode: boolean;
  /**
   * Map of bystander submission ID → display state.
   * Absent key = unfeatured (not on screen).
   * 'featured' = shown in the living row on the projector.
   * 'dead' = shown in the graveyard row with a red X.
   */
  bystanderStates?: Record<string, 'featured' | 'dead'>;
  updatedAt: Timestamp | null;
}

export interface MonsterSlotVote {
  id: string;
  showId: string;
  slotId: string;
  /** Index into slot.options[], or null for a write-in. */
  optionIndex: number | null;
  /** Non-null when voter typed a custom answer instead of picking an option. */
  writeIn: string | null;
  voterId: string;
  timestamp: Timestamp | null;
}

export interface SlotTally {
  optionCounts: number[];
  writeIns: MonsterSlotVote[];
  totalPreset: number;
  totalWriteIn: number;
  /** Index of the highest-voted preset option (lowest index wins ties). */
  winnerIndex: number;
}

// ─── Doc ID builders ──────────────────────────────────────────────────────────

function slotVoteDocId(showId: string, slotId: string, voterId: string): string {
  return `${showId}__${slotId}__${voterId}`;
}

// ─── Session ──────────────────────────────────────────────────────────────────

export function subscribeToMonsterSession(
  showId: string,
  onChange: (session: MonsterSession | null) => void,
): Unsubscribe {
  return onSnapshot(doc(db, SESSION_COLLECTION, showId), (snap) => {
    onChange(snap.exists() ? (snap.data() as MonsterSession) : null);
  });
}

export async function setMonsterPhase(showId: string, phase: MonsterPhase): Promise<void> {
  await setDoc(
    doc(db, SESSION_COLLECTION, showId),
    { phase, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function setSlotResult(
  showId: string,
  slotId: string,
  text: string,
): Promise<void> {
  // updateDoc resolves dot-notation as nested field paths; setDoc+merge does not
  await updateDoc(doc(db, SESSION_COLLECTION, showId), {
    [`slotResults.${slotId}`]: text,
    updatedAt: serverTimestamp(),
  });
}

/** Convenience wrapper — promotes a bystander name or move into slotResults. */
export async function setBystanderResult(
  showId: string,
  field: 'bystander-name' | 'bystander-move',
  value: string,
): Promise<void> {
  return setSlotResult(showId, field, value);
}

/**
 * Set the display state for a bystander submission on the projector.
 * Pass null to remove the bystander from the display entirely.
 */
export async function setBystanderState(
  showId: string,
  submissionId: string,
  state: 'featured' | 'dead' | null,
): Promise<void> {
  if (state === null) {
    await updateDoc(doc(db, SESSION_COLLECTION, showId), {
      [`bystanderStates.${submissionId}`]: deleteField(),
      updatedAt: serverTimestamp(),
    });
  } else {
    await updateDoc(doc(db, SESSION_COLLECTION, showId), {
      [`bystanderStates.${submissionId}`]: state,
      updatedAt: serverTimestamp(),
    });
  }
}

export async function setEmojiMode(showId: string, emojiMode: boolean): Promise<void> {
  await setDoc(
    doc(db, SESSION_COLLECTION, showId),
    { emojiMode, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function resetMonsterSession(showId: string): Promise<void> {
  await setDoc(doc(db, SESSION_COLLECTION, showId), {
    phase: 'idle',
    slotResults: {},
    emojiMode: false,
    bystanderStates: {},
    updatedAt: serverTimestamp(),
  });

  await _batchDeleteByShowId(SLOT_VOTES_COLLECTION, showId);
  await _batchDeleteByShowId('live-bystander-submissions', showId);
}

async function _batchDeleteByShowId(collectionName: string, showId: string): Promise<void> {
  const snap = await getDocs(
    query(collection(db, collectionName), where('showId', '==', showId)),
  );
  if (snap.empty) return;
  const BATCH_SIZE = 400;
  for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    for (const d of snap.docs.slice(i, i + BATCH_SIZE)) batch.delete(d.ref);
    await batch.commit();
  }
}

// ─── Slot votes ───────────────────────────────────────────────────────────────

/**
 * Upsert: one vote per voter per slot. Pass `{ optionIndex }` for a preset
 * option or `{ writeIn }` for a custom answer. Re-submitting overwrites.
 * Works for bystander phases too (slotId = 'bystander-name' or 'bystander-move').
 */
export async function castSlotVote(
  showId: string,
  slotId: string,
  payload: { optionIndex: number } | { writeIn: string },
  voterId: string,
): Promise<void> {
  const isWriteIn = 'writeIn' in payload;
  await setDoc(doc(db, SLOT_VOTES_COLLECTION, slotVoteDocId(showId, slotId, voterId)), {
    showId,
    slotId,
    optionIndex: isWriteIn ? null : (payload as { optionIndex: number }).optionIndex,
    writeIn: isWriteIn ? (payload as { writeIn: string }).writeIn.trim() : null,
    voterId,
    timestamp: serverTimestamp(),
  });
}

export function subscribeToSlotVotes(
  showId: string,
  slotId: string,
  onChange: (votes: MonsterSlotVote[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, SLOT_VOTES_COLLECTION),
    where('showId', '==', showId),
    where('slotId', '==', slotId),
  );
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MonsterSlotVote, 'id'>) })));
  });
}

// ─── Tally helpers ────────────────────────────────────────────────────────────

export function tallySlotVotes(votes: MonsterSlotVote[], optionCount: number): SlotTally {
  const optionCounts = new Array<number>(optionCount).fill(0);
  const writeIns: MonsterSlotVote[] = [];
  let totalPreset = 0;
  let totalWriteIn = 0;

  for (const vote of votes) {
    if (vote.optionIndex !== null && vote.optionIndex >= 0 && vote.optionIndex < optionCount) {
      optionCounts[vote.optionIndex] += 1;
      totalPreset += 1;
    } else if (vote.writeIn) {
      writeIns.push(vote);
      totalWriteIn += 1;
    }
  }

  let winnerIndex = 0;
  for (let i = 1; i < optionCounts.length; i++) {
    if (optionCounts[i] > optionCounts[winnerIndex]) winnerIndex = i;
  }

  return { optionCounts, writeIns, totalPreset, totalWriteIn, winnerIndex };
}

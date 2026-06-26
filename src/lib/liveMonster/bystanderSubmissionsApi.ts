/**
 * Bystander submission API — individual audience member submissions.
 *
 * Each audience member can submit up to MAX_PER_VOTER bystanders per show.
 * Docs use Firestore auto-generated IDs so multiple submissions per voter
 * are supported; the voterId field is indexed for per-voter queries.
 *
 * Collection: live-bystander-submissions
 * Composite index required: showId ASC + voterId ASC (see firestore.indexes.json)
 */

import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../firebase';

const COLLECTION = 'live-bystander-submissions';
const MAX_PER_VOTER = 5;

export interface BystanderSubmission {
  id: string;
  showId: string;
  voterId: string;
  name: string;
  typeId: string;
  /** Full move text if audience chose a preset. Mutually exclusive with custom fields. */
  movePreset?: string;
  /** First half of a custom move: "When [trigger]…" */
  customTrigger?: string;
  /** Second half of a custom move: "…[effect]" */
  customEffect?: string;
  submittedAt: Timestamp | null;
}

/**
 * Add a new bystander submission for this voter.
 * Throws 'max-submissions-reached' if the voter already has MAX_PER_VOTER submissions.
 */
export async function submitBystander(
  showId: string,
  voterId: string,
  data: Pick<BystanderSubmission, 'name' | 'typeId' | 'movePreset' | 'customTrigger' | 'customEffect'>,
): Promise<void> {
  const existing = await getDocs(
    query(
      collection(db, COLLECTION),
      where('showId', '==', showId),
      where('voterId', '==', voterId),
    ),
  );
  if (existing.size >= MAX_PER_VOTER) {
    throw new Error('max-submissions-reached');
  }
  await addDoc(collection(db, COLLECTION), {
    showId,
    voterId,
    name: data.name,
    typeId: data.typeId,
    ...(data.movePreset !== undefined ? { movePreset: data.movePreset } : {}),
    ...(data.customTrigger !== undefined ? { customTrigger: data.customTrigger } : {}),
    ...(data.customEffect !== undefined ? { customEffect: data.customEffect } : {}),
    submittedAt: serverTimestamp(),
  });
}

/** Subscribe to all submissions for a show (GM view). */
export function subscribeToBystanderSubmissions(
  showId: string,
  onChange: (submissions: BystanderSubmission[]) => void,
): Unsubscribe {
  const q = query(collection(db, COLLECTION), where('showId', '==', showId));
  return onSnapshot(q, (snap) => {
    onChange(
      snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<BystanderSubmission, 'id'>),
      })),
    );
  });
}

/** Subscribe to a single voter's submissions for a show (audience self-view). */
export function subscribeToVoterBystanderSubmissions(
  showId: string,
  voterId: string,
  onChange: (submissions: BystanderSubmission[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, COLLECTION),
    where('showId', '==', showId),
    where('voterId', '==', voterId),
  );
  return onSnapshot(q, (snap) => {
    onChange(
      snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<BystanderSubmission, 'id'>),
      })),
    );
  });
}

export async function batchDeleteBystanderSubmissions(showId: string): Promise<void> {
  const snap = await getDocs(
    query(collection(db, COLLECTION), where('showId', '==', showId)),
  );
  if (snap.empty) return;
  const BATCH_SIZE = 400;
  for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    for (const d of snap.docs.slice(i, i + BATCH_SIZE)) batch.delete(d.ref);
    await batch.commit();
  }
}

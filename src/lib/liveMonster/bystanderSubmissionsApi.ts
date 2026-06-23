/**
 * Bystander submission API — individual audience member submissions.
 *
 * Each audience member creates their own bystander (name + MotW type + move).
 * One doc per (show, voter); re-submitting overwrites.
 *
 * Collection: live-bystander-submissions
 * Doc ID:     {showId}__{voterId}
 */

import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../firebase';

const COLLECTION = 'live-bystander-submissions';

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

function docId(showId: string, voterId: string): string {
  return `${showId}__${voterId}`;
}

export async function submitBystander(
  showId: string,
  voterId: string,
  data: Pick<BystanderSubmission, 'name' | 'typeId' | 'movePreset' | 'customTrigger' | 'customEffect'>,
): Promise<void> {
  await setDoc(doc(db, COLLECTION, docId(showId, voterId)), {
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

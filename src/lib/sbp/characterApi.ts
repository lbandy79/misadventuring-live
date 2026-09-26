/**
 * SBP characters — Firestore CRUD for `sbp-characters`.
 *
 * Any cast member can read every character; only the owner or an admin can
 * change or delete one (firestore.rules). Docs store choices, never derived
 * stats — see character.ts and derive.ts.
 *
 * Own-character queries filter by ownerUid only and sort client-side, so
 * they need no composite index.
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../firebase';
import type { SbpCharacter } from './character';

const COLLECTION = 'sbp-characters';

export type SbpCharacterInput = Omit<SbpCharacter, 'id' | 'createdAt' | 'updatedAt'>;

/** Firestore rejects `undefined` values; drop them recursively. */
export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripUndefined) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) out[k] = stripUndefined(v);
    }
    return out as T;
  }
  return value;
}

function toCharacter(id: string, data: Record<string, unknown>): SbpCharacter {
  return { ...(data as Omit<SbpCharacter, 'id'>), id };
}

const byUpdated = (a: SbpCharacter, b: SbpCharacter) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0);

// ─── Write ────────────────────────────────────────────────────────────────────

export async function createSbpCharacter(input: SbpCharacterInput): Promise<SbpCharacter> {
  const now = Date.now();
  const payload = stripUndefined({ ...input, createdAt: now, updatedAt: now });
  const ref = await addDoc(collection(db, COLLECTION), payload);
  return { ...payload, id: ref.id };
}

/** Save everything a player may change. Owner fields and createdAt are left alone. */
export async function saveSbpCharacter(
  id: string,
  changes: Partial<Pick<SbpCharacter, 'name' | 'level' | 'speciesId' | 'backgroundId' | 'classId' | 'abilityScores' | 'choices' | 'rulesVersion'>>,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), stripUndefined({ ...changes, updatedAt: Date.now() }));
}

export async function deleteSbpCharacter(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getSbpCharacter(id: string): Promise<SbpCharacter | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  return snap.exists() ? toCharacter(snap.id, snap.data()) : null;
}

export function subscribeToSbpCharacter(
  id: string,
  callback: (character: SbpCharacter | null) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, COLLECTION, id),
    (snap) => callback(snap.exists() ? toCharacter(snap.id, snap.data()) : null),
    (err) => onError?.(err),
  );
}

export function subscribeToMySbpCharacters(
  uid: string,
  callback: (characters: SbpCharacter[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(collection(db, COLLECTION), where('ownerUid', '==', uid));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => toCharacter(d.id, d.data())).sort(byUpdated)),
    (err) => onError?.(err),
  );
}

/** Every character — the crew's shared party view. */
export function subscribeToAllSbpCharacters(
  callback: (characters: SbpCharacter[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, COLLECTION),
    (snap) => callback(snap.docs.map((d) => toCharacter(d.id, d.data())).sort(byUpdated)),
    (err) => onError?.(err),
  );
}

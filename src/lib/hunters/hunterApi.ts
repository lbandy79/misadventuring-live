/**
 * Hunter Sheets API — Firestore CRUD for cast character sheets.
 *
 * Collection: `hunter-sheets`
 * One document per character. Cast members own their own docs (matched by UID).
 * Admins and cast members can read all docs (so the party can see each other's sheets).
 *
 * Special mechanics are stored as a flexible Record<string, unknown> because
 * each MotW playbook has different mechanical choices (Fate, Haven, Agency, etc.).
 */

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HunterSheet {
  id: string;
  castMemberUid: string;
  castMemberEmail: string;
  castMemberName: string;

  showId: string;     // show series id — e.g. 'monster-of-the-week'
  systemId: string;   // system JSON id — e.g. 'monster-of-the-week'

  hunterName: string;
  playbookId: string;           // e.g. 'the-chosen'
  playbookName: string;         // e.g. 'The Chosen'
  ratingLineIndex: number;      // 0-based index into playbook.ratingLines

  selectedMoveIds: string[];    // move names (MotW uses name as ID, no separate id field)

  // Gear is recorded for reference — for most playbooks it's fixed text
  gear: string[];

  // Per-playbook special mechanics — structure varies
  specialMechanics: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;
}

type HunterSheetCreate = Omit<HunterSheet, 'id' | 'createdAt' | 'updatedAt'>;
type HunterSheetUpdate = Partial<Omit<HunterSheet, 'id' | 'castMemberUid' | 'castMemberEmail' | 'showId' | 'systemId' | 'createdAt'>>;

const COLLECTION = 'hunter-sheets';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toHunterSheet(id: string, data: Record<string, unknown>): HunterSheet {
  return {
    id,
    castMemberUid: data.castMemberUid as string,
    castMemberEmail: data.castMemberEmail as string,
    castMemberName: data.castMemberName as string,
    showId: data.showId as string,
    systemId: data.systemId as string,
    hunterName: data.hunterName as string,
    playbookId: data.playbookId as string,
    playbookName: data.playbookName as string,
    ratingLineIndex: data.ratingLineIndex as number,
    selectedMoveIds: (data.selectedMoveIds as string[]) ?? [],
    gear: (data.gear as string[]) ?? [],
    specialMechanics: (data.specialMechanics as Record<string, unknown>) ?? {},
    createdAt: (data.createdAt as { toDate?: () => Date } | undefined)?.toDate?.() ?? new Date(),
    updatedAt: (data.updatedAt as { toDate?: () => Date } | undefined)?.toDate?.() ?? new Date(),
  };
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function createHunterSheet(sheet: HunterSheetCreate): Promise<HunterSheet> {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...sheet,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const snap = await getDoc(ref);
  return toHunterSheet(snap.id, snap.data() as Record<string, unknown>);
}

export async function updateHunterSheet(id: string, updates: HunterSheetUpdate): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getHunterSheet(id: string): Promise<HunterSheet | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return toHunterSheet(snap.id, snap.data() as Record<string, unknown>);
}

/** Get all hunter sheets for a specific cast member (by UID). */
export async function getHunterSheetsForCastMember(uid: string): Promise<HunterSheet[]> {
  const q = query(
    collection(db, COLLECTION),
    where('castMemberUid', '==', uid),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toHunterSheet(d.id, d.data() as Record<string, unknown>));
}

/** Get all hunter sheets (for GM view and party roster). */
export async function getAllHunterSheets(): Promise<HunterSheet[]> {
  const q = query(collection(db, COLLECTION), orderBy('castMemberName', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toHunterSheet(d.id, d.data() as Record<string, unknown>));
}

/** Real-time subscription to all hunter sheets. */
export function subscribeToAllHunterSheets(
  callback: (sheets: HunterSheet[]) => void,
): Unsubscribe {
  const q = query(collection(db, COLLECTION), orderBy('castMemberName', 'asc'));
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => toHunterSheet(d.id, d.data() as Record<string, unknown>)),
    );
  });
}

/** Real-time subscription to a single cast member's sheets. */
export function subscribeToHunterSheetsForCastMember(
  uid: string,
  callback: (sheets: HunterSheet[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, COLLECTION),
    where('castMemberUid', '==', uid),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => toHunterSheet(d.id, d.data() as Record<string, unknown>)),
    );
  });
}

// ─── Cast management ──────────────────────────────────────────────────────────

/** Read the current cast email list. */
export async function getCastEmails(): Promise<string[]> {
  const snap = await getDoc(doc(db, 'config', 'cast'));
  if (!snap.exists()) return [];
  const data = snap.data() as { emails?: string[] };
  return Array.isArray(data.emails) ? data.emails.map((e) => e.toLowerCase()) : [];
}

/** Replace the entire cast email list (admin only per Firestore rules). */
export async function setCastEmails(emails: string[]): Promise<void> {
  await updateDoc(doc(db, 'config', 'cast'), {
    emails: emails.map((e) => e.toLowerCase().trim()),
  });
}

/** Bootstrap the cast doc if it doesn't exist yet. */
export async function initCastDoc(): Promise<void> {
  const ref = doc(db, 'config', 'cast');
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const { setDoc } = await import('firebase/firestore');
    await setDoc(ref, { emails: [] });
  }
}

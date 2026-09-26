/**
 * SBP rules data — Firestore access.
 *
 * Collections:
 *   sbp-rules/{kind}          current rules docs ({ meta, data }); cast + admin read, admin write
 *   sbp-rules-history/{id}    previous version, copied before every upload; admin only, append-only
 *
 * The rules files are unpublished IP. They are never imported into app code;
 * everything that needs them subscribes here after sign-in and relies on the
 * Firestore rules (firestore.rules) for access control.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../firebase';
import type {
  SbpClassesFile,
  SbpOriginsFile,
  SbpRulesDoc,
  SbpRulesHistoryEntry,
  SbpRulesKind,
  SbpRulesMeta,
} from './types';

const RULES = 'sbp-rules';
const HISTORY = 'sbp-rules-history';

export interface SbpRulesHistoryRow extends SbpRulesHistoryEntry {
  id: string;
}

/** Everything the wizard needs, keyed by kind. Absent = not uploaded yet. */
export interface LoadedSbpRules {
  classes: SbpRulesDoc<SbpClassesFile> | null;
  origins: SbpRulesDoc<SbpOriginsFile> | null;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getSbpRules<T = unknown>(kind: SbpRulesKind): Promise<SbpRulesDoc<T> | null> {
  const snap = await getDoc(doc(db, RULES, kind));
  return snap.exists() ? (snap.data() as SbpRulesDoc<T>) : null;
}

export function subscribeToSbpRules<T = unknown>(
  kind: SbpRulesKind,
  callback: (rules: SbpRulesDoc<T> | null) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, RULES, kind),
    (snap) => callback(snap.exists() ? (snap.data() as SbpRulesDoc<T>) : null),
    (err) => onError?.(err),
  );
}

/** Subscribe to both current rules docs at once. */
export function subscribeToAllSbpRules(
  callback: (rules: LoadedSbpRules) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const state: LoadedSbpRules = { classes: null, origins: null };
  const unsubs = [
    subscribeToSbpRules<SbpClassesFile>('classes', (d) => { state.classes = d; callback({ ...state }); }, onError),
    subscribeToSbpRules<SbpOriginsFile>('origins', (d) => { state.origins = d; callback({ ...state }); }, onError),
  ];
  return () => unsubs.forEach((u) => u());
}

export async function getSbpRulesHistory(kind: SbpRulesKind): Promise<SbpRulesHistoryRow[]> {
  const q = query(collection(db, HISTORY), where('kind', '==', kind), orderBy('replacedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as SbpRulesHistoryEntry) }));
}

// ─── Write ────────────────────────────────────────────────────────────────────

export interface UploadSbpRulesArgs {
  kind: SbpRulesKind;
  /** The parsed file, already validated. Written verbatim. */
  data: unknown;
  schemaVersion: string;
  counts: Record<string, number>;
  sourceFileName: string;
  user: { uid: string; email: string | null };
}

/**
 * Replace the current rules doc, archiving the previous one first.
 *
 * Both writes happen in one transaction so history can never lag the live
 * doc: either the old version is preserved and the new one is live, or
 * nothing changed.
 */
export async function uploadSbpRules(args: UploadSbpRulesArgs): Promise<SbpRulesMeta> {
  const meta: SbpRulesMeta = {
    kind: args.kind,
    schemaVersion: args.schemaVersion,
    uploadedBy: args.user.uid,
    uploadedByEmail: args.user.email ?? '',
    uploadedAt: Date.now(),
    sourceFileName: args.sourceFileName,
    counts: args.counts,
  };
  const rulesRef = doc(db, RULES, args.kind);

  await runTransaction(db, async (tx) => {
    const current = await tx.get(rulesRef);
    if (current.exists()) {
      const entry: SbpRulesHistoryEntry = {
        kind: args.kind,
        replacedAt: meta.uploadedAt,
        replacedBy: args.user.uid,
        previous: current.data() as SbpRulesDoc,
      };
      tx.set(doc(collection(db, HISTORY)), entry);
    }
    tx.set(rulesRef, { meta, data: args.data });
  });

  return meta;
}

/** Re-upload a history entry's data as the current doc (the current one is archived as usual). */
export async function restoreSbpRulesFromHistory(
  entryId: string,
  user: { uid: string; email: string | null },
): Promise<SbpRulesMeta> {
  const snap = await getDoc(doc(db, HISTORY, entryId));
  if (!snap.exists()) throw new Error(`History entry ${entryId} not found`);
  const entry = snap.data() as SbpRulesHistoryEntry;
  const prev = entry.previous.meta;
  return uploadSbpRules({
    kind: entry.kind,
    data: entry.previous.data,
    schemaVersion: prev.schemaVersion,
    counts: prev.counts,
    sourceFileName: `restored: ${prev.sourceFileName}`,
    user,
  });
}

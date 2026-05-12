/**
 * NPC / Beat / WorldVote Firestore API.
 *
 * Flat top-level collections keyed by showId field, not subcollections.
 * This makes cross-show queries possible later without restructuring.
 *
 * Collections:
 *   npcs              — one doc per audience NPC; auto-id
 *   npc-world-votes   — one doc per (showId, fieldId, deviceToken); deterministic id
 *   beats             — one doc per GM-triggered Beat; auto-id
 *
 * Identity:
 *   No auth, no access code. Device token only — a UUID persisted in
 *   localStorage. Soft de-dupe: one NPC per (showId, deviceToken).
 *   The audience member can edit their choices from the post-submit screen.
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
  setDoc,
  updateDoc,
  where,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';

// ─── Collection names ────────────────────────────────────────────────────────

export const NPCS_COLLECTION = 'npcs';
export const WORLD_VOTES_COLLECTION = 'npc-world-votes';
export const BEATS_COLLECTION = 'beats';

const DEVICE_TOKEN_KEY = 'mtp_device_token';

// ─── Types ───────────────────────────────────────────────────────────────────

/** One audience member's NPC for a given show. */
export interface NpcProfile {
  id: string;
  showId: string;
  systemId: string;
  displayName: string;
  /** fieldId → chosen option text (both personal and world fields stored here) */
  fieldValues: Record<string, string>;
  /** fieldId → true when the audience member typed a write-in rather than picking a preset */
  fieldWriteIns?: Record<string, boolean>;
  deviceToken: string;
  createdAt: Timestamp | null;
  isActive: boolean;
  hasBeenTagged: boolean;
  /** Soft-delete: set post-show. Archived NPCs never appear in the live roster
   *  but remain in Firestore for recap and audit. Never hard-delete. */
  isArchived?: boolean;
  /** Optional email captured on the save-your-bear screen. */
  email?: string;
}

/** One device's vote on a shared world field. Deterministic doc id. */
export interface WorldVote {
  id: string;
  showId: string;
  fieldId: string;
  optionIndex: number;
  optionText: string;
  deviceToken: string;
  createdAt: Timestamp | null;
}

export interface BeatResponseSlot {
  id: string;
  type: string;
  label: string;
  options: string[];
}

/** A GM-triggered audience moment for one NPC. */
export interface Beat {
  id: string;
  showId: string;
  npcId: string;
  npcDisplayName: string;
  promptText: string;
  responseTemplate: string;
  responseSlots: BeatResponseSlot[];
  response?: {
    slotValues: Record<string, string>;
    assembledText: string;
  };
  status: 'pending' | 'responded' | 'approved' | 'rejected' | 'cleared';
  triggeredAt: Timestamp | null;
  respondedAt?: Timestamp | null;
  moderatedAt?: Timestamp | null;
  moderatedBy?: string | null;
}

// ─── Device token ─────────────────────────────────────────────────────────────

/** Returns a stable UUID for this browser. Created on first call. */
export function getOrCreateDeviceToken(): string {
  if (typeof window === 'undefined') {
    return `ssr-${Math.random().toString(36).slice(2)}`;
  }
  try {
    const stored = window.localStorage.getItem(DEVICE_TOKEN_KEY);
    if (stored) return stored;
    const token =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(DEVICE_TOKEN_KEY, token);
    return token;
  } catch {
    return `fallback-${Math.random().toString(36).slice(2)}`;
  }
}

// ─── NPC CRUD ─────────────────────────────────────────────────────────────────

/**
 * Find this device's existing NPC for a show, or return null.
 * Called on page load to detect returning visitors.
 */
export async function getNpcByDeviceToken(
  showId: string,
  deviceToken: string,
): Promise<NpcProfile | null> {
  const q = query(
    collection(db, NPCS_COLLECTION),
    where('showId', '==', showId),
    where('deviceToken', '==', deviceToken),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as Omit<NpcProfile, 'id'>) };
}

/** Create a new NPC document. Returns the saved NpcProfile with its Firestore id. */
export async function createNpc(input: {
  showId: string;
  systemId: string;
  displayName: string;
  fieldValues: Record<string, string>;
  fieldWriteIns?: Record<string, boolean>;
  deviceToken: string;
}): Promise<NpcProfile> {
  const doc_data: Record<string, unknown> = {
    showId: input.showId,
    systemId: input.systemId,
    displayName: input.displayName,
    fieldValues: input.fieldValues,
    deviceToken: input.deviceToken,
    createdAt: serverTimestamp(),
    isActive: true,
    hasBeenTagged: false,
    isArchived: false,
  };
  if (input.fieldWriteIns && Object.keys(input.fieldWriteIns).length > 0) {
    doc_data.fieldWriteIns = input.fieldWriteIns;
  }
  const ref = await addDoc(collection(db, NPCS_COLLECTION), doc_data);
  return {
    id: ref.id,
    showId: input.showId,
    systemId: input.systemId,
    displayName: input.displayName,
    fieldValues: input.fieldValues,
    fieldWriteIns: input.fieldWriteIns,
    deviceToken: input.deviceToken,
    createdAt: null,
    isActive: true,
    hasBeenTagged: false,
    isArchived: false,
  };
}

/** Update displayName and fieldValues on an existing NPC (edit flow). */
export async function updateNpc(
  npcId: string,
  updates: {
    displayName: string;
    fieldValues: Record<string, string>;
    fieldWriteIns?: Record<string, boolean>;
  },
): Promise<void> {
  const patch: Record<string, unknown> = {
    displayName: updates.displayName,
    fieldValues: updates.fieldValues,
  };
  if (updates.fieldWriteIns !== undefined) {
    patch.fieldWriteIns = updates.fieldWriteIns;
  }
  await updateDoc(doc(db, NPCS_COLLECTION, npcId), patch);
}

/** Fetch a single NPC by document id. Returns null if not found. */
export async function getNpc(npcId: string): Promise<NpcProfile | null> {
  const snap = await getDoc(doc(db, NPCS_COLLECTION, npcId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<NpcProfile, 'id'>) };
}

/** Fetch approved Beats for one NPC (post-show history view). */
export async function getApprovedBeatsForNpc(npcId: string): Promise<Beat[]> {
  const q = query(
    collection(db, BEATS_COLLECTION),
    where('npcId', '==', npcId),
    where('status', '==', 'approved'),
    orderBy('triggeredAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Beat, 'id'>) }));
}

/** Attach an email address to an NPC document (save-your-character flow). */
export async function saveNpcEmail(npcId: string, email: string): Promise<void> {
  await updateDoc(doc(db, NPCS_COLLECTION, npcId), { email: email.trim().toLowerCase() });
}

/**
 * Soft-archive an NPC post-show. Sets isArchived + isActive so the live
 * roster subscription (which filters isActive == true) naturally drops it.
 * The NPC document is never hard-deleted.
 */
export async function archiveNpc(npcId: string): Promise<void> {
  await updateDoc(doc(db, NPCS_COLLECTION, npcId), {
    isArchived: true,
    isActive: false,
  });
}

/** Subscribe to all active NPCs for a show, ordered by createdAt. */
export function subscribeToNpcs(
  showId: string,
  onChange: (npcs: NpcProfile[]) => void,
  onError?: (err: Error) => void,
): () => void {
  const q = query(
    collection(db, NPCS_COLLECTION),
    where('showId', '==', showId),
    where('isActive', '==', true),
    orderBy('createdAt', 'asc'),
  );
  return onSnapshot(
    q,
    (snap) => {
      onChange(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<NpcProfile, 'id'>) })),
      );
    },
    (err) => {
      if (onError) onError(err);
      else console.warn('npcs subscription failed:', err);
    },
  );
}

// ─── World votes ──────────────────────────────────────────────────────────────

function buildWorldVoteId(showId: string, fieldId: string, deviceToken: string) {
  return `${showId}__${fieldId}__${deviceToken}`;
}

/** Upsert a world vote. One vote per (showId, fieldId, deviceToken). */
export async function castWorldVote(input: {
  showId: string;
  fieldId: string;
  optionIndex: number;
  optionText: string;
  deviceToken: string;
}): Promise<void> {
  const id = buildWorldVoteId(input.showId, input.fieldId, input.deviceToken);
  await setDoc(doc(db, WORLD_VOTES_COLLECTION, id), {
    showId: input.showId,
    fieldId: input.fieldId,
    optionIndex: input.optionIndex,
    optionText: input.optionText,
    deviceToken: input.deviceToken,
    createdAt: serverTimestamp(),
  });
}

/**
 * Fetch this device's existing world vote selections for a show.
 * Returns fieldId → optionIndex so the form can pre-fill on revisit.
 */
export async function getWorldVotesForDevice(
  showId: string,
  deviceToken: string,
): Promise<Record<string, number>> {
  const q = query(
    collection(db, WORLD_VOTES_COLLECTION),
    where('showId', '==', showId),
    where('deviceToken', '==', deviceToken),
  );
  const snap = await getDocs(q);
  const result: Record<string, number> = {};
  snap.docs.forEach((d) => {
    const data = d.data() as Omit<WorldVote, 'id'>;
    result[data.fieldId] = data.optionIndex;
  });
  return result;
}

// ─── Beats ────────────────────────────────────────────────────────────────────

/** GM triggers a Stinger for one NPC. Returns the new Beat's id. */
export async function triggerBeat(input: {
  showId: string;
  npcId: string;
  npcDisplayName: string;
  promptText: string;
  responseTemplate: string;
  responseSlots: BeatResponseSlot[];
}): Promise<string> {
  const ref = await addDoc(collection(db, BEATS_COLLECTION), {
    showId: input.showId,
    npcId: input.npcId,
    npcDisplayName: input.npcDisplayName,
    promptText: input.promptText,
    responseTemplate: input.responseTemplate,
    responseSlots: input.responseSlots,
    status: 'pending',
    triggeredAt: serverTimestamp(),
    respondedAt: null,
    moderatedAt: null,
    moderatedBy: null,
  });
  return ref.id;
}

/** NPC submits their Mad-Lib response to a Beat. */
export async function respondToBeat(
  beatId: string,
  response: { slotValues: Record<string, string>; assembledText: string },
): Promise<void> {
  await updateDoc(doc(db, BEATS_COLLECTION, beatId), {
    response,
    status: 'responded',
    respondedAt: serverTimestamp(),
  });
}

/** GM clears an approved Beat from the live feed (soft-hide, not deleted). */
export async function clearBeat(beatId: string): Promise<void> {
  await updateDoc(doc(db, BEATS_COLLECTION, beatId), {
    status: 'cleared',
  });
}

/** GM approves or rejects a Beat response from the mod queue. */
export async function moderateBeat(
  beatId: string,
  decision: 'approved' | 'rejected',
  moderatorId?: string | null,
): Promise<void> {
  await updateDoc(doc(db, BEATS_COLLECTION, beatId), {
    status: decision,
    moderatedAt: serverTimestamp(),
    moderatedBy: moderatorId ?? null,
  });
}

/** Subscribe to Beats targeting a specific NPC (audience phone view). */
export function subscribeToBeatsForNpc(
  npcId: string,
  onChange: (beats: Beat[]) => void,
  onError?: (err: Error) => void,
): () => void {
  const q = query(
    collection(db, BEATS_COLLECTION),
    where('npcId', '==', npcId),
    orderBy('triggeredAt', 'desc'),
  );
  return onSnapshot(
    q,
    (snap) => {
      onChange(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Beat, 'id'>) })));
    },
    (err) => {
      if (onError) onError(err);
      else console.warn('beats-for-npc subscription failed:', err);
    },
  );
}

/** Subscribe to all Beats for a show (GM mod queue). */
export function subscribeToBeatsForShow(
  showId: string,
  onChange: (beats: Beat[]) => void,
  onError?: (err: Error) => void,
): () => void {
  const q = query(
    collection(db, BEATS_COLLECTION),
    where('showId', '==', showId),
    orderBy('triggeredAt', 'desc'),
  );
  return onSnapshot(
    q,
    (snap) => {
      onChange(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Beat, 'id'>) })));
    },
    (err) => {
      if (onError) onError(err);
      else console.warn('beats-for-show subscription failed:', err);
    },
  );
}

/** Subscribe to approved Beats for a show (projector display). */
export function subscribeToApprovedBeats(
  showId: string,
  onChange: (beats: Beat[]) => void,
  onError?: (err: Error) => void,
): () => void {
  const q = query(
    collection(db, BEATS_COLLECTION),
    where('showId', '==', showId),
    where('status', '==', 'approved'),
    orderBy('moderatedAt', 'desc'),
  );
  return onSnapshot(
    q,
    (snap) => {
      onChange(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Beat, 'id'>) })));
    },
    (err) => {
      if (onError) onError(err);
      else console.warn('approved-beats subscription failed:', err);
    },
  );
}

// ─── displayName assembly ─────────────────────────────────────────────────────

/**
 * Substitute personal field values into the displayNameTemplate.
 * Template uses {fieldId} syntax, e.g. "{adjective} {job_title}, {tagline}".
 * World fields are ignored (not in the name).
 */
export function assembleDisplayName(
  template: string,
  fieldValues: Record<string, string>,
): string {
  return Object.entries(fieldValues).reduce(
    (text, [fieldId, value]) =>
      text.replace(new RegExp(`\\{${fieldId}\\}`, 'g'), value),
    template,
  );
}

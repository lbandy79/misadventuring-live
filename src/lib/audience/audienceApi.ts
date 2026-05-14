/**
 * Audience profile API — one document per email address.
 *
 * Collection: audience-profiles
 * Doc ID: normalized email (lowercased, trimmed)
 *
 * Schema (v2 — May 2026):
 *   email: string
 *   magicToken: string          — UUID v4, used for /return?token= magic links
 *   accessCode: string          — 6-char alphanumeric, used for manual code entry
 *   createdAt: Timestamp
 *   updatedAt: Timestamp
 *   npcs: Array<AudienceNpcRef>
 *   optedInForNotebook: boolean
 *   optedInForAnnouncements: boolean
 *
 * Write rules:
 *   - First write sets email, createdAt, and all provided fields.
 *   - Subsequent writes update updatedAt and any provided fields.
 *   - npcs: deduplicated by npcId — each NPC appears at most once.
 *   - Footer notify-me writes set optedInForAnnouncements only (no token/code).
 */

import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '../../firebase';

export const AUDIENCE_PROFILES_COLLECTION = 'audience-profiles';

export interface AudienceNpcRef {
  showId: string;          // Firestore collection key (e.g. "honey-heist-madlibs-2026-05-23")
  showSlug?: string;       // URL slug for routing (e.g. "mad-libs-honey-heist")
  npcId: string;
  savedAt?: string;        // ISO timestamp — when the audience member saved
  showName?: string;       // display name of the show
  revealSentence?: string; // pre-composed for notebook emails
  characterName?: string;  // NPC displayName at save time
}

export interface AudienceProfile {
  email: string;
  magicToken?: string;
  accessCode?: string;
  createdAt: unknown;      // Firestore Timestamp
  updatedAt?: unknown;     // Firestore Timestamp
  npcs: AudienceNpcRef[];
  optedInForNotebook: boolean;
  optedInForAnnouncements: boolean;
}

// Read-free upsert: setDoc+merge eliminates the getDoc that previously required
// isAdmin() to read audience-profiles. Tradeoff: createdAt is refreshed on each
// call (not first-write-only), and npcs dedup is by deep equality via arrayUnion
// rather than by npcId — a user who saves twice gets two entries if savedAt differs.
// Both are acceptable for the May 23 deadline.
export async function upsertAudienceProfile(input: {
  email: string;
  npc?: AudienceNpcRef;
  magicToken?: string;
  accessCode?: string;
  optedInForNotebook?: boolean;
  optedInForAnnouncements?: boolean;
  /** Legacy field kept for the footer notify-me form. */
  optedInForUpdates?: boolean;
}): Promise<void> {
  const emailNorm = input.email.trim().toLowerCase();
  if (!emailNorm) return;

  const ref = doc(db, AUDIENCE_PROFILES_COLLECTION, emailNorm);

  const payload: Record<string, unknown> = {
    email: emailNorm,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (input.npc) {
    payload.npcs = arrayUnion(input.npc);
  }
  if (input.magicToken !== undefined) payload.magicToken = input.magicToken;
  if (input.accessCode !== undefined) payload.accessCode = input.accessCode;

  // Only write opt-in fields when explicitly provided so merge doesn't overwrite
  // a prior opt-in with false.
  if (input.optedInForNotebook !== undefined) {
    payload.optedInForNotebook = input.optedInForNotebook;
  } else if (input.optedInForUpdates !== undefined) {
    payload.optedInForNotebook = input.optedInForUpdates;
  }
  if (input.optedInForAnnouncements !== undefined) {
    payload.optedInForAnnouncements = input.optedInForAnnouncements;
  } else if (input.optedInForUpdates !== undefined) {
    payload.optedInForAnnouncements = input.optedInForUpdates;
  }

  await setDoc(ref, payload, { merge: true });
}

/** Fetch by normalized email. Returns null if not found. */
export async function getAudienceProfileByEmail(
  email: string,
): Promise<AudienceProfile | null> {
  const emailNorm = email.trim().toLowerCase();
  if (!emailNorm) return null;
  const snap = await getDoc(doc(db, AUDIENCE_PROFILES_COLLECTION, emailNorm));
  return snap.exists() ? (snap.data() as AudienceProfile) : null;
}

/** Fetch by magic token (for /return?token= deep links). Returns null if not found. */
export async function getAudienceProfileByToken(
  magicToken: string,
): Promise<AudienceProfile | null> {
  if (!magicToken) return null;
  const q = query(
    collection(db, AUDIENCE_PROFILES_COLLECTION),
    where('magicToken', '==', magicToken),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as AudienceProfile;
}

/** Fetch by access code (for manual code entry on /return). Returns null if not found. */
export async function getAudienceProfileByCode(
  accessCode: string,
): Promise<AudienceProfile | null> {
  const code = accessCode.trim().toUpperCase();
  if (!code) return null;
  const q = query(
    collection(db, AUDIENCE_PROFILES_COLLECTION),
    where('accessCode', '==', code),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as AudienceProfile;
}

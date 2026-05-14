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
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
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
  const existing = await getDoc(ref);

  if (!existing.exists()) {
    const notebookOpt = input.optedInForNotebook ?? input.optedInForUpdates ?? false;
    await setDoc(ref, {
      email: emailNorm,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      npcs: input.npc ? [input.npc] : [],
      magicToken: input.magicToken ?? null,
      accessCode: input.accessCode ?? null,
      optedInForNotebook: notebookOpt,
      optedInForAnnouncements: input.optedInForAnnouncements ?? notebookOpt,
    });
    return;
  }

  const existingData = existing.data() as AudienceProfile;
  const patch: Record<string, unknown> = { updatedAt: serverTimestamp() };

  // Deduplicate by npcId — only append if this NPC isn't already recorded.
  if (input.npc) {
    const alreadyHas = (existingData.npcs ?? []).some((n) => n.npcId === input.npc!.npcId);
    if (!alreadyHas) {
      patch.npcs = [...(existingData.npcs ?? []), input.npc];
    }
  }

  if (input.magicToken !== undefined) patch.magicToken = input.magicToken;
  if (input.accessCode !== undefined) patch.accessCode = input.accessCode;

  if (input.optedInForNotebook !== undefined) {
    patch.optedInForNotebook = input.optedInForNotebook;
  }
  if (input.optedInForAnnouncements !== undefined) {
    patch.optedInForAnnouncements = input.optedInForAnnouncements;
  }
  // Legacy field alias from footer form
  if (input.optedInForUpdates !== undefined && input.optedInForNotebook === undefined) {
    patch.optedInForAnnouncements = input.optedInForUpdates;
  }

  await updateDoc(ref, patch);
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

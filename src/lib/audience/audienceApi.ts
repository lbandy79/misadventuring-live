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
export const MAGIC_TOKENS_COLLECTION = 'magic-tokens';

export interface AudienceNpcRef {
  showId: string;          // Firestore collection key (e.g. "honey-heist-madlibs-2026-05-23")
  showSlug?: string;       // URL slug for routing (e.g. "mad-libs-honey-heist")
  npcId: string;
  savedAt?: string;        // ISO timestamp — when the audience member saved
  showName?: string;       // display name of the show
  revealSentence?: string; // pre-composed for notebook emails
  characterName?: string;  // NPC displayName at save time
}

/** Minimal shape returned by token/code lookup — only what ReturnPage needs. */
export interface AudienceReturnData {
  email: string;
  npcs: AudienceNpcRef[];
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

  const writes: Promise<void>[] = [setDoc(ref, payload, { merge: true })];

  // Write a publicly-readable token doc so ReturnPage can resolve the magic link
  // without needing list access on the protected audience-profiles collection.
  if (input.magicToken) {
    writes.push(
      setDoc(doc(db, MAGIC_TOKENS_COLLECTION, input.magicToken), {
        email: emailNorm,
        npcs: input.npc ? [input.npc] : [],
        createdAt: serverTimestamp(),
      }),
    );
  }

  await Promise.all(writes);
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

/** Fetch by magic token (for /return?token= deep links). Returns null if not found.
 *  Reads from magic-tokens/{token} (publicly readable) instead of querying the
 *  admin-only audience-profiles collection. */
export async function getAudienceProfileByToken(
  magicToken: string,
): Promise<AudienceReturnData | null> {
  if (!magicToken) return null;
  const snap = await getDoc(doc(db, MAGIC_TOKENS_COLLECTION, magicToken));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    email: data.email as string,
    npcs: (data.npcs ?? []) as AudienceNpcRef[],
  };
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

// ─── Admin reads ──────────────────────────────────────────────────────────────

/** One row of the admin audience list — flattened for display and CSV export. */
export interface AudienceProfileRow {
  email: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  /** Number of characters this person has saved across all shows. */
  npcCount: number;
  /** Show names they've saved a character in, most recent first. */
  shows: string[];
  optedInForNotebook: boolean;
  optedInForAnnouncements: boolean;
  /** True when they can follow a magic link back to their characters. */
  hasMagicLink: boolean;
  /**
   * How the address arrived: 'character' if they saved a character,
   * 'footer' if it came from the site's notify-me form.
   */
  source: 'character' | 'footer';
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const ts = value as { toDate?: () => Date };
  return typeof ts.toDate === 'function' ? ts.toDate() : null;
}

/**
 * List every audience profile, newest first.
 *
 * Requires an admin session — `audience-profiles` is admin-read-only in
 * firestore.rules, so this throws a permission error for anyone else.
 */
export async function listAudienceProfiles(): Promise<AudienceProfileRow[]> {
  const snap = await getDocs(collection(db, AUDIENCE_PROFILES_COLLECTION));

  const rows = snap.docs.map((d) => {
    const p = d.data() as Partial<AudienceProfile>;
    const npcs = (p.npcs ?? []) as AudienceNpcRef[];
    const shows = [...npcs]
      .sort((a, b) => (b.savedAt ?? '').localeCompare(a.savedAt ?? ''))
      .map((n) => n.showName ?? n.showId)
      .filter((v, i, arr) => arr.indexOf(v) === i);

    return {
      email: (p.email as string) ?? d.id,
      createdAt: toDate(p.createdAt),
      updatedAt: toDate(p.updatedAt),
      npcCount: npcs.length,
      shows,
      optedInForNotebook: p.optedInForNotebook === true,
      optedInForAnnouncements: p.optedInForAnnouncements === true,
      hasMagicLink: typeof p.magicToken === 'string' && p.magicToken.length > 0,
      source: npcs.length > 0 ? ('character' as const) : ('footer' as const),
    };
  });

  return rows.sort((a, b) => {
    const at = a.createdAt?.getTime() ?? 0;
    const bt = b.createdAt?.getTime() ?? 0;
    return bt - at;
  });
}

/** Serialize rows to CSV (RFC 4180 quoting) for download from the admin panel. */
export function audienceRowsToCsv(rows: AudienceProfileRow[]): string {
  const header = [
    'email', 'source', 'characters', 'shows',
    'optedInForNotebook', 'optedInForAnnouncements', 'hasMagicLink',
    'createdAt', 'updatedAt',
  ];
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map((r) => [
    r.email, r.source, r.npcCount, r.shows.join('; '),
    r.optedInForNotebook, r.optedInForAnnouncements, r.hasMagicLink,
    r.createdAt?.toISOString() ?? '', r.updatedAt?.toISOString() ?? '',
  ].map(esc).join(','));
  return [header.join(','), ...lines].join('\n');
}

/**
 * Recap data layer.
 *
 * Public, read-only Firestore queries scoped to a single episode `showId`.
 * Strips `gmFlagged` and `gmNotes` from anything that leaves this module
 * so the rest of the recap UI can't accidentally render private fields,
 * and applies the curation filter (no `gmFlagged: true`, no test names).
 *
 * Handles two Firestore NPC shapes:
 *   Legacy (Betawave era): flat `name`, `occupation`, `appearance`, `secret` fields.
 *   NpcProfile (Mad Libs shows): `displayName` + `fieldValues` map.
 */

import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@mtp/firebase';
import type { Reservation } from '@mtp/lib';
import { BEATS_COLLECTION, type Beat } from '../../../../src/lib/npcs/npcApi';

export type { Beat };

/**
 * NPC projection safe for public recap rendering.
 * Covers both legacy NPC (flat fields) and NpcProfile (fieldValues) shapes.
 */
export type PublicNPC = {
  id: string;
  reservationId?: string;
  showId?: string;
  systemId?: string;
  createdAt: number;
  // NpcProfile shape (Mad Libs shows)
  displayName?: string;
  fieldValues?: Record<string, string>;
  avatarSeed?: string;
  // Legacy NPC shape (Betawave era)
  name?: string;
  occupation?: string;
  appearance?: string;
  secret?: string;
  bestStat?: string;
  worstStat?: string;
};

export interface RecapData {
  reservations: Reservation[];
  npcs: PublicNPC[];
  /** All reservations under this showId, including those that never built a character. */
  reservationCount: number;
  /** Curated NPCs eligible for public display (post-filter). */
  npcCount: number;
}

const TEST_NAME_PATTERN = /test/i;

/**
 * Filter rule for public recap rendering:
 *   - Drop anything `gmFlagged: true` (admin moderated).
 *   - Drop anything whose display name matches /test/i (creator tests).
 */
function isPublicEligible(raw: any): boolean {
  if (raw.gmFlagged === true) return false;
  const displayStr: string = raw.displayName ?? raw.name ?? '';
  if (TEST_NAME_PATTERN.test(displayStr)) return false;
  return true;
}

/** Fetch specific Beat documents by ID for Stinger highlight display. */
export async function fetchHighlightBeats(beatIds: string[]): Promise<Beat[]> {
  if (beatIds.length === 0) return [];
  const results = await Promise.all(
    beatIds.map((id) => getDoc(doc(db, BEATS_COLLECTION, id))),
  );
  return results
    .filter((d) => d.exists())
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Beat, 'id'>) }));
}

export async function fetchRecapData(showId: string): Promise<RecapData> {
  if (!showId) {
    return { reservations: [], npcs: [], reservationCount: 0, npcCount: 0 };
  }

  const [resSnap, npcSnap] = await Promise.all([
    getDocs(query(collection(db, 'reservations'), where('showId', '==', showId))),
    getDocs(query(collection(db, 'npcs'), where('showId', '==', showId))),
  ]);

  const reservations: Reservation[] = resSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Reservation, 'id'>),
  }));

  const eligible: PublicNPC[] = npcSnap.docs
    .filter((d) => isPublicEligible(d.data()))
    .map((d) => {
      const raw = d.data() as any;
      const rawCreatedAt = raw.createdAt;
      const createdAt: number =
        typeof rawCreatedAt === 'number' ? rawCreatedAt
        : rawCreatedAt?.toMillis?.() ?? 0;
      // Normalize to DisplayableNpc shape.
      // Legacy NPCs (Betawave) store name/occupation/secret as flat fields.
      // NpcProfile (Mad Libs shows) stores displayName + fieldValues map.
      // Synthesize missing fields so NpcDisplayRow renders both correctly.
      const displayName: string = raw.displayName ?? raw.name ?? '';
      const fieldValues: Record<string, string> | undefined =
        raw.fieldValues ??
        (raw.occupation || raw.secret
          ? {
              ...(raw.occupation ? { job_title: raw.occupation } : {}),
              ...(raw.secret     ? { tagline:   raw.secret }     : {}),
            }
          : undefined);
      return {
        id: d.id,
        reservationId: raw.reservationId,
        showId: raw.showId,
        systemId: raw.systemId,
        createdAt,
        displayName,
        fieldValues,
        avatarSeed: raw.avatarSeed,
        // Keep raw legacy fields so FeaturedCharacter can still render appearance.
        name: raw.name,
        occupation: raw.occupation,
        appearance: raw.appearance,
        secret: raw.secret,
      };
    });

  // Stable sort by createdAt so the grid order is deterministic.
  eligible.sort((a, b) => a.createdAt - b.createdAt);

  return {
    reservations,
    npcs: eligible,
    reservationCount: reservations.length,
    npcCount: eligible.length,
  };
}

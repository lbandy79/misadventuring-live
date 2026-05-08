/**
 * Recap data layer.
 *
 * Public, read-only Firestore queries scoped to a single episode `showId`.
 * Strips `gmFlagged` and `gmNotes` from anything that leaves this module
 * so the rest of the recap UI can't accidentally render private fields,
 * and applies the curation filter (no `gmFlagged: true`, no test names).
 */

import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@mtp/firebase';
import type { NPC, Reservation } from '@mtp/lib';

/** NPC projection that the recap page is allowed to render. Strips GM-only fields. */
export type PublicNPC = Omit<NPC, 'gmFlagged' | 'gmNotes'>;

export interface RecapData {
  reservations: Reservation[];
  npcs: PublicNPC[];
  /** All reservations under this showId, including those that never built a character. */
  reservationCount: number;
  /** Curated NPCs eligible for public display (post-filter). */
  npcCount: number;
}

const TEST_NAME_PATTERN = /test/i;

function stripGmFields(npc: NPC): PublicNPC {
  const { gmFlagged: _gmFlagged, gmNotes: _gmNotes, ...rest } = npc;
  return rest;
}

/**
 * Filter rule for public recap rendering:
 *   - Drop anything `gmFlagged: true` (admin moderated).
 *   - Drop anything whose `name` matches /test/i (creator tests).
 */
function isPublicEligible(npc: NPC): boolean {
  if (npc.gmFlagged === true) return false;
  if (typeof npc.name === 'string' && TEST_NAME_PATTERN.test(npc.name)) return false;
  return true;
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

  const allNpcs: NPC[] = npcSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<NPC, 'id'>),
  }));

  const eligible = allNpcs.filter(isPublicEligible).map(stripGmFields);

  // Stable sort by createdAt so the grid order is deterministic.
  eligible.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));

  return {
    reservations,
    npcs: eligible,
    reservationCount: reservations.length,
    npcCount: eligible.length,
  };
}

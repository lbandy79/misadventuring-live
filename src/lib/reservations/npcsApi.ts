/**
 * NPCs Firestore API.
 *
 * Phase 7: lookup helpers used by the companion to show an audience
 * member their character(s) across past shows.
 */

import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import type { NPC } from '../../types/npc.types';

/**
 * Find the NPC tied to a given reservation (if any).
 * NPCs are 1:1 with reservations in the current schema.
 */
export async function findNpcByReservationId(
  reservationId: string,
): Promise<NPC | null> {
  if (!reservationId) return null;
  const snap = await getDocs(
    query(
      collection(db, 'npcs'),
      where('reservationId', '==', reservationId),
      limit(1),
    ),
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as Omit<NPC, 'id'>) };
}

/**
 * Bulk fetch NPCs for a list of reservation ids. Returns a Map keyed by
 * reservationId so the companion can render a "Your character" card per
 * reservation without N+1 queries.
 *
 * Firestore `in` queries cap at 30 values per query, so we chunk.
 */
export async function findNpcsByReservationIds(
  reservationIds: string[],
): Promise<Map<string, NPC>> {
  const result = new Map<string, NPC>();
  if (reservationIds.length === 0) return result;

  const chunks: string[][] = [];
  for (let i = 0; i < reservationIds.length; i += 30) {
    chunks.push(reservationIds.slice(i, i + 30));
  }

  await Promise.all(
    chunks.map(async (ids) => {
      const snap = await getDocs(
        query(collection(db, 'npcs'), where('reservationId', 'in', ids)),
      );
      snap.docs.forEach((d) => {
        const npc = { id: d.id, ...(d.data() as Omit<NPC, 'id'>) };
        result.set(npc.reservationId, npc);
      });
    }),
  );

  return result;
}

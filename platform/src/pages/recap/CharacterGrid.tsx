/**
 * Character Grid — the rest of the audience-built cast on lined paper.
 *
 * The featured character is excluded so they don't appear twice. A small
 * deterministic tilt is applied per card to break the grid's mechanical
 * feel without relying on randomness (so SSR / re-render is stable).
 */

import CharacterCard from './CharacterCard';
import type { PublicNPC } from './recapApi';

interface CharacterGridProps {
  npcs: PublicNPC[];
  /** Reservation id to exclude (rendered as the featured character). */
  excludeReservationId?: string;
}

/** Deterministic tilt in degrees, range roughly [-1.6, 1.6]. */
function tiltFor(seed: string, idx: number): number {
  let h = idx * 31;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 33) ^ seed.charCodeAt(i);
  }
  // Map low bits to a small float in the range above.
  const sign = (h & 1) === 0 ? 1 : -1;
  const mag = ((Math.abs(h) >> 1) % 17) / 10; // 0.0 - 1.6
  return sign * mag;
}

export default function CharacterGrid({ npcs, excludeReservationId }: CharacterGridProps) {
  const visible = excludeReservationId
    ? npcs.filter((n) => n.reservationId !== excludeReservationId)
    : npcs;

  if (visible.length === 0) return null;

  return (
    <div className="recap-grid">
      {visible.map((npc, idx) => (
        <CharacterCard key={npc.id} npc={npc} tilt={tiltFor(npc.id, idx)} />
      ))}
    </div>
  );
}

/**
 * Sample rumors for tuning the projector layout without touching Firestore:
 *   /shows/green-oaks/display?demo=rumors        (8 notes)
 *   /shows/green-oaks/display?demo=rumors&n=11   (any count; pages past 8)
 * A mix of short, medium and near-limit lengths, with two revealed.
 */

import type { Rumor } from '@mtp/lib/rumors';

const SAMPLES: Array<[byline: string, text: string, verdict?: 'true' | 'false']> = [
  ['Dolores, the very sweaty bingo caller', 'the bingo balls are weighted', 'true'],
  ['Gus, the recently divorced pharmacist', 'the night nurse has not blinked since Tuesday and nobody on the third floor wants to be the one to bring it up'],
  ['Pastor Jim, the deeply Lutheran mayor', 'the geese are organized'],
  ['Marge, the overly helpful cafeteria lady', 'there is a second basement under the basement and it has its own vending machine', 'false'],
  ['Earl, the mysteriously tan night-shift orderly', 'Blue Pine has been paying people to move out'],
  ['Bev, the suspiciously cheerful Worthers factory foreman', 'the butterscotch recipe changed in March and so did everyone who eats it, look at their eyes, I am telling you'],
  ['Hank, the very sweaty mayor', 'someone is digging at night'],
  ['Opal, the recently divorced bingo caller', 'the shuffleboard court is a landing pad'],
  ['Walt, the overly helpful pharmacist', 'the new chaplain only speaks Latin and has never once been seen eating'],
  ['Trudy, the mysteriously tan cafeteria lady', 'Tuesday meatloaf is not meatloaf'],
  ['Norm, the deeply Lutheran night-shift orderly', 'the elevator has a floor it will only go to after midnight'],
  ['June, the suspiciously cheerful mayor', 'the mayor is two smaller mayors'],
];

/** Worst case for layout checks: every note at the 140-character limit,
 *  the longest byline, and a stamp. `?demo=rumors&len=max` */
const MAX_TEXT =
  'the butterscotch recipe changed in March and so did everyone who eats it, look at their eyes, I am telling you, it is the eyes, look at them';
const MAX_BYLINE = 'Bartholomew, the suspiciously cheerful Worthers factory foreman';

export function buildDemoRumors(count: number, worstCase = false): Rumor[] {
  const n = Math.max(0, Math.min(48, Math.round(count)));
  return Array.from({ length: n }, (_, i) => {
    const [npcName, text, verdict] = worstCase
      ? ([MAX_BYLINE, MAX_TEXT.slice(0, 140), i % 2 ? 'false' : 'true'] as const)
      : SAMPLES[i % SAMPLES.length];
    return {
      id: `demo-${i}`,
      showId: 'demo',
      ownerUid: 'demo',
      slot: 0,
      npcId: 'demo',
      npcName,
      text,
      status: 'circulating' as const,
      verdict: worstCase || i < SAMPLES.length ? (verdict ?? null) : null,
      createdAt: null,
    };
  });
}

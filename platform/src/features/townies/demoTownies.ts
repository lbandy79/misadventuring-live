/**
 * Sample townies for checking projector layouts without touching Firestore:
 *   /shows/green-oaks/display?demo=townies&n=8
 * Field ids match green-oaks.system.json (adjective, occupation, reputation).
 */

import type { NpcProfile } from '@mtp/lib/npcs/npcApi';

const SAMPLES: Array<[name: string, adjective: string, occupation: string, reputation: string]> = [
  ['Dolores', 'very sweaty', 'bingo caller', 'have never lost at bingo'],
  ['Gus', 'recently divorced', 'pharmacist', 'used to be in the CIA'],
  ['Pastor Jim', 'deeply Lutheran', 'mayor', 'talk to the geese'],
  ['Marge', 'overly helpful', 'cafeteria lady', 'know where the bodies are buried'],
  ['Earl', 'mysteriously tan', 'night-shift orderly', 'keep a crossbow in the trunk'],
  ['Bev', 'suspiciously cheerful', 'Worthers factory foreman', 'got banned from the buffet'],
  ['Hank', 'very sweaty', 'mayor', 'used to be in the CIA'],
  ['Opal', 'recently divorced', 'bingo caller', 'talk to the geese'],
  ['Walt', 'overly helpful', 'pharmacist', 'keep a crossbow in the trunk'],
  ['Trudy', 'mysteriously tan', 'cafeteria lady', 'have never lost at bingo'],
  ['Norm', 'deeply Lutheran', 'night-shift orderly', 'got banned from the buffet'],
  ['June', 'suspiciously cheerful', 'mayor', 'know where the bodies are buried'],
];

export function buildDemoTownies(count: number): NpcProfile[] {
  const n = Math.max(0, Math.min(40, Math.round(count)));
  return Array.from({ length: n }, (_, i) => {
    const [name, adjective, occupation, reputation] = SAMPLES[i % SAMPLES.length];
    return {
      id: `demo-townie-${i}`,
      showId: 'demo',
      systemId: 'green-oaks',
      displayName: i < SAMPLES.length ? name : `${name} ${Math.floor(i / SAMPLES.length) + 1}`,
      fieldValues: { adjective, occupation, reputation },
      deviceToken: 'demo',
      createdAt: null,
      isActive: true,
      hasBeenTagged: false,
      showOnDisplay: true,
    };
  });
}

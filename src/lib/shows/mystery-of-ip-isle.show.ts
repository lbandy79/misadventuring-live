/**
 * The Mystery of IP Isle — Show definition.
 *
 * One-off mystery set in the Soggy Bottom Pirates world, run on D&D 5e.
 * Aired before the studio displacement; Firestore data was wiped, so the
 * recap surfaces the full episode on YouTube.
 */
import type { Show } from '../types/show.types';

export const mysteryOfIpIsleShow: Show = {
  id: 'mystery-of-ip-isle',
  name: 'The Mystery of IP Isle',
  seriesName: 'Soggy Bottom Pirates',
  themeId: 'soggy-bottom-pirates',
  systemId: 'dnd-5e',
  enabledInteractions: ['vote', 'group-roll', 'npc-naming'],
  description:
    'A one-off mystery set in the Soggy Bottom world. The audience pieces together a haunted island.',
  status: 'archived',
  era: 'past',
  recap: {
    kind: 'external',
    url: 'https://www.youtube.com/watch?v=3QAEMmnY1CU',
    label: 'Watch on YouTube',
  },
};

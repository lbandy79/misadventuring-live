/**
 * Neon Nightmares — Show definition.
 *
 * Synthwave horror anthology. Vote-driven branching scenes.
 */
import type { Show } from '../types/show.types';

export const neonNightmaresShow: Show = {
  id: 'neon-nightmares',
  name: 'Neon Nightmares',
  themeId: 'neon-nightmares',
  systemId: 'kids-on-bikes-2e',
  enabledInteractions: ['vote', 'group-roll', 'npc-naming'],
  description:
    '80s neon horror. Audience picks the next scare and names the victims.',
  status: 'draft',
};

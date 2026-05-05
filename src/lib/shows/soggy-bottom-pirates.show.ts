/**
 * Soggy Bottom Pirates — Show definition.
 *
 * Comedic pirate adventure with a ship combat audience minigame.
 */
import type { Show } from '../types/show.types';

export const soggyBottomPiratesShow: Show = {
  id: 'soggy-bottom-pirates',
  name: 'Soggy Bottom Pirates',
  themeId: 'soggy-bottom-pirates',
  systemId: 'kids-on-bikes-2e',
  enabledInteractions: ['vote', 'group-roll', 'ship-combat', 'npc-naming'],
  description:
    'A crew of disreputable buccaneers. Audience steers the ship and names the crew.',
  status: 'live',
};

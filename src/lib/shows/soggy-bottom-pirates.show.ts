/**
 * Soggy Bottom Pirates — Show definition.
 *
 * Comedic pirate adventure run on D&D 5e with a ship combat audience
 * minigame. Main ongoing campaign — currently on hiatus pending recovery
 * of the recording studio. Kept registered so existing data and routes
 * remain valid; hidden from public listings via `era: 'shelved'`.
 */
import type { Show } from '../types/show.types';

export const soggyBottomPiratesShow: Show = {
  id: 'soggy-bottom-pirates',
  name: 'Soggy Bottom Pirates',
  themeId: 'soggy-bottom-pirates',
  systemId: 'dnd-5e',
  enabledInteractions: ['vote', 'group-roll', 'ship-combat', 'npc-naming'],
  description:
    'A crew of disreputable buccaneers. Audience steers the ship and names the crew.',
  status: 'draft',
  era: 'shelved',
};

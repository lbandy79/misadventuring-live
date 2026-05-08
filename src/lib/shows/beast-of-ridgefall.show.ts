/**
 * Beast of Ridgefall — Show definition.
 *
 * Dark fantasy one-shot run on D&D 5e.
 */
import type { Show } from '../types/show.types';

export const beastOfRidgefallShow: Show = {
  id: 'beast-of-ridgefall',
  name: 'The Beast of Ridgefall',
  themeId: 'beast-of-ridgefall',
  systemId: 'dnd-5e',
  enabledInteractions: [
    'vote',
    'group-roll',
    'monster-vote',
    'villager-submit',
    'monster-builder',
    'npc-naming',
  ],
  description:
    'A medieval village hunts the beast that took its children. Audience builds the monster and names the villagers.',
  status: 'archived',
  era: 'past',
  recap: {
    kind: 'external',
    url: 'https://www.youtube.com/watch?v=Cm5MqQQ5_1U&t=2792s',
    label: 'Watch on YouTube',
  },
};

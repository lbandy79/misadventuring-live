/**
 * Mad Libs Honey Heist — Show definition.
 *
 * Stand-alone one-shot. Audience writes the prompts Mad Libs–style; the
 * cast plays the resulting nonsense as a Honey Heist caper. May 23, 2026.
 */
import type { Show } from '../types/show.types';

export const madLibsHoneyHeistShow: Show = {
  id: 'mad-libs-honey-heist',
  name: 'Mad Libs Honey Heist',
  themeId: 'tmp-base',
  systemId: 'honey-heist',
  enabledInteractions: ['vote', 'group-roll'],
  description:
    'Mad Libs format. The audience writes the prompts. The cast plays it live.',
  status: 'live',
  era: 'past',
  accentColor: '#e0a022',
  accentInk: '#1c1c1c',
  recap: { kind: 'firestore', recapId: 'honey-heist-madlibs-2026-05-23' },
  youtubeUrl: 'https://www.youtube.com/watch?v=7qH6W5Nfy6Q',
};

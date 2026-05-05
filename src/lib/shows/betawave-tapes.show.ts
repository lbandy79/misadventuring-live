/**
 * The Betawave Tapes — Show definition.
 *
 * Neon-noir series running on Blade Runner RPG. Each session uses the
 * decoder-ring interaction for cipher-style audience puzzles.
 */
import type { Show } from '../types/show.types';

export const betawaveTapesShow: Show = {
  id: 'betawave-tapes',
  name: 'The Betawave Tapes',
  seriesName: 'The Betawave Tapes',
  themeId: 'betawave-tapes',
  systemId: 'blade-runner-rpg',
  enabledInteractions: ['vote', 'group-roll', 'decoder-ring'],
  description:
    'Replicants, signal ghosts, and a ciphered transmission only the audience can crack.',
  status: 'live',
};

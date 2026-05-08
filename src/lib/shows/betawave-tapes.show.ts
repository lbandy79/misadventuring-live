/**
 * The Betawave Tapes — Show definition.
 *
 * Neon-noir series running on Kids on Bikes 2e. Each session uses the
 * decoder-ring interaction for cipher-style audience puzzles.
 *
 * (Earlier prototypes used Blade Runner RPG to evaluate the system; the
 * series itself runs on Kids on Bikes 2e.)
 */
import type { Show } from '../types/show.types';

export const betawaveTapesShow: Show = {
  id: 'betawave-tapes',
  name: 'The Betawave Tapes',
  seriesName: 'The Betawave Tapes',
  themeId: 'betawave-tapes',
  systemId: 'kids-on-bikes-2e',
  enabledInteractions: ['vote', 'group-roll', 'decoder-ring'],
  description:
    'Replicants, signal ghosts, and a ciphered transmission only the audience can crack.',
  status: 'live',
  era: 'past',
  recap: { kind: 'firestore', recapId: 'betawave-last-call-2026-04-18' },
  youtubeUrl: 'https://www.youtube.com/watch?v=G0Hbj8YJrr8&t=3559s',
};

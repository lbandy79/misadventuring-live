/**
 * Monster of the Week — Show definition.
 *
 * Upcoming one-shot. The audience names the victims, builds the monster,
 * and votes on every terrible decision. June 27, 2026.
 */
import type { Show } from '../types/show.types';

export const monsterOfTheWeekShow: Show = {
  id: 'monster-of-the-week',
  name: 'Monster of the Week',
  themeId: 'tmp-base',
  systemId: 'monster-of-the-week',
  enabledInteractions: ['vote', 'group-roll'],
  description:
    'Something is hunting the town. The audience names the victims, builds the monster, and votes on every terrible decision.',
  era: 'upcoming',
  nextDate: '2026-06-27',
  accentColor: '#1d4e3a',
  accentInk: '#f5f0e3',
};

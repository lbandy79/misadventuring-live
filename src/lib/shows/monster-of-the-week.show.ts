/**
 * Monster of the Week — Show definition.
 *
 * Ongoing campaign. The audience names the victims, builds the monster,
 * and votes on every terrible decision.
 *
 * This is the rolling "next episode" entry: after each show it is repointed
 * at the upcoming date, and the episode that just aired gets its own
 * `monster-of-the-week-epN.show.ts` with `era: 'past'`.
 */
import type { Show } from '../types/show.types';

export const monsterOfTheWeekShow: Show = {
  id: 'monster-of-the-week',
  name: 'Monster of the Week — Episode Four',
  seriesName: 'Monster of the Week',
  themeId: 'tmp-base',
  systemId: 'monster-of-the-week',
  enabledInteractions: ['vote', 'group-roll'],
  description:
    'The truck is still out there. The story continues — the audience names the victims, builds the monster, and votes on every terrible decision.',
  era: 'upcoming',
  nextDate: '2026-10-24',
  venue: 'Lucky Straws, Winter Garden, FL',
  accentColor: '#1d4e3a',
  accentInk: '#f5f0e3',
};

/**
 * Monster of the Week — Show definition.
 *
 * Ongoing campaign. The audience names the victims, builds the monster,
 * and votes on every terrible decision. Next episode date TBA.
 */
import type { Show } from '../types/show.types';

export const monsterOfTheWeekShow: Show = {
  id: 'monster-of-the-week',
  name: 'Monster of the Week — Episode Three',
  seriesName: 'Monster of the Week',
  themeId: 'tmp-base',
  systemId: 'monster-of-the-week',
  enabledInteractions: ['vote', 'group-roll'],
  description:
    'Something is still hunting the town. The story continues — the audience names the victims, builds the monster, and votes on every terrible decision.',
  era: 'upcoming',
  nextDate: '2026-09-19',
  accentColor: '#1d4e3a',
  accentInk: '#f5f0e3',
};

/**
 * Monster of the Week — Episode One.
 *
 * June 27, 2026 at Lucky Straws, Winter Garden, FL.
 * Audience built the monster, named the bystanders, voted on every bad call.
 */
import type { Show } from '../types/show.types';

export const monsterOfTheWeekEp1Show: Show = {
  id: 'monster-of-the-week-ep1',
  name: 'Monster of the Week — Episode One',
  seriesName: 'Monster of the Week',
  themeId: 'tmp-base',
  systemId: 'monster-of-the-week',
  enabledInteractions: ['vote', 'group-roll'],
  description:
    'Something hunted the town. The audience named the victims, built the monster, and voted on every terrible decision.',
  era: 'past',
  accentColor: '#1d4e3a',
  accentInk: '#f5f0e3',
  recap: { kind: 'firestore', recapId: 'monster-of-the-week-2026-06-27' },
  youtubeUrl: 'https://www.youtube.com/watch?v=7T4dgK0Xg2w&t=156s',
};

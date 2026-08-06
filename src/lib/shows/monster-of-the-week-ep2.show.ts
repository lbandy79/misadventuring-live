/**
 * Monster of the Week — Episode Two.
 *
 * July 25, 2026 at Lucky Straws, Winter Garden, FL.
 * Audience built the monster (antlered, haunting the county fair, mimics
 * voices, felled by cold iron) and populated the town with bystanders.
 */
import type { Show } from '../types/show.types';

export const monsterOfTheWeekEp2Show: Show = {
  id: 'monster-of-the-week-ep2',
  name: 'Monster of the Week — Episode Two',
  seriesName: 'Monster of the Week',
  themeId: 'tmp-base',
  systemId: 'monster-of-the-week',
  enabledInteractions: ['vote', 'group-roll'],
  description:
    'The case stayed open. The audience built the monster, filled the town with bystanders, and voted on every terrible decision.',
  era: 'past',
  accentColor: '#1d4e3a',
  accentInk: '#f5f0e3',
  recap: { kind: 'firestore', recapId: 'monster-of-the-week-2026-07-25' },
  youtubeUrl: 'https://www.youtube.com/watch?v=UwHhy-TuFss&t=12s',
};

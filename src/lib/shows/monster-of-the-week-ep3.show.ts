/**
 * Monster of the Week — Episode Three.
 *
 * September 19, 2026 at Lucky Straws, Winter Garden, FL.
 * The audience ignored every preset on the board: all four winning traits
 * were write-ins. The monster was a Toyota Tacoma that haunts the pork
 * section at Winn Dixie and crawls into your ear to steer you from inside.
 */
import type { Show } from '../types/show.types';

export const monsterOfTheWeekEp3Show: Show = {
  id: 'monster-of-the-week-ep3',
  name: 'Monster of the Week — Episode Three',
  seriesName: 'Monster of the Week',
  themeId: 'tmp-base',
  systemId: 'monster-of-the-week',
  enabledInteractions: ['vote', 'group-roll'],
  description:
    'The hunt went sideways. The audience threw out every option on the board, wrote in a monster of their own, and voted on every terrible decision.',
  era: 'past',
  accentColor: '#1d4e3a',
  accentInk: '#f5f0e3',
  recap: { kind: 'firestore', recapId: 'monster-of-the-week-2026-09-19' },
  youtubeUrl: 'https://www.youtube.com/watch?v=r4tdPibl0QA',
};

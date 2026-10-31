/**
 * Monster of the Week — Show definition.
 *
 * Ongoing campaign. The audience names the victims, builds the monster,
 * and votes on every terrible decision.
 *
 * This is the rolling "next episode" entry: after each show it is repointed
 * at the upcoming date, and the episode that just aired gets its own
 * `monster-of-the-week-epN.show.ts` with `era: 'past'`.
 *
 * No episode is scheduled after Episode Four (Oct 24, 2026); the next show
 * on the calendar is Green Oaks. Add `nextDate` + `venue` back once
 * Episode Five has a date.
 */
import type { Show } from '../types/show.types';

export const monsterOfTheWeekShow: Show = {
  id: 'monster-of-the-week',
  name: 'Monster of the Week',
  seriesName: 'Monster of the Week',
  themeId: 'tmp-base',
  systemId: 'monster-of-the-week',
  enabledInteractions: ['vote', 'group-roll'],
  audienceMode: 'monster-builder',
  description:
    'The case stays open. The audience names the victims, builds the monster, and votes on every terrible decision. Episode Five is coming.',
  era: 'upcoming',
  accentColor: '#1d4e3a',
  accentInk: '#f5f0e3',
};

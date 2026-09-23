import { describe, it, expect } from 'vitest';
import {
  shows,
  getShow,
  getUpcomingShow,
  getPastShows,
  getShowEra,
} from '../../lib/shows/registry';

/**
 * `getUpcomingShow()` drives the "Coming Next" sticky on every recap page,
 * so a mistake here is invisible in code review but wrong on four-month-old
 * public URLs. These lock down the contract.
 */
describe('getUpcomingShow', () => {
  it('returns the soonest scheduled show', () => {
    const upcoming = getUpcomingShow();
    expect(upcoming).not.toBeNull();
    expect(upcoming!.id).toBe('monster-of-the-week');
    expect(upcoming!.nextDate).toBe('2026-10-24');
  });

  it('returns a show that is actually upcoming or live, never past', () => {
    const upcoming = getUpcomingShow();
    expect(['upcoming', 'live']).toContain(getShowEra(upcoming!));
  });

  it('carries the fields the sticky note renders', () => {
    const upcoming = getUpcomingShow()!;
    expect(upcoming.nextDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(upcoming.venue).toBeTruthy();
    expect(upcoming.description).toBeTruthy();
  });

  it('never beats a dated show with an undated one', () => {
    const dated = getUpcomingShow()!;
    expect(dated.nextDate).toBeDefined();
  });
});

describe('show registry integrity', () => {
  it('has no duplicate show ids', () => {
    const ids = shows.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('registers Episode Three as a past show with a recap pointer', () => {
    const ep3 = getShow('monster-of-the-week-ep3');
    expect(ep3).toBeDefined();
    expect(getShowEra(ep3!)).toBe('past');
    expect(ep3!.recap).toEqual({
      kind: 'firestore',
      recapId: 'monster-of-the-week-2026-09-19',
    });
  });

  it('keeps every past show reachable via a recap or youtube link', () => {
    for (const show of getPastShows()) {
      const reachable = Boolean(show.recap || show.youtubeUrl);
      expect(reachable, `${show.id} has no recap or youtubeUrl`).toBe(true);
    }
  });
});

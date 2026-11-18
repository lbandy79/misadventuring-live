import { describe, expect, it } from 'vitest';
import {
  screenModeFrom,
  townieCrowding,
  TOWNIE_FIT,
  writesForMode,
  type ScreenMode,
} from '../../../platform/src/features/big-screen/screenMode';

describe('screen mode', () => {
  it('reads the mode from the two stored switches', () => {
    expect(screenModeFrom(false, 'hidden')).toBe('off');
    expect(screenModeFrom(false, undefined)).toBe('off');
    expect(screenModeFrom(false, 'cast')).toBe('townies');
    expect(screenModeFrom(true, 'hidden')).toBe('rumors');
    expect(screenModeFrom(true, 'cast')).toBe('both');
  });

  it('round-trips every mode through its writes', () => {
    for (const mode of ['off', 'townies', 'rumors', 'both'] as ScreenMode[]) {
      const w = writesForMode(mode);
      expect(screenModeFrom(w.boardOn, w.displayMode)).toBe(mode);
    }
  });
});

describe('townie crowding', () => {
  it('is quiet with room to spare', () => {
    expect(townieCrowding('both', 3).level).toBe('ok');
    expect(townieCrowding('townies', 9).level).toBe('ok');
  });

  it('warns at the limit only when townies are on screen', () => {
    expect(townieCrowding('both', TOWNIE_FIT.both)).toMatchObject({ level: 'full' });
    expect(townieCrowding('both', TOWNIE_FIT.both).message).toMatch(/one more will squish/i);
    expect(townieCrowding('rumors', TOWNIE_FIT.both).level).toBe('ok');
  });

  it('says how many to unmark on the combined screen, and offers Townies only', () => {
    const c = townieCrowding('both', TOWNIE_FIT.both + 2);
    expect(c.level).toBe('over');
    expect(c.message).toMatch(/unmark 2/i);
    expect(c.message).toMatch(/townies only/i);
    expect(c.message).toMatch(/squished now/i);
  });

  it('checks Townies-only against its own, larger limit', () => {
    expect(townieCrowding('townies', TOWNIE_FIT.both + 1).level).toBe('ok');
    const c = townieCrowding('townies', TOWNIE_FIT.townies + 1);
    expect(c.level).toBe('over');
    expect(c.message).toMatch(/unmark 1\./i);
    expect(c.message).not.toMatch(/townies only/i);
  });

  it('warns ahead of time when the screen is off or on rumors', () => {
    const c = townieCrowding('off', TOWNIE_FIT.both + 1);
    expect(c.level).toBe('over');
    expect(c.message).not.toMatch(/squished now/i);
  });
});

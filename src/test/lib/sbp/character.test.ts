import { describe, it, expect } from 'vitest';
import {
  clearChoicesAbove,
  dormantLevels,
  levelDown,
  levelUp,
  setLevel,
  withChoices,
} from '../../../lib/sbp/character';
import { scooper } from './fixtures';

describe('character level helpers', () => {
  it('clamps to 1..20 and returns the same object when nothing changes', () => {
    const c = scooper();
    expect(setLevel(c, 0).level).toBe(1);
    expect(setLevel(c, 99).level).toBe(20);
    expect(setLevel(c, 3.9).level).toBe(3);
    expect(setLevel(c, 1)).toBe(c);
    expect(levelDown(c).level).toBe(1);
    expect(levelUp(c).level).toBe(2);
  });

  it('never mutates the input', () => {
    const c = scooper();
    const next = withChoices(setLevel(c, 4), 4, { asiOrFeat: { type: 'asi', increases: { STR: 2 } } });
    expect(c.level).toBe(1);
    expect(c.choices['4']).toBeUndefined();
    expect(next.choices['4']?.asiOrFeat).toBeDefined();
    expect(next.choices['1']).toEqual(c.choices['1']);
  });

  it('tracks dormant levels and clears them on demand', () => {
    let c = withChoices(setLevel(scooper(), 8), 8, { asiOrFeat: { type: 'asi', increases: { STR: 2 } } });
    c = withChoices(c, 4, { asiOrFeat: { type: 'asi', increases: { DEX: 2 } } });
    c = withChoices(c, 12, {});
    expect(dormantLevels(setLevel(c, 3))).toEqual([4, 8]);
    expect(dormantLevels(c)).toEqual([]);
    const cleared = clearChoicesAbove(setLevel(c, 5), 5);
    expect(Object.keys(cleared.choices).sort()).toEqual(['1', '4']);
  });
});

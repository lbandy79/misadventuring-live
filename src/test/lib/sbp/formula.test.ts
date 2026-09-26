import { describe, it, expect } from 'vitest';
import { evaluateFormula } from '../../../lib/sbp/formula';

const ctx = { level: 5, proficiency_bonus: 3, STR: 1, DEX: 2, CON: 3, INT: -1, WIS: 0, CHA: 4 };

describe('evaluateFormula', () => {
  it('evaluates the forms the data actually uses', () => {
    expect(evaluateFormula('level + CON', ctx)).toBe(8);
    expect(evaluateFormula('proficiency_bonus', ctx)).toBe(3);
    expect(evaluateFormula('level + CHA', ctx)).toBe(9);
  });

  it('handles arithmetic, precedence, parentheses and negatives', () => {
    expect(evaluateFormula('2 * level + 1', ctx)).toBe(11);
    expect(evaluateFormula('(level + 1) * 2', ctx)).toBe(12);
    expect(evaluateFormula('level / 2', ctx)).toBe(2);
    expect(evaluateFormula('-INT', ctx)).toBe(1);
    expect(evaluateFormula('level - CHA - 1', ctx)).toBe(0);
  });

  it('returns null instead of throwing on anything it does not understand', () => {
    expect(evaluateFormula('level + hp', ctx)).toBeNull();
    expect(evaluateFormula('level +', ctx)).toBeNull();
    expect(evaluateFormula('(level', ctx)).toBeNull();
    expect(evaluateFormula('level / 0', ctx)).toBeNull();
    expect(evaluateFormula('', ctx)).toBeNull();
    expect(evaluateFormula('alert(1)', ctx)).toBeNull();
  });
});

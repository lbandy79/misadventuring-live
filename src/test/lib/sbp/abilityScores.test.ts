import { describe, it, expect } from 'vitest';
import {
  abilityModifier,
  abilityScoreConfigFrom,
  DEFAULT_ABILITY_SCORE_CONFIG,
  pointBuyCost,
  validateBaseScores,
} from '../../../lib/sbp/abilityScores';
import { originsFixture } from './fixtures';

const scores = (s: number[]) => ({ STR: s[0], DEX: s[1], CON: s[2], INT: s[3], WIS: s[4], CHA: s[5] });

describe('abilityModifier', () => {
  it('rounds down from 10', () => {
    expect([8, 9, 10, 11, 12, 15, 20, 1].map(abilityModifier)).toEqual([-1, -1, 0, 0, 1, 2, 5, -5]);
  });
});

describe('validateBaseScores', () => {
  it('standard array must be used exactly once each, in any order', () => {
    expect(validateBaseScores('standard_array', scores([15, 14, 13, 12, 10, 8]))).toEqual([]);
    expect(validateBaseScores('standard_array', scores([8, 10, 12, 13, 14, 15]))).toEqual([]);
    expect(validateBaseScores('standard_array', scores([15, 15, 13, 12, 10, 8]))).toHaveLength(1);
  });

  it('point buy respects the budget and purchasable range', () => {
    expect(pointBuyCost(scores([15, 15, 15, 8, 8, 8]))).toBe(27);
    expect(validateBaseScores('point_buy', scores([15, 15, 15, 8, 8, 8]))).toEqual([]);
    expect(validateBaseScores('point_buy', scores([15, 15, 15, 9, 8, 8]))[0]).toMatch(/28 of 27/);
    expect(validateBaseScores('point_buy', scores([16, 8, 8, 8, 8, 8]))[0]).toMatch(/between 8 and 15/);
  });

  it('rolled scores must be whole numbers in range', () => {
    expect(validateBaseScores('rolled', scores([3, 18, 10, 11, 12, 13]))).toEqual([]);
    expect(validateBaseScores('rolled', scores([2, 18, 10, 11, 12, 13]))).toHaveLength(1);
    expect(validateBaseScores('rolled', scores([19, 18, 10, 11, 12, 13]))).toHaveLength(1);
  });

  it('reports missing abilities before anything else', () => {
    expect(validateBaseScores('rolled', { STR: 10 })).toEqual(['Missing scores for DEX, CON, INT, WIS, CHA.']);
  });
});

describe('abilityScoreConfigFrom', () => {
  it('falls back to defaults when the origins file has no block', () => {
    expect(abilityScoreConfigFrom(originsFixture())).toEqual(DEFAULT_ABILITY_SCORE_CONFIG);
    expect(abilityScoreConfigFrom(null)).toEqual(DEFAULT_ABILITY_SCORE_CONFIG);
  });

  it('lets the data override the numbers', () => {
    const origins = { ...originsFixture(), $ability_scores: { standard_array: [16, 14, 12, 10, 10, 8], point_buy: { budget: 30 } } };
    const cfg = abilityScoreConfigFrom(origins as never);
    expect(cfg.standardArray).toEqual([16, 14, 12, 10, 10, 8]);
    expect(cfg.pointBuy.budget).toBe(30);
    expect(cfg.pointBuy.costs).toEqual(DEFAULT_ABILITY_SCORE_CONFIG.pointBuy.costs);
  });
});

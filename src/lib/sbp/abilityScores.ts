/**
 * Ability score generation — the player picks a method per character.
 *
 * The numbers (standard array, point-buy costs and budget, rolled range)
 * default here but can be overridden by an optional `$ability_scores` block
 * in the origins rules file, so a rebalance is an upload, not a code change.
 */

import type { AbilityKey, SbpOriginsFile } from './types';
import type { AbilityScoreMethod, AbilityScores } from './character';

export const ABILITY_KEYS: AbilityKey[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

export interface AbilityScoreConfig {
  standardArray: number[];
  pointBuy: {
    budget: number;
    /** Score → cost. Scores absent here can't be bought. */
    costs: Record<string, number>;
  };
  rolled: { min: number; max: number };
}

export const DEFAULT_ABILITY_SCORE_CONFIG: AbilityScoreConfig = {
  standardArray: [15, 14, 13, 12, 10, 8],
  pointBuy: {
    budget: 27,
    costs: { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 },
  },
  rolled: { min: 3, max: 18 },
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Read `$ability_scores` from the origins file if present; else defaults. */
export function abilityScoreConfigFrom(origins?: SbpOriginsFile | null): AbilityScoreConfig {
  const raw = (origins as Record<string, unknown> | null | undefined)?.$ability_scores;
  if (!isRecord(raw)) return DEFAULT_ABILITY_SCORE_CONFIG;
  const d = DEFAULT_ABILITY_SCORE_CONFIG;
  const pb = isRecord(raw.point_buy) ? raw.point_buy : {};
  const rolled = isRecord(raw.rolled) ? raw.rolled : {};
  return {
    standardArray: Array.isArray(raw.standard_array) && raw.standard_array.every((n) => typeof n === 'number')
      ? (raw.standard_array as number[])
      : d.standardArray,
    pointBuy: {
      budget: typeof pb.budget === 'number' ? pb.budget : d.pointBuy.budget,
      costs: isRecord(pb.costs) ? (pb.costs as Record<string, number>) : d.pointBuy.costs,
    },
    rolled: {
      min: typeof rolled.min === 'number' ? rolled.min : d.rolled.min,
      max: typeof rolled.max === 'number' ? rolled.max : d.rolled.max,
    },
  };
}

export const abilityModifier = (score: number): number => Math.floor((score - 10) / 2);

export const formatModifier = (mod: number): string => (mod >= 0 ? `+${mod}` : `${mod}`);

/** Total point-buy cost of a set of base scores; null if any score isn't purchasable. */
export function pointBuyCost(base: AbilityScores, config = DEFAULT_ABILITY_SCORE_CONFIG): number | null {
  let total = 0;
  for (const key of ABILITY_KEYS) {
    const cost = config.pointBuy.costs[String(base[key])];
    if (cost === undefined) return null;
    total += cost;
  }
  return total;
}

/**
 * Check base scores against the chosen method. Returns human-readable
 * problems; empty means valid.
 */
export function validateBaseScores(
  method: AbilityScoreMethod,
  base: Partial<AbilityScores>,
  config = DEFAULT_ABILITY_SCORE_CONFIG,
): string[] {
  const issues: string[] = [];
  const missing = ABILITY_KEYS.filter((k) => typeof base[k] !== 'number');
  if (missing.length) {
    issues.push(`Missing scores for ${missing.join(', ')}.`);
    return issues;
  }
  const scores = base as AbilityScores;

  switch (method) {
    case 'standard_array': {
      const want = [...config.standardArray].sort((a, b) => a - b).join(',');
      const got = ABILITY_KEYS.map((k) => scores[k]).sort((a, b) => a - b).join(',');
      if (want !== got) issues.push(`Standard array must use exactly ${config.standardArray.join(', ')}, each once.`);
      break;
    }
    case 'point_buy': {
      const cost = pointBuyCost(scores, config);
      if (cost === null) {
        const range = Object.keys(config.pointBuy.costs).map(Number).sort((a, b) => a - b);
        issues.push(`Point buy scores must be between ${range[0]} and ${range[range.length - 1]}.`);
      } else if (cost > config.pointBuy.budget) {
        issues.push(`Point buy spends ${cost} of ${config.pointBuy.budget} points.`);
      }
      break;
    }
    case 'rolled': {
      for (const k of ABILITY_KEYS) {
        const v = scores[k];
        if (!Number.isInteger(v) || v < config.rolled.min || v > config.rolled.max) {
          issues.push(`${k} must be a whole number from ${config.rolled.min} to ${config.rolled.max}.`);
        }
      }
      break;
    }
    default:
      issues.push(`Unknown ability score method "${String(method)}".`);
  }
  return issues;
}

/**
 * SBP character — the stored shape and pure helpers for changing level.
 *
 * We store what the player CHOSE, never computed stats (BRIEF §5). Every
 * level-gated choice lives under the level it belongs to, in `choices`.
 * Derivation only reads choices at levels ≤ the character's current level,
 * so levelling down hides higher choices without deleting them ("dormant")
 * and levelling back up brings them straight back. `clearChoicesAbove` is
 * the deliberate discard.
 *
 * Firestore rules (`sbp-characters`) require every key of `SbpCharacter`
 * except `id`, and `level` to be an int in 1..20.
 */

import type { AbilityKey } from './types';

export type AbilityScoreMethod = 'standard_array' | 'point_buy' | 'rolled';

export type AbilityScores = Record<AbilityKey, number>;

/** +2 to one ability or +1 to two — the increases must total 2. */
export interface AsiChoice {
  type: 'asi';
  increases: Partial<Record<AbilityKey, number>>;
}

export interface FeatChoice {
  type: 'feat';
  featId: string;
  /** For feats whose `grants.skills_choose` asks the player to pick. */
  skills?: string[];
}

/** Choices that belong to one level. Which keys apply depends on the rules. */
export interface LevelChoices {
  /** At `class.archetype.entry_level`. */
  archetypeId?: string;
  /** At every level whose row has `asi_or_feat: true`. */
  asiOrFeat?: AsiChoice | FeatChoice;
  /** Level 1: picks from `class.proficiencies.skills.from`. */
  classSkills?: string[];
  /** Level 1, only when `species.size` is `{ choose_one }`. */
  speciesSize?: string;
  /** Level 1, only when `background.tool_proficiencies.choose` is set. */
  backgroundTools?: string[];
  /** Level 1, only when `background.ability_score_increase.mode` is `flexible`. */
  backgroundAsi?: Partial<Record<AbilityKey, number>>;
}

export interface SbpCharacter {
  /** Firestore doc id; absent before first save. */
  id?: string;
  ownerUid: string;
  ownerEmail: string;
  name: string;
  level: number;
  speciesId: string;
  backgroundId: string;
  classId: string;
  abilityScores: {
    method: AbilityScoreMethod;
    /** Before any bonuses. */
    base: AbilityScores;
  };
  /** Keyed by level as a string (Firestore map keys are strings). */
  choices: Record<string, LevelChoices>;
  /** `meta.uploadedAt` of each rules doc this was last edited against. */
  rulesVersion: { classes: number | null; origins: number | null };
  createdAt: number;
  updatedAt: number;
}

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 20;

export const clampLevel = (level: number): number =>
  Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, Math.trunc(level)));

/** Change level. Choices are untouched — higher ones go dormant. */
export function setLevel(character: SbpCharacter, level: number): SbpCharacter {
  const next = clampLevel(level);
  if (next === character.level) return character;
  return { ...character, level: next };
}

export const levelUp = (c: SbpCharacter) => setLevel(c, c.level + 1);
export const levelDown = (c: SbpCharacter) => setLevel(c, c.level - 1);

/** Levels above the current one that still hold choices. */
export function dormantLevels(character: SbpCharacter): number[] {
  return Object.keys(character.choices)
    .map(Number)
    .filter((lvl) => lvl > character.level && Object.keys(character.choices[String(lvl)] ?? {}).length > 0)
    .sort((a, b) => a - b);
}

/** The deliberate discard: drop every choice stored above `level`. */
export function clearChoicesAbove(character: SbpCharacter, level: number): SbpCharacter {
  const choices: Record<string, LevelChoices> = {};
  for (const [key, value] of Object.entries(character.choices)) {
    if (Number(key) <= level) choices[key] = value;
  }
  return { ...character, choices };
}

export const choicesAt = (character: SbpCharacter, level: number): LevelChoices =>
  character.choices[String(level)] ?? {};

/** Merge a partial set of choices into one level. */
export function withChoices(
  character: SbpCharacter,
  level: number,
  patch: Partial<LevelChoices>,
): SbpCharacter {
  const key = String(level);
  return {
    ...character,
    choices: { ...character.choices, [key]: { ...(character.choices[key] ?? {}), ...patch } },
  };
}

/** Levels that count for derivation: 1..current, ascending. */
export function activeLevels(character: SbpCharacter): number[] {
  return Array.from({ length: clampLevel(character.level) }, (_, i) => i + 1);
}

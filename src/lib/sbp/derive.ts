/**
 * Derivation: rules data + a character's choices → everything the sheet shows
 * at the character's current level.
 *
 * Pure. No Firebase, type-only imports of the rules shapes. Everything is
 * recomputed from scratch on every call, which is what makes level up/down
 * trivial: change `level`, derive again.
 *
 * Only choices stored at levels ≤ the current level are read (see
 * character.ts). Anything the rules ask for that the player hasn't chosen
 * yet is reported in `pendingChoices` rather than guessed, so the wizard and
 * the sheet can prompt for exactly what's missing.
 *
 * HP uses the fixed average per level (decided 2026-09-26).
 */

import type {
  AbilityKey,
  ArchetypeOption,
  Background,
  ClassLevel,
  Feat,
  Maturity,
  PlaytestFlag,
  SbpClass,
  SbpClassesFile,
  SbpOriginsFile,
  SbpRulesDoc,
  Species,
  SwapFlag,
  Uses,
} from './types';
import type { AsiChoice, FeatChoice, LevelChoices, SbpCharacter } from './character';
import { activeLevels, choicesAt, dormantLevels } from './character';
import { ABILITY_KEYS, abilityModifier, abilityScoreConfigFrom, validateBaseScores } from './abilityScores';
import { evaluateFormula, type FormulaContext } from './formula';

// ─── Output types ─────────────────────────────────────────────────────────────

export interface AbilityBlock {
  base: number;
  bonus: number;
  score: number;
  modifier: number;
}

export type FeatureSource = 'class' | 'archetype' | 'species' | 'background' | 'feat';

export interface ContentFlags {
  playtest?: PlaytestFlag;
  maturity?: Maturity;
  /** Internal only — never render on a public surface. */
  swap?: SwapFlag;
}

export interface DerivedUses {
  /** Resolved count, or null when the data gives something we can't count. */
  count: number | null;
  recharge: string;
  raw: Uses | string;
}

export interface DerivedFeature {
  id: string;
  name: string;
  text: string;
  source: FeatureSource;
  /** Id of the class / archetype / species / background / feat it came from. */
  sourceId: string;
  /** Level at which the character gained it. */
  level: number;
  uses?: DerivedUses;
  /** Evaluated `formula`, when the entry has one. */
  formulaValue?: number | null;
  formula?: string;
  grants?: Record<string, unknown>;
  flags: ContentFlags;
}

export type PendingChoiceKind =
  | 'archetype'
  | 'asi_or_feat'
  | 'class_skills'
  | 'species_size'
  | 'background_tools'
  | 'background_asi'
  | 'feat_skills';

export interface PendingChoice {
  level: number;
  kind: PendingChoiceKind;
  label: string;
  /** Ids or names to choose from, when the rules enumerate them. */
  options?: string[];
  choose?: number;
  /** For `feat_skills`: which feat is asking. */
  featId?: string;
}

export interface DerivedSpellcasting {
  ability: AbilityKey;
  modifier: number;
  saveDC: number;
  attackBonus: number;
  /** Slots by spell level, index 0 = 1st-level slots. */
  slots: number[];
  cantripsKnown: number | null;
  spellsKnown: number | null;
  preparesOrKnows: string | null;
  spellListId: string;
  /** Always false until a spells file exists and is loaded. */
  listLoaded: false;
}

export interface NamedRef {
  id: string;
  name: string;
  flags: ContentFlags;
}

export interface DerivedCharacter {
  level: number;
  /** False when a reference didn't resolve or the rules docs are missing. */
  ok: boolean;
  issues: string[];

  species: NamedRef | null;
  background: NamedRef | null;
  class: NamedRef | null;
  archetype: NamedRef | null;

  abilities: Record<AbilityKey, AbilityBlock>;
  proficiencyBonus: number;
  hitPoints: { max: number; hitDie: number | null; note: string };
  savingThrows: AbilityKey[];
  skills: string[];
  armor: string[];
  weapons: string[];
  tools: string[];
  speed: Record<string, number>;
  size: string | null;

  features: DerivedFeature[];
  spellcasting: DerivedSpellcasting | null;
  /** Non-standard per-level values from the class row, e.g. sneak_attack. */
  levelExtras: Record<string, unknown>;
  /** Grants that aren't features/skills/speed — for the sheet to list. */
  otherGrants: Array<{ source: string; key: string; value: unknown }>;

  pendingChoices: PendingChoice[];
  dormantLevels: number[];
  rulesOutdated: { classes: boolean; origins: boolean };
}

export interface RulesInput {
  classes: SbpRulesDoc<SbpClassesFile> | null | undefined;
  origins: SbpRulesDoc<SbpOriginsFile> | null | undefined;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STANDARD_LEVEL_KEYS = new Set([
  'level', 'proficiency_bonus', 'features', 'asi_or_feat', 'archetype_choice',
  'archetype_features', 'cantrips_known', 'spells_known', 'maturity', 'playtest',
]);

const flagsOf = (x: { playtest?: PlaytestFlag; maturity?: Maturity; swap?: SwapFlag } | null | undefined): ContentFlags => {
  const f: ContentFlags = {};
  if (x?.playtest) f.playtest = x.playtest;
  if (x?.maturity) f.maturity = x.maturity;
  if (x?.swap) f.swap = x.swap;
  return f;
};

const ref = (x: { id: string; name: string } & Record<string, unknown>): NamedRef =>
  ({ id: x.id, name: x.name, flags: flagsOf(x as never) });

const parseDie = (hitDie: string | number | undefined): number | null => {
  if (typeof hitDie === 'number') return hitDie;
  const m = typeof hitDie === 'string' ? /d\s*(\d+)/i.exec(hitDie) : null;
  return m ? Number(m[1]) : null;
};

function resolveUses(uses: Uses | string | undefined, pb: number): DerivedUses | undefined {
  if (uses === undefined) return undefined;
  if (typeof uses === 'string') return { count: null, recharge: uses, raw: uses };
  const count = uses.count === 'proficiency_bonus' ? pb : typeof uses.count === 'number' ? uses.count : null;
  return { count, recharge: uses.recharge, raw: uses };
}

const unique = (xs: string[]) => Array.from(new Set(xs));

// ─── Main ─────────────────────────────────────────────────────────────────────

export function deriveCharacter(character: SbpCharacter, rules: RulesInput): DerivedCharacter {
  const issues: string[] = [];
  const pending: PendingChoice[] = [];
  const level = Math.min(20, Math.max(1, Math.trunc(character.level)));
  const classesFile = rules.classes?.data ?? null;
  const originsFile = rules.origins?.data ?? null;

  const emptyAbilities = Object.fromEntries(
    ABILITY_KEYS.map((k) => [k, { base: character.abilityScores.base[k] ?? 10, bonus: 0, score: 0, modifier: 0 }]),
  ) as Record<AbilityKey, AbilityBlock>;

  const result: DerivedCharacter = {
    level,
    ok: true,
    issues,
    species: null,
    background: null,
    class: null,
    archetype: null,
    abilities: emptyAbilities,
    proficiencyBonus: 2,
    hitPoints: { max: 0, hitDie: null, note: '' },
    savingThrows: [],
    skills: [],
    armor: [],
    weapons: [],
    tools: [],
    speed: {},
    size: null,
    features: [],
    spellcasting: null,
    levelExtras: {},
    otherGrants: [],
    pendingChoices: pending,
    dormantLevels: dormantLevels(character),
    rulesOutdated: {
      classes: rules.classes ? rules.classes.meta.uploadedAt !== character.rulesVersion.classes : false,
      origins: rules.origins ? rules.origins.meta.uploadedAt !== character.rulesVersion.origins : false,
    },
  };

  if (!classesFile || !originsFile) {
    issues.push(!classesFile ? 'Classes rules are not loaded.' : 'Origins rules are not loaded.');
    result.ok = false;
    return result;
  }

  // ── Resolve references ──────────────────────────────────────────────────
  const species: Species | undefined = originsFile.species.find((s) => s.id === character.speciesId);
  const background: Background | undefined = originsFile.backgrounds.find((b) => b.id === character.backgroundId);
  const klass: SbpClass | undefined = classesFile.classes.find((c) => c.id === character.classId);
  if (!species) issues.push(`Species "${character.speciesId}" not found.`);
  if (!background) issues.push(`Background "${character.backgroundId}" not found.`);
  if (!klass) issues.push(`Class "${character.classId}" not found.`);
  if (!species || !background || !klass) {
    result.ok = false;
    return result;
  }
  result.species = ref(species);
  result.background = ref(background);
  result.class = ref(klass);

  const featById = new Map<string, Feat>(originsFile.feats.map((f) => [f.id, f]));
  const levels = activeLevels(character);
  const levelRow = (n: number): ClassLevel | undefined => klass.levels.find((L) => L.level === n) ?? klass.levels[n - 1];
  const currentRow = levelRow(level);
  if (!currentRow) issues.push(`Class "${klass.id}" has no level ${level} entry.`);
  const pb = currentRow?.proficiency_bonus ?? 2;
  result.proficiencyBonus = pb;

  // ── Level 1 choices ─────────────────────────────────────────────────────
  const c1 = choicesAt(character, 1);

  // Ability scores: base + background increase + ASI choices.
  const config = abilityScoreConfigFrom(originsFile);
  for (const msg of validateBaseScores(character.abilityScores.method, character.abilityScores.base, config)) {
    issues.push(`Ability scores: ${msg}`);
  }
  const bonus: Record<AbilityKey, number> = { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 };
  const addIncreases = (inc: Partial<Record<AbilityKey, number>> | undefined, label: string) => {
    if (!inc) return;
    for (const [k, v] of Object.entries(inc)) {
      if (!ABILITY_KEYS.includes(k as AbilityKey) || typeof v !== 'number') {
        issues.push(`${label}: invalid ability increase ${k}.`);
        continue;
      }
      bonus[k as AbilityKey] += v;
    }
  };

  const asi = background.ability_score_increase;
  if (asi?.mode === 'flexible') {
    const opts = asi.options ?? [];
    const chosen = c1.backgroundAsi;
    if (!chosen) {
      pending.push({ level: 1, kind: 'background_asi', label: `Spread +2/+1 or +1/+1/+1 across ${opts.join(', ')}`, options: opts });
    } else {
      const total = Object.values(chosen).reduce((a, b) => a + (b ?? 0), 0);
      const outside = Object.keys(chosen).filter((k) => !opts.includes(k as AbilityKey));
      if (total !== 3 || outside.length) issues.push('Background ability increase must total +3 across the listed abilities.');
      addIncreases(chosen, 'Background');
    }
  } else {
    addIncreases(asi?.values, 'Background');
  }

  // Class skills (choose N from list) — level 1.
  const skillRule = klass.proficiencies?.skills as { choose?: number; from?: string[] } | undefined;
  const skills: string[] = [...(background.skill_proficiencies ?? [])];
  if (skillRule?.choose && Array.isArray(skillRule.from)) {
    const chosen = c1.classSkills ?? [];
    const valid = chosen.filter((s) => skillRule.from!.includes(s));
    if (valid.length !== chosen.length) issues.push('Class skills include an option the class does not offer.');
    if (valid.length < skillRule.choose) {
      pending.push({ level: 1, kind: 'class_skills', label: `Choose ${skillRule.choose} class skills`, options: skillRule.from, choose: skillRule.choose });
    } else if (valid.length > skillRule.choose) {
      issues.push(`Class allows ${skillRule.choose} skills; ${valid.length} chosen.`);
    }
    skills.push(...valid);
  }

  // Species size.
  if (typeof species.size === 'string') {
    result.size = species.size;
  } else if (species.size && Array.isArray(species.size.choose_one)) {
    const opts = species.size.choose_one;
    if (c1.speciesSize && opts.includes(c1.speciesSize)) result.size = c1.speciesSize;
    else pending.push({ level: 1, kind: 'species_size', label: 'Choose a size', options: opts, choose: 1 });
  }

  // Tools: class + background fixed + background choice.
  const tools: string[] = [
    ...((klass.proficiencies?.tools as string[] | undefined) ?? []),
    ...(background.tool_proficiencies?.fixed ?? []),
  ];
  const toolChoose = background.tool_proficiencies?.choose;
  if (toolChoose) {
    const from = background.tool_proficiencies?.from ?? [];
    const chosen = c1.backgroundTools ?? [];
    const valid = from.length ? chosen.filter((t) => from.includes(t)) : chosen;
    if (valid.length < toolChoose) {
      pending.push({ level: 1, kind: 'background_tools', label: `Choose ${toolChoose} tool proficiencies`, options: from, choose: toolChoose });
    }
    tools.push(...valid);
  }

  // Speed from species.
  const speed: Record<string, number> = { ...(species.speed ?? {}) };

  // ── Features ────────────────────────────────────────────────────────────
  const features: DerivedFeature[] = [];
  const otherGrants: DerivedCharacter['otherGrants'] = [];

  // Formula context uses final modifiers, so compute ability totals first
  // from everything that's level-independent, then apply ASIs, then features.
  const asiLevels = levels.filter((n) => levelRow(n)?.asi_or_feat);
  const chosenFeats: Array<{ level: number; feat: Feat; choice: FeatChoice }> = [];
  for (const n of asiLevels) {
    const choice = choicesAt(character, n).asiOrFeat;
    if (!choice) {
      pending.push({ level: n, kind: 'asi_or_feat', label: `Level ${n}: ability score increase or feat` });
      continue;
    }
    if (choice.type === 'asi') {
      const inc = (choice as AsiChoice).increases;
      const total = Object.values(inc).reduce((a, b) => a + (b ?? 0), 0);
      const tooBig = Object.values(inc).some((v) => (v ?? 0) > 2 || (v ?? 0) < 0);
      if (total !== 2 || tooBig) issues.push(`Level ${n}: ability increase must be +2 to one ability or +1 to two.`);
      addIncreases(inc, `Level ${n}`);
    } else if (choice.type === 'feat') {
      const feat = featById.get(choice.featId);
      if (!feat) {
        issues.push(`Level ${n}: feat "${choice.featId}" not found.`);
        continue;
      }
      const need = feat.prerequisite?.species;
      if (need && need !== species.id) issues.push(`Level ${n}: ${feat.name} requires a different species.`);
      chosenFeats.push({ level: n, feat, choice });
    }
  }

  const abilities = {} as Record<AbilityKey, AbilityBlock>;
  for (const k of ABILITY_KEYS) {
    const base = character.abilityScores.base[k] ?? 10;
    const score = base + bonus[k];
    abilities[k] = { base, bonus: bonus[k], score, modifier: abilityModifier(score) };
  }
  result.abilities = abilities;

  const ctx: FormulaContext = {
    level,
    proficiency_bonus: pb,
    STR: abilities.STR.modifier,
    DEX: abilities.DEX.modifier,
    CON: abilities.CON.modifier,
    INT: abilities.INT.modifier,
    WIS: abilities.WIS.modifier,
    CHA: abilities.CHA.modifier,
  };

  const applyGrants = (grants: Record<string, unknown> | undefined, source: string, featChoice?: FeatChoice) => {
    if (!grants) return;
    for (const [key, value] of Object.entries(grants)) {
      if (key === 'skills' && Array.isArray(value)) {
        skills.push(...(value as string[]));
      } else if (key === 'skills_choose' && value && typeof value === 'object') {
        const rule = value as { choose?: number; from?: string[] };
        const chosen = featChoice?.skills ?? [];
        const valid = rule.from ? chosen.filter((s) => rule.from!.includes(s)) : chosen;
        if (valid.length < (rule.choose ?? 1)) {
          pending.push({
            level: 1, kind: 'feat_skills', label: `Choose ${rule.choose ?? 1} skill(s) from ${source}`,
            options: rule.from, choose: rule.choose ?? 1, featId: featChoice?.featId,
          });
        }
        skills.push(...valid);
      } else if (key === 'speed' && value && typeof value === 'object') {
        for (const [mode, v] of Object.entries(value as Record<string, unknown>)) {
          if (typeof v === 'number') speed[mode] = Math.max(speed[mode] ?? 0, v);
          else if (typeof v === 'string' && typeof speed[v] === 'number') speed[mode] = speed[v];
        }
      } else {
        otherGrants.push({ source, key, value });
      }
    }
  };

  const pushFeature = (f: Omit<DerivedFeature, 'flags' | 'uses' | 'formulaValue'> & {
    flags?: ContentFlags; uses?: Uses | string; formula?: string;
  }) => {
    features.push({
      ...f,
      flags: f.flags ?? {},
      uses: resolveUses(f.uses, pb),
      formulaValue: f.formula ? evaluateFormula(f.formula, ctx) : undefined,
    });
  };

  // Species traits.
  for (const trait of species.traits ?? []) {
    const unlock = trait.unlock_level ?? 1;
    if (unlock > level) continue;
    pushFeature({
      id: `${species.id}/${trait.id}`, name: trait.name, text: trait.text, source: 'species', sourceId: species.id,
      level: unlock, grants: trait.grants, flags: flagsOf(trait), uses: trait.uses, formula: trait.formula,
    });
    applyGrants(trait.grants, trait.name);
  }

  // Background origin feat.
  const originFeat = featById.get(background.origin_feat);
  if (originFeat) {
    pushFeature({
      id: originFeat.id, name: originFeat.name, text: originFeat.text, source: 'background', sourceId: background.id,
      level: 1, grants: originFeat.grants, flags: flagsOf(originFeat), uses: originFeat.uses,
    });
    applyGrants(originFeat.grants, originFeat.name);
  } else {
    issues.push(`Origin feat "${background.origin_feat}" not found.`);
  }

  // Class features by level.
  for (const n of levels) {
    const row = levelRow(n);
    if (!row) continue;
    for (const fid of row.features ?? []) {
      const body = klass.features[fid];
      if (!body) {
        issues.push(`Class feature "${fid}" (level ${n}) not found.`);
        continue;
      }
      pushFeature({
        id: `${klass.id}/${fid}`, name: body.name, text: body.text, source: 'class', sourceId: klass.id,
        level: n, grants: body.grants, flags: flagsOf(body), uses: body.uses, formula: body.formula,
      });
      applyGrants(body.grants, body.name);
    }
  }

  // Archetype.
  const archRule = klass.archetype;
  if (archRule && level >= archRule.entry_level) {
    const archetypeId = choicesAt(character, archRule.entry_level).archetypeId;
    const groupKey = archRule.choices_ref.replace(/^archetypes\./, '');
    const group = classesFile.archetypes[groupKey];
    if (!group) {
      issues.push(`Archetype group "${archRule.choices_ref}" not found.`);
    } else if (!archetypeId) {
      pending.push({
        level: archRule.entry_level, kind: 'archetype', label: `Choose a ${archRule.label}`,
        options: group.options.map((o) => o.id), choose: 1,
      });
    } else {
      const option: ArchetypeOption | undefined = group.options.find((o) => o.id === archetypeId);
      if (!option) {
        issues.push(`${archRule.label} "${archetypeId}" not found.`);
      } else {
        result.archetype = ref(option);
        for (const [lvlKey, feat] of Object.entries(option.features ?? {})) {
          const n = Number(lvlKey);
          if (!Number.isFinite(n) || n > level) continue;
          pushFeature({
            id: `${option.id}/${lvlKey}`, name: feat.name, text: feat.text, source: 'archetype', sourceId: option.id,
            level: n, grants: feat.grants as Record<string, unknown> | undefined, flags: flagsOf(feat as never),
            uses: feat.uses as Uses | undefined, formula: feat.formula as string | undefined,
          });
          applyGrants(feat.grants as Record<string, unknown> | undefined, feat.name);
        }
      }
    }
  }

  // Chosen feats.
  for (const { level: n, feat, choice } of chosenFeats) {
    pushFeature({
      id: feat.id, name: feat.name, text: feat.text, source: 'feat', sourceId: feat.id,
      level: n, grants: feat.grants, flags: flagsOf(feat), uses: feat.uses,
    });
    applyGrants(feat.grants, feat.name, choice);
  }

  features.sort((a, b) => a.level - b.level);
  result.features = features;
  result.otherGrants = otherGrants;
  result.skills = unique(skills).sort();
  result.tools = unique(tools);
  result.armor = unique((klass.proficiencies?.armor as string[] | undefined) ?? []);
  result.weapons = unique((klass.proficiencies?.weapons as string[] | undefined) ?? []);
  result.savingThrows = klass.saving_throws ?? [];
  result.speed = speed;

  // ── Hit points (fixed average) ──────────────────────────────────────────
  const die = parseDie(klass.hit_die);
  if (die === null) {
    issues.push(`Class "${klass.id}" has an unreadable hit die.`);
  } else {
    const con = abilities.CON.modifier;
    const perLevel = die / 2 + 1 + con;
    const max = die + con + (level - 1) * perLevel;
    result.hitPoints = {
      max: Math.max(1, max),
      hitDie: die,
      note: level === 1
        ? `${die} + CON (${con})`
        : `${die} + CON (${con}) at 1st, then ${die / 2 + 1} + CON per level × ${level - 1}`,
    };
  }

  // ── Spellcasting ────────────────────────────────────────────────────────
  if (klass.spellcasting) {
    const sc = klass.spellcasting;
    const table = classesFile.$slot_tables[sc.slot_progression] as Record<string, number[]> | undefined;
    const slots = table?.[String(level)];
    if (!Array.isArray(slots)) issues.push(`Slot table "${sc.slot_progression}" has no level ${level} row.`);
    const mod = abilities[sc.ability]?.modifier ?? 0;
    result.spellcasting = {
      ability: sc.ability,
      modifier: mod,
      saveDC: 8 + pb + mod,
      attackBonus: pb + mod,
      slots: Array.isArray(slots) ? slots : [],
      cantripsKnown: typeof currentRow?.cantrips_known === 'number' ? currentRow.cantrips_known : null,
      spellsKnown: typeof currentRow?.spells_known === 'number' ? currentRow.spells_known : null,
      preparesOrKnows: sc.prepares_or_knows ?? null,
      spellListId: sc.spell_list,
      listLoaded: false,
    };
  }

  // ── Level extras (anything non-standard on the current row) ─────────────
  if (currentRow) {
    for (const [k, v] of Object.entries(currentRow)) {
      if (!STANDARD_LEVEL_KEYS.has(k)) result.levelExtras[k] = v;
    }
  }

  pending.sort((a, b) => a.level - b.level);
  result.ok = issues.length === 0;
  return result;
}

/** Which choice kinds a given level asks for, given the rules. Handy for the wizard. */
export function choiceKindsAtLevel(klass: SbpClass, level: number): PendingChoiceKind[] {
  const kinds: PendingChoiceKind[] = [];
  if (klass.archetype?.entry_level === level) kinds.push('archetype');
  const row = klass.levels.find((L) => L.level === level) ?? klass.levels[level - 1];
  if (row?.asi_or_feat) kinds.push('asi_or_feat');
  return kinds;
}

export type { LevelChoices };

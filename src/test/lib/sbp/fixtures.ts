/**
 * Synthetic SBP rules for tests. Deliberately invented content — the real
 * files are unpublished IP and never enter the repo (BRIEF §3).
 */

import type { SbpClassesFile, SbpOriginsFile, SbpRulesDoc } from '../../../lib/sbp/types';
import type { SbpCharacter } from '../../../lib/sbp/character';

const ASI_LEVELS = [4, 8, 12, 16, 19];

export function classesFixture(): SbpClassesFile {
  const levels = Array.from({ length: 20 }, (_, i) => {
    const n = i + 1;
    return {
      level: n,
      proficiency_bonus: 2 + Math.floor((n - 1) / 4),
      features: n === 1 ? ['stir', 'spellcasting'] : n === 2 ? ['sprinkle'] : n === 5 ? ['double_scoop'] : [],
      asi_or_feat: ASI_LEVELS.includes(n),
      archetype_choice: n === 1,
      ...(n >= 3 ? { archetype_features: true } : {}),
      ...(n === 5 ? { scoops: '2d6' } : {}),
      cantrips_known: Math.min(2 + Math.floor(n / 4), 6),
      spells_known: n + 1,
    };
  });
  return {
    $schema_version: 'test',
    $slot_tables: {
      test_full: Object.fromEntries(
        Array.from({ length: 20 }, (_, i) => [String(i + 1), [Math.min(4, i + 2), i >= 2 ? 2 : 0, 0, 0, 0, 0, 0, 0, 0]]),
      ),
    },
    classes: [
      {
        id: 'class.scooper',
        name: 'Scooper',
        hit_die: 'd8',
        hp_at_1st: '8 + CON modifier',
        hp_per_level: '1d8 (or 5) + CON modifier',
        primary_ability: 'CHA',
        saving_throws: ['WIS', 'CHA'],
        proficiencies: {
          armor: ['light'],
          weapons: ['simple'],
          tools: ['scoop'],
          skills: { choose: 2, from: ['Arcana', 'Deception', 'Performance', 'Stealth'] },
        },
        spellcasting: { ability: 'CHA', spell_list: 'spell_list.scooper', slot_progression: 'test_full', prepares_or_knows: 'knows' },
        archetype: { label: 'Flavour', entry_level: 1, first_feature_level: 3, choices_ref: 'archetypes.flavours' },
        features: {
          stir: { name: 'Stir', level: 1, text: 'Stir it.', uses: { count: 'proficiency_bonus', recharge: 'long_rest' } },
          spellcasting: { name: 'Spellcasting', level: 1, text: 'Cast.' },
          sprinkle: { name: 'Sprinkle', level: 2, text: 'Sprinkle.', formula: 'level + CHA', playtest: { status: 'watching' } },
          double_scoop: { name: 'Double Scoop', level: 5, text: 'Two.', maturity: 'draft' },
        },
        levels,
      },
      {
        id: 'class.bruiser',
        name: 'Bruiser',
        hit_die: 'd12',
        saving_throws: ['STR', 'CON'],
        proficiencies: { armor: ['all'], weapons: ['martial'], tools: [], skills: { choose: 2, from: ['Athletics', 'Survival'] } },
        archetype: { label: 'Stance', entry_level: 3, first_feature_level: 3, choices_ref: 'archetypes.stances' },
        features: { smash: { name: 'Smash', level: 1, text: 'Smash.' } },
        levels: levels.map((L) => ({
          ...L,
          features: L.level === 1 ? ['smash'] : [],
          archetype_choice: L.level === 3,
          cantrips_known: undefined,
          spells_known: undefined,
        })),
      },
    ],
    archetypes: {
      flavours: {
        options: [
          {
            id: 'archetype.scooper.mint',
            name: 'Mint',
            features: { '3': { name: 'Cool Breath', text: 'Brr.' }, '7': { name: 'Frost', text: 'Colder.' } },
          },
          { id: 'archetype.scooper.fudge', name: 'Fudge', features: { '3': { name: 'Sticky', text: 'Stuck.' } } },
        ],
      },
      stances: {
        options: [{ id: 'archetype.bruiser.wall', name: 'Wall', features: { '3': { name: 'Brace', text: 'Hold.' } } }],
      },
    },
  };
}

export function originsFixture(): SbpOriginsFile {
  return {
    $schema_version: 'test',
    species: [
      {
        id: 'species.frogling',
        name: 'Frogling',
        size: { choose_one: ['small', 'medium'] },
        speed: { walk: 30, swim: 30 },
        traits: [
          { id: 'amphibious', name: 'Amphibious', text: 'Breathe both.', grants: { breathe: ['air', 'water'] } },
          { id: 'big_leap', name: 'Big Leap', text: 'Jump.', unlock_level: 3, formula: 'level + CON' },
        ],
        species_feats: ['feat.tongue_lash'],
      },
      {
        id: 'species.pebble',
        name: 'Pebble',
        size: 'small',
        speed: { walk: 25 },
        traits: [{ id: 'sturdy', name: 'Sturdy', text: 'Hard.', grants: { damage_resistance: ['bludgeoning'] } }],
      },
    ],
    backgrounds: [
      {
        id: 'background.deckhand',
        name: 'Deckhand',
        ability_score_increase: { mode: 'fixed', values: { STR: 2, WIS: 1 } },
        skill_proficiencies: ['Athletics', 'Perception'],
        tool_proficiencies: { fixed: ['rope'] },
        origin_feat: 'feat.sea_legs',
      },
      {
        id: 'background.tinker',
        name: 'Tinker',
        ability_score_increase: { mode: 'flexible', options: ['DEX', 'INT', 'CHA'] },
        skill_proficiencies: ['Investigation'],
        tool_proficiencies: { fixed: [], choose: 1, from: ['tinker_tools', 'lockpicks'] },
        origin_feat: 'feat.sea_legs',
      },
    ],
    feats: [
      {
        id: 'feat.sea_legs', name: 'Sea Legs', category: 'origin', prerequisite: null, text: 'Steady.',
        grants: { speed: { swim: 'walk' } }, uses: { count: 1, recharge: 'long_rest' },
      },
      {
        id: 'feat.tongue_lash', name: 'Tongue Lash', category: 'species', prerequisite: { species: 'species.frogling' },
        text: 'Lash.', grants: { skills_choose: { choose: 1, from: ['Acrobatics', 'Sleight of Hand'] } },
      },
      { id: 'feat.tough_crust', name: 'Tough Crust', category: 'origin', prerequisite: null, text: 'Crusty.' },
    ],
  };
}

export const rulesDocs = (
  overrides: { classesAt?: number; originsAt?: number } = {},
): { classes: SbpRulesDoc<SbpClassesFile>; origins: SbpRulesDoc<SbpOriginsFile> } => ({
  classes: {
    meta: { kind: 'classes', schemaVersion: 'test', uploadedBy: 'u', uploadedByEmail: '', uploadedAt: overrides.classesAt ?? 100, sourceFileName: 'c.json', counts: {} },
    data: classesFixture(),
  },
  origins: {
    meta: { kind: 'origins', schemaVersion: 'test', uploadedBy: 'u', uploadedByEmail: '', uploadedAt: overrides.originsAt ?? 200, sourceFileName: 'o.json', counts: {} },
    data: originsFixture(),
  },
});

/** A complete level-1 Scooper with every level-1 choice made. */
export function scooper(overrides: Partial<SbpCharacter> = {}): SbpCharacter {
  return {
    ownerUid: 'uid-1',
    ownerEmail: 'p@example.com',
    name: 'Test Scooper',
    level: 1,
    speciesId: 'species.frogling',
    backgroundId: 'background.deckhand',
    classId: 'class.scooper',
    abilityScores: { method: 'standard_array', base: { STR: 8, DEX: 12, CON: 14, INT: 10, WIS: 13, CHA: 15 } },
    choices: {
      '1': { archetypeId: 'archetype.scooper.mint', classSkills: ['Arcana', 'Performance'], speciesSize: 'small' },
    },
    rulesVersion: { classes: 100, origins: 200 },
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

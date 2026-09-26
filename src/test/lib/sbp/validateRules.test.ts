import { describe, it, expect } from 'vitest';
import {
  detectRulesKind,
  diffRules,
  validateClassesFile,
  validateOriginsFile,
  validateRulesFile,
} from '../../../lib/sbp/validateRules';
import type { SbpClassesFile } from '../../../lib/sbp/types';

/**
 * Fixtures are synthetic on purpose. The real rules files are unpublished
 * IP and must never be committed, not even as test data (BRIEF §3).
 */

const level = (n: number, features: string[] = [], extra: Record<string, unknown> = {}) => ({
  level: n,
  proficiency_bonus: 2 + Math.floor((n - 1) / 4),
  features,
  asi_or_feat: [4, 8, 12, 16, 19].includes(n),
  ...extra,
});

function classesFixture(): SbpClassesFile {
  return {
    $schema_version: '0.1.0',
    $slot_tables: { half_caster: { 1: [2] } },
    classes: [
      {
        id: 'class.tester',
        name: 'Tester',
        hit_die: 'd8',
        features: {
          poke: { name: 'Poke', level: 1, text: 'Poke a thing.' },
          prod: { name: 'Prod', level: 2, text: 'Prod a thing.' },
        },
        levels: [level(1, ['poke'], { archetype_choice: true }), level(2, ['prod']), ...Array.from({ length: 18 }, (_, i) => level(i + 3))],
        archetype: { label: 'Style', entry_level: 1, first_feature_level: 3, choices_ref: 'archetypes.tester_styles' },
        spellcasting: { ability: 'INT', spell_list: 'spell_list.tester', slot_progression: 'half_caster' },
      },
    ],
    archetypes: {
      tester_styles: {
        options: [
          { id: 'archetype.tester.loud', name: 'Loud', features: { '3': { name: 'Shout', text: 'Loudly.' } } },
        ],
      },
    },
  };
}

function originsFixture() {
  return {
    $schema_version: '0.1.0',
    species: [
      {
        id: 'species.blob',
        name: 'Blob',
        traits: [{ id: 'squish', name: 'Squish', text: 'You squish.' }],
        species_feats: ['feat.extra_squish'],
      },
    ],
    backgrounds: [
      {
        id: 'background.tester',
        name: 'Tester',
        ability_score_increase: { mode: 'fixed', values: { INT: 2, WIS: 1 } },
        origin_feat: 'feat.curious',
        collides_with: 'class.tester',
      },
    ],
    feats: [
      { id: 'feat.curious', name: 'Curious', category: 'origin', prerequisite: null, text: 'Ask things.' },
      {
        id: 'feat.extra_squish',
        name: 'Extra Squish',
        category: 'species',
        prerequisite: { species: 'species.blob' },
        text: 'Squish more.',
      },
    ],
  };
}

const errors = (r: { issues: { level: string; path: string }[] }) =>
  r.issues.filter((i) => i.level === 'error').map((i) => i.path);

describe('detectRulesKind', () => {
  it('recognises both file shapes and rejects everything else', () => {
    expect(detectRulesKind(classesFixture())).toBe('classes');
    expect(detectRulesKind(originsFixture())).toBe('origins');
    expect(detectRulesKind({ hello: 'world' })).toBeNull();
    expect(detectRulesKind([])).toBeNull();
    expect(detectRulesKind('nope')).toBeNull();
  });
});

describe('validateClassesFile', () => {
  it('accepts a well-formed file and counts entities', () => {
    const r = validateClassesFile(classesFixture());
    expect(errors(r)).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.schemaVersion).toBe('0.1.0');
    expect(r.counts).toEqual({ classes: 1, archetypes: 1, features: 2, slot_tables: 1 });
  });

  it('warns (does not fail) about the spell list, since the spells file does not exist', () => {
    const r = validateClassesFile(classesFixture());
    const warn = r.issues.find((i) => i.path.endsWith('spell_list'));
    expect(warn?.level).toBe('warning');
    expect(r.ok).toBe(true);
  });

  it('rejects a level that grants a feature not in the registry', () => {
    const f = classesFixture();
    f.classes[0].levels[1].features = ['prod', 'ghost_feature'];
    const r = validateClassesFile(f);
    expect(r.ok).toBe(false);
    expect(errors(r)).toContain('classes[0].levels[1].features[1]');
  });

  it('rejects a choices_ref that points at no archetype group', () => {
    const f = classesFixture();
    f.classes[0].archetype!.choices_ref = 'archetypes.missing';
    const r = validateClassesFile(f);
    expect(errors(r)).toContain('classes[0].archetype.choices_ref');
  });

  it('rejects a slot progression missing from $slot_tables', () => {
    const f = classesFixture();
    f.classes[0].spellcasting!.slot_progression = 'full_caster';
    expect(errors(validateClassesFile(f))).toContain('classes[0].spellcasting.slot_progression');
  });

  it('rejects fewer than 20 levels and out-of-order levels', () => {
    const f = classesFixture();
    f.classes[0].levels = f.classes[0].levels.slice(0, 5);
    expect(errors(validateClassesFile(f))).toContain('classes[0].levels');

    const g = classesFixture();
    g.classes[0].levels[3].level = 9;
    expect(errors(validateClassesFile(g))).toContain('classes[0].levels[3].level');
  });

  it('rejects duplicate and mis-namespaced ids', () => {
    const f = classesFixture();
    f.archetypes.tester_styles.options.push({ id: 'archetype.tester.loud', name: 'Dup', features: {} });
    expect(errors(validateClassesFile(f))).toContain('archetypes.tester_styles.options[1].id');

    const g = classesFixture();
    g.classes[0].id = 'tester';
    expect(errors(validateClassesFile(g))).toContain('classes[0].id');
  });

  it('warns about a registered feature no level grants', () => {
    const f = classesFixture();
    f.classes[0].features.orphan = { name: 'Orphan', level: 5, text: '…' };
    const r = validateClassesFile(f);
    expect(r.ok).toBe(true);
    expect(r.issues.some((i) => i.level === 'warning' && i.path === 'classes[0].features.orphan')).toBe(true);
  });

  it('fails cleanly on a missing schema version or wrong top-level shape', () => {
    const { $schema_version: _v, ...noVersion } = classesFixture();
    expect(errors(validateClassesFile(noVersion))).toContain('$schema_version');
    expect(validateClassesFile({ classes: 'nope' }).ok).toBe(false);
    expect(validateClassesFile(null).ok).toBe(false);
  });
});

describe('validateOriginsFile', () => {
  it('accepts a well-formed file when the classes file is loaded', () => {
    const r = validateOriginsFile(originsFixture(), classesFixture());
    expect(errors(r)).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.counts).toEqual({ species: 1, backgrounds: 1, feats: 2 });
  });

  it('downgrades collides_with to a warning when no classes file is loaded', () => {
    const r = validateOriginsFile(originsFixture(), null);
    expect(r.ok).toBe(true);
    expect(r.issues.some((i) => i.level === 'warning' && i.path === 'backgrounds[0].collides_with')).toBe(true);
  });

  it('rejects collides_with that names a class the loaded file lacks', () => {
    const o = originsFixture();
    o.backgrounds[0].collides_with = 'class.nonexistent';
    expect(errors(validateOriginsFile(o, classesFixture()))).toContain('backgrounds[0].collides_with');
  });

  it('rejects an origin feat that does not exist', () => {
    const o = originsFixture();
    o.backgrounds[0].origin_feat = 'feat.missing';
    expect(errors(validateOriginsFile(o))).toContain('backgrounds[0].origin_feat');
  });

  it('rejects a species feat that does not exist', () => {
    const o = originsFixture();
    o.species[0].species_feats = ['feat.missing'];
    expect(errors(validateOriginsFile(o))).toContain('species[0].species_feats[0]');
  });

  it('rejects a feat prerequisite naming an unknown species', () => {
    const o = originsFixture();
    o.feats[1].prerequisite = { species: 'species.unicorn' };
    expect(errors(validateOriginsFile(o))).toContain('feats[1].prerequisite.species');
  });

  it('enforces the ability_score_increase modes', () => {
    const fixedNoValues = originsFixture();
    fixedNoValues.backgrounds[0].ability_score_increase = { mode: 'fixed' } as never;
    expect(errors(validateOriginsFile(fixedNoValues))).toContain('backgrounds[0].ability_score_increase.values');

    const flexibleTwo = originsFixture();
    flexibleTwo.backgrounds[0].ability_score_increase = { mode: 'flexible', options: ['STR', 'DEX'] } as never;
    expect(errors(validateOriginsFile(flexibleTwo))).toContain('backgrounds[0].ability_score_increase.options');

    const flexibleOk = originsFixture();
    flexibleOk.backgrounds[0].ability_score_increase = { mode: 'flexible', options: ['STR', 'DEX', 'CON'] } as never;
    expect(validateOriginsFile(flexibleOk, classesFixture()).ok).toBe(true);

    const unknown = originsFixture();
    unknown.backgrounds[0].ability_score_increase = { mode: 'random' } as never;
    expect(errors(validateOriginsFile(unknown))).toContain('backgrounds[0].ability_score_increase.mode');
  });
});

describe('validateRulesFile', () => {
  it('routes by detected kind', () => {
    expect(validateRulesFile(classesFixture()).kind).toBe('classes');
    expect(validateRulesFile(originsFixture(), { classes: classesFixture() }).kind).toBe('origins');
  });

  it('rejects unrecognised input with a single explanatory error', () => {
    const r = validateRulesFile({ random: true });
    expect(r.ok).toBe(false);
    expect(r.kind).toBeNull();
    expect(r.issues).toHaveLength(1);
  });
});

describe('diffRules', () => {
  it('reports added, removed, changed and unchanged entities by id', () => {
    const before = originsFixture();
    const after = originsFixture();
    after.feats[0].text = 'Ask MORE things.';
    after.feats.push({ id: 'feat.new', name: 'New', category: 'origin', prerequisite: null, text: '…' });
    after.species = [];

    const d = diffRules('origins', before, after);
    expect(d.added).toEqual(['feat.new']);
    expect(d.removed).toEqual(['species.blob']);
    expect(d.changed).toEqual(['feat.curious']);
    expect(d.unchanged).toBe(2);
  });

  it('treats a first upload as all-added', () => {
    const d = diffRules('classes', undefined, classesFixture());
    expect(d.added).toEqual(['archetype.tester.loud', 'class.tester', 'slot_table.half_caster']);
    expect(d.removed).toEqual([]);
  });
});

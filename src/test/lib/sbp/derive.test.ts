import { describe, it, expect } from 'vitest';
import { deriveCharacter } from '../../../lib/sbp/derive';
import { clearChoicesAbove, setLevel, withChoices } from '../../../lib/sbp/character';
import { rulesDocs, scooper } from './fixtures';

const rules = rulesDocs();
const names = (d: ReturnType<typeof deriveCharacter>) => d.features.map((f) => f.name);

describe('deriveCharacter — level 1', () => {
  const d = deriveCharacter(scooper(), rules);

  it('resolves references and reports ok with no pending choices', () => {
    expect(d.ok).toBe(true);
    expect(d.issues).toEqual([]);
    expect(d.pendingChoices).toEqual([]);
    expect(d.species?.name).toBe('Frogling');
    expect(d.background?.name).toBe('Deckhand');
    expect(d.class?.name).toBe('Scooper');
    expect(d.archetype?.name).toBe('Mint');
  });

  it('applies the background increase to ability scores', () => {
    expect(d.abilities.STR).toEqual({ base: 8, bonus: 2, score: 10, modifier: 0 });
    expect(d.abilities.WIS).toEqual({ base: 13, bonus: 1, score: 14, modifier: 2 });
    expect(d.abilities.CHA.modifier).toBe(2);
  });

  it('computes fixed HP: die + CON at 1st', () => {
    expect(d.hitPoints).toMatchObject({ max: 8 + 2, hitDie: 8 });
  });

  it('collects proficiencies from class, background and grants', () => {
    expect(d.savingThrows).toEqual(['WIS', 'CHA']);
    expect(d.skills).toEqual(['Arcana', 'Athletics', 'Perception', 'Performance']);
    expect(d.tools).toEqual(['scoop', 'rope']);
    expect(d.armor).toEqual(['light']);
    expect(d.size).toBe('small');
  });

  it('applies a speed grant that references another mode', () => {
    expect(d.speed).toEqual({ walk: 30, swim: 30 });
  });

  it('grants level-1 features only, with uses resolved', () => {
    expect(names(d)).toEqual(['Amphibious', 'Sea Legs', 'Stir', 'Spellcasting']);
    const stir = d.features.find((f) => f.name === 'Stir')!;
    expect(stir.uses).toMatchObject({ count: 2, recharge: 'long_rest' });
    expect(d.features.find((f) => f.name === 'Cool Breath')).toBeUndefined();
  });

  it('keeps non-mechanical grants for the sheet to display', () => {
    expect(d.otherGrants).toEqual([{ source: 'Amphibious', key: 'breathe', value: ['air', 'water'] }]);
  });

  it('derives spellcasting numbers and marks the list as not loaded', () => {
    expect(d.spellcasting).toMatchObject({
      ability: 'CHA', modifier: 2, saveDC: 12, attackBonus: 4,
      slots: [2, 0, 0, 0, 0, 0, 0, 0, 0], cantripsKnown: 2, spellsKnown: 2,
      spellListId: 'spell_list.scooper', listLoaded: false,
    });
  });

  it('reports rules as current when versions match', () => {
    expect(d.rulesOutdated).toEqual({ classes: false, origins: false });
  });
});

describe('deriveCharacter — levelling', () => {
  it('level 5: HP, proficiency, features, formula, extras and slots all move', () => {
    const c = withChoices(setLevel(scooper(), 5), 4, { asiOrFeat: { type: 'asi', increases: { CHA: 2 } } });
    const d = deriveCharacter(c, rules);
    expect(d.ok).toBe(true);
    expect(d.proficiencyBonus).toBe(3);
    expect(d.abilities.CHA).toMatchObject({ score: 17, modifier: 3 });
    // 8 + 2 at 1st, then (5 + 2) × 4
    expect(d.hitPoints.max).toBe(10 + 7 * 4);
    // Sorted by level gained; within a level, species → background → class → archetype → feats.
    expect(names(d)).toEqual([
      'Amphibious', 'Sea Legs', 'Stir', 'Spellcasting', 'Sprinkle', 'Big Leap', 'Cool Breath', 'Double Scoop',
    ]);
    expect(d.features.find((f) => f.name === 'Sprinkle')!.formulaValue).toBe(5 + 3);
    expect(d.features.find((f) => f.name === 'Big Leap')!.formulaValue).toBe(5 + 2);
    expect(d.features.find((f) => f.name === 'Stir')!.uses?.count).toBe(3);
    expect(d.levelExtras).toEqual({ scoops: '2d6' });
    expect(d.spellcasting?.slots).toEqual([4, 2, 0, 0, 0, 0, 0, 0, 0]);
    expect(d.spellcasting?.saveDC).toBe(8 + 3 + 3);
  });

  it('asks for the ASI-or-feat choice at each unmade ASI level', () => {
    const d = deriveCharacter(setLevel(scooper(), 8), rules);
    expect(d.pendingChoices.map((p) => [p.level, p.kind])).toEqual([[4, 'asi_or_feat'], [8, 'asi_or_feat']]);
  });

  it('accepts a species feat at an ASI level and asks for its skill pick', () => {
    let c = setLevel(scooper(), 4);
    c = withChoices(c, 4, { asiOrFeat: { type: 'feat', featId: 'feat.tongue_lash' } });
    let d = deriveCharacter(c, rules);
    expect(names(d)).toContain('Tongue Lash');
    expect(d.pendingChoices).toEqual([
      expect.objectContaining({ kind: 'feat_skills', featId: 'feat.tongue_lash', choose: 1 }),
    ]);

    c = withChoices(c, 4, { asiOrFeat: { type: 'feat', featId: 'feat.tongue_lash', skills: ['Acrobatics'] } });
    d = deriveCharacter(c, rules);
    expect(d.pendingChoices).toEqual([]);
    expect(d.skills).toContain('Acrobatics');
  });

  it('flags a species-gated feat taken by the wrong species', () => {
    const c = withChoices(setLevel(scooper({ speciesId: 'species.pebble', choices: { '1': { archetypeId: 'archetype.scooper.mint', classSkills: ['Arcana', 'Stealth'] } } }), 4), 4, {
      asiOrFeat: { type: 'feat', featId: 'feat.tongue_lash' },
    });
    const d = deriveCharacter(c, rules);
    expect(d.ok).toBe(false);
    expect(d.issues.some((i) => i.includes('requires a different species'))).toBe(true);
  });

  it('rejects an ASI that is not +2 or +1/+1', () => {
    const c = withChoices(setLevel(scooper(), 4), 4, { asiOrFeat: { type: 'asi', increases: { CHA: 3 } } });
    expect(deriveCharacter(c, rules).issues.some((i) => i.includes('+2 to one ability'))).toBe(true);
  });
});

describe('deriveCharacter — level down keeps choices dormant', () => {
  const at8 = withChoices(
    withChoices(setLevel(scooper(), 8), 4, { asiOrFeat: { type: 'asi', increases: { CHA: 2 } } }),
    8, { asiOrFeat: { type: 'asi', increases: { CON: 1, DEX: 1 } } },
  );

  it('ignores choices above the current level and reports them as dormant', () => {
    const at3 = setLevel(at8, 3);
    const d = deriveCharacter(at3, rules);
    expect(d.abilities.CHA.score).toBe(15);
    expect(d.abilities.CON.score).toBe(14);
    expect(d.dormantLevels).toEqual([4, 8]);
    expect(d.pendingChoices).toEqual([]);
    expect(names(d)).not.toContain('Double Scoop');
  });

  it('brings them straight back on level up', () => {
    const back = setLevel(setLevel(at8, 3), 8);
    const d = deriveCharacter(back, rules);
    expect(d.abilities.CHA.score).toBe(17);
    expect(d.abilities.CON.score).toBe(15);
    expect(d.dormantLevels).toEqual([]);
  });

  it('clearChoicesAbove is the deliberate discard', () => {
    const cleared = clearChoicesAbove(setLevel(at8, 3), 3);
    expect(Object.keys(cleared.choices)).toEqual(['1']);
    const d = deriveCharacter(setLevel(cleared, 8), rules);
    expect(d.pendingChoices.map((p) => p.level)).toEqual([4, 8]);
  });
});

describe('deriveCharacter — archetype entry level', () => {
  const bruiser = () => scooper({
    classId: 'class.bruiser',
    choices: { '1': { classSkills: ['Athletics', 'Survival'], speciesSize: 'medium' } },
  });

  it('does not ask for an archetype before its entry level', () => {
    const d = deriveCharacter(setLevel(bruiser(), 2), rules);
    expect(d.pendingChoices).toEqual([]);
    expect(d.archetype).toBeNull();
  });

  it('asks at the entry level, and grants its features once chosen', () => {
    let c = setLevel(bruiser(), 3);
    let d = deriveCharacter(c, rules);
    expect(d.pendingChoices).toEqual([
      expect.objectContaining({ level: 3, kind: 'archetype', options: ['archetype.bruiser.wall'] }),
    ]);
    c = withChoices(c, 3, { archetypeId: 'archetype.bruiser.wall' });
    d = deriveCharacter(c, rules);
    expect(d.archetype?.name).toBe('Wall');
    expect(names(d)).toContain('Brace');
    expect(d.hitPoints.max).toBe(12 + 2 + (7 + 2) * 2);
    expect(d.spellcasting).toBeNull();
  });
});

describe('deriveCharacter — level-1 choices the rules demand', () => {
  it('asks for class skills, species size, flexible background increase and tool pick', () => {
    const c = scooper({ backgroundId: 'background.tinker', choices: {} });
    const d = deriveCharacter(c, rules);
    expect(d.pendingChoices.map((p) => p.kind).sort()).toEqual(
      ['archetype', 'background_asi', 'background_tools', 'class_skills', 'species_size'].sort(),
    );
    expect(d.abilities.DEX.bonus).toBe(0);
  });

  it('applies a flexible background increase once chosen and validates its total', () => {
    let c = withChoices(scooper({ backgroundId: 'background.tinker' }), 1, {
      backgroundAsi: { DEX: 2, INT: 1 }, backgroundTools: ['lockpicks'],
    });
    let d = deriveCharacter(c, rules);
    expect(d.abilities.DEX.bonus).toBe(2);
    expect(d.tools).toContain('lockpicks');
    expect(d.pendingChoices).toEqual([]);

    c = withChoices(c, 1, { backgroundAsi: { STR: 2, INT: 1 } });
    d = deriveCharacter(c, rules);
    expect(d.issues.some((i) => i.includes('must total +3'))).toBe(true);
  });

  it('rejects class skills the class does not offer', () => {
    const d = deriveCharacter(withChoices(scooper(), 1, { classSkills: ['Arcana', 'Athletics'] }), rules);
    expect(d.issues.some((i) => i.includes('does not offer'))).toBe(true);
  });
});

describe('deriveCharacter — failure modes', () => {
  it('reports missing rules docs without throwing', () => {
    const d = deriveCharacter(scooper(), { classes: null, origins: rules.origins });
    expect(d.ok).toBe(false);
    expect(d.issues).toEqual(['Classes rules are not loaded.']);
  });

  it('reports unresolved ids', () => {
    const d = deriveCharacter(scooper({ classId: 'class.nope' }), rules);
    expect(d.ok).toBe(false);
    expect(d.issues[0]).toContain('class.nope');
  });

  it('flags invalid base scores for the chosen method', () => {
    const d = deriveCharacter(scooper({ abilityScores: { method: 'standard_array', base: { STR: 18, DEX: 18, CON: 18, INT: 18, WIS: 18, CHA: 18 } } }), rules);
    expect(d.issues.some((i) => i.startsWith('Ability scores:'))).toBe(true);
  });

  it('marks rules as outdated when the character was built against an older upload', () => {
    const d = deriveCharacter(scooper(), rulesDocs({ classesAt: 999 }));
    expect(d.rulesOutdated).toEqual({ classes: true, origins: false });
  });

  it('surfaces playtest and maturity flags on features', () => {
    const d = deriveCharacter(setLevel(scooper(), 5), rules);
    expect(d.features.find((f) => f.name === 'Sprinkle')!.flags.playtest?.status).toBe('watching');
    expect(d.features.find((f) => f.name === 'Double Scoop')!.flags.maturity).toBe('draft');
  });
});

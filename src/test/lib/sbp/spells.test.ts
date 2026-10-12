import { describe, it, expect } from 'vitest';
import {
  detectRulesKind,
  diffRules,
  srdSpellId,
  validateClassesFile,
  validateRulesFile,
  validateSpellsFile,
  validateSrdSpellsFile,
} from '../../../lib/sbp/validateRules';
import { buildSpellIndex, resolveDamageType, spellDisplayName, spellListIds } from '../../../lib/sbp/spells';
import { deriveCharacter } from '../../../lib/sbp/derive';
import { setLevel } from '../../../lib/sbp/character';
import { classesFixture, rulesDocs, scooper, spellDocs, spellsFixture, srdSpellsFixture } from './fixtures';

/** Synthetic spells only; the real spell files are unpublished IP (BRIEF §3). */

const errors = (r: { issues: { level: string; path: string }[] }) =>
  r.issues.filter((i) => i.level === 'error').map((i) => i.path);
const warnings = (r: { issues: { level: string; path: string }[] }) =>
  r.issues.filter((i) => i.level === 'warning').map((i) => i.path);

describe('srdSpellId', () => {
  it('follows the convention in the spells files', () => {
    expect(srdSpellId("Heroes' Feast")).toBe('spell.heroes_feast');
    expect(srdSpellId('Blindness/Deafness')).toBe('spell.blindness_deafness');
    expect(srdSpellId('Arcanist’s Magic Aura')).toBe('spell.arcanists_magic_aura');
  });
});

describe('detectRulesKind — spell files', () => {
  it('tells the two spell files apart by spell_lists', () => {
    expect(detectRulesKind(spellsFixture())).toBe('spells');
    expect(detectRulesKind(srdSpellsFixture())).toBe('srd_spells');
  });
});

describe('validateSrdSpellsFile', () => {
  it('accepts a well-formed file and counts cantrips', () => {
    const r = validateSrdSpellsFile(srdSpellsFixture());
    expect(r.issues).toEqual([]);
    expect(r.counts).toEqual({ spells: 3, cantrips: 1 });
  });

  it('rejects bad levels and missing text; warns on ids that break the naming rule', () => {
    const f = srdSpellsFixture();
    f.spells[0].level = 10;
    f.spells[1].text = '';
    f.spells[2].id = 'spell.warden_s_wall';
    const r = validateSrdSpellsFile(f);
    expect(errors(r)).toEqual(['spells[0].level', 'spells[1].text']);
    expect(warnings(r)).toEqual(['spells[2].id']);
  });

  it('warns when the current spells file uses a spell this version drops', () => {
    const f = srdSpellsFixture();
    f.spells = f.spells.filter((s) => s.id !== 'spell.big_bang');
    const r = validateSrdSpellsFile(f, { spells: spellsFixture() });
    expect(r.ok).toBe(true);
    expect(r.issues.map((i) => i.message).join(' ')).toContain('spell.big_bang');
  });
});

describe('validateSpellsFile', () => {
  const loaded = { srd_spells: srdSpellsFixture(), classes: classesFixture() };

  it('accepts a well-formed file against the SRD and classes', () => {
    const r = validateSpellsFile(spellsFixture(), loaded);
    expect(r.issues).toEqual([]);
    expect(r.counts).toEqual({ signature_spells: 1, spell_lists: 1, reskins: 1 });
  });

  it('only warns about SRD references when no SRD file is loaded', () => {
    const r = validateSpellsFile(spellsFixture());
    expect(r.ok).toBe(true);
    expect(warnings(r)).toEqual(['spell_lists']);
  });

  it('rejects unknown SRD ids, unknown lists and signature ids that clash with the SRD', () => {
    const f = spellsFixture();
    f.spell_lists['spell_list.scooper'].srd.push('spell.nope');
    f.spells[0].lists = ['spell_list.ghost'];
    f.spells.push({ ...f.spells[0], id: 'spell.spark', lists: ['spell_list.scooper'] });
    const r = validateSpellsFile(f, loaded);
    expect(errors(r)).toEqual(expect.arrayContaining([
      'spell_lists.spell_list.scooper.srd[2]',
      'spells[0].lists[0]',
      'spells[1].id',
    ]));
  });

  it('rejects a reskin of a spell that is not on its list', () => {
    const f = spellsFixture();
    f.reskins.push({ spell: 'spell.wardens_wall', list: 'spell_list.scooper', name: 'Fudge Wall' });
    expect(errors(validateSpellsFile(f, loaded))).toEqual(['reskins[1].spell']);
  });

  it('rejects strain damage with no fallback', () => {
    const f = spellsFixture();
    delete f.spells[0].damage[0].fallback;
    expect(errors(validateSpellsFile(f, loaded))).toEqual(['spells[0].damage[0].fallback']);
  });

  it('rejects granted_by that names no class or archetype', () => {
    const f = spellsFixture();
    f.spells[0].granted_by = ['archetype.scooper.mint', 'archetype.nobody'];
    expect(errors(validateSpellsFile(f, loaded))).toEqual(['spells[0].granted_by[1]']);
  });

  it('rejects a file that drops a list a class still uses', () => {
    const f = spellsFixture();
    f.spell_lists = { 'spell_list.other': { srd: [] } };
    f.spells[0].lists = ['spell_list.other'];
    f.reskins = [];
    expect(errors(validateSpellsFile(f, loaded))).toEqual(['spell_lists']);
  });
});

describe('validateClassesFile — spell references', () => {
  const both = { spells: spellsFixture(), srd_spells: srdSpellsFixture() };

  it('resolves spell_list and grants.spells once the spell files are loaded', () => {
    const f = classesFixture();
    f.archetypes.flavours.options[0].features['3'].grants = { spells: ['spell.big_bang'] };
    const r = validateClassesFile(f, both);
    expect(r.issues.filter((i) => /spell/.test(i.path))).toEqual([]);
  });

  it('rejects an unknown list or granted spell when the files are loaded', () => {
    const f = classesFixture();
    f.classes[0].spellcasting!.spell_list = 'spell_list.ghost';
    f.archetypes.flavours.options[0].features['3'].grants = { spells: ['spell.nope'] };
    expect(errors(validateClassesFile(f, both))).toEqual(expect.arrayContaining([
      'classes[0].spellcasting.spell_list',
      'archetypes.flavours.options[0].features.3.grants.spells[0]',
    ]));
  });

  it('routes both spell files through validateRulesFile', () => {
    expect(validateRulesFile(spellsFixture(), { srd_spells: srdSpellsFixture() }).kind).toBe('spells');
    expect(validateRulesFile(srdSpellsFixture()).kind).toBe('srd_spells');
  });
});

describe('diffRules — spells', () => {
  it('diffs spells, lists and reskins by id', () => {
    const next = spellsFixture();
    next.spell_lists['spell_list.scooper'].srd.push('spell.wardens_wall');
    next.reskins[0].name = 'Ice Cream Headache';
    const d = diffRules('spells', spellsFixture(), next);
    expect(d.changed).toEqual(['reskin.spell.big_bang@spell_list.scooper', 'spell_list.scooper']);
    expect(d.unchanged).toBe(1);
  });
});

describe('spell helpers', () => {
  const spells = spellsFixture();
  const index = buildSpellIndex(spells, srdSpellsFixture());

  it('builds a class list from signature spells plus the SRD list', () => {
    expect(spellListIds('spell_list.scooper', spells)).toEqual(['spell.sprinkles', 'spell.spark', 'spell.big_bang']);
    expect(spellListIds('spell_list.scooper', null)).toEqual([]);
  });

  it('shows the reskin name only to casters on that list', () => {
    const bang = index.get('spell.big_bang')!;
    expect(spellDisplayName(bang, 'spell_list.scooper', spells)).toBe('Brain Freeze');
    expect(spellDisplayName(bang, 'spell_list.other', spells)).toBe('Big Bang');
  });

  it('resolves strain damage to the caster strain, else the fallback', () => {
    const dmg = index.get('spell.sprinkles')!.damage[0];
    expect(resolveDamageType(dmg, 'necrotic')).toBe('necrotic');
    expect(resolveDamageType(dmg, null)).toBe('cold');
    expect(resolveDamageType({ dice: '1d4', type: 'fire' }, 'necrotic')).toBe('fire');
  });
});

describe('deriveCharacter — spells', () => {
  it('marks the list loaded and lists its spells once the spells doc is present', () => {
    const d = deriveCharacter(scooper(), { ...rulesDocs(), ...spellDocs() });
    expect(d.spellcasting?.listLoaded).toBe(true);
    expect(d.spellcasting?.listSpellIds).toEqual(['spell.sprinkles', 'spell.spark', 'spell.big_bang']);
  });

  it('stays unloaded without the spells doc', () => {
    const d = deriveCharacter(scooper(), rulesDocs());
    expect(d.spellcasting).toMatchObject({ listLoaded: false, listSpellIds: [] });
  });

  it('turns grants.spells into always-known spells, reskinned, from the level they arrive', () => {
    const rules = { ...rulesDocs(), ...spellDocs() };
    rules.classes.data.archetypes.flavours.options[0].features['3'].grants = { spells: ['spell.big_bang'] };
    expect(deriveCharacter(scooper(), rules).grantedSpells).toEqual([]);
    const d = deriveCharacter(setLevel(scooper(), 3), rules);
    expect(d.grantedSpells).toEqual([
      { id: 'spell.big_bang', name: 'Brain Freeze', level: 1, source: 'Cool Breath', gainedAt: 3 },
    ]);
    expect(d.otherGrants.some((g) => g.key === 'spells')).toBe(false);
  });

  it('reads the strain damage type from the archetype', () => {
    const rules = { ...rulesDocs(), ...spellDocs() };
    (rules.classes.data.archetypes.flavours.options[0] as Record<string, unknown>).resistance_type = 'cold';
    expect(deriveCharacter(scooper(), rules).spellcasting?.strainDamageType).toBe('cold');
  });
});

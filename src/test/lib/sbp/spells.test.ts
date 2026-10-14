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
import {
  buildSpellIndex,
  formatCastingTime,
  formatComponents,
  formatDuration,
  formatRange,
  resolveDamageType,
  spellDisplayName,
  spellLevelLabel,
  spellListIds,
} from '../../../lib/sbp/spells';
import { deriveCharacter } from '../../../lib/sbp/derive';
import { setLevel, withChoices } from '../../../lib/sbp/character';
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

  it('formats signature spells from structured fields and SRD spells from their text', () => {
    const sprinkles = buildSpellIndex(spellsFixture(), null).get('spell.sprinkles')!;
    expect(formatCastingTime(sprinkles)).toBe('Action');
    expect(formatRange(sprinkles)).toBe('60 feet');
    expect(formatComponents(sprinkles)).toBe('V');
    expect(formatDuration(sprinkles)).toBe('Instantaneous');
    expect(formatRange({ ...sprinkles, range: { type: 'self' }, area: { shape: 'cone', feet: 15 } })).toBe('Self (15-foot cone)');
    expect(formatCastingTime({ ...sprinkles, casting_time: { unit: 'minute', amount: 10, trigger: null }, ritual: true }))
      .toBe('10 minutes or Ritual');
    expect(formatDuration({ ...sprinkles, duration: { type: 'timed', text: '1 hour' } })).toBe('1 hour');
    expect(spellLevelLabel({ level: 0, school: 'Evocation' })).toBe('Evocation cantrip');
    expect(spellLevelLabel({ level: 2, school: 'Evocation' })).toBe('2nd-level evocation');
  });

  it('reads the strain damage type from the archetype', () => {
    const rules = { ...rulesDocs(), ...spellDocs() };
    (rules.classes.data.archetypes.flavours.options[0] as Record<string, unknown>).resistance_type = 'cold';
    expect(deriveCharacter(scooper(), rules).spellcasting?.strainDamageType).toBe('cold');
  });
});

// ─── Spell picks ──────────────────────────────────────────────────────────────

/** Rules with a level-2 spell on the list, so slot gating has something to gate. */
function pickRules() {
  const rules = { ...rulesDocs(), ...spellDocs() };
  rules.spells.data.spell_lists['spell_list.scooper'].srd.push('spell.wardens_wall');
  return rules;
}
const kinds = (d: ReturnType<typeof deriveCharacter>) =>
  d.spellcasting!.requests.map((r) => `${r.level}:${r.kind}:${r.choose}`);
const spellPending = (d: ReturnType<typeof deriveCharacter>) =>
  d.pendingChoices.filter((p) => p.kind.startsWith('spell_')).map((p) => `${p.level}:${p.kind}`);

describe('deriveCharacter — spell picks (known caster)', () => {
  it('asks for level-1 cantrips and spells, castable levels only', () => {
    const d = deriveCharacter(scooper(), pickRules());
    expect(kinds(d)).toEqual(['1:cantrips:2', '1:spells:2']);
    const [cantrips, spells] = d.spellcasting!.requests;
    expect(cantrips.options).toEqual(['spell.sprinkles', 'spell.spark']);
    expect(spells.options).toEqual(['spell.big_bang']);
    expect(spells.maxSpellLevel).toBe(1);
    expect(spellPending(d)).toEqual(['1:spell_cantrips', '1:spell_spells']);
  });

  it('asks only for the growth at each later level', () => {
    const d = deriveCharacter(setLevel(scooper(), 4), pickRules());
    // cantrips_known 2→3 at level 4; spells_known grows by 1 every level.
    expect(kinds(d)).toEqual(['1:cantrips:2', '1:spells:2', '2:spells:1', '3:spells:1', '4:cantrips:1', '4:spells:1']);
    expect(d.spellcasting!.requests.find((r) => r.level === 3)!.options).toContain('spell.wardens_wall');
    expect(d.spellcasting!.requests.find((r) => r.level === 2)!.options).not.toContain('spell.wardens_wall');
  });

  it('accepts valid picks and clears the pending spell choices', () => {
    const c = withChoices(scooper(), 1, { cantrips: ['spell.sprinkles', 'spell.spark'], spells: ['spell.big_bang'] });
    const d = deriveCharacter(c, pickRules());
    expect(d.spellcasting).toMatchObject({ cantrips: ['spell.sprinkles', 'spell.spark'], known: ['spell.big_bang'] });
    // Only one level-1 spell exists, so one of the two picks is still open.
    expect(spellPending(d)).toEqual(['1:spell_spells']);
    expect(d.spellcasting!.issues).toEqual([]);
  });

  it('rejects a spell above the slots of the level it was picked at', () => {
    const c = withChoices(scooper(), 1, { spells: ['spell.wardens_wall'] });
    const d = deriveCharacter(c, pickRules());
    expect(d.spellcasting!.known).toEqual([]);
    expect(d.spellcasting!.issues[0]).toContain("Warden's Wall");
    expect(d.issues).toEqual(expect.arrayContaining(d.spellcasting!.issues));
  });

  it('rejects the same spell picked at two levels, keeping the earlier one', () => {
    let c = setLevel(scooper(), 2);
    c = withChoices(c, 1, { spells: ['spell.big_bang'] });
    c = withChoices(c, 2, { spells: ['spell.big_bang'] });
    const d = deriveCharacter(c, pickRules());
    expect(d.spellcasting!.known).toEqual(['spell.big_bang']);
    expect(d.spellcasting!.issues).toHaveLength(1);
  });

  it('keeps higher-level picks dormant when levelling down', () => {
    let c = setLevel(scooper(), 3);
    c = withChoices(c, 3, { spells: ['spell.wardens_wall'] });
    expect(deriveCharacter(c, pickRules()).spellcasting!.known).toEqual(['spell.wardens_wall']);
    const down = deriveCharacter(setLevel(c, 2), pickRules());
    expect(down.spellcasting!.known).toEqual([]);
    expect(down.issues).toEqual([]);
    expect(down.dormantLevels).toEqual([3]);
  });

  it('leaves granted spells out of the options', () => {
    const rules = pickRules();
    rules.classes.data.classes[0].features.stir.grants = { spells: ['spell.big_bang'] };
    const d = deriveCharacter(scooper(), rules);
    expect(d.spellcasting!.requests[1].options).toEqual([]);
  });

  it('asks for nothing until the spells doc is loaded', () => {
    const d = deriveCharacter(scooper(), rulesDocs());
    expect(d.spellcasting!.requests).toEqual([]);
    expect(spellPending(d)).toEqual([]);
  });
});

describe('deriveCharacter — spell picks (prepared casters)', () => {
  it('prepares from the whole list when there is no spellbook', () => {
    const rules = pickRules();
    rules.classes.data.classes[0].spellcasting!.prepares_or_knows = 'prepares';
    const c = { ...scooper(), prepared: ['spell.big_bang', 'spell.wardens_wall'] };
    const d = deriveCharacter(c, rules);
    expect(kinds(d)).toEqual(['1:cantrips:2', '1:prepared:2']);
    expect(d.spellcasting!.prepared).toEqual(['spell.big_bang']);
    expect(d.spellcasting!.issues[0]).toContain("Warden's Wall");
  });

  it('writes spells into the book per level, copies extras, and prepares from the book', () => {
    const rules = pickRules();
    const k = rules.classes.data.classes[0];
    k.spellcasting = { ...k.spellcasting!, prepares_or_knows: 'prepares', spellbook: 'stir' };
    k.levels.forEach((row) => { row.journal_spells = 1 + row.level; row.spells_known = 1; });
    let c = setLevel(scooper(), 3);
    c = withChoices(c, 1, { spells: ['spell.big_bang'] });
    c = withChoices(c, 3, { journalExtra: ['spell.wardens_wall'] });
    c = { ...c, prepared: ['spell.wardens_wall'] };
    const d = deriveCharacter(c, rules);
    expect(kinds(d)).toEqual([
      '1:cantrips:2', '1:journal:2', '2:journal:1', '3:journal:1', '3:journal_extra:null', '3:prepared:1',
    ]);
    expect(d.spellcasting!.spellbookSpells).toEqual(['spell.big_bang', 'spell.wardens_wall']);
    expect(d.spellcasting!.prepared).toEqual(['spell.wardens_wall']);
    const prep = d.spellcasting!.requests.find((r) => r.kind === 'prepared')!;
    expect(prep.options).toEqual(['spell.big_bang', 'spell.wardens_wall']);
    // A spell already in the book can't be copied in again.
    expect(d.spellcasting!.requests.find((r) => r.kind === 'journal_extra')!.options).not.toContain('spell.big_bang');
  });
});

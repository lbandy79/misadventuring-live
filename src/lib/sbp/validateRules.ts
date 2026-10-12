/**
 * Validation for SBP rules uploads.
 *
 * Runs in the browser before an admin writes a rules file to Firestore.
 * Pure functions, no Firebase: the admin panel calls these, and the unit
 * tests feed them small synthetic files (never the real data — see BRIEF §3).
 *
 * The bar for an upload is "every reference resolves". A dangling id would
 * surface as a broken step in the wizard for every player, and a bad upload
 * is much cheaper to reject here than to roll back from history.
 */

import type {
  SbpClassesFile,
  SbpOriginsFile,
  SbpRulesKind,
  SbpSpellsFile,
  SbpSrdSpellsFile,
} from './types';

export interface ValidationIssue {
  /** `error` blocks the upload; `warning` is shown but doesn't block. */
  level: 'error' | 'warning';
  /** Where in the file, e.g. `backgrounds[2].origin_feat`. */
  path: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  kind: SbpRulesKind | null;
  schemaVersion: string | null;
  issues: ValidationIssue[];
  counts: Record<string, number>;
}

/** A change summary between the current doc and the candidate, by entity id. */
export interface RulesDiff {
  added: string[];
  removed: string[];
  changed: string[];
  unchanged: number;
}

const ID_NAMESPACES: Record<SbpRulesKind, string[]> = {
  origins: ['species.', 'background.', 'feat.'],
  classes: ['class.', 'archetype.'],
  spells: ['spell.', 'spell_list.'],
  srd_spells: ['spell.'],
};

/**
 * Firestore caps a document at 1 MiB. The SRD file is ~600 KB, so warn well
 * before the cap rather than let the upload transaction fail.
 */
const DOC_SIZE_WARN_BYTES = 900_000;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Which rules file is this? Decided by top-level shape, not filename, so a
 * misnamed file can't land in the wrong doc.
 */
export function detectRulesKind(input: unknown): SbpRulesKind | null {
  if (!isRecord(input)) return null;
  if (Array.isArray(input.classes) && isRecord(input.archetypes)) return 'classes';
  if (Array.isArray(input.species) && Array.isArray(input.backgrounds) && Array.isArray(input.feats)) {
    return 'origins';
  }
  // Both spell files have spells[]; only the hand-edited one has spell_lists.
  if (isRecord(input.spell_lists)) return 'spells';
  if (Array.isArray(input.spells)) return 'srd_spells';
  return null;
}

class Collector {
  issues: ValidationIssue[] = [];
  error(path: string, message: string) {
    this.issues.push({ level: 'error', path, message });
  }
  warn(path: string, message: string) {
    this.issues.push({ level: 'warning', path, message });
  }
}

function checkCommonHeader(input: Record<string, unknown>, c: Collector): string | null {
  const v = input.$schema_version;
  if (typeof v !== 'string' || v.length === 0) {
    c.error('$schema_version', 'Missing $schema_version.');
    return null;
  }
  return v;
}

function checkIds(
  items: Array<Record<string, unknown>>,
  path: string,
  namespace: string,
  c: Collector,
  seen: Set<string>,
): void {
  items.forEach((item, i) => {
    const id = item.id;
    if (typeof id !== 'string' || !id) {
      c.error(`${path}[${i}].id`, 'Missing id.');
      return;
    }
    if (!id.startsWith(namespace)) {
      c.error(`${path}[${i}].id`, `Id "${id}" must start with "${namespace}".`);
    }
    if (seen.has(id)) c.error(`${path}[${i}].id`, `Duplicate id "${id}".`);
    seen.add(id);
  });
}

// ─── Origins ──────────────────────────────────────────────────────────────────

/**
 * Validate an origins file. Pass the currently-loaded classes file so
 * `collides_with` can be resolved; without it that check downgrades to a
 * warning (the classes doc may simply not be uploaded yet).
 */
export function validateOriginsFile(
  input: unknown,
  classes?: SbpClassesFile | null,
): ValidationResult {
  const c = new Collector();
  const fail = (): ValidationResult => ({
    ok: false, kind: 'origins', schemaVersion: null, issues: c.issues, counts: {},
  });

  if (!isRecord(input)) {
    c.error('', 'Not a JSON object.');
    return fail();
  }
  const schemaVersion = checkCommonHeader(input, c);
  const species = Array.isArray(input.species) ? (input.species as Array<Record<string, unknown>>) : null;
  const backgrounds = Array.isArray(input.backgrounds) ? (input.backgrounds as Array<Record<string, unknown>>) : null;
  const feats = Array.isArray(input.feats) ? (input.feats as Array<Record<string, unknown>>) : null;
  if (!species) c.error('species', 'Missing species[].');
  if (!backgrounds) c.error('backgrounds', 'Missing backgrounds[].');
  if (!feats) c.error('feats', 'Missing feats[].');
  if (!species || !backgrounds || !feats) return fail();

  const seen = new Set<string>();
  checkIds(species, 'species', 'species.', c, seen);
  checkIds(backgrounds, 'backgrounds', 'background.', c, seen);
  checkIds(feats, 'feats', 'feat.', c, seen);

  const featIds = new Set(feats.map((f) => f.id as string));
  const speciesIds = new Set(species.map((s) => s.id as string));
  const classIds = classes ? new Set(classes.classes.map((k) => k.id)) : null;

  backgrounds.forEach((b, i) => {
    const p = `backgrounds[${i}]`;
    if (typeof b.origin_feat !== 'string' || !featIds.has(b.origin_feat)) {
      c.error(`${p}.origin_feat`, `Origin feat "${String(b.origin_feat)}" not found in feats[].`);
    }
    const asi = b.ability_score_increase;
    if (!isRecord(asi)) {
      c.error(`${p}.ability_score_increase`, 'Missing ability_score_increase.');
    } else if (asi.mode === 'fixed') {
      if (!isRecord(asi.values) || Object.keys(asi.values).length === 0) {
        c.error(`${p}.ability_score_increase.values`, 'mode "fixed" needs values.');
      }
    } else if (asi.mode === 'flexible') {
      if (!Array.isArray(asi.options) || asi.options.length !== 3) {
        c.error(`${p}.ability_score_increase.options`, 'mode "flexible" needs exactly 3 options.');
      }
    } else {
      c.error(`${p}.ability_score_increase.mode`, `Unknown mode "${String(asi.mode)}" (fixed | flexible).`);
    }
    const tools = b.tool_proficiencies;
    if (tools !== undefined) {
      const isStrings = (v: unknown) => Array.isArray(v) && v.every((s) => typeof s === 'string');
      if (!isRecord(tools)) {
        c.error(`${p}.tool_proficiencies`, 'tool_proficiencies must be an object.');
      } else {
        if (tools.fixed !== undefined && !isStrings(tools.fixed)) {
          c.error(`${p}.tool_proficiencies.fixed`, 'fixed must be a list of tool names.');
        }
        if (tools.from !== undefined && !isStrings(tools.from)) {
          c.error(`${p}.tool_proficiencies.from`, 'from must be a list of tool names.');
        }
        const ch = tools.choose;
        if (isRecord(ch)) {
          if (ch.count !== undefined && (typeof ch.count !== 'number' || ch.count < 1)) {
            c.error(`${p}.tool_proficiencies.choose.count`, 'count must be a number of at least 1.');
          }
          if (ch.category !== undefined && typeof ch.category !== 'string') {
            c.error(`${p}.tool_proficiencies.choose.category`, 'category must be a string.');
          }
        } else if (ch !== undefined && (typeof ch !== 'number' || ch < 1)) {
          c.error(`${p}.tool_proficiencies.choose`, 'choose must be a number, or { count, category }.');
        }
      }
    }
    if (typeof b.collides_with === 'string') {
      if (classIds && !classIds.has(b.collides_with)) {
        c.error(`${p}.collides_with`, `Class "${b.collides_with}" not found in the loaded classes file.`);
      } else if (!classIds) {
        c.warn(`${p}.collides_with`, `Could not check "${b.collides_with}": no classes file loaded.`);
      }
    }
  });

  species.forEach((s, i) => {
    const p = `species[${i}]`;
    if (!Array.isArray(s.traits)) c.error(`${p}.traits`, 'Missing traits[].');
    const sf = s.species_feats;
    if (sf !== undefined) {
      if (!Array.isArray(sf)) {
        c.error(`${p}.species_feats`, 'species_feats must be an array of feat ids.');
      } else {
        sf.forEach((id, j) => {
          if (typeof id !== 'string' || !featIds.has(id)) {
            c.error(`${p}.species_feats[${j}]`, `Feat "${String(id)}" not found in feats[].`);
          }
        });
      }
    }
  });

  feats.forEach((f, i) => {
    const p = `feats[${i}]`;
    const prereq = f.prerequisite;
    if (isRecord(prereq) && typeof prereq.species === 'string' && !speciesIds.has(prereq.species)) {
      c.error(`${p}.prerequisite.species`, `Species "${prereq.species}" not found in species[].`);
    }
    if (typeof f.text !== 'string') c.error(`${p}.text`, 'Missing text.');
  });

  const ok = !c.issues.some((i) => i.level === 'error');
  return {
    ok,
    kind: 'origins',
    schemaVersion,
    issues: c.issues,
    counts: { species: species.length, backgrounds: backgrounds.length, feats: feats.length },
  };
}

// ─── Classes ──────────────────────────────────────────────────────────────────

/**
 * Validate a classes file. Pass the loaded spell files so `spell_list` and
 * `grants.spells` can be resolved; without them those checks downgrade to
 * warnings (the spell docs may simply not be uploaded yet).
 */
export function validateClassesFile(
  input: unknown,
  spellFiles: { spells?: SbpSpellsFile | null; srd_spells?: SbpSrdSpellsFile | null } = {},
): ValidationResult {
  const c = new Collector();
  const fail = (): ValidationResult => ({
    ok: false, kind: 'classes', schemaVersion: null, issues: c.issues, counts: {},
  });

  if (!isRecord(input)) {
    c.error('', 'Not a JSON object.');
    return fail();
  }
  const schemaVersion = checkCommonHeader(input, c);
  const classes = Array.isArray(input.classes) ? (input.classes as Array<Record<string, unknown>>) : null;
  const archetypes = isRecord(input.archetypes) ? input.archetypes : null;
  const slotTables = isRecord(input.$slot_tables) ? input.$slot_tables : {};
  if (!classes) c.error('classes', 'Missing classes[].');
  if (!archetypes) c.error('archetypes', 'Missing archetypes{}.');
  if (!classes || !archetypes) return fail();

  const seen = new Set<string>();
  checkIds(classes, 'classes', 'class.', c, seen);

  const knownSpells = spellFiles.spells && spellFiles.srd_spells
    ? new Set([...spellFiles.spells.spells, ...spellFiles.srd_spells.spells].map((s) => s.id))
    : null;

  let archetypeCount = 0;
  for (const [key, group] of Object.entries(archetypes)) {
    if (!isRecord(group) || !Array.isArray(group.options)) {
      c.error(`archetypes.${key}`, 'Archetype group needs options[].');
      continue;
    }
    checkIds(group.options as Array<Record<string, unknown>>, `archetypes.${key}.options`, 'archetype.', c, seen);
    archetypeCount += group.options.length;
  }

  let featureCount = 0;
  classes.forEach((k, i) => {
    const p = `classes[${i}]`;
    const features = isRecord(k.features) ? k.features : null;
    const levels = Array.isArray(k.levels) ? (k.levels as Array<Record<string, unknown>>) : null;
    if (!features) c.error(`${p}.features`, 'Missing features{}.');
    if (!levels) c.error(`${p}.levels`, 'Missing levels[].');
    if (!features || !levels) return;
    featureCount += Object.keys(features).length;

    if (levels.length !== 20) {
      c.error(`${p}.levels`, `Expected 20 level entries, found ${levels.length}.`);
    }
    const referenced = new Set<string>();
    levels.forEach((L, j) => {
      if (L.level !== j + 1) c.error(`${p}.levels[${j}].level`, `Expected level ${j + 1}, found ${String(L.level)}.`);
      if (typeof L.proficiency_bonus !== 'number') {
        c.error(`${p}.levels[${j}].proficiency_bonus`, 'Missing proficiency_bonus.');
      }
      if (typeof L.asi_or_feat !== 'boolean') {
        c.error(`${p}.levels[${j}].asi_or_feat`, 'asi_or_feat must be true or false.');
      }
      const fs = Array.isArray(L.features) ? L.features : null;
      if (!fs) {
        c.error(`${p}.levels[${j}].features`, 'Missing features[].');
        return;
      }
      fs.forEach((id, n) => {
        if (typeof id !== 'string' || !(id in features)) {
          c.error(`${p}.levels[${j}].features[${n}]`, `Feature "${String(id)}" not in ${p}.features.`);
        } else {
          referenced.add(id);
        }
      });
    });
    for (const id of Object.keys(features)) {
      if (!referenced.has(id)) c.warn(`${p}.features.${id}`, 'Feature is never granted by any level.');
    }

    const arch = k.archetype;
    if (isRecord(arch)) {
      const ref = typeof arch.choices_ref === 'string' ? arch.choices_ref : '';
      const key = ref.startsWith('archetypes.') ? ref.slice('archetypes.'.length) : null;
      if (!key || !(key in archetypes)) {
        c.error(`${p}.archetype.choices_ref`, `"${ref}" does not point at an archetypes.* group.`);
      }
      if (typeof arch.entry_level !== 'number' || typeof arch.first_feature_level !== 'number') {
        c.error(`${p}.archetype`, 'entry_level and first_feature_level must be numbers.');
      }
    }

    const sc = k.spellcasting;
    if (isRecord(sc)) {
      if (typeof sc.slot_progression !== 'string' || !(sc.slot_progression in slotTables)) {
        c.error(`${p}.spellcasting.slot_progression`, `"${String(sc.slot_progression)}" not in $slot_tables.`);
      }
      if (typeof sc.spell_list !== 'string') {
        c.error(`${p}.spellcasting.spell_list`, 'Missing spell_list.');
      } else if (!spellFiles.spells) {
        c.warn(`${p}.spellcasting.spell_list`, `Could not check "${sc.spell_list}": no spells file loaded.`);
      } else if (!(sc.spell_list in spellFiles.spells.spell_lists)) {
        c.error(`${p}.spellcasting.spell_list`, `"${sc.spell_list}" not in the loaded spells file's spell_lists.`);
      }
      if (typeof sc.spellbook === 'string' && !(sc.spellbook in features)) {
        c.error(`${p}.spellcasting.spellbook`, `Feature "${sc.spellbook}" not in ${p}.features.`);
      }
    }
    for (const [fid, body] of Object.entries(features)) {
      checkSpellGrants(isRecord(body) ? body.grants : undefined, `${p}.features.${fid}.grants.spells`);
    }
  });

  for (const [key, group] of Object.entries(archetypes)) {
    if (!isRecord(group) || !Array.isArray(group.options)) continue;
    (group.options as unknown[]).forEach((o, i) => {
      if (!isRecord(o) || !isRecord(o.features)) return;
      for (const [lvl, body] of Object.entries(o.features)) {
        checkSpellGrants(
          isRecord(body) ? body.grants : undefined,
          `archetypes.${key}.options[${i}].features.${lvl}.grants.spells`,
        );
      }
    });
  }

  function checkSpellGrants(grants: unknown, path: string) {
    if (!isRecord(grants) || grants.spells === undefined) return;
    if (!Array.isArray(grants.spells)) {
      c.error(path, 'grants.spells must be a list of spell ids.');
      return;
    }
    grants.spells.forEach((id, j) => {
      if (typeof id !== 'string' || !id.startsWith('spell.')) {
        c.error(`${path}[${j}]`, `"${String(id)}" is not a spell id.`);
      } else if (!knownSpells) {
        c.warn(`${path}[${j}]`, `Could not check "${id}": both spell files must be loaded.`);
      } else if (!knownSpells.has(id)) {
        c.error(`${path}[${j}]`, `Spell "${id}" not found in either spell file.`);
      }
    });
  }

  const ok = !c.issues.some((i) => i.level === 'error');
  return {
    ok,
    kind: 'classes',
    schemaVersion,
    issues: c.issues,
    counts: {
      classes: classes.length,
      archetypes: archetypeCount,
      features: featureCount,
      slot_tables: Object.keys(slotTables).length,
    },
  };
}

// ─── Spells ───────────────────────────────────────────────────────────────────

/**
 * The SRD id rule from the spells files' `$conventions.srd_ids`: lowercase,
 * drop apostrophes, every other run of non-alphanumerics becomes `_`.
 */
export function srdSpellId(name: string): string {
  return 'spell.' + name
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const SAVE_OUTCOMES = new Set(['half', 'none', 'half_initial_only']);

/** Shape checks shared by both spell files. */
function checkSpell(s: Record<string, unknown>, p: string, c: Collector): void {
  if (typeof s.name !== 'string' || !s.name) c.error(`${p}.name`, 'Missing name.');
  if (typeof s.level !== 'number' || !Number.isInteger(s.level) || s.level < 0 || s.level > 9) {
    c.error(`${p}.level`, `Level must be a whole number 0–9, found ${String(s.level)}.`);
  }
  if (typeof s.text !== 'string' || !s.text) c.error(`${p}.text`, 'Missing text.');
  if (!isRecord(s.casting_time)) c.error(`${p}.casting_time`, 'Missing casting_time.');
  if (!isRecord(s.range)) c.error(`${p}.range`, 'Missing range.');
  if (!isRecord(s.components)) c.error(`${p}.components`, 'Missing components.');
  if (!isRecord(s.duration)) c.error(`${p}.duration`, 'Missing duration.');
  if (s.tags !== undefined && !(Array.isArray(s.tags) && s.tags.every((t) => typeof t === 'string'))) {
    c.error(`${p}.tags`, 'tags must be a list of strings.');
  }
  if (isRecord(s.save) && typeof s.save.on_success === 'string' && !SAVE_OUTCOMES.has(s.save.on_success)) {
    c.warn(`${p}.save.on_success`, `Unknown outcome "${s.save.on_success}" (half | none | half_initial_only).`);
  }
  if (!Array.isArray(s.damage)) {
    c.error(`${p}.damage`, 'damage must be a list (empty if none).');
  } else {
    s.damage.forEach((d, j) => {
      if (!isRecord(d) || typeof d.dice !== 'string' || typeof d.type !== 'string') {
        c.error(`${p}.damage[${j}]`, 'Each damage entry needs dice and type.');
      } else if (d.type === 'strain' && typeof d.fallback !== 'string') {
        c.error(`${p}.damage[${j}].fallback`, 'Strain damage needs a fallback type for casters without a Strain.');
      }
    });
  }
}

const fileTooBig = (input: unknown, c: Collector) => {
  const bytes = new TextEncoder().encode(JSON.stringify(input)).length;
  if (bytes > DOC_SIZE_WARN_BYTES) {
    c.warn('', `File is ${Math.round(bytes / 1000)} KB; Firestore rejects documents over ~1,000 KB.`);
  }
};

/** Validate the generated SRD spells file (`sbp_srd_spells.json`). */
export function validateSrdSpellsFile(
  input: unknown,
  loaded: { spells?: SbpSpellsFile | null } = {},
): ValidationResult {
  const c = new Collector();
  if (!isRecord(input)) {
    c.error('', 'Not a JSON object.');
    return { ok: false, kind: 'srd_spells', schemaVersion: null, issues: c.issues, counts: {} };
  }
  const schemaVersion = checkCommonHeader(input, c);
  const spells = input.spells as Array<Record<string, unknown>>;
  const seen = new Set<string>();
  checkIds(spells, 'spells', 'spell.', c, seen);
  spells.forEach((s, i) => {
    const p = `spells[${i}]`;
    if (!isRecord(s)) return;
    checkSpell(s, p, c);
    if (typeof s.name === 'string' && typeof s.id === 'string' && srdSpellId(s.name) !== s.id) {
      c.warn(`${p}.id`, `Id "${s.id}" doesn't follow the SRD id rule (expected "${srdSpellId(s.name)}").`);
    }
  });
  fileTooBig(input, c);

  // Reverse check: would the current spells file still resolve against this one?
  const sp = loaded.spells;
  if (sp) {
    const dropped = new Set<string>();
    for (const list of Object.values(sp.spell_lists)) list.srd.forEach((id) => !seen.has(id) && dropped.add(id));
    sp.reskins.forEach((r) => !seen.has(r.spell) && dropped.add(r.spell));
    for (const id of dropped) {
      c.warn('spells', `"${id}" is used by the current spells file but isn't in this one.`);
    }
  }

  return {
    ok: !c.issues.some((i) => i.level === 'error'),
    kind: 'srd_spells',
    schemaVersion,
    issues: c.issues,
    counts: { spells: spells.length, cantrips: spells.filter((s) => s.level === 0).length },
  };
}

/**
 * Validate the hand-edited spells file (`sbp_spells.json`): signature spells,
 * `spell_lists`, and `reskins`. SRD references are only checked when the SRD
 * file is loaded; class/archetype references only when classes are.
 */
export function validateSpellsFile(
  input: unknown,
  loaded: { srd_spells?: SbpSrdSpellsFile | null; classes?: SbpClassesFile | null } = {},
): ValidationResult {
  const c = new Collector();
  const fail = (): ValidationResult => ({
    ok: false, kind: 'spells', schemaVersion: null, issues: c.issues, counts: {},
  });
  if (!isRecord(input)) {
    c.error('', 'Not a JSON object.');
    return fail();
  }
  const schemaVersion = checkCommonHeader(input, c);
  const spells = Array.isArray(input.spells) ? (input.spells as Array<Record<string, unknown>>) : null;
  const lists = isRecord(input.spell_lists) ? input.spell_lists : null;
  const reskins = Array.isArray(input.reskins) ? (input.reskins as Array<Record<string, unknown>>) : [];
  if (!spells) c.error('spells', 'Missing spells[] (use [] if there are no signature spells).');
  if (!lists) c.error('spell_lists', 'Missing spell_lists{}.');
  if (input.reskins !== undefined && !Array.isArray(input.reskins)) c.error('reskins', 'reskins must be a list.');
  if (!spells || !lists) return fail();

  const srdIds = loaded.srd_spells ? new Set(loaded.srd_spells.spells.map((s) => s.id)) : null;
  const classes = loaded.classes ?? null;
  const ownerIds = classes
    ? new Set([
      ...classes.classes.map((k) => k.id),
      ...Object.values(classes.archetypes).flatMap((g) => g.options.map((o) => o.id)),
    ])
    : null;

  // Signature spells.
  const seen = new Set<string>();
  checkIds(spells, 'spells', 'spell.', c, seen);
  spells.forEach((s, i) => {
    const p = `spells[${i}]`;
    if (!isRecord(s)) return;
    checkSpell(s, p, c);
    if (typeof s.id === 'string' && srdIds?.has(s.id)) {
      c.error(`${p}.id`, `"${s.id}" is also an SRD spell id. Signature ids must be unique across both files.`);
    }
    if (!Array.isArray(s.lists) || s.lists.length === 0) {
      c.warn(`${p}.lists`, 'Not on any spell list (only reachable through grants).');
    } else {
      s.lists.forEach((l, j) => {
        if (typeof l !== 'string' || !(l in lists)) c.error(`${p}.lists[${j}]`, `"${String(l)}" not in spell_lists.`);
      });
    }
    if (ownerIds) {
      (Array.isArray(s.granted_by) ? s.granted_by : []).forEach((g, j) => {
        if (typeof g !== 'string' || !ownerIds.has(g)) {
          c.error(`${p}.granted_by[${j}]`, `"${String(g)}" is not a class or archetype in the loaded classes file.`);
        }
      });
      (Array.isArray(s.affinity) ? s.affinity : []).forEach((g, j) => {
        if (typeof g !== 'string' || !ownerIds.has(g)) {
          c.warn(`${p}.affinity[${j}]`, `"${String(g)}" is not an archetype in the loaded classes file.`);
        }
      });
    }
  });

  // Lists.
  let unresolved = 0;
  for (const [listId, list] of Object.entries(lists)) {
    const p = `spell_lists.${listId}`;
    if (!listId.startsWith('spell_list.')) c.error(p, `List id "${listId}" must start with "spell_list.".`);
    if (!isRecord(list) || !Array.isArray(list.srd)) {
      c.error(p, 'Each list needs srd: [spell ids].');
      continue;
    }
    const inList = new Set<string>();
    list.srd.forEach((id, j) => {
      if (typeof id !== 'string') {
        c.error(`${p}.srd[${j}]`, 'Not a spell id.');
        return;
      }
      if (inList.has(id)) c.warn(`${p}.srd[${j}]`, `"${id}" is listed twice.`);
      inList.add(id);
      if (seen.has(id)) {
        c.error(`${p}.srd[${j}]`, `"${id}" is a signature spell; give it to the list with its own lists[] instead.`);
      } else if (srdIds && !srdIds.has(id)) {
        c.error(`${p}.srd[${j}]`, `"${id}" not found in the loaded SRD spells file.`);
      } else if (!srdIds) {
        unresolved += 1;
      }
    });
  }
  if (unresolved > 0) {
    c.warn('spell_lists', `Could not check ${unresolved} SRD references: no SRD spells file loaded.`);
  }

  // Reskins: a reskin renames a spell already on the list; it never adds one.
  const pairs = new Set<string>();
  reskins.forEach((r, i) => {
    const p = `reskins[${i}]`;
    const spell = typeof r.spell === 'string' ? r.spell : '';
    const listId = typeof r.list === 'string' ? r.list : '';
    if (typeof r.name !== 'string' || !r.name) c.error(`${p}.name`, 'Missing name.');
    const list = lists[listId];
    if (!isRecord(list)) {
      c.error(`${p}.list`, `"${listId}" not in spell_lists.`);
    } else if (!Array.isArray(list.srd) || !list.srd.includes(spell)) {
      c.error(`${p}.spell`, `"${spell}" isn't on ${listId}. Add it to that list's srd first.`);
    }
    if (pairs.has(`${spell}@${listId}`)) c.error(p, `Second reskin of "${spell}" on ${listId}.`);
    pairs.add(`${spell}@${listId}`);
  });

  // Reverse checks against the classes that use these lists.
  if (classes) {
    classes.classes.forEach((k, i) => {
      const listId = k.spellcasting?.spell_list;
      if (listId && !(listId in lists)) {
        c.error('spell_lists', `classes[${i}] (${k.id}) uses "${listId}", which this file doesn't define.`);
      }
    });
  }

  fileTooBig(input, c);
  return {
    ok: !c.issues.some((i) => i.level === 'error'),
    kind: 'spells',
    schemaVersion,
    issues: c.issues,
    counts: {
      signature_spells: spells.length,
      spell_lists: Object.keys(lists).length,
      reskins: reskins.length,
    },
  };
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export interface LoadedRules {
  classes?: SbpClassesFile | null;
  origins?: SbpOriginsFile | null;
  spells?: SbpSpellsFile | null;
  srd_spells?: SbpSrdSpellsFile | null;
}

/** Validate a parsed file of any kind against whatever is already loaded. */
export function validateRulesFile(input: unknown, loaded: LoadedRules = {}): ValidationResult {
  const kind = detectRulesKind(input);
  switch (kind) {
    case 'classes':
      return validateClassesFile(input, loaded);
    case 'origins':
      return validateOriginsFile(input, loaded.classes);
    case 'spells':
      return validateSpellsFile(input, loaded);
    case 'srd_spells':
      return validateSrdSpellsFile(input, loaded);
    default:
      return {
        ok: false, kind: null, schemaVersion: null, counts: {},
        issues: [{
          level: 'error',
          path: '',
          message: 'Unrecognised file: expected classes[] + archetypes{}, species[] + backgrounds[] + feats[], '
            + 'spells[] + spell_lists{}, or spells[] alone (SRD).',
        }],
      };
  }
}

// ─── Diff ─────────────────────────────────────────────────────────────────────

/** Flatten a file into { entityId: entity } so two versions can be compared. */
export function indexRulesEntities(kind: SbpRulesKind, data: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!isRecord(data)) return out;
  const collect = (items: unknown) => {
    if (!Array.isArray(items)) return;
    for (const item of items) {
      if (isRecord(item) && typeof item.id === 'string') out[item.id] = item;
    }
  };
  if (kind === 'origins') {
    collect(data.species);
    collect(data.backgrounds);
    collect(data.feats);
  } else if (kind === 'classes') {
    collect(data.classes);
    if (isRecord(data.archetypes)) {
      for (const group of Object.values(data.archetypes)) {
        if (isRecord(group)) collect(group.options);
      }
    }
    if (isRecord(data.$slot_tables)) {
      for (const [key, table] of Object.entries(data.$slot_tables)) out[`slot_table.${key}`] = table;
    }
  } else if (kind === 'srd_spells') {
    collect(data.spells);
  } else if (kind === 'spells') {
    collect(data.spells);
    if (isRecord(data.spell_lists)) {
      for (const [key, list] of Object.entries(data.spell_lists)) out[key] = list;
    }
    if (Array.isArray(data.reskins)) {
      for (const r of data.reskins) {
        if (isRecord(r)) out[`reskin.${String(r.spell)}@${String(r.list)}`] = r;
      }
    }
  }
  return out;
}

export function diffRules(kind: SbpRulesKind, previous: unknown, next: unknown): RulesDiff {
  const a = indexRulesEntities(kind, previous);
  const b = indexRulesEntities(kind, next);
  const diff: RulesDiff = { added: [], removed: [], changed: [], unchanged: 0 };
  for (const id of Object.keys(b)) {
    if (!(id in a)) diff.added.push(id);
    else if (JSON.stringify(a[id]) !== JSON.stringify(b[id])) diff.changed.push(id);
    else diff.unchanged += 1;
  }
  for (const id of Object.keys(a)) {
    if (!(id in b)) diff.removed.push(id);
  }
  diff.added.sort();
  diff.removed.sort();
  diff.changed.sort();
  return diff;
}

export { ID_NAMESPACES };

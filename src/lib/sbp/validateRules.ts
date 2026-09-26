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
};

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
  if (Array.isArray(input.spells) || isRecord(input.spell_lists)) return 'spells';
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

export function validateClassesFile(input: unknown): ValidationResult {
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
      if (typeof sc.spell_list === 'string') {
        c.warn(`${p}.spellcasting.spell_list`, `"${sc.spell_list}" lives in the spells file, which isn't loaded yet.`);
      }
    }
  });

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

// ─── Entry point ──────────────────────────────────────────────────────────────

export interface LoadedRules {
  classes?: SbpClassesFile | null;
  origins?: SbpOriginsFile | null;
}

/** Validate a parsed file of any kind against whatever is already loaded. */
export function validateRulesFile(input: unknown, loaded: LoadedRules = {}): ValidationResult {
  const kind = detectRulesKind(input);
  switch (kind) {
    case 'classes':
      return validateClassesFile(input);
    case 'origins':
      return validateOriginsFile(input, loaded.classes);
    case 'spells':
      return {
        ok: false, kind, schemaVersion: null, counts: {},
        issues: [{ level: 'error', path: '', message: 'Spells files are not supported yet.' }],
      };
    default:
      return {
        ok: false, kind: null, schemaVersion: null, counts: {},
        issues: [{
          level: 'error',
          path: '',
          message: 'Unrecognised file: expected classes[] + archetypes{} or species[] + backgrounds[] + feats[].',
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

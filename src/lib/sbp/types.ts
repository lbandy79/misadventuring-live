/**
 * Soggy Bottom Pirates rules data — TypeScript shapes.
 *
 * These describe the two rules files (`sbp_classes.json`, `sbp_origins.json`)
 * as their `$conventions` blocks define them. They are TYPES ONLY. The files
 * themselves are unpublished IP and never enter this repo or the bundle;
 * they are uploaded to Firestore through /admin and fetched after sign-in.
 *
 * Shapes are deliberately permissive (index signatures, optional fields):
 * the data is still being designed and rebalancing must be a file upload,
 * not a code change. Consumers read the fields they need and ignore the rest.
 */

export type AbilityKey = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';

export type Maturity = 'core' | 'draft' | 'confirmed';

export interface PlaytestFlag {
  status: 'needs_evaluation' | 'watching' | 'confirmed';
  note?: string;
  flagged?: string;
}

/** IP rename tracking. Internal only — never rendered on a public surface. */
export interface SwapFlag {
  risk: 'high' | 'medium' | 'low';
  note?: string;
}

export interface Uses {
  count: number | 'proficiency_bonus';
  recharge: 'short_rest' | 'long_rest';
}

interface Flagged {
  maturity?: Maturity;
  playtest?: PlaytestFlag;
  swap?: SwapFlag;
}

// ─── Origins file ─────────────────────────────────────────────────────────────

export interface SpeciesTrait extends Flagged {
  id: string;
  name: string;
  text: string;
  grants?: Record<string, unknown>;
  uses?: Uses;
  unlock_level?: number;
  formula?: string;
}

export interface Species extends Flagged {
  id: string;
  name: string;
  flavor?: string;
  creature_type?: string;
  size?: string | { choose_one: string[] };
  speed?: Record<string, number>;
  traits: SpeciesTrait[];
  /** Feat ids selectable at asi_or_feat levels, gated by species prerequisite. */
  species_feats?: string[];
  [key: string]: unknown;
}

export interface AbilityScoreIncrease {
  /** 'fixed' uses `values`; 'flexible' lets the player spread +2/+1 or +1/+1/+1 over `options`. */
  mode: 'fixed' | 'flexible';
  values?: Partial<Record<AbilityKey, number>>;
  options?: AbilityKey[];
}

export interface Background extends Flagged {
  id: string;
  name: string;
  flavor?: string;
  ability_score_increase: AbilityScoreIncrease;
  skill_proficiencies?: string[];
  tool_proficiencies?: { fixed?: string[]; choose?: number; from?: string[] };
  origin_feat: string;
  /** Class id whose display name this background shares. UI shows a note; never blocks. */
  collides_with?: string;
  [key: string]: unknown;
}

export interface Feat extends Flagged {
  id: string;
  name: string;
  category: 'origin' | 'species' | string;
  prerequisite: { species?: string; [key: string]: unknown } | null;
  repeatable?: boolean;
  text: string;
  grants?: Record<string, unknown>;
  uses?: Uses;
  [key: string]: unknown;
}

export interface OpenDecision {
  id: string;
  question: string;
  [key: string]: unknown;
}

export interface SbpOriginsFile {
  $schema_version: string;
  $doc?: string;
  $conventions?: Record<string, string>;
  $open_decisions?: OpenDecision[];
  species: Species[];
  backgrounds: Background[];
  feats: Feat[];
}

// ─── Classes file ─────────────────────────────────────────────────────────────

export interface ClassFeature extends Flagged {
  name: string;
  level: number;
  text: string;
  is_capstone?: boolean;
  grants?: Record<string, unknown>;
  uses?: Uses;
  formula?: string;
  [key: string]: unknown;
}

export interface ClassLevel extends Flagged {
  level: number;
  proficiency_bonus: number;
  /** Feature ids — bodies live once in `SbpClass.features`. */
  features: string[];
  asi_or_feat: boolean;
  archetype_choice?: boolean;
  archetype_features?: boolean | number | string[];
  cantrips_known?: number;
  spells_known?: number;
  [key: string]: unknown;
}

export interface ClassArchetypeRef {
  label: string;
  /** Level the player CHOOSES the archetype. */
  entry_level: number;
  /** Level the first archetype feature lands — may be later than entry_level. */
  first_feature_level: number;
  /** `archetypes.<key>` into `SbpClassesFile.archetypes`. */
  choices_ref: string;
}

export interface ClassSpellcasting {
  ability: AbilityKey;
  /** `spell_list.*` — lives in a spells file that does not exist yet. */
  spell_list: string;
  /** Key into `$slot_tables`. */
  slot_progression: string;
  prepares_or_knows?: 'prepares' | 'knows';
  [key: string]: unknown;
}

export interface SbpClass extends Flagged {
  id: string;
  name: string;
  flavor?: string;
  hit_die: string | number;
  hp_at_1st?: string | number;
  hp_per_level?: string | number;
  primary_ability?: AbilityKey | AbilityKey[];
  saving_throws?: AbilityKey[];
  proficiencies?: Record<string, unknown>;
  starting_equipment?: unknown;
  spellcasting?: ClassSpellcasting;
  archetype?: ClassArchetypeRef;
  features: Record<string, ClassFeature>;
  levels: ClassLevel[];
  companions?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ArchetypeOption extends Flagged {
  id: string;
  name: string;
  /** Keyed by level (as a string, since it came from JSON). */
  features: Record<string, { name: string; text: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

export interface ArchetypeGroup {
  $doc?: string;
  options: ArchetypeOption[];
}

export interface SbpClassesFile {
  $schema_version: string;
  $doc?: string;
  $conventions?: Record<string, string>;
  $slot_tables: Record<string, unknown>;
  classes: SbpClass[];
  archetypes: Record<string, ArchetypeGroup>;
}

// ─── Firestore documents ──────────────────────────────────────────────────────

/** Doc ids in `sbp-rules`. `spells` is reserved for the file that doesn't exist yet. */
export type SbpRulesKind = 'classes' | 'origins' | 'spells';

export interface SbpRulesMeta {
  kind: SbpRulesKind;
  schemaVersion: string;
  /** Admin uid who uploaded. Rules require it to match request.auth.uid. */
  uploadedBy: string;
  uploadedByEmail: string;
  /** Millisecond epoch, set client-side so it can double as the `rulesVersion` token. */
  uploadedAt: number;
  sourceFileName: string;
  counts: Record<string, number>;
}

/** Shape of `sbp-rules/{kind}`. `data` is the uploaded file, verbatim. */
export interface SbpRulesDoc<T = SbpClassesFile | SbpOriginsFile> {
  meta: SbpRulesMeta;
  data: T;
}

/** Shape of `sbp-rules-history/{id}`: the previous doc plus when it was replaced. */
export interface SbpRulesHistoryEntry {
  kind: SbpRulesKind;
  replacedAt: number;
  replacedBy: string;
  previous: SbpRulesDoc;
}

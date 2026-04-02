/**
 * System Configuration Types
 * 
 * TypeScript interfaces for TTRPG system JSON files.
 * The app reads system rules as data — stats, dice, tropes, NPC creator config —
 * so components never hardcode system-specific values.
 */

// =============================================================================
// TOP-LEVEL SYSTEM CONFIG
// =============================================================================

export interface SystemConfig {
  system: SystemInfo;
  stats: Stat[];
  dice: DiceConfig;
  ageGroups: AgeGroup[];
  tropes: Trope[];
  strengths: Strength[];
  flaws: Flaw[];
  statChecks: StatCheckRules;
  npcCreator: NpcCreatorConfig;
  showConfig: ShowConfig;
}

// =============================================================================
// SYSTEM IDENTITY
// =============================================================================

export interface SystemInfo {
  id: string;
  name: string;
  edition: string;
  publisher: string;
  description: string;
}

// =============================================================================
// STATS
// =============================================================================

export interface Stat {
  id: string;
  name: string;
  description: string;
  likelyVerbs: string[];
}

// =============================================================================
// DICE
// =============================================================================

export interface DiceConfig {
  available: string[];
  descriptions: Record<string, string>;
}

// =============================================================================
// AGE GROUPS
// =============================================================================

export interface AgeGroup {
  id: string;
  name: string;
  statBonuses: Record<string, number>;
  freeStrength: string;
  restrictedStrengths?: string[];
  description: string;
}

// =============================================================================
// TROPES (Character Archetypes)
// =============================================================================

export interface Trope {
  id: string;
  name: string;
  allowedAges: string[];
  statAssignment: Record<string, string>;
  suggestedStrengths: string[];
  suggestedFlaws: string[];
  questions: string[];
}

// =============================================================================
// STRENGTHS & FLAWS
// =============================================================================

export interface Strength {
  id: string;
  name: string;
  description: string;
  atCost: number;
  alwaysActive: boolean;
  teenOnly?: boolean;
  requiresInput?: boolean;
}

export interface Flaw {
  id: string;
  name: string;
}

// =============================================================================
// STAT CHECK RULES
// =============================================================================

export interface DifficultyLevel {
  range: [number, number];
  label: string;
  description: string;
}

export interface AdversityTokenRules {
  startingAmount: number;
  earnedOnFailure: number;
  spendToBoostRoll: string;
  canHelpAllies: boolean;
  canIgnoreFear: string;
}

export interface StatCheckRules {
  difficultyScale: DifficultyLevel[];
  luckyBreak: string;
  adversityTokens: AdversityTokenRules;
}

// =============================================================================
// NPC CREATOR CONFIG
// =============================================================================

export interface NpcFormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  required: boolean;
  placeholder?: string;
  helpText?: string;
  maxLength?: number;
  optionsFrom?: string;
  validation?: string;
}

export interface NpcStatAssignment {
  _comment?: string;
  best: string;
  worst: string;
  remaining: string;
}

export interface NpcCreatorConfig {
  _comment?: string;
  fields: NpcFormField[];
  statAssignment: NpcStatAssignment;
}

// =============================================================================
// SHOW CONFIG (Per-Show Overrides)
// =============================================================================

export interface ShowSetting {
  era: string;
  location: string;
  coreLocation: string;
}

export interface NpcCreatorOverrides {
  occupationSuggestions: string[];
  secretPrompt: string;
}

export interface ShowConfig {
  _comment?: string;
  showId: string;
  showName: string;
  seriesName: string;
  tapeNumber: number;
  setting: ShowSetting;
  npcCreatorOverrides: NpcCreatorOverrides;
}

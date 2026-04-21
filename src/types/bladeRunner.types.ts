export type AttributeLevel = 'A' | 'B' | 'C' | 'D';

export interface BladeRunnerSystemInfo {
  id: string;
  name: string;
  edition: string;
  publisher: string;
  engine: string;
  description: string;
}

export interface BladeRunnerAttribute {
  id: 'strength' | 'agility' | 'intelligence' | 'empathy';
  name: string;
  description: string;
  linkedSkills: string[];
  healthContributor?: boolean;
  resolveContributor?: boolean;
}

export interface BladeRunnerAttributeLevel {
  level: AttributeLevel;
  dieType: string;
  dieSize: number;
  description: string;
}

export interface BladeRunnerSkill {
  id: string;
  name: string;
  attribute: string;
  description: string;
}

export interface BladeRunnerNatureOption {
  id: 'human' | 'replicant';
  name: string;
  rollRange: [number, number];
  rollDie: string;
  bonusAttributeIncreases: number;
  bonusAttributeRestriction?: string;
  healthModifier: number;
  resolveModifier: number;
  promotionModifier: number;
  chinyenModifier: number;
  pushLimit: number;
  pushDamageType: string;
  notes: string;
}

export interface BladeRunnerArchetype {
  id: string;
  name: string;
  allowedNatures: Array<'human' | 'replicant'>;
  keyAttribute: BladeRunnerAttribute['id'];
  keySkills: string[];
  chinyenDie: string;
  description: string;
  specialties: string[];
  suggestedNames: string[];
  suggestedAppearances: string[];
}

export interface BladeRunnerYearsOnForce {
  id: string;
  name: string;
  rollRange: [number, number];
  rollDie: string;
  yearsRange: string;
  attributeIncreases: number;
  skillIncreases: number;
  specialties: number;
  promotionDie: string;
  chinyenModifier: number;
  description: string;
}

export interface BladeRunnerDerivedStatConfig {
  formula: string;
  replicantBonus?: number;
  replicantPenalty?: number;
  example: string;
}

export interface BladeRunnerSpecialty {
  id: string;
  name: string;
  description: string;
  stackable?: number;
}

export interface RollTableOption {
  roll: number | [number, number];
  text: string;
}

export interface RollTable {
  rollDie: string;
  options: RollTableOption[];
}

export interface KeyMemoryTables {
  when: RollTable;
  where: RollTable;
  who: RollTable;
  what: RollTable;
  feeling: RollTable;
}

export interface KeyRelationshipTables {
  who: RollTable;
  quality: RollTable;
  situation: RollTable;
}

export interface BladeRunnerSystemConfig {
  system: BladeRunnerSystemInfo;
  attributes: BladeRunnerAttribute[];
  attributeLevels: BladeRunnerAttributeLevel[];
  skills: BladeRunnerSkill[];
  nature: {
    options: BladeRunnerNatureOption[];
  };
  archetypes: BladeRunnerArchetype[];
  yearsOnForce: BladeRunnerYearsOnForce[];
  derivedStats: {
    health: BladeRunnerDerivedStatConfig;
    resolve: BladeRunnerDerivedStatConfig;
  };
  specialties: BladeRunnerSpecialty[];
  keyMemory: {
    description: string;
    tables: KeyMemoryTables;
  };
  keyRelationship: {
    description: string;
    tables: KeyRelationshipTables;
  };
  signatureItem: {
    description: string;
    rollDie: string;
    options: RollTableOption[];
  };
  standardGear: Array<{ id: string; name: string; description: string }>;
  homes: {
    rollDie: string;
    options: RollTableOption[];
  };
  characterCreation: {
    steps: Array<{ step: number; action: string; details: string }>;
  };
  quickPlayReference: Record<string, string[] | string>;
  showConfig: Record<string, unknown>;
}

export interface BladeRunnerCharacter {
  name: string;
  playerName: string;
  appearance: string;
  natureId: 'human' | 'replicant';
  archetypeId: string;
  yearsOnForceId: string;
  attributes: Record<BladeRunnerAttribute['id'], AttributeLevel>;
  health: number;
  resolve: number;
  skills: Record<string, AttributeLevel>;
  specialties: string[];
  keyMemory: {
    when: string;
    where: string;
    who: string;
    what: string;
    feeling: string;
    summary: string;
  };
  keyRelationship: {
    name: string;
    who: string;
    quality: string;
    situation: string;
    summary: string;
  };
  signatureItem: string;
  home: string;
  gear: Array<{ id: string; name: string; description: string }>;
}

export function isBladeRunnerConfig(value: unknown): value is BladeRunnerSystemConfig {
  if (!value || typeof value !== 'object') return false;
  const maybeConfig = value as Partial<BladeRunnerSystemConfig>;
  return Boolean(
    maybeConfig.system?.id === 'blade-runner-rpg' &&
      Array.isArray(maybeConfig.attributes) &&
      Array.isArray(maybeConfig.skills) &&
      Array.isArray(maybeConfig.archetypes) &&
      Array.isArray(maybeConfig.yearsOnForce)
  );
}

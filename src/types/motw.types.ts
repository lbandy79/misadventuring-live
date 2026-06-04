export interface MotWRating {
  id: 'charm' | 'cool' | 'sharp' | 'tough' | 'weird';
  name: string;
  description: string;
}

export interface MotWRatingsLine {
  charm: number;
  cool: number;
  sharp: number;
  tough: number;
  weird: number;
}

export interface MotWMove {
  name: string;
  mandatory?: boolean;
  description: string;
}

export interface MotWSpecialMechanicsSection {
  description: string;
  options?: string[];
  pick?: number;
  pickCount?: number;
  suggestions?: string[];
  goodTraditions?: string[];
  badTraditions?: string[];
  resources?: string[];
  redTape?: string[];
  bases?: string[];
  extras?: string[];
  effects?: string[];
  whoYouLost?: string[];
  whyYouCouldntSave?: string[];
  howYouFoundOut?: string[];
  heroicTags?: string[];
  doomTags?: string[];
  forms?: string[];
  businessEnd?: string[];
  material?: string[];
  tags?: string[];
  prey?: string;
}

export interface MotWPlaybook {
  id: string;
  name: string;
  concept: string;
  examples: string[];
  ratingLines: MotWRatingsLine[];
  moveCount: number;
  moves: MotWMove[];
  gear: string[];
  luckSpecial?: string;
  advancedImprovement?: string | null;
  specialMechanics?: Record<string, MotWSpecialMechanicsSection>;
}

export interface MotWBasicMove {
  id: string;
  name: string;
  roll: string;
  trigger: string;
  results: Record<string, string>;
  holdQuestions?: string[];
}

export interface MotWSystemConfig {
  system: {
    id: string;
    name: string;
    description: string;
  };
  ratings: {
    list: MotWRating[];
    range: { min: number; max: number };
    scale: Record<string, string>;
  };
  dice: {
    mechanic: {
      results: Record<string, string>;
    };
  };
  luck: {
    boxes: number;
    spendOptions: string[];
    whenEmpty: string;
  };
  harm: {
    track: number;
    unstableAt: number;
  };
  basicMoves: MotWBasicMove[];
  playbooks: MotWPlaybook[];
  improvements: {
    standard: string[];
    advanced: string[];
    leveling: string;
    endOfSessionQuestions: string[];
  };
}

export function isMotWConfig(config: unknown): config is MotWSystemConfig {
  if (!config || typeof config !== 'object') return false;
  const c = config as Record<string, unknown>;
  return (
    typeof c.system === 'object' &&
    c.system !== null &&
    (c.system as Record<string, unknown>).id === 'monster-of-the-week' &&
    Array.isArray(c.playbooks)
  );
}

export type MotWStep = 'welcome' | 'playbook' | 'ratings' | 'moves' | 'specials' | 'summary';

export const MOTW_STEP_ORDER: MotWStep[] = [
  'welcome',
  'playbook',
  'ratings',
  'moves',
  'specials',
  'summary',
];

export const MOTW_STEP_LABELS: Record<MotWStep, string> = {
  welcome: 'Intro',
  playbook: 'Playbook',
  ratings: 'Ratings',
  moves: 'Moves',
  specials: 'Specials',
  summary: 'Summary',
};

export interface MotWCreatorState {
  step: MotWStep;
  playbookId: string | null;
  ratingsLineIndex: number | null;
  selectedMoveNames: string[];
  specialSelections: Record<string, string[]>; // "sectionKey.fieldKey" → selected items
  specialNotes: string;
  hunterName: string;
  playerName: string;
}

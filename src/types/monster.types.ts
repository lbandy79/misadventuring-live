/**
 * Monster Assembly Types - Beast of Ridgefall Sprint
 * 
 * Types for the monster building voting system where the audience
 * votes on four body parts to create a unique creature.
 */

// Body part categories
export type MonsterPartCategory = 'head' | 'torso' | 'arms' | 'legs';

// Individual part options with display info
export interface MonsterPartOption {
  id: string;
  label: string;
  emoji: string;
  description?: string;
}

// Available options for each body part
export interface MonsterPartConfig {
  category: MonsterPartCategory;
  question: string;
  options: MonsterPartOption[];
}

// The assembled monster result
export interface AssembledMonster {
  head: string;
  torso: string;
  arms: string;
  legs: string;
  name?: string; // Audience-submitted name (post-battle)
  compiledId: string; // e.g., "ram-bear-mantis-spider"
  assembledAt: number;
}

// Monster vote state stored in Firebase
export interface MonsterVoteState {
  status: 'voting' | 'revealing' | 'complete';
  currentPart: MonsterPartCategory;
  partIndex: number; // 0-3 for head, torso, arms, legs
  votes: {
    head?: Record<string, number>;
    torso?: Record<string, number>;
    arms?: Record<string, number>;
    legs?: Record<string, number>;
  };
  winners: {
    head?: string;
    torso?: string;
    arms?: string;
    legs?: string;
  };
  isOpen: boolean;
  timer: number;
  startedAt?: number;
  sessionId: string;
}

// Active interaction type for monster voting
export interface MonsterVoteInteraction {
  type: 'monster-vote';
  currentPart: MonsterPartCategory;
  partIndex: number;
  question: string;
  options: MonsterPartOption[];
  isOpen: boolean;
  timer: number;
  startedAt?: number;
  sessionId: string;
}

// Default monster part configurations
export const MONSTER_PARTS_CONFIG: MonsterPartConfig[] = [
  {
    category: 'head',
    question: 'What HEAD does the creature have?',
    options: [
      { id: 'ram', label: 'Ram', emoji: '🐏', description: 'Curved horns of fury' },
      { id: 'wolf', label: 'Wolf', emoji: '🐺', description: 'Cunning predator' },
      { id: 'owl', label: 'Owl', emoji: '🦉', description: 'All-seeing eyes' },
      { id: 'stag', label: 'Stag', emoji: '🦌', description: 'Noble antlers' },
    ],
  },
  {
    category: 'torso',
    question: 'What BODY does the creature have?',
    options: [
      { id: 'bear', label: 'Bear', emoji: '🐻', description: 'Massive and powerful' },
      { id: 'boar', label: 'Boar', emoji: '🐗', description: 'Tusked and fierce' },
      { id: 'elk', label: 'Elk', emoji: '🫎', description: 'Swift and strong' },
      { id: 'stone', label: 'Stone', emoji: '🪨', description: 'Living rock' },
    ],
  },
  {
    category: 'arms',
    question: 'What ARMS does the creature have?',
    options: [
      { id: 'gorilla', label: 'Gorilla', emoji: '🦍', description: 'Crushing strength' },
      { id: 'eagle', label: 'Eagle', emoji: '🦅', description: 'Taloned wings' },
      { id: 'mantis', label: 'Mantis', emoji: '🦗', description: 'Razor scythes' },
      { id: 'badger', label: 'Badger', emoji: '🦡', description: 'Digging claws' },
    ],
  },
  {
    category: 'legs',
    question: 'What LEGS does the creature have?',
    options: [
      { id: 'goat', label: 'Goat', emoji: '🐐', description: 'Sure-footed climber' },
      { id: 'horse', label: 'Horse', emoji: '🐴', description: 'Thundering hooves' },
      { id: 'spider', label: 'Spider', emoji: '🕷️', description: 'Eight-legged horror' },
      { id: 'wurm', label: 'Wurm', emoji: '🐛', description: 'Slithering mass' },
    ],
  },
];

// Get the part order for sequential voting
export const PART_ORDER: MonsterPartCategory[] = ['head', 'torso', 'arms', 'legs'];

// Helper to get config for a specific part
export function getPartConfig(category: MonsterPartCategory): MonsterPartConfig {
  return MONSTER_PARTS_CONFIG.find(p => p.category === category)!;
}

// Helper to compile monster ID from winners
export function compileMonsterID(winners: MonsterVoteState['winners']): string {
  return `${winners.head || 'unknown'}-${winners.torso || 'unknown'}-${winners.arms || 'unknown'}-${winners.legs || 'unknown'}`;
}

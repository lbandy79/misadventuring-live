/**
 * LEGACY REFERENCE — Quick Monster Builder (Lucky Straws, Feb 15 show)
 *
 * ⚠️  This code is NOT actively used in the platform app. It lives here as
 *     reference for what we shipped and what we learned. The active system
 *     is `platform/src/components/admin/LiveMonsterAdminPanel.tsx` driven
 *     by `src/data/liveMonster/` configs.
 *
 * What this was:
 *   Audience selects ALL 4 body parts at once (head / torso / arms / legs) and
 *   submits a single combined creature. Votes aggregate server-side; the most-
 *   picked combo is revealed part-by-part with GSAP animation.
 *
 * What worked:
 *   - Emoji labels — scannable on phones in a dark room
 *   - GSAP sequential reveal built tension ("THE HEAD OF A... RAM!")
 *   - localStorage voter ID — simple, no auth friction
 *
 * What didn't work:
 *   - Picking 4 things simultaneously is cognitively heavy; engagement dropped
 *     after the first part because the rest felt like chores
 *   - Hardcoded body parts — reusing for a different show required code changes
 *   - No write-ins; audience could only pick from preset options
 *   - Body-part chimera metaphor doesn't fit MotW's narrative monster style
 *
 * Superseded by: sequential phase system in `src/lib/liveMonster/liveMonsterApi.ts`
 * which is config-driven, GM-paced, and supports write-ins.
 */

// Body part categories
export type MonsterBuilderCategory = 'head' | 'torso' | 'arms' | 'legs';

// Individual part options
export interface MonsterBuilderOption {
  id: string;
  emoji: string;
  label: string;
}

// Part configuration
export interface MonsterBuilderPartConfig {
  category: MonsterBuilderCategory;
  label: string;
  options: MonsterBuilderOption[];
}

// User's complete creature submission
export interface MonsterBuilderSubmission {
  odId: string;
  head: string;
  torso: string;
  arms: string;
  legs: string;
  submittedAt: number;
}

// Vote counts per option per category
export interface MonsterBuilderCounts {
  head: Record<string, number>;
  torso: Record<string, number>;
  arms: Record<string, number>;
  legs: Record<string, number>;
}

// Winning parts
export interface MonsterBuilderWinners {
  head: string | null;
  torso: string | null;
  arms: string | null;
  legs: string | null;
}

// Firebase state for monster builder
export interface MonsterBuilderState {
  status: 'building' | 'closed' | 'revealing' | 'complete';
  submissions: Record<string, MonsterBuilderSubmission>;
  results: {
    head: string | null;
    torso: string | null;
    arms: string | null;
    legs: string | null;
    counts: MonsterBuilderCounts;
  };
  revealStep: 0 | 1 | 2 | 3 | 4 | 5; // 0=not started, 1-4=each part, 5=complete
  sessionId: string;
}

// ============ MONSTER PARTS CONFIG ============

export const MONSTER_BUILDER_HEADS: MonsterBuilderOption[] = [
  { id: 'ram', emoji: '🐏', label: 'Ram' },
  { id: 'wolf', emoji: '🐺', label: 'Wolf' },
  { id: 'owl', emoji: '🦉', label: 'Owl' },
  { id: 'octopus', emoji: '🐙', label: 'Octopus' },
];

export const MONSTER_BUILDER_TORSOS: MonsterBuilderOption[] = [
  { id: 'bear', emoji: '🐻', label: 'Bear' },
  { id: 'boar', emoji: '🐗', label: 'Boar' },
  { id: 'stone', emoji: '🪨', label: 'Stone' },
  { id: 'flame', emoji: '🔥', label: 'Flame' },
];

export const MONSTER_BUILDER_ARMS: MonsterBuilderOption[] = [
  { id: 'gorilla', emoji: '🦍', label: 'Gorilla' },
  { id: 'eagle', emoji: '🦅', label: 'Eagle' },
  { id: 'crab', emoji: '🦀', label: 'Crab' },
  { id: 'squid', emoji: '🦑', label: 'Squid' },
];

export const MONSTER_BUILDER_LEGS: MonsterBuilderOption[] = [
  { id: 'goat', emoji: '🐐', label: 'Goat' },
  { id: 'wolf', emoji: '🐺', label: 'Wolf' },
  { id: 'spider', emoji: '🕷️', label: 'Spider' },
  { id: 'snake', emoji: '🐍', label: 'Snake' },
];

export const MONSTER_BUILDER_CONFIG: MonsterBuilderPartConfig[] = [
  { category: 'head', label: 'HEAD', options: MONSTER_BUILDER_HEADS },
  { category: 'torso', label: 'BODY', options: MONSTER_BUILDER_TORSOS },
  { category: 'arms', label: 'ARMS', options: MONSTER_BUILDER_ARMS },
  { category: 'legs', label: 'LEGS', options: MONSTER_BUILDER_LEGS },
];

// Display text mapping for dramatic reveal
export const DISPLAY_TEXT: Record<string, Record<string, string>> = {
  head: {
    ram: 'RAM',
    wolf: 'WOLF',
    owl: 'OWL',
    octopus: 'OCTOPUS',
  },
  torso: {
    bear: 'BEAR',
    boar: 'BOAR',
    stone: 'LIVING STONE',
    flame: 'LIVING FLAME',
  },
  arms: {
    gorilla: 'GORILLA',
    eagle: 'EAGLE',
    crab: 'CRAB',
    squid: 'SQUID',
  },
  legs: {
    goat: 'GOAT',
    wolf: 'WOLF',
    spider: 'SPIDER',
    snake: 'SERPENT',
  },
};

export const REVEAL_INTROS: Record<MonsterBuilderCategory, string> = {
  head: 'THE HEAD OF A...',
  torso: 'THE BODY OF A...',
  arms: 'THE CLAWS OF A...',
  legs: 'THE LEGS OF A...',
};

// Part order for reveal sequence
export const BUILDER_PART_ORDER: MonsterBuilderCategory[] = ['head', 'torso', 'arms', 'legs'];

// Helper to get emoji for a part
export function getPartEmoji(category: MonsterBuilderCategory, optionId: string): string {
  const config = MONSTER_BUILDER_CONFIG.find(c => c.category === category);
  return config?.options.find(o => o.id === optionId)?.emoji || '❓';
}

// Helper to calculate winner from votes (with tie-breaker)
export function calculateWinner(votes: Record<string, number>): string {
  const entries = Object.entries(votes);
  if (entries.length === 0) return '';
  
  const maxVotes = Math.max(...entries.map(([_, count]) => count));
  const winners = entries.filter(([_, count]) => count === maxVotes);
  
  if (winners.length === 1) {
    return winners[0][0];
  }
  
  // Tie: random selection
  const randomIndex = Math.floor(Math.random() * winners.length);
  return winners[randomIndex][0];
}

// Generate unique user ID (stored in localStorage)
export function getOrCreateUserId(): string {
  const key = 'mtp-user-id';
  let userId = localStorage.getItem(key);
  if (!userId) {
    userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(key, userId);
  }
  return userId;
}

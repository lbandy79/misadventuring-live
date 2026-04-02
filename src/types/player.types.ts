/**
 * Player identity & character assignment types
 *
 * Four named players each get a unique URL (/player/ben, /player/libbe, etc.)
 * and the GM assigns recruited crew characters to them from the admin panel.
 *
 * Firebase doc: players/assignments
 */

export type PlayerID = 'ben' | 'libbe' | 'patrick' | 'josh';

export const PLAYER_IDS: PlayerID[] = ['ben', 'libbe', 'patrick', 'josh'];

export const PLAYER_NAMES: Record<PlayerID, string> = {
  ben: 'Ben',
  libbe: 'Libbe',
  patrick: 'Patrick',
  josh: 'Josh',
};

export interface PlayerAssignment {
  characterId: string;
  assignedAt: number;
}

export type PlayersDoc = Record<PlayerID, PlayerAssignment | null>;

export function isValidPlayerId(id: string): id is PlayerID {
  return PLAYER_IDS.includes(id as PlayerID);
}

export function createEmptyPlayersDoc(): PlayersDoc {
  return { ben: null, libbe: null, patrick: null, josh: null };
}

// ─── Stat block types (matches ip_isle_stat_blocks.json shape) ───────

export interface StatBlockAbilities {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export interface StatBlockAttack {
  name: string;
  toHit: string;
  damage: string;
  range: string;
}

export interface StatBlockFlicker {
  rating: string;
  effect: string;
}

export interface StatBlock {
  id: string;
  name: string;
  year: number;
  source: string;
  shipRole: string;
  flicker: StatBlockFlicker;
  hp: number;
  ac: number;
  speed: string;
  abilities: StatBlockAbilities;
  attack: StatBlockAttack;
  skills: Record<string, string>;
  specials: string[];
  personality: string;
}

export interface StatBlockFile {
  meta: {
    level: number;
    proficiencyBonus: number;
    note: string;
  };
  characters: StatBlock[];
}

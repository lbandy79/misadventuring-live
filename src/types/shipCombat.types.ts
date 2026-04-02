/**
 * Ship Combat v2 Types — Wave-based ship defense encounter
 *
 * v2: Crew acts as ONE collective unit. Audience votes on a single action
 * from 3-4 options per round. Multi-round waves with distinct phases:
 * crew-voting → player-turns → villain-turn → repeat.
 *
 * FLOW:
 *   1. GM loads crew from decoder-ring results
 *   2. Begin combat → status: 'briefing' → display shows wave intro
 *   3. Open crew voting → status: 'crew-voting' → audience picks ONE action
 *   4. Close voting → GM enters d20 → resolve crew action
 *   5. Player turns → status: 'player-turns' → PCs fight at table
 *   6. Villain turn → status: 'villain-turn' → auto-calc boarder damage + flyer advance
 *   7. DM clicks Next Round or Next Wave → repeat
 *   8. Victory/Defeat → end
 */

// ─── Status ────────────────────────────────────────────────────────────

export type ShipCombatStatus =
  | 'idle'
  | 'briefing'
  | 'crew-voting'     // audience votes on crew action
  | 'pc-voting'       // audience votes on which crew member performs the action
  | 'awaiting-roll'   // voting closed, GM enters d20
  | 'player-turns'    // PCs fight at the table
  | 'villain-turn'    // boarder damage + flyer advance
  | 'between-waves'   // wave cleared, DM decides when to proceed
  | 'victory'
  | 'defeat';

// Crew roles (same 5 roles as v1, used for roster display & stat lookups)
export type CombatRole = 'helmsman' | 'gunner' | 'engineer' | 'lookout' | 'cook' | 'diplomat';
export const COMBAT_ROLES: CombatRole[] = ['helmsman', 'gunner', 'engineer', 'lookout', 'cook', 'diplomat'];

export const COMBAT_ROLE_EMOJI: Record<CombatRole, string> = {
  helmsman: '🧭',
  gunner: '⚔️',
  engineer: '🔧',
  lookout: '👁',
  cook: '🍳',
  diplomat: '🗣️',
};

export const COMBAT_ROLE_LABELS: Record<CombatRole, string> = {
  helmsman: 'Helmsman',
  gunner: 'Gunner',
  engineer: 'Engineer',
  lookout: 'Lookout',
  cook: 'Cook/QM',
  diplomat: 'Diplomat',
};

// ─── Firebase document: ship-combat/current ────────────────────────────

export interface ShipCombatState {
  status: ShipCombatStatus;

  // Ship status
  cracklesRevenge: {
    hullHP: number;
    hullMaxHP: number;
    status: 'healthy' | 'damaged' | 'critical';
  };
  scoutShip: {
    hullHP: number;
    hullMaxHP: number;
    mastDestroyed: boolean;
  };

  // Wave & round tracking
  currentWave: number;   // 1-3
  currentRound: number;  // 1-based within each wave
  totalWaves: number;    // 3

  // Flyer tracker — THE tension mechanic
  flyers: {
    active: number;
    escaped: number;
    destroyed: number;
    maxEscaped: number;  // 3
  };

  // Tracks how many rounds each active flyer has been airborne
  flyerRoundTracker: { launchedWave: number; roundsActive: number }[];

  // Boarder tracking — simplified to flat total
  boarders: {
    total: number;       // current boarders on deck
    defeated: number;    // total defeated across all waves
  };

  // Crew roster (populated from decoder-ring results)
  crew: CrewMember[];

  // Current crew action voting
  crewAction: {
    options: CrewActionOption[];   // 3-4 options for this round
    votes: Record<string, string>; // visitorId → actionId
    winningActionId: string | null;
    result: CrewActionResult | null;
  };

  // PC voting — audience picks which crew member performs the winning action
  pcVote: {
    votes: Record<string, string>;  // visitorId → characterId
    winningCrewId: string | null;
  };

  // Wave briefing text for display
  briefingText: string;

  // Mini-boss (Wave 3 only)
  scoutCaptain: {
    hp: number;
    maxHp: number;
    active: boolean;
  } | null;

  // DM notes for current round
  dmNotes: {
    pcPrompt: string;
    enemyActions: string;
    escalation: string;
  } | null;

  // Buffs carrying over between rounds
  activeBuffs: string[];

  // Pending roll info (set during 'awaiting-roll' phase)
  pendingRoll: {
    actionId: string;
    actionLabel: string;
    stat: 'attack' | 'skill';
    dc: number;
    modifier: number;
    autoSuccess: boolean;
    crewMemberId: string | null;
    crewMemberName: string | null;
  } | null;

  // Villain turn summary (set during villain-turn for display)
  villainTurnSummary: {
    boarderDamage: number;
    flyersAdvanced: number;
    flyersEscaped: number;
    narrative: string;
  } | null;

  // Session tracking
  sessionId: string;
  startedAt: number;
}

// ─── Crew Member ───────────────────────────────────────────────────────

export interface CrewMember {
  characterId: string;
  characterName: string;
  year: number;
  role: CombatRole;
  imageUrl: string;
  attackBonus: number;
  skillBonus: number;
}

// ─── Crew Action ───────────────────────────────────────────────────────

export interface CrewActionOption {
  id: string;
  label: string;
  description: string;
  icon: string;
  stat: 'attack' | 'skill';
  dc: number;
  onSuccess: string;
  onFail: string;
  // Mechanical effects on success
  flyersDestroyed?: number;
  boardersDefeated?: number;
  healAmount?: number;
  damageToScout?: number;
  buffGranted?: string;
  hullDamageSelf?: number;
  autoSuccess?: boolean;
}

export interface CrewActionResult {
  actionId: string;
  actionLabel: string;
  roll: number;
  modifier: number;
  total: number;
  dc: number;
  success: boolean;
  narrative: string;
  effectsApplied: string[];
}

// ─── Wave & Round Definitions ──────────────────────────────────────────

export interface RoundDefinition {
  roundNumber: number;
  options: CrewActionOption[];
  dmNotes: {
    pcPrompt: string;
    enemyActions: string;
    escalation: string;
  };
}

export interface WaveDefinition {
  waveNumber: number;
  title: string;
  briefing: string;
  startingBoarders: number;
  flyersLaunching: number;
  rounds: RoundDefinition[];
}

// ─── Enemy Stats ───────────────────────────────────────────────────────

export interface EnemyStats {
  name: string;
  ac: number;
  hp: number;
  attack: string;
  damage: string;
  speed: string;
  special?: string;
}

// ─── Active interaction type (for config/active-interaction) ───────────

export interface ShipCombatInteraction {
  type: 'ship-combat';
  status: ShipCombatStatus;
  sessionId: string;
  wave: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────

/** Extract numeric bonus from "+7" format */
export function parseToHitBonus(toHit: string): number {
  const match = toHit.match(/([+-]?\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/** Extract numeric bonus from skill string like "+7" */
export function parseSkillBonus(bonus: string): number {
  const match = bonus.match(/([+-]?\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/** Get the hull status label based on current/max HP */
export function getHullStatus(current: number, max: number): 'healthy' | 'damaged' | 'critical' {
  const pct = current / max;
  if (pct > 0.6) return 'healthy';
  if (pct > 0.3) return 'damaged';
  return 'critical';
}

/** Get the crew's best attack bonus (highest among all 5 members) */
export function getCrewAttackBonus(crew: CrewMember[]): number {
  if (crew.length === 0) return 0;
  return Math.max(...crew.map(c => c.attackBonus));
}

/** Get the crew's best skill bonus (highest among all 5 members) */
export function getCrewSkillBonus(crew: CrewMember[]): number {
  if (crew.length === 0) return 0;
  return Math.max(...crew.map(c => c.skillBonus));
}

/** Get the crew modifier for a given stat type */
export function getCrewModifier(crew: CrewMember[], stat: 'attack' | 'skill'): number {
  return stat === 'attack' ? getCrewAttackBonus(crew) : getCrewSkillBonus(crew);
}

/** Generate a fresh ship combat state */
export function createInitialShipCombatState(sessionId: string): ShipCombatState {
  return {
    status: 'idle',
    cracklesRevenge: { hullHP: 50, hullMaxHP: 50, status: 'healthy' },
    scoutShip: { hullHP: 30, hullMaxHP: 30, mastDestroyed: false },
    currentWave: 1,
    currentRound: 1,
    totalWaves: 3,
    flyers: { active: 0, escaped: 0, destroyed: 0, maxEscaped: 3 },
    flyerRoundTracker: [],
    boarders: { total: 0, defeated: 0 },
    crew: [],
    crewAction: {
      options: [],
      votes: {},
      winningActionId: null,
      result: null,
    },
    pcVote: {
      votes: {},
      winningCrewId: null,
    },
    briefingText: '',
    scoutCaptain: null,
    dmNotes: null,
    activeBuffs: [],
    pendingRoll: null,
    villainTurnSummary: null,
    sessionId,
    startedAt: Date.now(),
  };
}

/** Tally crew votes → returns the winning action ID */
export function tallyCrewVotes(votes: Record<string, string>): { winnerId: string | null; counts: Record<string, number> } {
  const counts: Record<string, number> = {};

  for (const actionId of Object.values(votes)) {
    counts[actionId] = (counts[actionId] || 0) + 1;
  }

  let maxVotes = 0;
  let winnerId: string | null = null;
  for (const [actionId, count] of Object.entries(counts)) {
    if (count > maxVotes) {
      maxVotes = count;
      winnerId = actionId;
    }
  }

  return { winnerId, counts };
}

/** Get total vote count */
export function getTotalVotes(votes: Record<string, string>): number {
  return Object.keys(votes).length;
}

/** Tally PC votes → returns the winning crew member ID */
export function tallyPCVotes(votes: Record<string, string>): { winnerId: string | null; counts: Record<string, number> } {
  const counts: Record<string, number> = {};

  for (const crewId of Object.values(votes)) {
    counts[crewId] = (counts[crewId] || 0) + 1;
  }

  let maxVotes = 0;
  let winnerId: string | null = null;
  for (const [crewId, count] of Object.entries(counts)) {
    if (count > maxVotes) {
      maxVotes = count;
      winnerId = crewId;
    }
  }

  return { winnerId, counts };
}

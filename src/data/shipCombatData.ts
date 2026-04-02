/**
 * Ship Combat v2 Data — Wave definitions, enemy stats, crew action options
 *
 * v2: Crew acts as ONE unit. Each round offers 3-4 action choices to the audience.
 * Waves can have multiple rounds. Enemy stats unchanged from v1.
 */

import type { WaveDefinition, EnemyStats, CrewActionOption, RoundDefinition } from '../types/shipCombat.types';
import type { StatBlock } from '../types/player.types';
import statBlockJson from './ip_isle_stat_blocks.json';

// ─── Stat block lookup ─────────────────────────────────────────────────

const statBlockData = statBlockJson as unknown as { meta: { level: number; proficiencyBonus: number; note: string }; characters: StatBlock[] };

export function getStatBlockById(id: string): StatBlock | undefined {
  return statBlockData.characters.find((c) => c.id === id);
}

// ─── Enemy stat constants ──────────────────────────────────────────────

export const BOARDER_STATS: EnemyStats = {
  name: 'Sog-Scout (Boarder)',
  ac: 12,
  hp: 12,
  attack: '+4',
  damage: '1d6+2 slashing',
  speed: '30 ft.',
};

export const ELITE_BOARDER_STATS: EnemyStats = {
  name: 'Sog-Elite (Wave 3)',
  ac: 14,
  hp: 20,
  attack: '+5',
  damage: '1d8+3 slashing',
  speed: '30 ft.',
  special: 'Resistance to first hit each round (sog-hardened)',
};

export const FLYER_STATS: EnemyStats = {
  name: 'Sog-Glider (Flyer)',
  ac: 14,
  hp: 10,
  attack: 'N/A',
  damage: 'N/A',
  speed: '60 ft. flying',
  special: 'Escapes after 2 rounds if not destroyed. Does not attack — carries coordinates.',
};

export const SCOUT_CAPTAIN_STATS: EnemyStats = {
  name: 'Scout Captain (Mini-Boss)',
  ac: 16,
  hp: 40,
  attack: '+7',
  damage: '1d10+4 slashing',
  speed: '30 ft.',
  special: 'Varnish Slash (CON DC 14 or +1d6 necrotic), Signal Flare (bonus action, 1 extra flyer, one-use), Smoke Bomb (reaction, disadvantage on next attack)',
};

// ─── Wave 1 — "They're Boarding!" ──────────────────────────────────────

const wave1Round1: CrewActionOption[] = [
  {
    id: 'w1-shoot-flyer',
    label: 'Shoot Down Flyer',
    description: 'The crew takes aim at the escaping flyer before it gets away.',
    icon: '⚔️',
    stat: 'attack',
    dc: 12,
    onSuccess: 'Direct hit! The flyer goes down in splinters!',
    onFail: 'The shot goes wide — the flyer keeps climbing.',
    flyersDestroyed: 1,
  },
  {
    id: 'w1-repel-boarders',
    label: 'Repel Boarders',
    description: 'Rally the crew to fight off the boarders climbing aboard.',
    icon: '⚔️',
    stat: 'attack',
    dc: 11,
    onSuccess: 'The crew pushes them back! 2 boarders defeated!',
    onFail: 'The boarders hold their ground.',
    boardersDefeated: 2,
  },
  {
    id: 'w1-reinforce-hull',
    label: 'Reinforce Hull',
    description: 'Patch up the ship before more damage comes.',
    icon: '🔧',
    stat: 'skill',
    dc: 10,
    onSuccess: 'Hull reinforced! +5 temporary HP.',
    onFail: 'The patch doesn\'t hold.',
    healAmount: 5,
  },
  {
    id: 'w1-hold-steady',
    label: 'Hold Steady & Scout',
    description: 'Keep the ship stable and track enemy positions.',
    icon: '👁',
    stat: 'skill',
    dc: 10,
    onSuccess: 'Steady as she goes! Crew gets advantage next round.',
    onFail: 'Ship lurches — no bonus.',
    buffGranted: 'crew-advantage',
  },
];

// ─── Wave 2 — "Smoke and Mirrors" ──────────────────────────────────────

const wave2Round1: CrewActionOption[] = [
  {
    id: 'w2r1-volley-flyers',
    label: 'Volley at Flyers',
    description: 'The crew fires a volley at the two flyers.',
    icon: '⚔️',
    stat: 'attack',
    dc: 13,
    onSuccess: 'Volley hits! Flyer destroyed!',
    onFail: 'Shots go wide — flyers keep climbing.',
    flyersDestroyed: 1,
  },
  {
    id: 'w2r1-target-mast',
    label: 'Target Scout Mast',
    description: 'A risky shot — if it lands, no more flyers can launch in Wave 3!',
    icon: '⚔️',
    stat: 'attack',
    dc: 15,
    onSuccess: 'The mast SNAPS! No more flyers from that ship!',
    onFail: 'The mast holds — flyers will launch again.',
    buffGranted: 'mast-destroyed',
  },
  {
    id: 'w2r1-emergency-repair',
    label: 'Emergency Repair',
    description: 'The crew rallies to patch the hull.',
    icon: '🔧',
    stat: 'skill',
    dc: 12,
    onSuccess: 'Patched up! +8 hull HP restored.',
    onFail: 'The damage is too extensive.',
    healAmount: 8,
  },
  {
    id: 'w2r1-ram-scout',
    label: 'Ram Scout Ship',
    description: 'Slam into the scout ship — high risk, high reward.',
    icon: '🧭',
    stat: 'skill',
    dc: 14,
    onSuccess: 'CRUNCH! Scout ship takes 10 hull damage!',
    onFail: 'Missed the angle — take 5 hull damage for nothing.',
    damageToScout: 10,
    hullDamageSelf: 5,
  },
];

const wave2Round2: CrewActionOption[] = [
  {
    id: 'w2r2-suppress-boarders',
    label: 'Suppress Boarders',
    description: 'Lay down covering fire on the remaining boarders.',
    icon: '⚔️',
    stat: 'attack',
    dc: 12,
    onSuccess: 'Suppressive fire! 2 boarders down!',
    onFail: 'They\'re using cover — can\'t get a clear shot.',
    boardersDefeated: 2,
  },
  {
    id: 'w2r2-track-flyers',
    label: 'Track & Shoot Flyers',
    description: 'The lookout guides the gunner for a precise shot.',
    icon: '👁',
    stat: 'skill',
    dc: 13,
    onSuccess: 'Tracked and hit! Flyer destroyed!',
    onFail: 'Too much smoke — lost track.',
    flyersDestroyed: 1,
  },
  {
    id: 'w2r2-morale-boost',
    label: 'Morale Boost',
    description: '"FOR THE CRACKLE!" — Rally the crew for the final push.',
    icon: '🍳',
    stat: 'skill',
    dc: 10,
    onSuccess: '"FOR THE CRACKLE!" — Morale surges! +1 all rolls next round.',
    onFail: 'The speech falls flat.',
    buffGranted: 'morale-boost',
  },
];

// ─── Wave 3 — "Cut the Head Off" ───────────────────────────────────────

const wave3Round1: CrewActionOption[] = [
  {
    id: 'w3r1-overload-shot',
    label: 'Overload Shot',
    description: 'Hit ALL flyers at once — but the weapon jams after.',
    icon: '⚔️',
    stat: 'attack',
    dc: 12,
    onSuccess: 'BOOOOM! All flyers hit!',
    onFail: 'The overcharged shot misfires — weapon jams, no damage.',
    flyersDestroyed: 3,
    buffGranted: 'weapon-jammed',
  },
  {
    id: 'w3r1-ram-and-board',
    label: 'Ram and Board',
    description: 'Open a path for the PCs to board the scout ship!',
    icon: '🧭',
    stat: 'skill',
    dc: 15,
    onSuccess: 'CRASH! The ships lock together — PCs can board!',
    onFail: 'The angle\'s wrong — can\'t get close enough.',
    buffGranted: 'pcs-can-board',
  },
  {
    id: 'w3r1-call-targets',
    label: 'Call Targets',
    description: 'Coordinate the whole crew for maximum effectiveness.',
    icon: '👁',
    stat: 'skill',
    dc: 12,
    onSuccess: 'Targets called! Everyone gets advantage!',
    onFail: 'Too much chaos — can\'t coordinate.',
    buffGranted: 'all-advantage',
  },
  {
    id: 'w3r1-final-repair',
    label: 'Final Repair',
    description: 'Last chance to patch the hull before the final fight.',
    icon: '🔧',
    stat: 'skill',
    dc: 12,
    onSuccess: 'Major repair! +10 hull HP.',
    onFail: 'Too much damage — can\'t get it sealed.',
    healAmount: 10,
  },
];

const wave3Round2: CrewActionOption[] = [
  {
    id: 'w3r2-pick-off-flyers',
    label: 'Pick Off Flyers',
    description: 'Pick off the remaining flyers one by one.',
    icon: '⚔️',
    stat: 'attack',
    dc: 14,
    onSuccess: 'Precise shot! Flyer destroyed.',
    onFail: 'Miss — flyer keeps climbing.',
    flyersDestroyed: 1,
  },
  {
    id: 'w3r2-target-captain',
    label: 'Target Scout Captain',
    description: 'Take a shot at the captain before the PCs engage.',
    icon: '⚔️',
    stat: 'attack',
    dc: 16,
    onSuccess: 'Direct hit on the captain! Softened up for the PCs!',
    onFail: 'The captain dodges — Smoke Bomb reaction!',
    damageToScout: 7,
  },
  {
    id: 'w3r2-battle-rations',
    label: 'Battle Rations',
    description: 'Feed the crew one last time — auto-success.',
    icon: '🍳',
    stat: 'skill',
    dc: 0,
    autoSuccess: true,
    onSuccess: 'Battle feast! All crew heal + morale surge!',
    onFail: '',
    healAmount: 5,
    buffGranted: 'morale-boost',
  },
];

// ─── Wave Definitions ──────────────────────────────────────────────────

export const WAVES: WaveDefinition[] = [
  {
    waveNumber: 1,
    title: "They're Boarding!",
    briefing: "Smoke clears. A scout ship is lashed alongside. Boarders climbing the port and starboard rails. One flyer launches from the scout's crow's nest.",
    startingBoarders: 4,
    flyersLaunching: 1,
    rounds: [
      {
        roundNumber: 1,
        options: wave1Round1,
        dmNotes: {
          pcPrompt: 'PCs can engage port-side boarders directly. Let them roll attacks and feel heroic against the first wave of mooks.',
          enemyActions: 'Boarders attack crew: 2 damage per surviving boarder to hull. Flyer advances toward escape.',
          escalation: 'If crew fails badly, 2 extra boarders climb aboard at end of round.',
        },
      },
    ],
  },
  {
    waveNumber: 2,
    title: 'Smoke and Mirrors',
    briefing: "More boarding parties. Two flyers launch simultaneously. Smoke fills the air!",
    startingBoarders: 5,
    flyersLaunching: 2,
    rounds: [
      {
        roundNumber: 1,
        options: wave2Round1,
        dmNotes: {
          pcPrompt: 'A PC should dramatically step up to defend the ship. Let them describe their heroic moment!',
          enemyActions: 'Boarders press the attack. Flyers climb higher. Scout ship maneuvers alongside.',
          escalation: 'If flyers escape this wave, tension spikes. Captain boards next wave regardless.',
        },
      },
      {
        roundNumber: 2,
        options: wave2Round2,
        dmNotes: {
          pcPrompt: 'PCs can help the crew with the remaining boarders or chase a flyer.',
          enemyActions: 'Remaining boarders make a final push. Flyers near escape altitude.',
          escalation: 'If both flyers still active, one is guaranteed to escape unless crew destroys it now.',
        },
      },
    ],
  },
  {
    waveNumber: 3,
    title: 'Cut the Head Off',
    briefing: "The Scout Captain boards with elite troops. Three flyers launch in formation. This is everything they've got.",
    startingBoarders: 4,
    flyersLaunching: 3,
    rounds: [
      {
        roundNumber: 1,
        options: wave3Round1,
        dmNotes: {
          pcPrompt: 'The Scout Captain taunts about LeFoot finding IP Isle. One PC should step up for a dramatic duel.',
          enemyActions: 'Elite boarders are tougher (AC 14, HP 20). Scout Captain uses Varnish Slash.',
          escalation: 'Captain uses Signal Flare for 1 emergency flyer if crew is succeeding too easily.',
        },
      },
      {
        roundNumber: 2,
        options: wave3Round2,
        dmNotes: {
          pcPrompt: 'Final showdown. PCs should be going all-out against the captain. This is the climax!',
          enemyActions: 'Captain uses Smoke Bomb (reaction). Flyers make final escape attempt.',
          escalation: 'If captain is below 50% HP, he attempts to flee. If 3+ flyers escaped total, tension is maximum.',
        },
      },
    ],
  },
];

/** Get the wave definition for a given wave number */
export function getWaveDefinition(waveNumber: number): WaveDefinition | undefined {
  return WAVES.find((w) => w.waveNumber === waveNumber);
}

/** Get a specific round from a wave */
export function getRoundDefinition(waveNumber: number, roundNumber: number): RoundDefinition | undefined {
  const wave = getWaveDefinition(waveNumber);
  if (!wave) return undefined;
  return wave.rounds.find((r) => r.roundNumber === roundNumber);
}

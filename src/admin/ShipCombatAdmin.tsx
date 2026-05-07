/**
 * ShipCombatAdmin v2 — GM controls for wave-based ship defense encounter
 *
 * v2: Crew acts as ONE unit. Single action vote per round.
 * Multi-round waves with crew-voting → player-turns → villain-turn phases.
 *
 * GM WORKFLOW:
 *   1. "Load Crew" pulls recruited crew from decoder-ring/current
 *   2. "Begin Ship Combat" → briefing for Wave 1
 *   3. "Open Crew Voting" → audience picks ONE action from 3-4 options
 *   4. "Close Voting" → PC Vote: audience picks which crew member performs it
 *   5. "Close PC Vote" → GM enters single d20 → "Resolve"
 *   6. "Player Turns" → PCs fight at table (waiting screen on phones)
 *   7. "Run Villain Turn" → auto-calc boarder damage + flyer advance
 *   8. "Next Round" or "Next Wave" → DM decides
 *   9. Victory/Defeat → end
 *
 * FIREBASE DOCS:
 *   - ship-combat/current          → ShipCombatState
 *   - config/active-interaction    → { type: 'ship-combat', status, sessionId, wave }
 *   - decoder-ring/current (read)  → pull crew roster
 */

import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useShow } from '../lib/shows';
import { archiveSingleton } from '../lib/archive';
import type { RecruitedCrewMember } from '../types/decoderRing.types';
import { getStatBlockById, getRoundDefinition, getWaveDefinition, SCOUT_CAPTAIN_STATS } from '../data/shipCombatData';
import {
  createInitialShipCombatState,
  parseToHitBonus,
  parseSkillBonus,
  getHullStatus,
  tallyCrewVotes,
  tallyPCVotes,
  getTotalVotes,
  COMBAT_ROLE_EMOJI,
  COMBAT_ROLE_LABELS,
} from '../types/shipCombat.types';
import type {
  ShipCombatState,
  CombatRole,
  CrewMember,
  CrewActionResult,
} from '../types/shipCombat.types';

/** Map a decoder-ring ShipRole to a CombatRole */
function mapToCombatRole(role: string): CombatRole | null {
  const validRoles: CombatRole[] = ['helmsman', 'gunner', 'engineer', 'lookout', 'cook', 'diplomat'];
  return validRoles.includes(role as CombatRole) ? (role as CombatRole) : null;
}

export default function ShipCombatAdmin() {
  const { showId: activeShowId } = useShow();
  const [state, setState] = useState<ShipCombatState | null>(null);
  const [rollEntry, setRollEntry] = useState('');
  const [enemyRefOpen, setEnemyRefOpen] = useState<string | null>(null);

  // ─── Firebase listener ─────────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'ship-combat', 'current'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as ShipCombatState;
        if (!Array.isArray(data.crew)) data.crew = [];
        if (!data.currentRound) data.currentRound = 1;
        if (!data.currentWave) data.currentWave = 1;
        if (!data.crewAction) data.crewAction = { options: [], votes: {}, winningActionId: null, result: null };
        if (!data.pcVote) data.pcVote = { votes: {}, winningCrewId: null };
        setState(data);
      } else setState(null);
    });
    return () => unsub();
  }, []);

  // ─── Load crew from decoder ring ───────────────────────────────────
  const loadCrewFromDecoderRing = async () => {
    const snap = await getDoc(doc(db, 'decoder-ring', 'current'));
    if (!snap.exists()) {
      alert('No decoder ring session found. Run the Well of Lines first.');
      return;
    }
    const drState = snap.data();
    const rawCrew: RecruitedCrewMember[] = drState.crew || [];
    if (rawCrew.length === 0) {
      alert('No crew recruited yet. Finish the decoder ring first.');
      return;
    }

    const crewMembers: CrewMember[] = [];
    const usedRoles = new Set<CombatRole>();

    for (const member of rawCrew) {
      const combatRole = mapToCombatRole(member.role);
      if (!combatRole || usedRoles.has(combatRole)) continue;
      usedRoles.add(combatRole);

      const statBlock = getStatBlockById(member.characterId);
      const attackBonus = statBlock ? parseToHitBonus(statBlock.attack.toHit) : 3;
      const skillValues = statBlock ? Object.values(statBlock.skills) : [];
      const bestSkill = skillValues.length > 0
        ? Math.max(...skillValues.map(s => parseSkillBonus(s)))
        : 3;

      crewMembers.push({
        characterId: member.characterId,
        characterName: member.characterName,
        year: member.year,
        role: combatRole,
        imageUrl: member.image || '',
        attackBonus,
        skillBonus: bestSkill,
      });
    }

    const sessionId = `ship-combat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const initial = createInitialShipCombatState(sessionId);
    initial.crew = crewMembers;

    // Snapshot any prior state before we replace it.
    await archiveSingleton('ship-combat', 'current', activeShowId);
    await setDoc(doc(db, 'ship-combat', 'current'), initial);
  };

  // ─── Load default crew directly from stat blocks ───────────────────
  const loadDefaultCrew = async () => {
    const roleMap: Record<string, CombatRole> = {
      'Scout': 'lookout',
      'Gunner': 'gunner',
      'Quartermaster': 'engineer',
      'Helmsman': 'helmsman',
      'Cook': 'cook',
      'Rigger': 'diplomat',
    };
    const ids = ['thepink', 'barrel', 'rosie', 'chomp', 'blueberry'];
    const crewMembers: CrewMember[] = [];
    for (const id of ids) {
      const statBlock = getStatBlockById(id);
      if (!statBlock) continue;
      const combatRole = roleMap[statBlock.shipRole] || 'cook';
      const attackBonus = parseToHitBonus(statBlock.attack.toHit);
      const skillValues = Object.values(statBlock.skills) as string[];
      const bestSkill = skillValues.length > 0
        ? Math.max(...skillValues.map(s => parseSkillBonus(s)))
        : 3;
      crewMembers.push({
        characterId: statBlock.id,
        characterName: statBlock.name,
        year: statBlock.year,
        role: combatRole,
        imageUrl: '',
        attackBonus,
        skillBonus: bestSkill,
      });
    }
    const sessionId = `ship-combat-${Date.now()}`;
    const initial = createInitialShipCombatState(sessionId);
    initial.crew = crewMembers;
    // Snapshot any prior state before we replace it.
    await archiveSingleton('ship-combat', 'current', activeShowId);
    await setDoc(doc(db, 'ship-combat', 'current'), initial);
  };

  // ─── Begin combat (idle → briefing) ────────────────────────────────
  const beginCombat = async () => {
    if (!state) return;
    const wave = getWaveDefinition(1);
    if (!wave) return;

    const round = wave.rounds[0];

    await updateDoc(doc(db, 'ship-combat', 'current'), {
      status: 'briefing',
      currentWave: 1,
      currentRound: 1,
      briefingText: wave.briefing,
      boarders: {
        total: wave.startingBoarders,
        defeated: 0,
      },
      flyers: {
        ...state.flyers,
        active: wave.flyersLaunching,
      },
      flyerRoundTracker: Array.from({ length: wave.flyersLaunching }, () => ({
        launchedWave: 1,
        roundsActive: 0,
      })),
      dmNotes: round.dmNotes,
      scoutCaptain: wave.waveNumber === 3
        ? { hp: SCOUT_CAPTAIN_STATS.hp, maxHp: SCOUT_CAPTAIN_STATS.hp, active: true }
        : null,
    });

    await setDoc(doc(db, 'config', 'active-interaction'), {
      type: 'ship-combat',
      status: 'briefing',
      sessionId: state.sessionId,
      wave: 1,
    });
  };

  // ─── Open crew voting ──────────────────────────────────────────────
  const openCrewVoting = async () => {
    if (!state) return;
    const round = getRoundDefinition(state.currentWave, state.currentRound);
    if (!round) return;

    await updateDoc(doc(db, 'ship-combat', 'current'), {
      status: 'crew-voting',
      crewAction: {
        options: round.options,
        votes: {},
        winningActionId: null,
        result: null,
      },
      pcVote: {
        votes: {},
        winningCrewId: null,
      },
      dmNotes: round.dmNotes,
    });
    await updateDoc(doc(db, 'config', 'active-interaction'), {
      status: 'crew-voting',
    });
  };

  // ─── Close voting → pc-voting (audience picks crew member) ──────────
  const closeCrewVoting = async () => {
    if (!state) return;
    const { winnerId } = tallyCrewVotes(state.crewAction.votes);
    const winningAction = state.crewAction.options.find(o => o.id === winnerId) || state.crewAction.options[0];
    if (!winningAction) return;

    await updateDoc(doc(db, 'ship-combat', 'current'), {
      status: 'pc-voting',
      'crewAction.winningActionId': winningAction.id,
      pcVote: {
        votes: {},
        winningCrewId: null,
      },
    });
    await updateDoc(doc(db, 'config', 'active-interaction'), {
      status: 'pc-voting',
    });
  };

  // ─── Close PC voting → awaiting-roll ──────────────────────────────
  const closePCVoting = async () => {
    if (!state) return;
    const { winnerId: winningCrewId } = tallyPCVotes(state.pcVote.votes);
    const winningCrew = state.crew.find(c => c.characterId === winningCrewId) || state.crew[0];
    if (!winningCrew) return;

    const winningAction = state.crewAction.options.find(o => o.id === state.crewAction.winningActionId) || state.crewAction.options[0];
    if (!winningAction) return;

    const modifier = winningAction.stat === 'attack' ? winningCrew.attackBonus : winningCrew.skillBonus;
    const moraleBonus = state.activeBuffs.includes('morale-boost') ? 1 : 0;

    setRollEntry('');

    await updateDoc(doc(db, 'ship-combat', 'current'), {
      status: 'awaiting-roll',
      'pcVote.winningCrewId': winningCrew.characterId,
      pendingRoll: {
        actionId: winningAction.id,
        actionLabel: winningAction.label,
        stat: winningAction.stat,
        dc: winningAction.dc,
        modifier: modifier + moraleBonus,
        autoSuccess: winningAction.autoSuccess || false,
        crewMemberId: winningCrew.characterId,
        crewMemberName: winningCrew.characterName,
      },
    });
    await updateDoc(doc(db, 'config', 'active-interaction'), {
      status: 'awaiting-roll',
    });
  };

  // ─── Resolve crew action ──────────────────────────────────────────
  const resolveCrewAction = async () => {
    if (!state || !state.pendingRoll) return;
    const pending = state.pendingRoll;
    const action = state.crewAction.options.find(o => o.id === pending.actionId);
    if (!action) return;

    let roll = 0;
    let success = false;
    const effectsApplied: string[] = [];

    if (pending.autoSuccess) {
      success = true;
      effectsApplied.push('Auto-success');
    } else {
      roll = Math.max(1, Math.min(20, parseInt(rollEntry, 10) || 0));
      const total = roll + pending.modifier;
      success = total >= pending.dc;
    }

    // Apply effects
    let hullHeal = 0;
    let hullDamage = 0;
    let scoutDamage = 0;
    let flyersDestroyed = 0;
    let boardersDefeated = 0;
    const newBuffs = [...state.activeBuffs];

    if (success) {
      if (action.flyersDestroyed) {
        flyersDestroyed = Math.min(action.flyersDestroyed, state.flyerRoundTracker.length);
        effectsApplied.push(`${flyersDestroyed} flyer(s) destroyed`);
      }
      if (action.boardersDefeated) {
        boardersDefeated = Math.min(action.boardersDefeated, state.boarders.total);
        effectsApplied.push(`${boardersDefeated} boarder(s) defeated`);
      }
      if (action.healAmount) {
        hullHeal = action.healAmount;
        effectsApplied.push(`+${hullHeal} hull HP`);
      }
      if (action.damageToScout) {
        scoutDamage = action.damageToScout;
        effectsApplied.push(`${scoutDamage} damage to scout`);
      }
      if (action.buffGranted) {
        newBuffs.push(action.buffGranted);
        effectsApplied.push(`Buff: ${action.buffGranted}`);
      }
    }
    if (action.hullDamageSelf) {
      hullDamage = action.hullDamageSelf;
      effectsApplied.push(`-${hullDamage} hull HP (cost)`);
    }

    // Destroy flyers from tracker
    const newTracker = [...state.flyerRoundTracker];
    let toDestroy = flyersDestroyed;
    while (toDestroy > 0 && newTracker.length > 0) {
      newTracker.pop();
      toDestroy--;
    }

    // Apply mast-destroyed buff
    const mastDestroyed = state.scoutShip.mastDestroyed || newBuffs.includes('mast-destroyed');

    // Calculate new hull values
    const newCrackleHP = Math.max(0, Math.min(
      state.cracklesRevenge.hullMaxHP,
      state.cracklesRevenge.hullHP - hullDamage + hullHeal
    ));
    const newScoutHP = Math.max(0, state.scoutShip.hullHP - scoutDamage);

    const result: CrewActionResult = {
      actionId: action.id,
      actionLabel: action.label,
      roll,
      modifier: pending.modifier,
      total: roll + pending.modifier,
      dc: pending.dc,
      success,
      narrative: success ? action.onSuccess : action.onFail,
      effectsApplied,
    };

    // Clear one-time buffs
    const persistentBuffs = newBuffs.filter(b =>
      b === 'mast-destroyed' || b === 'catapult-rigged' ||
      b === 'isle-defenses' || b === 'scout-pinned' || b === 'scout-disabled' ||
      b === 'pcs-can-board' || b === 'all-advantage' || b === 'captain-tracked' ||
      b === 'weapon-jammed'
    );

    await updateDoc(doc(db, 'ship-combat', 'current'), {
      status: 'player-turns',
      'crewAction.result': result,
      pendingRoll: null,
      cracklesRevenge: {
        hullHP: newCrackleHP,
        hullMaxHP: state.cracklesRevenge.hullMaxHP,
        status: getHullStatus(newCrackleHP, state.cracklesRevenge.hullMaxHP),
      },
      scoutShip: {
        hullHP: newScoutHP,
        hullMaxHP: state.scoutShip.hullMaxHP,
        mastDestroyed,
      },
      flyers: {
        ...state.flyers,
        active: newTracker.length,
        destroyed: state.flyers.destroyed + flyersDestroyed,
      },
      flyerRoundTracker: newTracker,
      boarders: {
        total: Math.max(0, state.boarders.total - boardersDefeated),
        defeated: state.boarders.defeated + boardersDefeated,
      },
      activeBuffs: persistentBuffs,
    });
    await updateDoc(doc(db, 'config', 'active-interaction'), {
      status: 'player-turns',
    });
  };

  // ─── Run villain turn (auto-calculate) ─────────────────────────────
  const runVillainTurn = async () => {
    if (!state) return;

    // Boarder damage: 2 per surviving boarder
    const boarderDamage = state.boarders.total * 2;

    // Advance flyer round tracker
    const newTracker = state.flyerRoundTracker.map(f => ({
      ...f,
      roundsActive: f.roundsActive + 1,
    }));

    // Check for escaped flyers (roundsActive >= 2)
    let flyersEscaped = 0;
    const remainingTracker = newTracker.filter(f => {
      if (f.roundsActive >= 2) {
        flyersEscaped++;
        return false;
      }
      return true;
    });

    const flyersAdvanced = newTracker.length;

    // Apply boarder hull damage
    const newCrackleHP = Math.max(0, state.cracklesRevenge.hullHP - boarderDamage);

    const narrativeParts: string[] = [];
    if (boarderDamage > 0) narrativeParts.push(`Boarders deal ${boarderDamage} damage to the hull!`);
    if (flyersAdvanced > 0) narrativeParts.push(`${flyersAdvanced} flyer(s) advance toward escape.`);
    if (flyersEscaped > 0) narrativeParts.push(`💀 ${flyersEscaped} flyer(s) ESCAPED!`);
    if (narrativeParts.length === 0) narrativeParts.push('The enemies regroup...');

    const villainSummary = {
      boarderDamage,
      flyersAdvanced,
      flyersEscaped,
      narrative: narrativeParts.join(' '),
    };

    // Check defeat condition
    const newEscapedTotal = state.flyers.escaped + flyersEscaped;
    const isDefeat = newEscapedTotal >= state.flyers.maxEscaped;

    await updateDoc(doc(db, 'ship-combat', 'current'), {
      status: isDefeat ? 'defeat' : 'villain-turn',
      villainTurnSummary: villainSummary,
      cracklesRevenge: {
        hullHP: newCrackleHP,
        hullMaxHP: state.cracklesRevenge.hullMaxHP,
        status: getHullStatus(newCrackleHP, state.cracklesRevenge.hullMaxHP),
      },
      flyers: {
        active: remainingTracker.length,
        escaped: newEscapedTotal,
        destroyed: state.flyers.destroyed,
        maxEscaped: state.flyers.maxEscaped,
      },
      flyerRoundTracker: remainingTracker,
    });
    await updateDoc(doc(db, 'config', 'active-interaction'), {
      status: isDefeat ? 'defeat' : 'villain-turn',
    });
  };

  // ─── Advance round (within same wave) ──────────────────────────────
  const advanceRound = async () => {
    if (!state) return;
    const wave = getWaveDefinition(state.currentWave);
    if (!wave) return;

    const nextRound = state.currentRound + 1;
    const roundDef = wave.rounds.find(r => r.roundNumber === nextRound);

    if (!roundDef) {
      // No more rounds in this wave — go to between-waves
      await goToBetweenWaves();
      return;
    }

    await updateDoc(doc(db, 'ship-combat', 'current'), {
      status: 'briefing',
      currentRound: nextRound,
      dmNotes: roundDef.dmNotes,
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
      villainTurnSummary: null,
    });
    await updateDoc(doc(db, 'config', 'active-interaction'), {
      status: 'briefing',
    });
  };

  // ─── Between waves ─────────────────────────────────────────────────
  const goToBetweenWaves = async () => {
    if (!state) return;

    // Check victory conditions
    const isVictory = (state.scoutCaptain && state.scoutCaptain.hp <= 0) || state.scoutShip.hullHP <= 0;
    if (isVictory || state.currentWave >= 3) {
      await endCombat(isVictory ? 'victory' : 'victory');
      return;
    }

    await updateDoc(doc(db, 'ship-combat', 'current'), {
      status: 'between-waves',
      villainTurnSummary: null,
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
    });
    await updateDoc(doc(db, 'config', 'active-interaction'), {
      status: 'between-waves',
    });
  };

  // ─── Advance to next wave ──────────────────────────────────────────
  const advanceWave = async () => {
    if (!state) return;
    const next = state.currentWave + 1;
    if (next > 3) {
      await endCombat('victory');
      return;
    }

    const wave = getWaveDefinition(next);
    if (!wave) return;

    // Flyers launching — reduced if mast is destroyed
    let newFlyers = wave.flyersLaunching;
    if (state.scoutShip.mastDestroyed && next === 3) {
      newFlyers = 1;
    }

    const newTrackers = [
      ...state.flyerRoundTracker,
      ...Array.from({ length: newFlyers }, () => ({
        launchedWave: next,
        roundsActive: 0,
      })),
    ];

    const round = wave.rounds[0];

    await updateDoc(doc(db, 'ship-combat', 'current'), {
      status: 'briefing',
      currentWave: next,
      currentRound: 1,
      briefingText: wave.briefing,
      boarders: {
        total: state.boarders.total + wave.startingBoarders,
        defeated: state.boarders.defeated,
      },
      flyers: {
        ...state.flyers,
        active: state.flyers.active + newFlyers,
      },
      flyerRoundTracker: newTrackers,
      dmNotes: round.dmNotes,
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
      villainTurnSummary: null,
      scoutCaptain: next === 3
        ? { hp: SCOUT_CAPTAIN_STATS.hp, maxHp: SCOUT_CAPTAIN_STATS.hp, active: true }
        : state.scoutCaptain,
    });
    await updateDoc(doc(db, 'config', 'active-interaction'), {
      status: 'briefing',
      wave: next,
    });
  };

  // ─── End combat ────────────────────────────────────────────────────
  const endCombat = async (status: 'victory' | 'defeat' | 'idle' = 'victory') => {
    if (state) {
      await updateDoc(doc(db, 'ship-combat', 'current'), { status });
    }
    await setDoc(doc(db, 'config', 'active-interaction'), { type: 'none' });
  };

  // ─── Manual overrides ──────────────────────────────────────────────
  const adjustFlyersEscaped = async (delta: number) => {
    if (!state) return;
    await updateDoc(doc(db, 'ship-combat', 'current'), {
      'flyers.escaped': Math.max(0, state.flyers.escaped + delta),
    });
  };

  const adjustHullHP = async (ship: 'crackle' | 'scout', delta: number) => {
    if (!state) return;
    if (ship === 'crackle') {
      const newHP = Math.max(0, Math.min(state.cracklesRevenge.hullMaxHP, state.cracklesRevenge.hullHP + delta));
      await updateDoc(doc(db, 'ship-combat', 'current'), {
        'cracklesRevenge.hullHP': newHP,
        'cracklesRevenge.status': getHullStatus(newHP, state.cracklesRevenge.hullMaxHP),
      });
    } else {
      const newHP = Math.max(0, Math.min(state.scoutShip.hullMaxHP, state.scoutShip.hullHP + delta));
      await updateDoc(doc(db, 'ship-combat', 'current'), {
        'scoutShip.hullHP': newHP,
      });
    }
  };

  const adjustBoarders = async (delta: number) => {
    if (!state) return;
    await updateDoc(doc(db, 'ship-combat', 'current'), {
      'boarders.total': Math.max(0, state.boarders.total + delta),
    });
  };

  const resetEverything = async () => {
    if (!confirm('Reset ship combat completely? This wipes all combat state.')) return;
    // Snapshot first so the wipe is recoverable.
    await archiveSingleton('ship-combat', 'current', activeShowId);
    await deleteDoc(doc(db, 'ship-combat', 'current'));
    await setDoc(doc(db, 'config', 'active-interaction'), { type: 'none' });
    setState(null);
  };

  // ─── Derived state ─────────────────────────────────────────────────
  const wave = state ? getWaveDefinition(state.currentWave) : null;
  const totalRounds = wave ? wave.rounds.length : 1;
  const { winnerId, counts: voteCounts } = state ? tallyCrewVotes(state.crewAction?.votes || {}) : { winnerId: null, counts: {} };
  const totalVotes = state ? getTotalVotes(state.crewAction?.votes || {}) : 0;
  const { winnerId: pcWinnerId, counts: pcVoteCounts } = state ? tallyPCVotes(state.pcVote?.votes || {}) : { winnerId: null, counts: {} };
  const totalPCVotes = state ? getTotalVotes(state.pcVote?.votes || {}) : 0;

  // Check end conditions
  const isVictory = state && (
    (state.scoutCaptain && state.scoutCaptain.hp <= 0) ||
    state.scoutShip.hullHP <= 0
  );
  const isDefeat = state && state.flyers.escaped >= state.flyers.maxEscaped;
  const isCritical = state && state.cracklesRevenge.hullHP <= 0;

  // Can advance round? (more rounds in this wave)
  const hasMoreRounds = wave && state && state.currentRound < wave.rounds.length;

  // ─── RENDER ────────────────────────────────────────────────────────
  return (
    <section className="admin-card config-card ship-combat-card">
      <h2>⚓ Ship Combat v2 — The Crackle's Revenge</h2>
      <p className="card-hint">
        Crew acts as ONE unit. Audience votes on a single action per round.
        {state ? ` Wave ${state.currentWave}/${state.totalWaves} R${state.currentRound}/${totalRounds} • ${state.status}` : ''}
      </p>

      {/* ── No active combat OR idle with empty crew ── */}
      {(!state || (state?.status === 'idle' && state.crew.length === 0)) && (
        <div>
          <button onClick={loadCrewFromDecoderRing} className="btn-primary launch-btn">
            🚢 Load Crew from Decoder Ring
          </button>
          <button onClick={loadDefaultCrew} className="btn-epic launch-btn" style={{ marginLeft: '0.5rem' }}>
            ⚔️ Load Default Crew (All 5)
          </button>
        </div>
      )}

      {/* ── Pre-combat: crew loaded, idle ── */}
      {state?.status === 'idle' && (
        <div>
          <div style={{ marginBottom: '0.5rem' }}>
            <h4 style={{ fontSize: '0.8rem', color: '#E8872A' }}>Crew Loaded ({state.crew.length}/5)</h4>
            {state.crew.map(member => (
              <div key={member.characterId} style={{ fontSize: '0.7rem', color: '#eee', marginBottom: '0.15rem' }}>
                {COMBAT_ROLE_EMOJI[member.role]} <strong>{COMBAT_ROLE_LABELS[member.role]}</strong>: {member.characterName} (ATK +{member.attackBonus}, Skill +{member.skillBonus})
              </div>
            ))}
          </div>
          <button onClick={beginCombat} className="btn-epic launch-btn" disabled={state.crew.length === 0}>
            ⚔️ Begin Ship Combat
          </button>
          <button onClick={async () => { await archiveSingleton('ship-combat', 'current', activeShowId); await deleteDoc(doc(db, 'ship-combat', 'current')); }} className="btn-secondary" style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>
            🔄 Reset Combat
          </button>
        </div>
      )}

      {/* ── Active Combat Layout ── */}
      {state && state.status !== 'idle' && state.status !== 'victory' && state.status !== 'defeat' && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>

          {/* ── LEFT COLUMN: Wave Card / DM Notes ── */}
          <div style={{ flex: '1 1 200px', minWidth: '200px' }}>
            {/* Wave info */}
            {wave && (
              <div style={{
                padding: '0.5rem',
                background: 'rgba(232,135,42,0.08)',
                border: '1px solid rgba(232,135,42,0.3)',
                borderRadius: '6px',
                marginBottom: '0.5rem',
              }}>
                <h3 style={{ fontSize: '0.85rem', color: '#E8872A', margin: 0 }}>
                  Wave {wave.waveNumber} — {wave.title} (R{state.currentRound}/{totalRounds})
                </h3>
                <p style={{ fontSize: '0.7rem', color: '#ccc', margin: '0.3rem 0' }}>{wave.briefing}</p>

                <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.65rem', color: '#aaa', marginBottom: '0.3rem' }}>
                  <span>⚔️ Boarders: {state.boarders.total}</span>
                  <span>🦅 Flyers: {state.flyers.active}</span>
                </div>

                {/* Scout Captain info (Wave 3) */}
                {state.scoutCaptain && (
                  <div style={{
                    marginTop: '0.3rem',
                    padding: '0.3rem',
                    background: 'rgba(231,76,60,0.15)',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                  }}>
                    <strong style={{ color: '#e74c3c' }}>⚔️ Scout Captain</strong>
                    <span style={{ color: '#eee' }}> — HP: {state.scoutCaptain.hp}/{state.scoutCaptain.maxHp} | AC: {SCOUT_CAPTAIN_STATS.ac}</span>
                  </div>
                )}
              </div>
            )}

            {/* DM Notes */}
            {state.dmNotes && (
              <div style={{
                padding: '0.4rem',
                background: 'rgba(155,89,182,0.08)',
                border: '1px solid rgba(155,89,182,0.3)',
                borderRadius: '6px',
                fontSize: '0.65rem',
              }}>
                <div style={{ color: '#9b59b6', marginBottom: '0.2rem', fontWeight: 700 }}>📋 DM Notes (R{state.currentRound})</div>
                <div style={{ color: '#9b59b6', marginBottom: '0.15rem' }}>
                  🎭 <strong>PC Prompt:</strong> {state.dmNotes.pcPrompt}
                </div>
                <div style={{ color: '#e67e22', marginBottom: '0.15rem' }}>
                  🏴 <strong>Enemy Actions:</strong> {state.dmNotes.enemyActions}
                </div>
                <div style={{ color: '#e74c3c' }}>
                  ⚠️ <strong>Escalation:</strong> {state.dmNotes.escalation}
                </div>
              </div>
            )}
          </div>

          {/* ── CENTER COLUMN: Crew Vote Controls ── */}
          <div style={{ flex: '1 1 250px', minWidth: '250px' }}>

            {/* Briefing: Open Voting */}
            {(state.status === 'briefing' || state.status === 'between-waves') && (
              <button onClick={openCrewVoting} className="btn-primary launch-btn">
                🗳️ Open Crew Voting — W{state.currentWave}R{state.currentRound}
              </button>
            )}

            {/* Crew Voting: live tally + Close */}
            {state.status === 'crew-voting' && (
              <div>
                <h4 style={{ fontSize: '0.75rem', color: '#E8872A' }}>
                  Crew Voting Open ({totalVotes} votes)
                </h4>
                {state.crewAction.options.map(option => {
                  const count = voteCounts[option.id] || 0;
                  const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                  const isWinning = option.id === winnerId;
                  return (
                    <div key={option.id} style={{
                      fontSize: '0.7rem', padding: '0.3rem 0.4rem', marginBottom: '0.2rem',
                      background: isWinning ? 'rgba(46,204,113,0.15)' : 'rgba(0,0,0,0.2)',
                      borderLeft: `3px solid ${isWinning ? '#2ecc71' : '#555'}`,
                      borderRadius: '0 4px 4px 0',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{option.icon} <strong>{option.label}</strong></span>
                        <span style={{ color: isWinning ? '#2ecc71' : '#888' }}>{count} ({pct}%)</span>
                      </div>
                      <div style={{
                        height: '4px', background: '#1a1a2e', borderRadius: '2px', marginTop: '0.2rem',
                      }}>
                        <div style={{
                          width: `${pct}%`, height: '100%',
                          background: isWinning ? '#2ecc71' : '#555',
                          borderRadius: '2px', transition: 'width 0.3s',
                        }} />
                      </div>
                    </div>
                  );
                })}
                <button onClick={closeCrewVoting} className="btn-warning launch-btn" style={{ marginTop: '0.5rem' }}>
                  🔒 Close Voting
                </button>
              </div>
            )}

            {/* PC Voting: audience picks which crew member */}
            {state.status === 'pc-voting' && (
              <div>
                <h4 style={{ fontSize: '0.75rem', color: '#3498db' }}>
                  🎭 Who Performs the Action? ({totalPCVotes} votes)
                </h4>
                <div style={{
                  fontSize: '0.65rem', color: '#aaa', marginBottom: '0.3rem',
                  padding: '0.2rem 0.4rem', background: 'rgba(46,204,113,0.1)',
                  borderLeft: '3px solid #2ecc71', borderRadius: '0 4px 4px 0',
                }}>
                  Action: <strong style={{ color: '#2ecc71' }}>
                    {state.crewAction.options.find(o => o.id === state.crewAction.winningActionId)?.icon}{' '}
                    {state.crewAction.options.find(o => o.id === state.crewAction.winningActionId)?.label}
                  </strong>
                  {' '}({state.crewAction.options.find(o => o.id === state.crewAction.winningActionId)?.stat === 'attack' ? 'Attack' : 'Skill'} check)
                </div>
                {state.crew.map(member => {
                  const count = pcVoteCounts[member.characterId] || 0;
                  const pct = totalPCVotes > 0 ? Math.round((count / totalPCVotes) * 100) : 0;
                  const isWinning = member.characterId === pcWinnerId;
                  const winningAction = state.crewAction.options.find(o => o.id === state.crewAction.winningActionId);
                  const bonus = winningAction?.stat === 'attack' ? member.attackBonus : member.skillBonus;
                  return (
                    <div key={member.characterId} style={{
                      fontSize: '0.7rem', padding: '0.3rem 0.4rem', marginBottom: '0.2rem',
                      background: isWinning ? 'rgba(52,152,219,0.15)' : 'rgba(0,0,0,0.2)',
                      borderLeft: `3px solid ${isWinning ? '#3498db' : '#555'}`,
                      borderRadius: '0 4px 4px 0',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{COMBAT_ROLE_EMOJI[member.role]} <strong>{member.characterName}</strong> <span style={{ color: '#888', fontSize: '0.6rem' }}>(+{bonus})</span></span>
                        <span style={{ color: isWinning ? '#3498db' : '#888' }}>{count} ({pct}%)</span>
                      </div>
                      <div style={{
                        height: '4px', background: '#1a1a2e', borderRadius: '2px', marginTop: '0.2rem',
                      }}>
                        <div style={{
                          width: `${pct}%`, height: '100%',
                          background: isWinning ? '#3498db' : '#555',
                          borderRadius: '2px', transition: 'width 0.3s',
                        }} />
                      </div>
                    </div>
                  );
                })}
                <button onClick={closePCVoting} className="btn-warning launch-btn" style={{ marginTop: '0.5rem' }}>
                  🔒 Close PC Vote
                </button>
              </div>
            )}

            {/* Awaiting Roll: single d20 entry */}
            {state.status === 'awaiting-roll' && state.pendingRoll && (
              <div>
                <h4 style={{ fontSize: '0.75rem', color: '#f39c12', marginBottom: '0.3rem' }}>
                  🎲 Crew Action — Enter d20
                </h4>
                <div style={{
                  padding: '0.4rem', background: 'rgba(243,156,18,0.1)', borderRadius: '6px',
                  fontSize: '0.7rem', marginBottom: '0.3rem',
                }}>
                  <div><strong>{state.pendingRoll.actionLabel}</strong></div>
                  <div style={{ color: '#aaa' }}>
                    {state.pendingRoll.stat === 'attack' ? 'Attack' : 'Skill'} check • DC {state.pendingRoll.dc} • Modifier +{state.pendingRoll.modifier}
                    {state.pendingRoll.crewMemberName && (
                      <span style={{ color: '#3498db' }}> • Performed by {state.pendingRoll.crewMemberName}</span>
                    )}
                  </div>
                </div>

                {state.pendingRoll.autoSuccess ? (
                  <div style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                    AUTO SUCCESS ✅
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      placeholder="d20"
                      value={rollEntry}
                      onChange={(e) => setRollEntry(e.target.value)}
                      style={{
                        width: '60px', padding: '0.25rem 0.4rem', fontSize: '0.85rem',
                        background: '#1a1a2e', border: '1px solid #555', borderRadius: '4px',
                        color: '#fff', textAlign: 'center',
                      }}
                    />
                    {rollEntry && (() => {
                      const r = parseInt(rollEntry, 10);
                      const total = r + state.pendingRoll!.modifier;
                      const pass = total >= state.pendingRoll!.dc;
                      return (
                        <span style={{ color: pass ? '#2ecc71' : '#e74c3c', fontWeight: 'bold', fontSize: '0.8rem' }}>
                          = {total} {pass ? '✅' : '❌'}
                        </span>
                      );
                    })()}
                  </div>
                )}

                <button
                  onClick={resolveCrewAction}
                  className="btn-primary launch-btn"
                  disabled={!state.pendingRoll.autoSuccess && !rollEntry}
                >
                  ⚔️ Resolve Crew Action
                </button>
              </div>
            )}

            {/* Player Turns: waiting + villain turn button */}
            {state.status === 'player-turns' && (
              <div>
                {state.crewAction.result && (
                  <div style={{
                    padding: '0.4rem', marginBottom: '0.4rem',
                    background: state.crewAction.result.success ? 'rgba(46,204,113,0.1)' : 'rgba(231,76,60,0.1)',
                    borderLeft: `3px solid ${state.crewAction.result.success ? '#2ecc71' : '#e74c3c'}`,
                    borderRadius: '0 4px 4px 0', fontSize: '0.7rem',
                  }}>
                    <div><strong>{state.crewAction.result.actionLabel}</strong>
                      {state.crewAction.result.success ? ' ✅' : ' ❌'}
                      {!state.crewAction.result.success || state.crewAction.result.roll > 0
                        ? ` (${state.crewAction.result.roll}+${state.crewAction.result.modifier}=${state.crewAction.result.total} vs DC ${state.crewAction.result.dc})`
                        : ' (AUTO)'}
                    </div>
                    <div style={{ color: '#aaa', fontStyle: 'italic' }}>{state.crewAction.result.narrative}</div>
                  </div>
                )}
                <div style={{ fontSize: '0.75rem', color: '#f39c12', marginBottom: '0.3rem' }}>
                  🎭 Player Turns — PCs are fighting at the table
                </div>
                <button onClick={runVillainTurn} className="btn-danger launch-btn">
                  🏴 Run Villain Turn
                </button>
              </div>
            )}

            {/* Villain Turn: summary + Next Round/Wave */}
            {state.status === 'villain-turn' && (
              <div>
                {state.villainTurnSummary && (
                  <div style={{
                    padding: '0.4rem', marginBottom: '0.4rem',
                    background: 'rgba(231,76,60,0.1)',
                    borderLeft: '3px solid #e74c3c',
                    borderRadius: '0 4px 4px 0', fontSize: '0.7rem',
                  }}>
                    <div style={{ color: '#e74c3c', fontWeight: 700 }}>🏴 Villain Turn Result</div>
                    <div style={{ color: '#ccc' }}>{state.villainTurnSummary.narrative}</div>
                  </div>
                )}

                {/* Victory/defeat alerts */}
                {isVictory && (
                  <div style={{ fontSize: '0.8rem', color: '#2ecc71', padding: '0.3rem', background: 'rgba(46,204,113,0.2)', borderRadius: '4px', marginBottom: '0.3rem', textAlign: 'center' }}>
                    🎉 VICTORY condition met!
                  </div>
                )}
                {isCritical && (
                  <div style={{ fontSize: '0.8rem', color: '#f39c12', padding: '0.3rem', background: 'rgba(243,156,18,0.2)', borderRadius: '4px', marginBottom: '0.3rem', textAlign: 'center' }}>
                    ⚠️ Crackle's Revenge hull critical!
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  {hasMoreRounds ? (
                    <button onClick={advanceRound} className="btn-primary launch-btn" style={{ flex: 1 }}>
                      ▶️ Next Round (R{state.currentRound + 1})
                    </button>
                  ) : state.currentWave < 3 ? (
                    <button onClick={goToBetweenWaves} className="btn-primary launch-btn" style={{ flex: 1 }}>
                      ▶️ Wave {state.currentWave} Complete
                    </button>
                  ) : (
                    <button onClick={() => endCombat(isVictory ? 'victory' : isDefeat ? 'defeat' : 'victory')} className="btn-epic launch-btn" style={{ flex: 1 }}>
                      {isVictory ? '🎉 Victory!' : isDefeat ? '💀 Defeat' : '⚔️ End Combat'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Between waves */}
            {state.status === 'between-waves' && (
              <div>
                <div style={{ fontSize: '0.8rem', color: '#2ecc71', marginBottom: '0.3rem', textAlign: 'center' }}>
                  Wave {state.currentWave} complete!
                </div>
                {state.currentWave < 3 ? (
                  <button onClick={advanceWave} className="btn-primary launch-btn">
                    ▶️ Start Wave {state.currentWave + 1}
                  </button>
                ) : (
                  <button onClick={() => endCombat('victory')} className="btn-epic launch-btn">
                    🎉 Victory — Combat Over!
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN: Battle Status ── */}
          <div style={{ flex: '1 1 180px', minWidth: '180px' }}>
            {/* Flyer Tracker */}
            <div style={{
              margin: '0 0 0.5rem 0',
              padding: '0.4rem',
              background: state.flyers.escaped >= 2 ? 'rgba(231,76,60,0.2)' : 'rgba(46,204,113,0.1)',
              border: `2px solid ${state.flyers.escaped >= 2 ? '#e74c3c' : state.flyers.escaped >= 1 ? '#f39c12' : '#2ecc71'}`,
              borderRadius: '8px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.65rem', color: '#888' }}>FLYER TRACKER</div>
              <div style={{ fontSize: '1.3rem', letterSpacing: '0.2rem' }}>
                {Array.from({ length: state.flyers.maxEscaped }).map((_, i) => (
                  <span key={i}>{i < state.flyers.escaped ? '💀' : '⬜'}</span>
                ))}
              </div>
              <div style={{ fontSize: '0.6rem', color: '#aaa' }}>
                {state.flyers.escaped}/{state.flyers.maxEscaped} escaped • {state.flyers.active} active • {state.flyers.destroyed} destroyed
              </div>
            </div>

            {/* Hull HP bars */}
            <div style={{ marginBottom: '0.5rem' }}>
              <div>
                <div style={{ fontSize: '0.6rem', color: '#2ecc71' }}>⚓ Crackle's Revenge</div>
                <div style={{ background: '#1a1a2e', borderRadius: '4px', overflow: 'hidden', height: '10px' }}>
                  <div style={{
                    width: `${(state.cracklesRevenge.hullHP / state.cracklesRevenge.hullMaxHP) * 100}%`,
                    height: '100%',
                    background: state.cracklesRevenge.status === 'critical' ? '#e74c3c' : state.cracklesRevenge.status === 'damaged' ? '#f39c12' : '#2ecc71',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                <div style={{ fontSize: '0.55rem', color: '#888' }}>{state.cracklesRevenge.hullHP}/{state.cracklesRevenge.hullMaxHP}</div>
              </div>
              <div style={{ marginTop: '0.2rem' }}>
                <div style={{ fontSize: '0.6rem', color: '#e74c3c' }}>🏴 Scout Ship {state.scoutShip.mastDestroyed ? '(MAST DOWN)' : ''}</div>
                <div style={{ background: '#1a1a2e', borderRadius: '4px', overflow: 'hidden', height: '10px' }}>
                  <div style={{
                    width: `${(state.scoutShip.hullHP / state.scoutShip.hullMaxHP) * 100}%`,
                    height: '100%',
                    background: '#e74c3c',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                <div style={{ fontSize: '0.55rem', color: '#888' }}>{state.scoutShip.hullHP}/{state.scoutShip.hullMaxHP}</div>
              </div>
            </div>

            {/* Crew roster */}
            <div style={{ fontSize: '0.6rem', color: '#aaa', marginBottom: '0.3rem' }}>
              <div style={{ fontWeight: 700, color: '#888', marginBottom: '0.15rem' }}>CREW</div>
              {state.crew.map(m => (
                <div key={m.characterId} style={{ marginBottom: '0.1rem' }}>
                  {COMBAT_ROLE_EMOJI[m.role]} {m.characterName}
                </div>
              ))}
            </div>

            {/* Manual Overrides */}
            <div style={{
              padding: '0.3rem',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '6px',
              fontSize: '0.6rem',
            }}>
              <div style={{ color: '#888', marginBottom: '0.2rem', fontWeight: 700 }}>Overrides</div>
              <div style={{ display: 'flex', gap: '0.2rem', flexWrap: 'wrap' }}>
                <button onClick={() => adjustFlyersEscaped(1)} className="btn-danger" style={{ fontSize: '0.55rem', padding: '0.1rem 0.2rem' }}>+1 Escaped</button>
                <button onClick={() => adjustFlyersEscaped(-1)} className="btn-secondary" style={{ fontSize: '0.55rem', padding: '0.1rem 0.2rem' }}>-1 Escaped</button>
                <button onClick={() => adjustHullHP('crackle', 5)} className="btn-secondary" style={{ fontSize: '0.55rem', padding: '0.1rem 0.2rem' }}>+5 Hull</button>
                <button onClick={() => adjustHullHP('crackle', -5)} className="btn-danger" style={{ fontSize: '0.55rem', padding: '0.1rem 0.2rem' }}>-5 Hull</button>
                <button onClick={() => adjustHullHP('scout', -10)} className="btn-secondary" style={{ fontSize: '0.55rem', padding: '0.1rem 0.2rem' }}>-10 Scout</button>
                <button onClick={() => adjustBoarders(1)} className="btn-danger" style={{ fontSize: '0.55rem', padding: '0.1rem 0.2rem' }}>+1 Boarder</button>
                <button onClick={() => adjustBoarders(-1)} className="btn-secondary" style={{ fontSize: '0.55rem', padding: '0.1rem 0.2rem' }}>-1 Boarder</button>
              </div>
              <div style={{ marginTop: '0.2rem' }}>
                <button onClick={() => endCombat('victory')} className="btn-warning" style={{ fontSize: '0.55rem', padding: '0.1rem 0.2rem' }}>End Combat</button>
                <button onClick={resetEverything} className="btn-danger" style={{ fontSize: '0.55rem', padding: '0.1rem 0.2rem', marginLeft: '0.2rem' }}>🗑️ Reset All</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Victory state ── */}
      {state?.status === 'victory' && (
        <div style={{ textAlign: 'center', padding: '0.5rem' }}>
          <div style={{ fontSize: '1rem', marginBottom: '0.3rem' }}>🎉 IP Isle is safe!</div>
          <button onClick={() => endCombat('idle')} className="btn-secondary">✖️ Close Combat</button>
        </div>
      )}

      {/* ── Defeat state ── */}
      {state?.status === 'defeat' && (
        <div style={{ textAlign: 'center', padding: '0.5rem' }}>
          <div style={{ fontSize: '1rem', marginBottom: '0.3rem' }}>💀 The Barren Sole changes course...</div>
          <button onClick={() => endCombat('idle')} className="btn-secondary">✖️ Close Combat</button>
        </div>
      )}

      {/* ── Active Buffs (debug visibility) ── */}
      {state && state.activeBuffs.length > 0 && (
        <div style={{ fontSize: '0.6rem', color: '#666', marginTop: '0.3rem' }}>
          Buffs: {state.activeBuffs.join(', ')}
        </div>
      )}

      {/* ── Enemy Quick Reference ── */}
      {state && state.status !== 'idle' && (
        <div style={{
          marginTop: '0.6rem',
          padding: '0.4rem',
          background: 'rgba(26,10,10,0.5)',
          border: '1px solid #4a2a1a',
          borderRadius: '8px',
        }}>
          <div style={{
            fontSize: '0.7rem', fontWeight: 700, color: '#f5a623',
            textAlign: 'center', marginBottom: '0.3rem', letterSpacing: '0.5px',
          }}>
            ⚔️ ENEMY QUICK REF — <span style={{ fontSize: '0.6rem', color: '#c09060' }}>🔥 All fire-vulnerable</span>
          </div>

          {/* At a glance row */}
          <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
            {[
              { id: 'sogswab', name: 'Sogswab', tag: 'Boarder', tagColor: '#a0d880', tagBg: '#3a5a2a', ac: 12, hp: 15, hit: '+4', dmg: '1d6+2' },
              { id: 'brute', name: 'Brute', tag: 'Elite', tagColor: '#f0c060', tagBg: '#5a3a1a', ac: 14, hp: 28, hit: '+5', dmg: '1d8+3' },
              { id: 'kite', name: 'Kite', tag: 'Flyer', tagColor: '#60b0f0', tagBg: '#1a3a5a', ac: 14, hp: 10, hit: '—', dmg: 'No atk' },
              { id: 'wrung', name: 'Wrung', tag: 'Boss', tagColor: '#f06060', tagBg: '#5a1a1a', ac: 16, hp: 40, hit: '+5', dmg: '1d8+3+1d6' },
            ].map(e => (
              <div
                key={e.id}
                onClick={() => setEnemyRefOpen(enemyRefOpen === e.id ? null : e.id)}
                style={{
                  flex: '1 1 110px', cursor: 'pointer', userSelect: 'none',
                  padding: '0.25rem 0.35rem',
                  background: enemyRefOpen === e.id ? 'rgba(245,166,35,0.1)' : 'rgba(0,0,0,0.3)',
                  border: `1px solid ${enemyRefOpen === e.id ? '#f5a623' : '#3a2015'}`,
                  borderRadius: '6px', fontSize: '0.58rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: '#f0c060' }}>{e.name}</span>
                  <span style={{
                    fontSize: '0.5rem', fontWeight: 700, padding: '1px 5px',
                    borderRadius: '8px', background: e.tagBg, color: e.tagColor,
                  }}>{e.tag}</span>
                </div>
                <div style={{ color: '#b0a090', marginTop: '0.1rem' }}>
                  <span style={{ color: '#60b0f0' }}>AC {e.ac}</span>{' · '}
                  <span style={{ color: '#5dde5d' }}>HP {e.hp}</span>{' · '}
                  <span style={{ color: '#4ecdc4' }}>{e.hit}</span>{' / '}
                  <span style={{ color: '#f06060' }}>{e.dmg}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Expanded detail for selected enemy */}
          {enemyRefOpen === 'sogswab' && (
            <div style={{ padding: '0.3rem 0.4rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', fontSize: '0.6rem', color: '#c0a890' }}>
              <div style={{ marginBottom: '0.15rem' }}>
                <span style={{ color: '#f0c060', fontWeight: 700 }}>Rusted Cutlass:</span>{' '}
                <span style={{ color: '#4ecdc4' }}>+4</span> · <span style={{ color: '#f06060' }}>1d6+2 slash</span>
              </div>
              <div style={{ marginBottom: '0.15rem' }}>
                <span style={{ color: '#f0c060', fontWeight: 700 }}>Grappling Hook:</span>{' '}
                <span style={{ color: '#4ecdc4' }}>+2</span> · 20/40 ft · <span style={{ color: '#f06060' }}>1d4 piercing</span> · STR DC 11 or pulled 10 ft
              </div>
              <div style={{ marginBottom: '0.15rem' }}>
                <span style={{ color: '#f5a623', fontWeight: 700 }}>Soggy Grip:</span>{' '}
                On melee hit, STR DC 11 or grappled until end of next turn
              </div>
              <div style={{ color: '#f08060', fontSize: '0.55rem' }}>🔥 Vulnerable to Fire · Immune to Frightened/Charmed · Death: milky puddle, evaporates</div>
            </div>
          )}

          {enemyRefOpen === 'brute' && (
            <div style={{ padding: '0.3rem 0.4rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', fontSize: '0.6rem', color: '#c0a890' }}>
              <div style={{ marginBottom: '0.15rem' }}>
                <span style={{ color: '#f0c060', fontWeight: 700 }}>Boarding Axe:</span>{' '}
                <span style={{ color: '#4ecdc4' }}>+5</span> · <span style={{ color: '#f06060' }}>1d8+3 slash</span>
              </div>
              <div style={{ marginBottom: '0.15rem' }}>
                <span style={{ color: '#f0c060', fontWeight: 700 }}>Soggy Slam:</span>{' '}
                <span style={{ color: '#4ecdc4' }}>+5</span> · <span style={{ color: '#f06060' }}>1d6+3 bludg</span> · CON DC 13 or speed -10 ft
              </div>
              <div style={{ marginBottom: '0.15rem' }}>
                <span style={{ color: '#f5a623', fontWeight: 700 }}>Sog Crust:</span>{' '}
                First hit each round: reduce dmg by 3. Fire disables until next turn
              </div>
              <div style={{ color: '#f08060', fontSize: '0.55rem' }}>🔥 Vulnerable to Fire · Resist Cold + Bludgeoning · Death: cracks open, milky fluid</div>
            </div>
          )}

          {enemyRefOpen === 'kite' && (
            <div style={{ padding: '0.3rem 0.4rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', fontSize: '0.6rem', color: '#c0a890' }}>
              <div style={{ marginBottom: '0.15rem' }}>
                <span style={{ color: '#f5a623', fontWeight: 700 }}>No Attack:</span>{' '}
                Flees. Does not fight. Uses Dash every turn
              </div>
              <div style={{ marginBottom: '0.15rem' }}>
                <span style={{ color: '#f5a623', fontWeight: 700 }}>Escape Timer:</span>{' '}
                Launches → survives 2 full rounds → ESCAPES. Flyer tracker +1
              </div>
              <div style={{ marginBottom: '0.15rem' }}>
                <span style={{ color: '#f5a623', fontWeight: 700 }}>Evasive Flight:</span>{' '}
                Ranged attacks from 30+ ft have disadvantage
              </div>
              <div style={{ color: '#f08060', fontSize: '0.55rem' }}>🔥 ANY fire damage = instant kill (parchment wings) · Death: varnish shatters, coordinates lost</div>
            </div>
          )}

          {enemyRefOpen === 'wrung' && (
            <div style={{ padding: '0.3rem 0.4rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', fontSize: '0.6rem', color: '#c0a890' }}>
              <div style={{ marginBottom: '0.15rem' }}>
                <span style={{ color: '#f0c060', fontWeight: 700 }}>Varnish Blade:</span>{' '}
                <span style={{ color: '#4ecdc4' }}>+5</span> · <span style={{ color: '#f06060' }}>1d8+3 slash + 1d6 necrotic</span> · DC 12 or healing halved
              </div>
              <div style={{ marginBottom: '0.15rem' }}>
                <span style={{ color: '#f5a623', fontWeight: 700 }}>Signal Flare</span> <span style={{ color: '#8a6a5a' }}>(1/enc):</span>{' '}
                Bonus action. Launches 1 emergency Varnish Kite
              </div>
              <div style={{ marginBottom: '0.15rem' }}>
                <span style={{ color: '#f5a623', fontWeight: 700 }}>Tactical Command</span> <span style={{ color: '#8a6a5a' }}>(Rech 5-6):</span>{' '}
                2 Sogswabs in 30 ft use reaction to move + attack
              </div>
              <div style={{ marginBottom: '0.15rem' }}>
                <span style={{ color: '#f5a623', fontWeight: 700 }}>Smoke Bomb</span> <span style={{ color: '#8a6a5a' }}>(1/enc, Reaction):</span>{' '}
                When hit: 10 ft obscured. Wrung moves half speed, no OAs
              </div>
              <div style={{ color: '#f08060', fontSize: '0.55rem' }}>🔥 Vulnerable to Fire · Resist Cold · Death: "He's already... closer than you think."</div>
              <div style={{ marginTop: '0.15rem', fontSize: '0.55rem', color: '#f0c060' }}>
                💰 Loot: Vanishing Varnish Blade (+1d6 nec) · Navigation Chart (Barren Sole patrol) · Knight's Insignia
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

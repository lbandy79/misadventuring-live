/**
 * ShipCombatVote v2 — Audience phone component for ship combat
 *
 * v2: No station tabs. Crew votes on a single action from 3-4 options.
 * Waiting screens for player-turns / villain-turn / between-waves.
 *
 * FIREBASE DOCS:
 *   - Reads: ship-combat/current (onSnapshot)
 *   - Writes: ship-combat/current.crewAction.votes (via transaction)
 */

import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound, initAudio } from '../utils/sounds';
import { getWaveDefinition } from '../data/shipCombatData';
import type { ShipCombatState, CrewActionOption } from '../types/shipCombat.types';
import { COMBAT_ROLE_EMOJI } from '../types/shipCombat.types';
import './ShipCombatVote.css';

/** Persistent visitor ID for vote tracking */
function getVisitorId(): string {
  const key = 'mtp-user-id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

export default function ShipCombatVote() {
  const [state, setState] = useState<ShipCombatState | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedCrew, setSelectedCrew] = useState<string | null>(null);
  const [hasVotedPC, setHasVotedPC] = useState(false);

  const visitorId = getVisitorId();

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

        // Check if this user already voted on crew action
        const existingVote = data.crewAction?.votes?.[visitorId];
        if (existingVote) {
          setSelectedAction(existingVote);
          setHasVoted(true);
        } else {
          setHasVoted(false);
          setSelectedAction(null);
        }

        // Check if this user already voted on PC
        const existingPCVote = data.pcVote?.votes?.[visitorId];
        if (existingPCVote) {
          setSelectedCrew(existingPCVote);
          setHasVotedPC(true);
        } else {
          setHasVotedPC(false);
          setSelectedCrew(null);
        }
      }
    });
    return () => unsub();
  }, [visitorId]);

  // Reset selection when round/wave changes
  useEffect(() => {
    if (state?.status === 'briefing' || state?.status === 'crew-voting') {
      setSelectedAction(null);
      setHasVoted(false);
      setSelectedCrew(null);
      setHasVotedPC(false);
    }
  }, [state?.status, state?.currentWave, state?.currentRound]);

  // ─── Cast vote (visitorId → actionId) ──────────────────────────────
  const castVote = useCallback(async (actionId: string) => {
    if (!state || state.status !== 'crew-voting') return;

    initAudio();

    try {
      const docRef = doc(db, 'ship-combat', 'current');

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(docRef);
        if (!snap.exists()) return;
        const current = snap.data() as ShipCombatState;
        const newVotes = { ...(current.crewAction?.votes || {}) };
        newVotes[visitorId] = actionId;
        tx.update(docRef, { 'crewAction.votes': newVotes });
      });

      setSelectedAction(actionId);
      setHasVoted(true);
      playSound('vote');
    } catch (err) {
      console.error('Ship combat vote failed:', err);
      playSound('error');
    }
  }, [state, visitorId]);

  // ─── Cast PC vote (visitorId → characterId) ───────────────────────
  const castPCVote = useCallback(async (characterId: string) => {
    if (!state || state.status !== 'pc-voting') return;

    initAudio();

    try {
      const docRef = doc(db, 'ship-combat', 'current');

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(docRef);
        if (!snap.exists()) return;
        const current = snap.data() as ShipCombatState;
        const newVotes = { ...(current.pcVote?.votes || {}) };
        newVotes[visitorId] = characterId;
        tx.update(docRef, { 'pcVote.votes': newVotes });
      });

      setSelectedCrew(characterId);
      setHasVotedPC(true);
      playSound('vote');
    } catch (err) {
      console.error('Ship combat PC vote failed:', err);
      playSound('error');
    }
  }, [state, visitorId]);

  // ─── Derived data ──────────────────────────────────────────────────
  const wave = state ? getWaveDefinition(state.currentWave) : null;
  const options: CrewActionOption[] = state?.crewAction?.options || [];

  if (!state) return null;

  // ─── Briefing / Idle state ─────────────────────────────────────────
  if (state.status === 'briefing' || state.status === 'idle') {
    return (
      <div className="ship-combat-vote">
        <div className="scv-briefing">
          <div className="scv-header">
            <span className="scv-title">⚓ Ship Combat</span>
            <span className="scv-wave">Wave {state.currentWave}/{state.totalWaves}</span>
          </div>

          {/* Flyer tracker */}
          <div className="scv-flyer-tracker">
            {Array.from({ length: state.flyers.maxEscaped }).map((_, i) => (
              <span key={i} className={`scv-flyer-slot ${i < state.flyers.escaped ? 'escaped' : ''}`}>
                {i < state.flyers.escaped ? '💀' : '⬜'}
              </span>
            ))}
          </div>

          {wave && (
            <motion.div
              className="scv-briefing-text"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h3>Wave {wave.waveNumber} — {wave.title}</h3>
              <p>{wave.briefing}</p>
            </motion.div>
          )}

          <div className="scv-waiting">Waiting for captain's orders...</div>
        </div>
      </div>
    );
  }

  // ─── Crew Voting state (3-4 vertical buttons) ─────────────────────
  if (state.status === 'crew-voting') {
    return (
      <div className="ship-combat-vote">
        <div className="scv-header">
          <span className="scv-title">⚓ Wave {state.currentWave} R{state.currentRound}</span>
          <span className="scv-wave">Pick an action!</span>
        </div>

        {/* Flyer tracker mini */}
        <div className="scv-flyer-tracker mini">
          {Array.from({ length: state.flyers.maxEscaped }).map((_, i) => (
            <span key={i} className={`scv-flyer-slot ${i < state.flyers.escaped ? 'escaped' : ''}`}>
              {i < state.flyers.escaped ? '💀' : '⬜'}
            </span>
          ))}
          <span className="scv-flyer-count">{state.flyers.active} flyers</span>
        </div>

        {/* Action buttons */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${state.currentWave}-${state.currentRound}`}
            className="scv-actions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {options.map(option => {
              const isActive = selectedAction === option.id && hasVoted;
              return (
                <motion.button
                  key={option.id}
                  className={`scv-action-btn ${isActive ? 'selected' : ''}`}
                  onClick={() => castVote(option.id)}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="scv-action-top">
                    <span className="scv-action-icon">{option.icon}</span>
                    <span className="scv-action-label">{option.label}</span>
                    {option.autoSuccess && <span className="scv-auto-badge">AUTO</span>}
                  </div>
                  <div className="scv-action-desc">{option.description}</div>
                  {isActive && (
                    <motion.div
                      className="scv-action-locked"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >
                      ✅ Locked in
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {hasVoted && (
          <div className="scv-vote-confirmed">
            ✅ Vote locked in — {options.find(o => o.id === selectedAction)?.label || ''}
          </div>
        )}
      </div>
    );
  }

  // ─── PC Voting: pick which crew member performs the action ─────────
  if (state.status === 'pc-voting') {
    const winningAction = state.crewAction.options.find(o => o.id === state.crewAction.winningActionId);
    return (
      <div className="ship-combat-vote">
        <div className="scv-header">
          <span className="scv-title">⚓ Wave {state.currentWave} R{state.currentRound}</span>
          <span className="scv-wave">Who does it?</span>
        </div>

        {/* Show winning action */}
        {winningAction && (
          <div className="scv-winning-action">
            <span className="scv-winning-action-icon">{winningAction.icon}</span>
            <span className="scv-winning-action-label">{winningAction.label}</span>
          </div>
        )}

        {/* Crew member buttons */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`pc-${state.currentWave}-${state.currentRound}`}
            className="scv-actions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {state.crew.map(member => {
              const isActive = selectedCrew === member.characterId && hasVotedPC;
              const bonus = winningAction?.stat === 'attack' ? member.attackBonus : member.skillBonus;
              return (
                <motion.button
                  key={member.characterId}
                  className={`scv-action-btn scv-crew-btn ${isActive ? 'selected' : ''}`}
                  onClick={() => castPCVote(member.characterId)}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="scv-action-top">
                    <span className="scv-action-icon">{COMBAT_ROLE_EMOJI[member.role]}</span>
                    <span className="scv-action-label">{member.characterName}</span>
                    <span className="scv-crew-bonus">+{bonus}</span>
                  </div>
                  <div className="scv-action-desc">{COMBAT_ROLE_EMOJI[member.role]} {member.role}</div>
                  {isActive && (
                    <motion.div
                      className="scv-action-locked"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >
                      ✅ Locked in
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {hasVotedPC && (
          <div className="scv-vote-confirmed">
            ✅ Vote locked in — {state.crew.find(c => c.characterId === selectedCrew)?.characterName || ''}
          </div>
        )}
      </div>
    );
  }

  // ─── Awaiting Roll / Player Turns ──────────────────────────────────
  if (state.status === 'awaiting-roll' || state.status === 'player-turns') {
    return (
      <div className="ship-combat-vote">
        <div className="scv-resolving">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="scv-spinner"
          >
            ⚔️
          </motion.div>
          <div className="scv-resolving-text">
            {state.status === 'awaiting-roll' ? 'The crew rolls the dice...' : 'Players are fighting!'}
          </div>

          {/* Show crew action result if available */}
          {state.crewAction.result && (
            <motion.div
              className={`scv-my-result ${state.crewAction.result.success ? 'success' : 'fail'}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <div className="scv-result-action">{state.crewAction.result.actionLabel}</div>
              <div className={`scv-result-roll ${state.crewAction.result.success ? 'success' : 'fail'}`}>
                {state.crewAction.result.roll > 0
                  ? `🎲 ${state.crewAction.result.roll} + ${state.crewAction.result.modifier} = ${state.crewAction.result.total} vs DC ${state.crewAction.result.dc}`
                  : 'AUTO'}
                {state.crewAction.result.success ? ' ✅' : ' ❌'}
              </div>
              <div className="scv-result-narrative">{state.crewAction.result.narrative}</div>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  // ─── Villain Turn ──────────────────────────────────────────────────
  if (state.status === 'villain-turn') {
    return (
      <div className="ship-combat-vote">
        <div className="scv-resolving">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="scv-spinner"
          >
            🏴
          </motion.div>
          <div className="scv-resolving-text">The enemies strike back!</div>

          {state.villainTurnSummary && (
            <motion.div
              className="scv-my-result fail"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <div className="scv-result-narrative">{state.villainTurnSummary.narrative}</div>
            </motion.div>
          )}

          {/* Hull status */}
          <div className="scv-round-summary">
            <div className="scv-summary-row">
              ⚓ Hull: {state.cracklesRevenge.hullHP}/{state.cracklesRevenge.hullMaxHP}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Between Waves ─────────────────────────────────────────────────
  if (state.status === 'between-waves') {
    return (
      <div className="ship-combat-vote">
        <div className="scv-briefing">
          <div className="scv-header">
            <span className="scv-title">⚓ Wave {state.currentWave} Complete</span>
          </div>
          <div className="scv-flyer-tracker">
            {Array.from({ length: state.flyers.maxEscaped }).map((_, i) => (
              <span key={i} className={`scv-flyer-slot ${i < state.flyers.escaped ? 'escaped' : ''}`}>
                {i < state.flyers.escaped ? '💀' : '⬜'}
              </span>
            ))}
          </div>
          <div className="scv-round-summary">
            <div className="scv-summary-row">⚓ Hull: {state.cracklesRevenge.hullHP}/{state.cracklesRevenge.hullMaxHP}</div>
            <div className="scv-summary-row">🦅 Flyers: {state.flyers.active} active, {state.flyers.destroyed} destroyed</div>
            <div className="scv-summary-row">⚔️ Boarders: {state.boarders.total} remaining</div>
          </div>
          <div className="scv-waiting">Preparing for the next wave...</div>
        </div>
      </div>
    );
  }

  // ─── Victory state ─────────────────────────────────────────────────
  if (state.status === 'victory') {
    return (
      <div className="ship-combat-vote">
        <motion.div
          className="scv-complete victory"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 150 }}
        >
          <div className="scv-complete-icon">🎉</div>
          <div className="scv-complete-text">IP Isle is safe!</div>
        </motion.div>
      </div>
    );
  }

  // ─── Defeat state ──────────────────────────────────────────────────
  if (state.status === 'defeat') {
    return (
      <div className="ship-combat-vote">
        <motion.div
          className="scv-complete defeat"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 150 }}
        >
          <div className="scv-complete-icon">💀</div>
          <div className="scv-complete-text">The Barren Sole changes course...</div>
        </motion.div>
      </div>
    );
  }

  return null;
}

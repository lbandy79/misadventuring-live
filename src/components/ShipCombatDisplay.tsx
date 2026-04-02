/**
 * ShipCombatDisplay v2 — Venue screen / OBS overlay for ship combat
 *
 * v2: Crew acts as ONE unit. Single action vote per round.
 * Horizontal vote bars during crew-voting, narrative results, waiting states.
 *
 * PHASES:
 *   briefing:      Wave title + briefing text
 *   crew-voting:   Vote bars fill as audience picks
 *   awaiting-roll: Brief "Rolling..." screen
 *   player-turns:  "Players are fighting!" with crew result
 *   villain-turn:  "Enemies strike!" with damage summary
 *   between-waves: Wave summary
 *   victory/defeat: Finale screens
 */

import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { db } from '../firebase';
import { audioMixer } from '../utils/audioMixer';
import { celebrateWinner } from '../utils/confetti';
import { getWaveDefinition } from '../data/shipCombatData';
import {
  COMBAT_ROLE_EMOJI,
  tallyCrewVotes,
  tallyPCVotes,
  getTotalVotes,
} from '../types/shipCombat.types';
import type { ShipCombatState } from '../types/shipCombat.types';
import './ShipCombatDisplay.css';

interface Props {
  onComplete?: () => void;
}

export default function ShipCombatDisplay({ onComplete }: Props) {
  const [state, setState] = useState<ShipCombatState | null>(null);
  const [prevStatus, setPrevStatus] = useState<string>('idle');
  const containerRef = useRef<HTMLDivElement>(null);

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

        if (data.status !== prevStatus) {
          handleStatusTransition(prevStatus, data.status, data);
          setPrevStatus(data.status);
        }
      }
    });
    return () => unsub();
  }, [prevStatus]);

  // ─── Status transition effects ─────────────────────────────────────
  const handleStatusTransition = (_from: string, to: string, _data: ShipCombatState) => {
    if (to === 'briefing') {
      try { audioMixer.play('whoosh'); } catch {}
      if (containerRef.current) {
        gsap.fromTo(containerRef.current,
          { x: -5 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' }
        );
      }
    }
    if (to === 'crew-voting') {
      try { audioMixer.play('uiClick'); } catch {}
    }
    if (to === 'pc-voting') {
      try { audioMixer.play('uiClick'); } catch {}
    }
    if (to === 'player-turns') {
      try { audioMixer.play('diceImpact'); } catch {}
    }
    if (to === 'villain-turn') {
      try { audioMixer.play('diceImpact'); } catch {}
    }
    if (to === 'victory') {
      try { audioMixer.play('victory'); } catch {}
      celebrateWinner({ intensity: 'epic' });
      if (onComplete) onComplete();
    }
    if (to === 'defeat') {
      if (onComplete) onComplete();
    }
  };

  // ─── Derived data ──────────────────────────────────────────────────
  const wave = state ? getWaveDefinition(state.currentWave) : null;
  const { counts: voteCounts } = state ? tallyCrewVotes(state.crewAction?.votes || {}) : { counts: {} as Record<string, number> };
  const totalVotes = state ? getTotalVotes(state.crewAction?.votes || {}) : 0;
  const { counts: pcVoteCounts } = state ? tallyPCVotes(state.pcVote?.votes || {}) : { counts: {} as Record<string, number> };
  const totalPCVotes = state ? getTotalVotes(state.pcVote?.votes || {}) : 0;

  if (!state) return null;

  return (
    <div className="scd-container" ref={containerRef}>
      {/* ── Top Bar: Ship HP + Flyer Tracker ── */}
      <div className="scd-top-bar">
        <div className="scd-ship-status">
          <div className="scd-ship">
            <div className="scd-ship-label">⚓ THE CRACKLE'S REVENGE</div>
            <div className="scd-hp-bar">
              <div
                className={`scd-hp-fill crackle ${state.cracklesRevenge.status}`}
                style={{ width: `${(state.cracklesRevenge.hullHP / state.cracklesRevenge.hullMaxHP) * 100}%` }}
              />
            </div>
            <div className="scd-hp-text">{state.cracklesRevenge.hullHP}/{state.cracklesRevenge.hullMaxHP} HP</div>
          </div>
          <div className="scd-ship">
            <div className="scd-ship-label scout">🏴 SCOUT SHIP {state.scoutShip.mastDestroyed ? '(MAST DOWN)' : ''}</div>
            <div className="scd-hp-bar">
              <div
                className="scd-hp-fill scout"
                style={{ width: `${(state.scoutShip.hullHP / state.scoutShip.hullMaxHP) * 100}%` }}
              />
            </div>
            <div className="scd-hp-text">{state.scoutShip.hullHP}/{state.scoutShip.hullMaxHP} HP</div>
          </div>
        </div>

        <div className={`scd-flyer-tracker ${state.flyers.escaped >= 2 ? 'danger' : state.flyers.escaped >= 1 ? 'warning' : 'safe'}`}>
          <div className="scd-flyer-label">FLYER TRACKER</div>
          <div className="scd-flyer-slots">
            {Array.from({ length: state.flyers.maxEscaped }).map((_, i) => (
              <span key={i} className={`scd-flyer-slot ${i < state.flyers.escaped ? 'escaped' : ''}`}>
                {i < state.flyers.escaped ? '💀' : '⬜'}
              </span>
            ))}
          </div>
          <div className="scd-flyer-count">
            {state.flyers.escaped}/{state.flyers.maxEscaped} escaped • {state.flyers.active} active
          </div>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <AnimatePresence mode="wait">

        {/* ── Briefing ── */}
        {state.status === 'briefing' && wave && (
          <motion.div
            key="briefing"
            className="scd-briefing"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              className="scd-wave-title"
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
            >
              WAVE {wave.waveNumber}
            </motion.div>
            <motion.div
              className="scd-wave-subtitle"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {wave.title}
            </motion.div>
            <motion.div
              className="scd-briefing-text"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              {wave.briefing}
            </motion.div>

            {/* Threat preview */}
            <motion.div
              className="scd-threat-preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              <span>⚔️ {wave.startingBoarders} Boarders</span>
              <span>🦅 {wave.flyersLaunching} Flyers</span>
              <span>Round {state.currentRound}</span>
            </motion.div>
          </motion.div>
        )}

        {/* ── Crew Voting: vote bars ── */}
        {state.status === 'crew-voting' && (
          <motion.div
            key="voting"
            className="scd-voting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="scd-voting-header">
              <span className="scd-section-title">WAVE {state.currentWave} R{state.currentRound} — CREW VOTE</span>
              <span className="scd-vote-total">{totalVotes} votes</span>
            </div>

            <div className="scd-vote-bars">
              {state.crewAction.options.map(option => {
                const count = voteCounts[option.id] || 0;
                const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                const vals = Object.values(voteCounts) as number[];
                const isLeading = count > 0 && count >= Math.max(...vals, 0);
                return (
                  <motion.div
                    key={option.id}
                    className={`scd-vote-bar-row ${isLeading ? 'leading' : ''}`}
                    animate={isLeading ? { scale: [1, 1.01, 1] } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="scd-vote-bar-label">
                      <span className="scd-vote-bar-icon">{option.icon}</span>
                      <span className="scd-vote-bar-name">{option.label}</span>
                    </div>
                    <div className="scd-vote-bar-track">
                      <motion.div
                        className={`scd-vote-bar-fill ${isLeading ? 'leading' : ''}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.4 }}
                      />
                    </div>
                    <div className="scd-vote-bar-count">{count} ({pct}%)</div>
                  </motion.div>
                );
              })}
            </div>

            {/* Boarder + flyer status */}
            <div className="scd-boarders">
              <span>⚔️ Boarders: {state.boarders.total}</span>
              <span>🦅 Flyers: {state.flyers.active} active</span>
            </div>
          </motion.div>
        )}

        {/* ── PC Voting: crew member vote bars ── */}
        {state.status === 'pc-voting' && (
          <motion.div
            key="pc-voting"
            className="scd-voting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="scd-voting-header">
              <span className="scd-section-title">WHO PERFORMS THE ACTION?</span>
              <span className="scd-vote-total">{totalPCVotes} votes</span>
            </div>

            {/* Show the winning action */}
            {(() => {
              const winningAction = state.crewAction.options.find(o => o.id === state.crewAction.winningActionId);
              return winningAction ? (
                <div className="scd-pc-winning-action">
                  <span>{winningAction.icon}</span> {winningAction.label}
                </div>
              ) : null;
            })()}

            <div className="scd-vote-bars">
              {state.crew.map(member => {
                const count = pcVoteCounts[member.characterId] || 0;
                const pct = totalPCVotes > 0 ? Math.round((count / totalPCVotes) * 100) : 0;
                const vals = Object.values(pcVoteCounts) as number[];
                const isLeading = count > 0 && count >= Math.max(...vals, 0);
                const winningAction = state.crewAction.options.find(o => o.id === state.crewAction.winningActionId);
                const bonus = winningAction?.stat === 'attack' ? member.attackBonus : member.skillBonus;
                return (
                  <motion.div
                    key={member.characterId}
                    className={`scd-vote-bar-row ${isLeading ? 'leading' : ''}`}
                    animate={isLeading ? { scale: [1, 1.01, 1] } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="scd-vote-bar-label">
                      <span className="scd-vote-bar-icon">{COMBAT_ROLE_EMOJI[member.role]}</span>
                      <span className="scd-vote-bar-name">{member.characterName}</span>
                      <span className="scd-vote-bar-bonus">+{bonus}</span>
                    </div>
                    <div className="scd-vote-bar-track">
                      <motion.div
                        className={`scd-vote-bar-fill ${isLeading ? 'leading' : ''}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.4 }}
                      />
                    </div>
                    <div className="scd-vote-bar-count">{count} ({pct}%)</div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── Awaiting Roll ── */}
        {state.status === 'awaiting-roll' && (
          <motion.div
            key="awaiting-roll"
            className="scd-resolving"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="scd-resolving-icon"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              🎲
            </motion.div>
            <div className="scd-resolving-text">The crew rolls the dice...</div>
            {state.pendingRoll && (
              <div className="scd-resolving-action">
                {state.crewAction.options.find(o => o.id === state.pendingRoll?.actionId)?.icon}
                {' '}{state.pendingRoll.actionLabel}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Player Turns ── */}
        {state.status === 'player-turns' && (
          <motion.div
            key="player-turns"
            className="scd-player-turns"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="scd-phase-icon"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              ⚔️
            </motion.div>
            <div className="scd-phase-title">PLAYERS ARE FIGHTING!</div>

            {/* Crew action result */}
            {state.crewAction.result && (
              <motion.div
                className={`scd-crew-result ${state.crewAction.result.success ? 'success' : 'fail'}`}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
              >
                <div className="scd-crew-result-label">{state.crewAction.result.actionLabel}</div>
                {state.crewAction.result.roll > 0 ? (
                  <div className="scd-crew-result-roll">
                    🎲 {state.crewAction.result.roll}+{state.crewAction.result.modifier} = {state.crewAction.result.total} vs DC {state.crewAction.result.dc}
                    {state.crewAction.result.success ? ' ✅' : ' ❌'}
                  </div>
                ) : (
                  <div className="scd-crew-result-roll success">AUTO ✅</div>
                )}
                <div className="scd-crew-result-narrative">{state.crewAction.result.narrative}</div>
                {state.crewAction.result.effectsApplied.length > 0 && (
                  <div className="scd-crew-result-effects">
                    {state.crewAction.result.effectsApplied.join(' • ')}
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── Villain Turn ── */}
        {state.status === 'villain-turn' && (
          <motion.div
            key="villain-turn"
            className="scd-villain-turn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="scd-phase-icon villain"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              🏴
            </motion.div>
            <div className="scd-phase-title villain">ENEMIES STRIKE!</div>

            {state.villainTurnSummary && (
              <motion.div
                className="scd-villain-summary"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="scd-villain-narrative">{state.villainTurnSummary.narrative}</div>
                <div className="scd-villain-stats">
                  {state.villainTurnSummary.boarderDamage > 0 && (
                    <span>💥 -{state.villainTurnSummary.boarderDamage} hull</span>
                  )}
                  {state.villainTurnSummary.flyersEscaped > 0 && (
                    <span>💀 {state.villainTurnSummary.flyersEscaped} escaped</span>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── Between Waves ── */}
        {state.status === 'between-waves' && (
          <motion.div
            key="between-waves"
            className="scd-between-waves"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="scd-phase-icon">⚓</div>
            <div className="scd-phase-title">WAVE {state.currentWave} COMPLETE</div>
            <div className="scd-between-summary">
              <div>⚓ Hull: {state.cracklesRevenge.hullHP}/{state.cracklesRevenge.hullMaxHP}</div>
              <div>🦅 Flyers: {state.flyers.active} active, {state.flyers.destroyed} destroyed</div>
              <div>⚔️ Boarders: {state.boarders.total} remaining</div>
            </div>
          </motion.div>
        )}

        {/* ── Victory ── */}
        {state.status === 'victory' && (
          <motion.div
            key="victory"
            className="scd-complete victory"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 100 }}
          >
            <div className="scd-complete-icon">🎉</div>
            <div className="scd-complete-title">IP ISLE IS SAFE!</div>
            <div className="scd-complete-subtitle">The Crackle's Revenge prevails.</div>
            <div className="scd-complete-crew">
              {state.crew.map(m => (
                <div key={m.characterId} className="scd-complete-member">
                  <span className="scd-complete-emoji">{COMBAT_ROLE_EMOJI[m.role]}</span>
                  <span>{m.characterName}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Defeat ── */}
        {state.status === 'defeat' && (
          <motion.div
            key="defeat"
            className="scd-complete defeat"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 100 }}
          >
            <div className="scd-complete-icon">💀</div>
            <div className="scd-complete-title">THE BARREN SOLE CHANGES COURSE...</div>
            <div className="scd-complete-subtitle">LeFoot has the coordinates.</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom Bar: Crew Roster ── */}
      {(state.status === 'crew-voting' || state.status === 'pc-voting' || state.status === 'player-turns' || state.status === 'villain-turn') && (
        <div className="scd-bottom-bar">
          CREW: {state.crew.map(m =>
            `${COMBAT_ROLE_EMOJI[m.role]} ${m.characterName}`
          ).join(' | ')}
        </div>
      )}

      {/* Captain HP (Wave 3) */}
      {state.scoutCaptain && state.status !== 'idle' && state.status !== 'victory' && state.status !== 'defeat' && (
        <div className="scd-captain-status">
          ⚔️ Scout Captain: {state.scoutCaptain.hp}/{state.scoutCaptain.maxHp} HP
        </div>
      )}
    </div>
  );
}

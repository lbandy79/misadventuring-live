/**
 * DecoderRingDisplay — Venue screen / OBS overlay
 *
 * The big-screen experience visible from 20+ feet.
 *
 * PHASES:
 *   voting-year:          Decoder ring wheel spinning + year options displayed
 *   revealing-character:  Wheel locks → character card reveal with flicker FX
 *   voting-role:          Ship silhouette with open role slots, live vote counts
 *   revealing-role:       Role assignment animation, character snaps into position
 *   complete:             Full crew roster glamour shot
 *
 * Pattern: follows MonsterBuilderDisplay.tsx structure.
 *   - GSAP for reveal sequences
 *   - Framer Motion for state transitions
 *   - audioMixer for sound cues
 *   - celebrateWinner for confetti
 *
 * COPILOT NOTES:
 *   - Listen to decoder-ring/current with onSnapshot
 *   - Character images at /images/ip-isle/{image}
 *   - Use getFlickerClass() from character data for CSS flicker
 *   - The decoder ring wheel animation is VISUAL ONLY (cosmetic spin → settle on year)
 *   - Wheel doesn't determine the year — the vote already did. It's theater.
 *   - Screen shake on character reveal (broadcastCue or direct GSAP)
 *   - Confetti on role assignment
 *   - Persistent crew roster in bottom bar after first recruitment
 */

import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { db } from '../firebase';
import { useTheme } from '../themes/ThemeProvider';
import { audioMixer } from '../utils/audioMixer';
import { celebrateWinner, quickCelebration } from '../utils/confetti';
import {
  getCharacterById,
  getFlickerClass,
  SHIP_ROLES,
} from '../data/decoderRingCharacters';
import type { DecoderRingState } from '../types/decoderRing.types';
import './DecoderRingDisplay.css';

interface Props {
  onComplete?: () => void;
}

export default function DecoderRingDisplay({ onComplete }: Props) {
  const { theme } = useTheme();
  const [state, setState] = useState<DecoderRingState | null>(null);
  const [prevStatus, setPrevStatus] = useState<string>('idle');
  const containerRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // ─── Firebase listener ─────────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'decoder-ring', 'current'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as DecoderRingState;
        const newStatus = data.status;

        // Trigger transition effects on status change
        if (newStatus !== prevStatus) {
          handleStatusTransition(prevStatus, newStatus, data);
          setPrevStatus(newStatus);
        }

        setState(data);
      }
    });
    return () => unsub();
  }, [prevStatus]);

  // ─── Status transition effects ─────────────────────────────────────
  const handleStatusTransition = (from: string, to: string, data: DecoderRingState) => {
    // Year vote opens → wheel starts spinning
    if (to === 'voting-year') {
      audioMixer.play('whoosh');
      startWheelSpin();
    }

    // Year vote closes → wheel settles on winning year
    if (to === 'revealing-character' && data.winningYear) {
      audioMixer.play('diceImpact');
      settleWheel(data.winningYear);
    }

    // Character revealed → card entrance
    if (to === 'revealing-character' && data.revealedCharacterId) {
      revealCharacterCard(data.revealedCharacterId);
    }

    // Role vote closes → assignment celebration
    if (to === 'complete') {
      audioMixer.play('victory');
      celebrateWinner({ intensity: 'epic' });
    }
  };

  // ─── Wheel spin animation (cosmetic) ──────────────────────────────
  const startWheelSpin = () => {
    if (!wheelRef.current) return;
    // Continuous rotation while voting is open
    gsap.to(wheelRef.current, {
      rotation: '+=3600',
      duration: 60,
      ease: 'none',
      repeat: -1,
    });
  };

  const settleWheel = (year: number) => {
    if (!wheelRef.current) return;
    gsap.killTweensOf(wheelRef.current);
    // Dramatic deceleration
    gsap.to(wheelRef.current, {
      rotation: '+=720',
      duration: 3,
      ease: 'power4.out',
      onComplete: () => {
        // Screen shake on lock
        document.body.classList.add('shake-heavy');
        setTimeout(() => document.body.classList.remove('shake-heavy'), 500);
      },
    });
  };

  // ─── Character card reveal ─────────────────────────────────────────
  const revealCharacterCard = (charId: string) => {
    if (!cardRef.current) return;
    gsap.fromTo(cardRef.current,
      { scale: 0, rotateY: 180, opacity: 0 },
      {
        scale: 1,
        rotateY: 0,
        opacity: 1,
        duration: 0.8,
        ease: 'back.out(1.5)',
        onStart: () => {
          audioMixer.play('uiClick');
          quickCelebration({ x: 0.5, y: 0.4 });
        },
      }
    );
  };

  // ─── Derived ───────────────────────────────────────────────────────
  const revealedChar = state?.revealedCharacterId
    ? getCharacterById(state.revealedCharacterId)
    : null;
  const winRole = state?.winningRole
    ? SHIP_ROLES.find(r => r.id === state.winningRole)
    : null;

  if (!state) return null;

  return (
    <div className={`decoder-display decoder-display--${theme.id}`} ref={containerRef}>

      {/* ═══ DECODER RING WHEEL (always visible during voting/reveal) ═══ */}
      <AnimatePresence>
        {(state.status === 'voting-year' || state.status === 'revealing-character') && (
          <motion.div
            className="wheel-container"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            {/* TODO: Build the brass decoder ring visual */}
            {/* Outer ring with year numbers, inner mechanism, 4 digit displays */}
            {/* For Sunday MVP: a glowing circle with the year in the center */}
            <div className="wheel-ring" ref={wheelRef}>
              <div className="wheel-center">
                {state.winningYear ? (
                  <span className="wheel-year locked">{state.winningYear}</span>
                ) : (
                  <span className="wheel-year spinning">????</span>
                )}
              </div>
            </div>

            {/* Year option labels around the wheel */}
            <div className="wheel-options">
              {state.yearOptions.map((opt, i) => {
                const isWinner = state.winningYear === opt.year;
                return (
                  <motion.div
                    key={opt.year}
                    className={`wheel-option ${isWinner ? 'winner' : ''}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                  >
                    <img
                      src={`/images/ip-isle/${opt.thumbnail}`}
                      alt={opt.label}
                      className="wheel-option-img"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <span className="wheel-option-year">{opt.year}</span>
                    <span className="wheel-option-votes">{state.yearVotes[opt.year] || 0}</span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ CHARACTER CARD REVEAL ═══ */}
      <AnimatePresence>
        {revealedChar && (state.status === 'revealing-character' || state.status === 'voting-role' || state.status === 'complete') && (
          <motion.div
            className={`char-card ${getFlickerClass(revealedChar.flicker)}`}
            ref={cardRef}
            initial={{ scale: 0, rotateY: 180, opacity: 0 }}
            animate={{ scale: 1, rotateY: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            <div className="char-card-image">
              <img src={`/images/ip-isle/${revealedChar.image}`} alt={revealedChar.name} />
            </div>
            <div className="char-card-info">
              <h2 className="char-card-name">{revealedChar.name}</h2>
              <p className="char-card-source">{revealedChar.sourceIP} • {revealedChar.year}</p>
              <p className="char-card-liner">{revealedChar.oneLiner}</p>
              {revealedChar.isNPC && (
                <p className="char-card-npc">⚡ {revealedChar.npcNote}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ ROLE VOTE DISPLAY ═══ */}
      <AnimatePresence>
        {state.status === 'voting-role' && (
          <motion.div
            className="role-vote-display"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <h3 className="role-vote-title">Assign to the Crackle's Revenge</h3>
            <div className="role-vote-bars">
              {SHIP_ROLES.map(role => {
                const count = state.roleVotes[role.id] || 0;
                const total = Object.values(state.roleVotes).reduce((a, b) => a + b, 0);
                const pct = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={role.id} className="role-bar-row">
                    <span className="role-bar-label">{role.emoji} {role.label}</span>
                    <div className="role-bar-track">
                      <motion.div
                        className="role-bar-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(pct, 2)}%` }}
                        transition={{ type: 'spring', stiffness: 50, damping: 15 }}
                      />
                    </div>
                    <span className="role-bar-count">{count}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ CREW ROSTER (persistent bottom bar) ═══ */}
      {state.crew.length > 0 && (
        <div className="crew-roster">
          {state.crew.map(m => {
            const char = getCharacterById(m.characterId);
            const role = SHIP_ROLES.find(r => r.id === m.role);
            return (
              <div key={m.characterId} className={`crew-member ${getFlickerClass(m.flicker)}`}>
                <img
                  src={`/images/ip-isle/${m.image}`}
                  alt={m.characterName}
                  className="crew-member-img"
                />
                <span className="crew-member-role">{role?.emoji}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ VOTE COUNT (top right, during voting phases) ═══ */}
      {(state.status === 'voting-year' || state.status === 'voting-role') && (
        <div className="decoder-vote-count">
          <span className="decoder-spin-label">Spin {state.spinNumber}/5</span>
        </div>
      )}
    </div>
  );
}

/**
 * DecoderRingVote — Audience phone component
 *
 * Two-phase voting:
 *   Phase 1: Vote on a year (3–4 options with cereal box thumbnails)
 *   Phase 2: Vote on a ship role for the revealed character
 *
 * Pattern: follows MonsterBuilder.tsx for session tracking,
 *          EncounterVote.tsx for vote casting + revote UX.
 *
 * FIREBASE DOCS:
 *   - Reads: decoder-ring/current (onSnapshot)
 *   - Writes: decoder-ring/current (increment year/role votes via transaction)
 *   - Reads: config/active-interaction (for status)
 *
 * IMAGE PATHS:
 *   Cereal box thumbnails: /images/ip-isle/{image filename}
 *   (Match the OneDrive folder → public/images/ip-isle/)
 *
 * COPILOT NOTES:
 *   - Vote casting: use runTransaction like MonsterBuilder.tsx (atomic increment)
 *   - Session key: getYearVoteStorageKey / getRoleVoteStorageKey from types
 *   - Revoting: same "tap another option" pattern as EncounterVote
 *   - Spawn vote-fly-away particle on cast (reuse existing CSS class)
 *   - After voting, show "watching the Well..." waiting state
 */

import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound, initAudio } from '../utils/sounds';
import { TMPCheck } from './icons/TMPIcons';
import { SHIP_ROLES, getCharacterById } from '../data/decoderRingCharacters';
import {
  getYearVoteStorageKey,
  getRoleVoteStorageKey,
} from '../types/decoderRing.types';
import type { DecoderRingState } from '../types/decoderRing.types';
import './DecoderRingVote.css';

export default function DecoderRingVote() {
  const [state, setState] = useState<DecoderRingState | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [hasVotedYear, setHasVotedYear] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [hasVotedRole, setHasVotedRole] = useState(false);

  // ─── Firebase listener ─────────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'decoder-ring', 'current'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as DecoderRingState;
        setState(data);

        // Check localStorage for existing votes this spin
        const yearKey = getYearVoteStorageKey(data.sessionId, data.spinNumber);
        const roleKey = getRoleVoteStorageKey(data.sessionId, data.spinNumber);
        const savedYear = localStorage.getItem(yearKey);
        const savedRole = localStorage.getItem(roleKey);

        if (savedYear) {
          setHasVotedYear(true);
          setSelectedYear(Number(savedYear));
        } else {
          setHasVotedYear(false);
          setSelectedYear(null);
        }

        if (savedRole) {
          setHasVotedRole(true);
          setSelectedRole(savedRole);
        } else {
          setHasVotedRole(false);
          setSelectedRole(null);
        }
      }
    });
    return () => unsub();
  }, []);

  // ─── Cast year vote (atomic transaction) ───────────────────────────
  const castYearVote = useCallback(async (year: number) => {
    if (!state || state.status !== 'voting-year') return;
    if (selectedYear === year) return; // Already selected this one

    initAudio();

    try {
      const docRef = doc(db, 'decoder-ring', 'current');

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(docRef);
        if (!snap.exists()) return;
        const current = snap.data() as DecoderRingState;
        const newVotes = { ...current.yearVotes };

        // Decrement old vote if changing
        if (hasVotedYear && selectedYear !== null && newVotes[selectedYear] !== undefined) {
          newVotes[selectedYear] = Math.max(0, (newVotes[selectedYear] || 0) - 1);
        }

        // Increment new vote
        newVotes[year] = (newVotes[year] || 0) + 1;

        tx.update(docRef, { yearVotes: newVotes });
      });

      const storageKey = getYearVoteStorageKey(state.sessionId, state.spinNumber);
      localStorage.setItem(storageKey, String(year));
      setSelectedYear(year);
      setHasVotedYear(true);
      playSound('vote');
    } catch (err) {
      console.error('Year vote failed:', err);
      playSound('error');
    }
  }, [state, selectedYear, hasVotedYear]);

  // ─── Cast role vote (atomic transaction) ───────────────────────────
  const castRoleVote = useCallback(async (roleId: string) => {
    if (!state || state.status !== 'voting-role') return;
    if (selectedRole === roleId) return;

    initAudio();

    try {
      const docRef = doc(db, 'decoder-ring', 'current');

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(docRef);
        if (!snap.exists()) return;
        const current = snap.data() as DecoderRingState;
        const newVotes = { ...current.roleVotes };

        // Decrement old
        if (hasVotedRole && selectedRole && newVotes[selectedRole as keyof typeof newVotes] !== undefined) {
          newVotes[selectedRole as keyof typeof newVotes] = Math.max(0, (newVotes[selectedRole as keyof typeof newVotes] || 0) - 1);
        }

        // Increment new
        newVotes[roleId as keyof typeof newVotes] = (newVotes[roleId as keyof typeof newVotes] || 0) + 1;

        tx.update(docRef, { roleVotes: newVotes });
      });

      const storageKey = getRoleVoteStorageKey(state.sessionId, state.spinNumber);
      localStorage.setItem(storageKey, roleId);
      setSelectedRole(roleId);
      setHasVotedRole(true);
      playSound('vote');
    } catch (err) {
      console.error('Role vote failed:', err);
      playSound('error');
    }
  }, [state, selectedRole, hasVotedRole]);

  // ─── Derived ───────────────────────────────────────────────────────
  const revealedChar = state?.revealedCharacterId
    ? getCharacterById(state.revealedCharacterId)
    : null;

  if (!state) return null;

  // ─── RENDER: Year voting ───────────────────────────────────────────
  if (state.status === 'voting-year') {
    return (
      <div className="decoder-vote-container">
        <h2 className="decoder-title">🔮 The Well of Lines</h2>
        <p className="decoder-subtitle">Choose a year — summon an echo!</p>

        <div className="year-options">
          {state.yearOptions.map((opt) => (
            <motion.button
              key={opt.year}
              className={`year-btn ${selectedYear === opt.year ? 'selected' : ''}`}
              onClick={() => castYearVote(opt.year)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {/* Cereal box thumbnail */}
              <div className="year-thumb">
                <img
                  src={`/images/ip-isle/${opt.thumbnail}`}
                  alt={opt.label}
                  loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
              <span className="year-number">{opt.year}</span>
              <span className="year-label">{opt.label.split(' — ')[1] || ''}</span>
              {selectedYear === opt.year && (
                <motion.span className="your-vote" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <TMPCheck size={16} /> Your pick
                </motion.span>
              )}
            </motion.button>
          ))}
        </div>

        {hasVotedYear && (
          <motion.p className="change-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            Changed your mind? Tap another year! 🔄
          </motion.p>
        )}
      </div>
    );
  }

  // ─── RENDER: Character reveal (watching) ───────────────────────────
  if (state.status === 'revealing-character') {
    return (
      <div className="decoder-vote-container">
        <div className="decoder-waiting">
          <h2>🔮 The Well is churning...</h2>
          {revealedChar && (
            <motion.div
              className="char-reveal-mini"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <img
                src={`/images/ip-isle/${revealedChar.image}`}
                alt={revealedChar.name}
                className="char-thumb"
              />
              <h3>{revealedChar.name}</h3>
              <p className="char-liner">{revealedChar.oneLiner}</p>
            </motion.div>
          )}
          {!revealedChar && <p>Watch the main screen!</p>}
        </div>
      </div>
    );
  }

  // ─── RENDER: Role voting ───────────────────────────────────────────
  if (state.status === 'voting-role' && revealedChar) {
    return (
      <div className="decoder-vote-container">
        <h2 className="decoder-title">🚢 Assign {revealedChar.name}</h2>
        <p className="decoder-subtitle">What role on the Crackle's Revenge?</p>

        <div className="role-options">
          {SHIP_ROLES.map((role) => (
            <motion.button
              key={role.id}
              className={`role-btn ${selectedRole === role.id ? 'selected' : ''} ${role.id === revealedChar.bestRole ? 'recommended' : ''}`}
              onClick={() => castRoleVote(role.id)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="role-emoji">{role.emoji}</span>
              <span className="role-name">{role.label}</span>
              <span className="role-desc">{role.shortDesc}</span>
              {role.id === revealedChar.bestRole && (
                <span className="best-fit-badge">★ Best Fit</span>
              )}
              {selectedRole === role.id && (
                <motion.span className="your-vote" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <TMPCheck size={14} />
                </motion.span>
              )}
            </motion.button>
          ))}
        </div>

        {hasVotedRole && (
          <motion.p className="change-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            Changed your mind? Tap another role! 🔄
          </motion.p>
        )}
      </div>
    );
  }

  // ─── RENDER: Revealing role / complete ─────────────────────────────
  if (state.status === 'revealing-role' || state.status === 'complete') {
    const winRole = SHIP_ROLES.find(r => r.id === state.winningRole);
    return (
      <div className="decoder-vote-container">
        <div className="decoder-waiting">
          <h2>{state.status === 'complete' ? '✅ Crew Updated!' : '🔮 Assigning role...'}</h2>
          {revealedChar && winRole && state.status === 'complete' && (
            <motion.div
              className="assignment-result"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <p><strong>{revealedChar.name}</strong></p>
              <p>{winRole.emoji} {winRole.label}</p>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  // ─── RENDER: Idle between spins ────────────────────────────────────
  return (
    <div className="decoder-vote-container">
      <div className="decoder-waiting">
        <h2>🔮 The Well of Lines</h2>
        <p>Spin {state.spinNumber} — waiting for the Well to activate...</p>
        {state.crew.length > 0 && (
          <div className="mini-crew">
            <h4>Crew so far:</h4>
            {state.crew.map(m => (
              <span key={m.characterId} className="crew-chip">
                {SHIP_ROLES.find(r => r.id === m.role)?.emoji} {m.characterName}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

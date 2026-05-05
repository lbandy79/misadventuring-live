/**
 * VoteSubmission — Reusable simple-vote primitive.
 *
 * Phase 3c extraction of the EncounterVote pattern: a list of options, one
 * vote-per-device tracked via localStorage(sessionId), live counts via
 * `votes/current-vote`, optional timer, fly-away particle on cast.
 *
 * Other show-specific vote surfaces (monster builder, decoder ring, ship
 * combat) intentionally do NOT use this — they have different mechanics
 * (sequential parts, multi-phase transactions, visitorId-keyed). They may
 * adopt sub-pieces later.
 *
 * Reads from votes/current-vote via useVoteTracking (Phase 2b hook).
 * Writes increments to votes/current-vote and stamps showId on the doc
 * so future server-side analytics can attribute votes to a show.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useVoteTracking } from '../../realtime';
import { playSound, initAudio } from '../../audio-fx';
import { TMPCheck } from '../../../components/icons/TMPIcons';
import type { VoteOption } from '../../types/interaction.types';
import './VoteSubmission.css';

const VOTE_DOC_ID = 'current-vote';

export interface VoteSubmissionProps {
  question?: string;
  options?: VoteOption[];
  isOpen?: boolean;
  /** Total seconds for the round (used with startedAt). */
  timer?: number;
  /** Epoch ms when the round started, for countdown calculation. */
  startedAt?: number;
  /** Round id — votes from previous sessions (different ids) are ignored. */
  sessionId?: string;
  /** Show id stamped on the vote doc when the user changes their vote. */
  showId?: string;
  /** Optional CSS class hook for theme-specific overrides. */
  className?: string;
}

// Layout color slots — supports up to 3 options.
const OPTION_COLORS = ['left', 'right', 'center'];

/** Spawn the "vote flies away" emoji particle on cast. */
function spawnVoteFlyAway(emoji: string): void {
  const particle = document.createElement('div');
  particle.textContent = emoji;
  particle.style.cssText =
    'position:fixed;font-size:3rem;z-index:10000;pointer-events:none;' +
    'top:50%;left:50%;transform:translate(-50%,-50%);';
  particle.classList.add('vote-fly-away');
  document.body.appendChild(particle);
  setTimeout(() => particle.remove(), 700);
}

export default function VoteSubmission({
  question,
  options,
  isOpen,
  timer,
  startedAt,
  sessionId,
  showId,
  className,
}: VoteSubmissionProps) {
  const { counts: votes, totalVotes, percentOf, isLoading } = useVoteTracking();
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const storageKey = sessionId ? `voted-${sessionId}` : `voted-${VOTE_DOC_ID}`;

  // Restore vote state when session changes.
  useEffect(() => {
    const voted = localStorage.getItem(storageKey);
    if (voted) {
      setHasVoted(true);
      setSelectedOption(voted);
    } else {
      setHasVoted(false);
      setSelectedOption(null);
    }
  }, [storageKey]);

  // Countdown with tick/buzz cues.
  const prevTimeRef = useRef<number | null>(null);
  useEffect(() => {
    if (!startedAt || !timer || !isOpen) {
      setTimeRemaining(null);
      return;
    }
    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(0, timer - elapsed);
      if (remaining <= 10 && remaining > 0 && remaining !== prevTimeRef.current) {
        playSound('tick');
      }
      if (remaining === 0 && prevTimeRef.current !== 0) {
        playSound('buzz');
      }
      prevTimeRef.current = remaining;
      setTimeRemaining(remaining);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startedAt, timer, isOpen]);

  const castVote = useCallback(
    async (optionId: string) => {
      if (!isOpen) return;
      initAudio();
      if (selectedOption === optionId) return;

      const opt = options?.find((o) => o.id === optionId);
      if (opt?.emoji) spawnVoteFlyAway(opt.emoji);

      try {
        const voteRef = doc(db, 'votes', VOTE_DOC_ID);
        // Stamp showId opportunistically so the doc carries provenance.
        const showStamp = showId ? { showId } : {};

        if (hasVoted && selectedOption) {
          await updateDoc(voteRef, {
            ...showStamp,
            [`counts.${selectedOption}`]: increment(-1),
            [`counts.${optionId}`]: increment(1),
          });
        } else {
          await updateDoc(voteRef, {
            ...showStamp,
            [`counts.${optionId}`]: increment(1),
            totalVotes: increment(1),
          });
        }

        playSound('vote');

        const audienceContainer = document.querySelector('.audience-container');
        if (audienceContainer) {
          audienceContainer.classList.add('vote-counted');
          setTimeout(() => audienceContainer.classList.remove('vote-counted'), 600);
        }

        localStorage.setItem(storageKey, optionId);
        setHasVoted(true);
        setSelectedOption(optionId);
      } catch (error) {
        console.error('Vote failed:', error);
        playSound('error');
        alert('Vote failed - please try again!');
      }
    },
    [hasVoted, isOpen, options, selectedOption, showId, storageKey]
  );

  // Even split before any votes are cast (matches v1 visual behavior).
  const getPercent = (optionId: string): number => {
    if (totalVotes === 0) return 100 / (options?.length || 2);
    return percentOf(optionId);
  };

  if (isLoading) {
    return (
      <div className={`vote-container ${className ?? ''}`}>
        <div className="loading">Loading...</div>
      </div>
    );
  }

  const votingClosed =
    !isOpen || (timeRemaining !== null && timeRemaining <= 0);

  return (
    <div className={`vote-container ${className ?? ''}`} ref={containerRef}>
      <h2>{question || 'What should the party do?'}</h2>

      {timeRemaining !== null && timeRemaining > 0 && (
        <motion.div
          className="timer"
          animate={{ scale: timeRemaining <= 10 ? [1, 1.1, 1] : 1 }}
          transition={{
            repeat: timeRemaining <= 10 ? Infinity : 0,
            duration: 1,
          }}
        >
          <span className={timeRemaining <= 10 ? 'urgent' : ''}>
            {Math.floor(timeRemaining / 60)}:
            {(timeRemaining % 60).toString().padStart(2, '0')}
          </span>
        </motion.div>
      )}

      {votingClosed && !hasVoted && (
        <div className="voting-closed-banner">Voting has ended</div>
      )}

      <div
        className={`vote-options ${
          options?.length === 3 ? 'three-options' : ''
        }`}
      >
        {options?.map((option, index) => (
          <motion.button
            key={option.id}
            className={`vote-btn ${OPTION_COLORS[index]} ${
              selectedOption === option.id ? 'selected' : ''
            } ${votingClosed ? 'disabled' : ''}`}
            onClick={() => !votingClosed && castVote(option.id)}
            whileHover={!votingClosed ? { scale: 1.03 } : {}}
            whileTap={!votingClosed ? { scale: 0.97 } : {}}
            aria-disabled={votingClosed}
          >
            <span className="emoji">{option.emoji}</span>
            <span className="label">{option.label}</span>
            {hasVoted && (
              <motion.span
                className="count"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {votes[option.id] || 0} votes
              </motion.span>
            )}
            {selectedOption === option.id && (
              <motion.span
                className="your-vote"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              >
                <TMPCheck size={18} /> Your vote
              </motion.span>
            )}
          </motion.button>
        ))}
      </div>

      <div className="results-bar">
        {options?.map((option, index) => (
          <motion.div
            key={option.id}
            className={`bar-fill ${OPTION_COLORS[index]}`}
            initial={{ width: `${100 / (options?.length || 2)}%` }}
            animate={{ width: `${getPercent(option.id)}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          >
            {getPercent(option.id) > 15 && (
              <span className="bar-label">
                {Math.round(getPercent(option.id))}%
              </span>
            )}
          </motion.div>
        ))}
      </div>

      <p className="total-votes">
        {totalVotes} adventurer{totalVotes !== 1 ? 's have' : ' has'} voted
      </p>

      <AnimatePresence>
        {hasVoted && !votingClosed && (
          <motion.p
            className="voted-message"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            Changed your mind? Tap another option! 🔄
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

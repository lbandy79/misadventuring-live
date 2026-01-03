import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { playSound, initAudio } from '../utils/sounds';
import { TMPCheck } from './icons/TMPIcons';
import './EncounterVote.css';

const VOTE_DOC_ID = 'current-vote';

interface VoteOption {
  id: string;
  label: string;
  emoji: string;
}

interface VoteConfig {
  question?: string;
  options?: VoteOption[];
  isOpen?: boolean;
  timer?: number;
  startedAt?: number;
  sessionId?: string; // Unique ID for this voting session
}

interface EncounterVoteProps {
  config: VoteConfig;
}

export default function EncounterVote({ config }: EncounterVoteProps) {
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { question, options, isOpen, timer, startedAt, sessionId } = config || {};
  
  // Generate storage key based on session ID to prevent stale votes
  const storageKey = sessionId ? `voted-${sessionId}` : `voted-${VOTE_DOC_ID}`;

  // 🚀 Spawn flying vote particle for "votes fly to screen" illusion
  const spawnVoteFlyAway = (optionId: string) => {
    const option = options?.find(o => o.id === optionId);
    if (!option || !containerRef.current) return;
    
    // Create a particle element
    const particle = document.createElement('div');
    particle.textContent = option.emoji;
    particle.style.cssText = `
      position: fixed;
      font-size: 3rem;
      z-index: 10000;
      pointer-events: none;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    `;
    
    // Add our fly-away animation class
    particle.classList.add('vote-fly-away');
    
    document.body.appendChild(particle);
    
    // Remove after animation completes
    setTimeout(() => particle.remove(), 700);
  };

  // Listen for real-time vote updates
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'votes', VOTE_DOC_ID),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setVotes(data.counts || {});
        }
        setIsLoading(false);
      },
      (error) => {
        console.error('Vote listener error:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Check if user already voted THIS session (reset when session changes)
  useEffect(() => {
    const voted = localStorage.getItem(storageKey);
    if (voted) {
      setHasVoted(true);
      setSelectedOption(voted);
    } else {
      // New session - reset vote state
      setHasVoted(false);
      setSelectedOption(null);
    }
  }, [storageKey]);

  // Track previous time for sound effects
  const prevTimeRef = useRef<number | null>(null);

  // Countdown timer with sound effects
  useEffect(() => {
    if (!startedAt || !timer || !isOpen) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(0, timer - elapsed);
      
      // Play tick sound in last 10 seconds
      if (remaining <= 10 && remaining > 0 && remaining !== prevTimeRef.current) {
        playSound('tick');
      }
      
      // Play buzz when time's up
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

  const castVote = useCallback(async (optionId: string) => {
    if (!isOpen) return;
    
    // Initialize audio on first interaction
    initAudio();
    
    // If clicking the same option, do nothing
    if (selectedOption === optionId) return;

    // 🚀 Spawn fly-away particle for visual feedback
    spawnVoteFlyAway(optionId);

    try {
      const voteRef = doc(db, 'votes', VOTE_DOC_ID);
      
      if (hasVoted && selectedOption) {
        // Changing vote: decrement old, increment new
        await updateDoc(voteRef, {
          [`counts.${selectedOption}`]: increment(-1),
          [`counts.${optionId}`]: increment(1)
        });
      } else {
        // First vote
        await updateDoc(voteRef, {
          [`counts.${optionId}`]: increment(1),
          totalVotes: increment(1)
        });
      }

      // Play satisfying vote sound!
      playSound('vote');

      localStorage.setItem(storageKey, optionId);
      setHasVoted(true);
      setSelectedOption(optionId);
    } catch (error) {
      console.error('Vote failed:', error);
      playSound('error');
      alert('Vote failed - please try again!');
    }
  }, [hasVoted, isOpen, selectedOption, storageKey]);

  // Calculate percentages
  const totalVotes = Object.values(votes).reduce((sum, count) => sum + count, 0);
  const getPercent = (optionId: string): number => {
    if (totalVotes === 0) return 100 / (options?.length || 2);
    return ((votes[optionId] || 0) / totalVotes) * 100;
  };

  // Color assignments for options
  const optionColors = ['left', 'right', 'center'];

  if (isLoading) {
    return <div className="vote-container"><div className="loading">Loading...</div></div>;
  }

  const votingClosed = !isOpen || (timeRemaining !== null && timeRemaining <= 0);

  return (
    <div className="vote-container" ref={containerRef}>
      <h2>{question || 'What should the party do?'}</h2>
      
      {/* Timer */}
      {timeRemaining !== null && timeRemaining > 0 && (
        <motion.div 
          className="timer"
          animate={{ scale: timeRemaining <= 10 ? [1, 1.1, 1] : 1 }}
          transition={{ repeat: timeRemaining <= 10 ? Infinity : 0, duration: 1 }}
        >
          <span className={timeRemaining <= 10 ? 'urgent' : ''}>
            {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
          </span>
        </motion.div>
      )}

      {votingClosed && !hasVoted && (
        <div className="voting-closed-banner">Voting has ended</div>
      )}
      
      <div className={`vote-options ${options?.length === 3 ? 'three-options' : ''}`}>
        {options?.map((option, index) => (
          <motion.button
            key={option.id}
            className={`vote-btn ${optionColors[index]} ${selectedOption === option.id ? 'selected' : ''} ${votingClosed ? 'disabled' : ''}`}
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

      {/* Live results bar */}
      <div className="results-bar">
        {options?.map((option, index) => (
          <motion.div 
            key={option.id}
            className={`bar-fill ${optionColors[index]}`}
            initial={{ width: `${100 / (options?.length || 2)}%` }}
            animate={{ width: `${getPercent(option.id)}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          >
            {getPercent(option.id) > 15 && (
              <span className="bar-label">{Math.round(getPercent(option.id))}%</span>
            )}
          </motion.div>
        ))}
      </div>

      <p className="total-votes">{totalVotes} adventurer{totalVotes !== 1 ? 's have' : ' has'} voted</p>

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

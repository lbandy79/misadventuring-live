/**
 * MonsterVote - Audience voting component for monster assembly
 * 
 * Sequential 4-part voting system where audience votes on head, torso, arms, legs.
 * Similar to EncounterVote but tracks progress through parts.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { playSound, initAudio } from '../utils/sounds';
import { TMPCheck } from './icons/TMPIcons';
import type { MonsterPartCategory, MonsterPartOption, MonsterVoteState } from '../types/monster.types';
import { PART_ORDER } from '../types/monster.types';
import './MonsterVote.css';

interface MonsterVoteConfig {
  currentPart: MonsterPartCategory;
  partIndex: number;
  question: string;
  options: MonsterPartOption[];
  isOpen: boolean;
  timer: number;
  startedAt?: number;
  sessionId: string;
}

interface MonsterVoteProps {
  config: MonsterVoteConfig;
}

export default function MonsterVote({ config }: MonsterVoteProps) {
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [completedParts, setCompletedParts] = useState<MonsterVoteState['winners']>({});
  const containerRef = useRef<HTMLDivElement>(null);

  const { currentPart, partIndex, question, options, isOpen, timer, startedAt, sessionId } = config;
  
  // Storage key unique to this part + session
  const storageKey = `monster-vote-${sessionId}-${currentPart}`;

  // Spawn flying vote particle
  const spawnVoteFlyAway = (optionId: string) => {
    const option = options?.find(o => o.id === optionId);
    if (!option || !containerRef.current) return;
    
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
    particle.classList.add('vote-fly-away');
    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 700);
  };

  // Listen for real-time vote updates for current part
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'monster-vote', 'current'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as MonsterVoteState;
          // Get votes for current part
          const partVotes = data.votes?.[currentPart] || {};
          setVotes(partVotes);
          // Track which parts are complete
          setCompletedParts(data.winners || {});
        }
        setIsLoading(false);
      },
      (error) => {
        console.error('Monster vote listener error:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentPart]);

  // Check if user already voted this part
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

  // Countdown timer
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

  const castVote = useCallback(async (optionId: string) => {
    if (!isOpen) return;
    
    initAudio();
    
    if (selectedOption === optionId) return;

    spawnVoteFlyAway(optionId);

    try {
      const voteRef = doc(db, 'monster-vote', 'current');
      
      if (hasVoted && selectedOption) {
        // Changing vote
        await updateDoc(voteRef, {
          [`votes.${currentPart}.${selectedOption}`]: increment(-1),
          [`votes.${currentPart}.${optionId}`]: increment(1)
        });
      } else {
        // First vote
        await updateDoc(voteRef, {
          [`votes.${currentPart}.${optionId}`]: increment(1)
        });
      }

      playSound('vote');
      localStorage.setItem(storageKey, optionId);
      setHasVoted(true);
      setSelectedOption(optionId);
    } catch (error) {
      console.error('Monster vote failed:', error);
      playSound('error');
      alert('Vote failed - please try again!');
    }
  }, [hasVoted, isOpen, selectedOption, storageKey, currentPart]);

  // Calculate percentages
  const totalVotes = Object.values(votes).reduce((sum, count) => sum + count, 0);
  const getPercent = (optionId: string): number => {
    if (totalVotes === 0) return 100 / (options?.length || 4);
    return ((votes[optionId] || 0) / totalVotes) * 100;
  };

  const optionColors = ['left', 'right', 'center', 'fourth'];

  if (isLoading) {
    return <div className="monster-vote-container"><div className="loading">Loading...</div></div>;
  }

  const votingClosed = !isOpen || (timeRemaining !== null && timeRemaining <= 0);
  
  // Part labels with emojis
  const partLabels: Record<MonsterPartCategory, string> = {
    head: '🧠 Head',
    torso: '💪 Body',
    arms: '🦾 Arms',
    legs: '🦿 Legs'
  };

  return (
    <div className="monster-vote-container" ref={containerRef}>
      {/* Progress indicator */}
      <div className="monster-progress">
        {PART_ORDER.map((part, idx) => (
          <div 
            key={part}
            className={`progress-step ${idx < partIndex ? 'completed' : ''} ${idx === partIndex ? 'active' : ''}`}
          >
            <span className="step-emoji">
              {idx < partIndex ? '✅' : partLabels[part].split(' ')[0]}
            </span>
            <span className="step-label">{part}</span>
            {completedParts[part] && (
              <span className="step-winner">{completedParts[part]}</span>
            )}
          </div>
        ))}
      </div>

      <h2 className="monster-question">
        <span className="part-badge">{partLabels[currentPart]}</span>
        {question}
      </h2>
      
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
        <div className="voting-closed-banner">Voting has ended for this part</div>
      )}
      
      <div className="monster-vote-options">
        {options?.map((option, index) => (
          <motion.button
            key={option.id}
            className={`monster-vote-btn ${optionColors[index]} ${selectedOption === option.id ? 'selected' : ''} ${votingClosed ? 'disabled' : ''}`}
            onClick={() => !votingClosed && castVote(option.id)}
            whileHover={!votingClosed ? { scale: 1.05 } : {}}
            whileTap={!votingClosed ? { scale: 0.95 } : {}}
            aria-disabled={votingClosed}
          >
            <span className="emoji">{option.emoji}</span>
            <span className="label">{option.label}</span>
            {option.description && (
              <span className="description">{option.description}</span>
            )}
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
            initial={{ width: '25%' }}
            animate={{ width: `${getPercent(option.id)}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          >
            {getPercent(option.id) > 12 && (
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

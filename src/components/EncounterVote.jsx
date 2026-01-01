import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import './EncounterVote.css';

const VOTE_DOC_ID = 'current-vote';

export default function EncounterVote({ config }) {
  const [votes, setVotes] = useState({});
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(null);

  const { question, options, isOpen, timer, startedAt } = config || {};

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

    // Check if user already voted this session
    const voted = localStorage.getItem(`voted-${VOTE_DOC_ID}`);
    if (voted) {
      setHasVoted(true);
      setSelectedOption(voted);
    }

    return () => unsubscribe();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!startedAt || !timer || !isOpen) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(0, timer - elapsed);
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startedAt, timer, isOpen]);

  const castVote = useCallback(async (optionId) => {
    if (hasVoted || !isOpen) return;

    try {
      const voteRef = doc(db, 'votes', VOTE_DOC_ID);
      await updateDoc(voteRef, {
        [`counts.${optionId}`]: increment(1),
        totalVotes: increment(1)
      });

      localStorage.setItem(`voted-${VOTE_DOC_ID}`, optionId);
      setHasVoted(true);
      setSelectedOption(optionId);
    } catch (error) {
      console.error('Vote failed:', error);
      alert('Vote failed - please try again!');
    }
  }, [hasVoted, isOpen]);

  // Calculate percentages
  const totalVotes = Object.values(votes).reduce((sum, count) => sum + count, 0);
  const getPercent = (optionId) => {
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
    <div className="vote-container">
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
            className={`vote-btn ${optionColors[index]} ${hasVoted ? 'disabled' : ''} ${selectedOption === option.id ? 'selected' : ''}`}
            onClick={() => castVote(option.id)}
            whileHover={!hasVoted && isOpen ? { scale: 1.03 } : {}}
            whileTap={!hasVoted && isOpen ? { scale: 0.97 } : {}}
            disabled={hasVoted || votingClosed}
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
                ✓ Your vote
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
            initial={{ width: `${100 / options.length}%` }}
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
        {hasVoted && (
          <motion.p 
            className="voted-message"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            Your voice has been heard! ✨
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

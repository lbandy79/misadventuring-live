import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { useTheme } from '../themes';
import { playSound, initAudio } from '../utils/sounds';
import './DisplayView.css';

interface VoteOption {
  id: string;
  label: string;
  emoji: string;
}

interface ActiveInteraction {
  type: 'none' | 'vote' | 'madlibs' | 'npc-naming' | 'group-roll';
  question?: string;
  options?: VoteOption[];
  isOpen?: boolean;
  timer?: number;
  startedAt?: number;
}

interface VotesData {
  counts?: Record<string, number>;
  totalVotes?: number;
}

export default function DisplayView() {
  const [activeInteraction, setActiveInteraction] = useState<ActiveInteraction>({ type: 'none' });
  const [votes, setVotes] = useState<VotesData>({});
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [debugInfo, setDebugInfo] = useState('Connecting...');
  useTheme(); 
  
  // Track previous state for sound triggers
  const prevInteractionRef = useRef<ActiveInteraction>({ type: 'none' });
  const prevVotesRef = useRef<number>(0);

  // Initialize audio on first click (required by browsers)
  const handleEnableSound = () => {
    initAudio();
    setSoundEnabled(true);
  };

  // Listen to active interaction with sound effects
  useEffect(() => {
    console.log('DisplayView: Setting up listener for active-interaction');
    const unsubscribe = onSnapshot(
      doc(db, 'config', 'active-interaction'),
      (snapshot) => {
        console.log('DisplayView: Got snapshot', snapshot.exists(), snapshot.data());
        if (snapshot.exists()) {
          const newInteraction = snapshot.data() as ActiveInteraction;
          
          // Play whoosh when new interaction starts
          if (newInteraction.type !== 'none' && prevInteractionRef.current.type === 'none') {
            playSound('whoosh');
          }
          
          // Play chime when voting closes
          if (prevInteractionRef.current.isOpen && !newInteraction.isOpen && newInteraction.type === 'vote') {
            playSound('chime');
          }
          
          prevInteractionRef.current = newInteraction;
          setActiveInteraction(newInteraction);
          setDebugInfo(`Type: ${snapshot.data().type}`);
        } else {
          setActiveInteraction({ type: 'none' });
          setDebugInfo('No active interaction doc');
        }
      },
      (error) => {
        console.error('DisplayView: Listener error', error);
        setDebugInfo(`Error: ${error.message}`);
      }
    );
    return () => unsubscribe();
  }, []);

  // Listen to votes with sound effects
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'votes', 'current-vote'),
      (snapshot) => {
        if (snapshot.exists()) {
          const newVotes = snapshot.data() as VotesData;
          
          // Play subtle tick when votes come in (on display only)
          if (newVotes.totalVotes && newVotes.totalVotes > prevVotesRef.current) {
            // Soft tick for each new vote on the display
            playSound('tick');
          }
          
          prevVotesRef.current = newVotes.totalVotes || 0;
          setVotes(newVotes);
        }
      }
    );
    return () => unsubscribe();
  }, []);

  // Calculate vote percentages
  const totalVotes = votes.totalVotes || 0;
  const getPercent = (optionId: string): number => {
    if (totalVotes === 0) return 0;
    return ((votes.counts?.[optionId] || 0) / totalVotes) * 100;
  };

  // Find the winner
  const getWinner = (): VoteOption | null => {
    if (!activeInteraction.options || totalVotes === 0) return null;
    let maxVotes = 0;
    let winner: VoteOption | null = null;
    activeInteraction.options.forEach(opt => {
      const count = votes.counts?.[opt.id] || 0;
      if (count > maxVotes) {
        maxVotes = count;
        winner = opt;
      }
    });
    return winner;
  };

  return (
    <div className="display-container">
      {/* Debug info - remove in production */}
      <div style={{ position: 'absolute', top: '1rem', left: '1rem', color: '#666', fontSize: '0.8rem', zIndex: 100 }}>
        {debugInfo} | Active: {activeInteraction.type}
      </div>

      {/* Sound toggle - small, corner */}
      <button 
        className="sound-toggle"
        onClick={handleEnableSound}
        title={soundEnabled ? 'Sound enabled' : 'Click to enable sound'}
      >
        {soundEnabled ? '🔊' : '🔇'}
      </button>

      <AnimatePresence mode="wait">
        {/* Idle State */}
        {activeInteraction.type === 'none' && (
          <motion.div 
            className="idle-state"
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="idle-content">
              <motion.div 
                className="logo-container"
                animate={{ 
                  y: [0, -10, 0],
                  filter: ['drop-shadow(0 0 20px var(--accent-muted))', 'drop-shadow(0 0 40px var(--accent-muted))', 'drop-shadow(0 0 20px var(--accent-muted))']
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <h1>The Misadventuring Party</h1>
              </motion.div>
              <p className="join-prompt">Join the adventure</p>
              <div className="url-display">play.misadventuringparty.com</div>
            </div>
          </motion.div>
        )}

        {/* Voting Active */}
        {activeInteraction.type === 'vote' && (
          <motion.div 
            className="vote-display"
            key="vote"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <motion.h2 
              className="vote-question"
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {activeInteraction.question}
            </motion.h2>

            {/* Vote count */}
            <motion.div 
              className="vote-count"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: 'spring' }}
            >
              <span className="count-number">{totalVotes}</span>
              <span className="count-label">votes cast</span>
            </motion.div>

            {/* Giant tug-of-war bar */}
            <div className="display-results-bar">
              {activeInteraction.options?.map((option, index) => {
                const percent = getPercent(option.id);
                const colors = ['bar-a', 'bar-b', 'bar-c'];
                return (
                  <motion.div
                    key={option.id}
                    className={`display-bar-segment ${colors[index]}`}
                    initial={{ width: `${100 / (activeInteraction.options?.length || 2)}%` }}
                    animate={{ width: `${Math.max(percent, 5)}%` }}
                    transition={{ type: 'spring', stiffness: 50, damping: 15 }}
                  >
                    <div className="segment-content">
                      <span className="segment-emoji">{option.emoji}</span>
                      <span className="segment-label">{option.label}</span>
                      <span className="segment-percent">{Math.round(percent)}%</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Voting status */}
            <motion.div 
              className={`voting-status ${activeInteraction.isOpen ? 'open' : 'closed'}`}
              animate={activeInteraction.isOpen ? { scale: [1, 1.05, 1] } : {}}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              {activeInteraction.isOpen ? '⚡ VOTING OPEN ⚡' : '🏁 VOTING CLOSED'}
            </motion.div>

            {/* Winner announcement when closed */}
            {!activeInteraction.isOpen && totalVotes > 0 && (
              <motion.div 
                className="winner-announcement"
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 10, delay: 0.5 }}
              >
                <span className="winner-emoji">{getWinner()?.emoji}</span>
                <span className="winner-text">{getWinner()?.label}</span>
                <span className="winner-subtitle">THE PEOPLE HAVE SPOKEN</span>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Placeholder for other interaction types */}
        {activeInteraction.type === 'madlibs' && (
          <motion.div className="coming-soon-display" key="madlibs">
            <h2>📜 Madlibs Reveal Coming Soon</h2>
          </motion.div>
        )}

        {activeInteraction.type === 'group-roll' && (
          <motion.div className="coming-soon-display" key="roll">
            <h2>🎲 Group Roll Animation Coming Soon</h2>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

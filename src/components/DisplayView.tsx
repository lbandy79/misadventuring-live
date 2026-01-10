import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { useTheme, ThemeLogo } from '../themes';
import { ThemeIcon } from '../themes/ThemeAssets';
import { audioMixer, initAudio } from '../utils/audioMixer';
import { initConfetti, destroyConfetti } from '../utils/confetti';
import { useCueListener } from '../hooks';
import { TMPSoundOn, TMPSoundOff, TMPVotingClosed } from './icons/TMPIcons';
import DiceRollerDisplay from './DiceRollerDisplay';
import VoteParticlesSimple, { useVoteParticles } from './VoteParticlesSimple';
import WinnerBanner from './WinnerBanner';
import IdleDisplay from './IdleDisplay';
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
  const [isShaking, setIsShaking] = useState(false);
  const [showWinnerReveal, setShowWinnerReveal] = useState(false);
  const { theme } = useTheme(); 
  
  // Listen for GM-triggered cues from Firebase (synced effects across all displays)
  useCueListener();
  
  // Vote particles system
  const { emitVoteParticle } = useVoteParticles();
  const prevVoteCountsRef = useRef<Record<string, number>>({});
  
  // Track previous state for sound triggers
  const prevInteractionRef = useRef<ActiveInteraction>({ type: 'none' });
  const prevVotesRef = useRef<number>(0);

  // Initialize confetti on mount
  useEffect(() => {
    initConfetti();
    return () => destroyConfetti();
  }, []);

  // Initialize audio on first click (required by browsers)
  const handleEnableSound = () => {
    initAudio();
    audioMixer.init();
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
            audioMixer.play('whoosh');
            setShowWinnerReveal(false); // Reset winner reveal for new interaction
          }
          
          // 🎉 THE BIG MOMENT: Voting closes - trigger celebration!
          if (prevInteractionRef.current.isOpen && !newInteraction.isOpen && newInteraction.type === 'vote') {
            audioMixer.play('uiClick');
            
            // Screen shake for impact
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 800);
            
            // Dramatic reveal timing - WinnerBanner handles confetti & sound
            setTimeout(() => {
              setShowWinnerReveal(true);
            }, 600);
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

  // Listen to votes with sound effects and particle emission
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'votes', 'current-vote'),
      (snapshot) => {
        if (snapshot.exists()) {
          const newVotes = snapshot.data() as VotesData;
          const newCounts = newVotes.counts || {};
          
          console.log('📊 Vote update:', { 
            total: newVotes.totalVotes, 
            prevTotal: prevVotesRef.current,
            counts: newCounts,
            prevCounts: prevVoteCountsRef.current 
          });
          
          // Play subtle tick when total votes increase (new voter)
          if (newVotes.totalVotes && newVotes.totalVotes > prevVotesRef.current) {
            audioMixer.play('timerTick', { volume: 0.3 });
          }
          
          // Emit particles for each option that gained votes
          // This works for both new votes AND revotes (changing your vote)
          Object.keys(newCounts).forEach(optionId => {
            const prevCount = prevVoteCountsRef.current[optionId] || 0;
            const newCount = newCounts[optionId] || 0;
            const diff = newCount - prevCount;
            
            console.log(`🗳️ Option ${optionId}: ${prevCount} → ${newCount} (diff: ${diff})`);
            
            if (diff > 0) {
              // Emit particles for new votes (max 5 at once to avoid overload)
              const particleCount = Math.min(diff, 5);
              console.log(`🎯 Emitting ${particleCount} particles for option ${optionId}`);
              for (let i = 0; i < particleCount; i++) {
                setTimeout(() => emitVoteParticle(optionId, 1), i * 100);
              }
            }
          });
          
          prevVoteCountsRef.current = { ...newCounts };
          prevVotesRef.current = newVotes.totalVotes || 0;
          setVotes(newVotes);
        }
      }
    );
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Don't depend on emitVoteParticle - it reads from window at call time

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
    <div className={`display-container crt-overlay ${isShaking ? 'shake-intense' : ''}`}>
      {/* Vote Particles Layer - Simple DOM version */}
      <VoteParticlesSimple enabled={activeInteraction.type === 'vote'} />

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
        {soundEnabled ? <TMPSoundOn size={28} /> : <TMPSoundOff size={28} />}
      </button>

      <AnimatePresence mode="wait">
        {/* Idle State - QR Code & CTA */}
        {activeInteraction.type === 'none' && (
          <motion.div 
            className="idle-state"
            key="idle"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            {/* QR Idle Display with themed logo */}
            <IdleDisplay 
              themeKey={theme.id}
              logo={<ThemeLogo size={180} />}
              url="https://play.themisadventuringparty.com"
            />
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

            {/* Vote Option Cards - positioned above the bar */}
            <div className="vote-option-cards">
              {activeInteraction.options?.map((option, index) => {
                const percent = getPercent(option.id);
                const colors = ['option-a', 'option-b', 'option-c'];
                const iconKeys = ['optionA', 'optionB', 'optionC'];
                const hasThemeIcon = theme.assets?.voteIcons?.[iconKeys[index]];
                return (
                  <motion.div
                    key={option.id}
                    className={`vote-option-card ${colors[index]}`}
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                  >
                    <div className="option-icon">
                      {hasThemeIcon ? (
                        <ThemeIcon iconKey={iconKeys[index]} size={64} />
                      ) : (
                        <span className="option-emoji">{option.emoji}</span>
                      )}
                    </div>
                    <span className="option-label">{option.label}</span>
                    <span className="option-percent">{Math.round(percent)}%</span>
                  </motion.div>
                );
              })}
            </div>

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
                  />
                );
              })}
            </div>

            {/* Voting status */}
            <motion.div 
              className={`voting-status ${activeInteraction.isOpen ? 'open' : 'closed'}`}
              data-text={activeInteraction.isOpen ? 'VOTING OPEN' : 'VOTING CLOSED'}
              animate={activeInteraction.isOpen ? { scale: [1, 1.02, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              {activeInteraction.isOpen ? (
                <>
                  <span className="status-indicator" />
                  VOTING OPEN
                </>
              ) : (
                <><TMPVotingClosed size={32} /> VOTING CLOSED</>
              )}
            </motion.div>

            {/* 🏆 WINNER ANNOUNCEMENT - GSAP Animated Theme Banner! */}
            <WinnerBanner
              show={!activeInteraction.isOpen && totalVotes > 0 && showWinnerReveal}
              winner={getWinner()?.label || ''}
              winnerId={getWinner()?.id}
              percentage={getWinner() ? getPercent(getWinner()!.id) : 0}
              onAnimationComplete={() => {
                // Auto-hide after 5 seconds
                setTimeout(() => setShowWinnerReveal(false), 5000);
              }}
            />
          </motion.div>
        )}

        {/* Placeholder for other interaction types */}
        {activeInteraction.type === 'madlibs' && (
          <motion.div className="coming-soon-display" key="madlibs">
            <h2>📜 Madlibs Reveal Coming Soon</h2>
          </motion.div>
        )}

        {activeInteraction.type === 'group-roll' && (
          <DiceRollerDisplay key="roll" />
        )}
      </AnimatePresence>
    </div>
  );
}

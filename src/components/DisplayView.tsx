import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { useTheme, ThemeLogo } from '../themes';
import { ThemeIcon } from '../themes/ThemeAssets';
import { audioMixer, initAudio } from '../utils/audioMixer';
import { initConfetti, destroyConfetti, celebrateWinner } from '../utils/confetti';
import { useCueListener } from '../hooks';
import { TMPSoundOn, TMPSoundOff, TMPVotingClosed } from './icons/TMPIcons';
import DiceRollerDisplay from './DiceRollerDisplay';
import VoteParticlesSimple, { useVoteParticles } from './VoteParticlesSimple';
import WinnerBanner from './WinnerBanner';
import IdleDisplay from './IdleDisplay';
import MonsterReveal from './MonsterReveal';
import QRCode from './QRCode';
import MonsterBuilderDisplay from './MonsterBuilderDisplay';
import VillagerDisplay from './VillagerDisplay';
import DecoderRingDisplay from './DecoderRingDisplay';
import ShipCombatDisplay from './ShipCombatDisplay';
import Madlibs from './Madlibs';
import NpcNaming from './NpcNaming';
import DisplayErrorBoundary from './display/DisplayErrorBoundary';
import NpcArrivalToast from './display/NpcArrivalToast';
import NpcSpotlight, { SpotlightNpc } from './display/NpcSpotlight';
import './DisplayView.css';

interface VoteOption {
  id: string;
  label: string;
  emoji: string;
}

interface ActiveInteraction {
  type: 'none' | 'vote' | 'madlibs' | 'npc-naming' | 'group-roll' | 'monster-vote' | 'villager-submit' | 'monster-builder' | 'decoder-ring' | 'ship-combat' | 'npc-spotlight';
  question?: string;
  options?: VoteOption[];
  isOpen?: boolean;
  timer?: number;
  startedAt?: number;
  currentPart?: string;
  partIndex?: number;
  status?: string;
  // NPC Spotlight fields (multi-NPC)
  spotlightNpcs?: SpotlightNpc[];
  // Legacy single-NPC fields (backwards compat)
  npcId?: string;
  npcName?: string;
  npcOccupation?: string;
  npcAppearance?: string;
}

interface VotesData {
  counts?: Record<string, number>;
  totalVotes?: number;
}

export default function DisplayView() {
  const hideBar = new URLSearchParams(window.location.search).get('hideBar') === 'true';
  const [activeInteraction, setActiveInteraction] = useState<ActiveInteraction>({ type: 'none' });
  const [votes, setVotes] = useState<VotesData>({});
  const [soundEnabled, setSoundEnabled] = useState(false);  // Audio locked until user gesture
  const [audioUnlocked, setAudioUnlocked] = useState(false);  // Shows unlock overlay
  const [isShaking, setIsShaking] = useState(false);
  const [showWinnerReveal, setShowWinnerReveal] = useState(false);
  const [builderData, setBuilderData] = useState<{ status?: string } | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isSurging, setIsSurging] = useState(false);
  const [milestoneReached, setMilestoneReached] = useState<number | null>(null);
  const [isTie, setIsTie] = useState(false);
  const { theme } = useTheme(); 
  
  // Listen for GM-triggered cues from Firebase (synced effects across all displays)
  useCueListener();
  
  // Vote particles system
  const { emitVoteParticle } = useVoteParticles();
  const prevVoteCountsRef = useRef<Record<string, number>>({});
  
  // Track previous state for sound triggers
  const prevInteractionRef = useRef<ActiveInteraction>({ type: 'none' });
  const prevVotesRef = useRef<number>(0);
  
  // Track vote velocity for "surging" indicator
  const voteTimestampsRef = useRef<number[]>([]);
  const milestonesHitRef = useRef<Set<number>>(new Set());

  // Initialize confetti on mount
  useEffect(() => {
    initConfetti();
    return () => destroyConfetti();
  }, []);

  // Listen to monster-builder state for QR visibility
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'monster-builder', 'current'),
      (snapshot) => {
        if (snapshot.exists()) {
          setBuilderData({ status: snapshot.data().status });
        }
      }
    );
    return () => unsubscribe();
  }, []);

  // Initialize audio on first click (required by browsers)
  const handleEnableSound = () => {
    initAudio();
    audioMixer.init();
    setSoundEnabled(true);
    setAudioUnlocked(true);
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
            setIsTie(false);
            // Reset milestones for new interaction
            milestonesHitRef.current.clear();
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
        } else {
          setActiveInteraction({ type: 'none' });
        }
      },
      (error) => {
        console.error('DisplayView: Listener error', error);
      }
    );
    return () => unsubscribe();
  }, []);

  // Listen to votes with sound effects, particle emission, velocity tracking, and milestones
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'votes', 'current-vote'),
      (snapshot) => {
        if (snapshot.exists()) {
          const newVotes = snapshot.data() as VotesData;
          const newCounts = newVotes.counts || {};
          const newTotal = newVotes.totalVotes || 0;
          
          console.log('📊 Vote update:', { 
            total: newTotal, 
            prevTotal: prevVotesRef.current,
            counts: newCounts,
            prevCounts: prevVoteCountsRef.current 
          });
          
          // Play subtle tick when total votes increase (new voter)
          if (newTotal > prevVotesRef.current) {
            audioMixer.play('timerTick', { volume: 0.3 });
            
            // Track vote timestamps for velocity detection
            const now = Date.now();
            voteTimestampsRef.current.push(now);
            // Keep only last 10 seconds of timestamps
            voteTimestampsRef.current = voteTimestampsRef.current.filter(t => now - t < 10000);
            
            // Check velocity: if more than 8 votes in last 10 seconds, we're surging!
            const recentVotes = voteTimestampsRef.current.length;
            if (recentVotes >= 8 && !isSurging) {
              setIsSurging(true);
              // Auto-clear surging after 3 seconds of no new surge
              setTimeout(() => setIsSurging(false), 3000);
            }
            
            // Check milestones (25 and 50 for 50-100 person venue)
            const milestones = [25, 50];
            milestones.forEach(milestone => {
              if (newTotal >= milestone && !milestonesHitRef.current.has(milestone)) {
                milestonesHitRef.current.add(milestone);
                setMilestoneReached(milestone);
                // Trigger confetti for milestone
                celebrateWinner();
                // Clear milestone display after 2.5 seconds
                setTimeout(() => setMilestoneReached(null), 2500);
              }
            });
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
          prevVotesRef.current = newTotal;
          setVotes(newVotes);
        }
      }
    );
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSurging]); // Include isSurging to properly update state

  // Countdown timer for voting
  useEffect(() => {
    const { timer, startedAt, isOpen } = activeInteraction;
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
  }, [activeInteraction]);

  // Calculate vote percentages
  const totalVotes = votes.totalVotes || 0;
  const getPercent = (optionId: string): number => {
    if (totalVotes === 0) return 0;
    return ((votes.counts?.[optionId] || 0) / totalVotes) * 100;
  };

  // Find the winner (returns null if tie)
  const getWinner = (): VoteOption | null => {
    if (!activeInteraction.options || totalVotes === 0) return null;
    
    // Find max votes and count how many options have that count
    let maxVotes = 0;
    activeInteraction.options.forEach(opt => {
      const count = votes.counts?.[opt.id] || 0;
      if (count > maxVotes) maxVotes = count;
    });
    
    const winners = activeInteraction.options.filter(
      opt => (votes.counts?.[opt.id] || 0) === maxVotes
    );
    
    // If more than one option has max votes, it's a tie
    if (winners.length > 1 && maxVotes > 0) {
      return null; // Tie - no single winner
    }
    
    return winners[0] || null;
  };

  // Check if there's a tie (for tie-breaker display)
  const checkForTie = (): boolean => {
    if (!activeInteraction.options || totalVotes === 0) return false;
    
    let maxVotes = 0;
    activeInteraction.options.forEach(opt => {
      const count = votes.counts?.[opt.id] || 0;
      if (count > maxVotes) maxVotes = count;
    });
    
    const topOptions = activeInteraction.options.filter(
      opt => (votes.counts?.[opt.id] || 0) === maxVotes
    );
    
    return topOptions.length > 1 && maxVotes > 0;
  };

  // Detect tie when voting closes
  useEffect(() => {
    if (!activeInteraction.isOpen && activeInteraction.type === 'vote' && totalVotes > 0) {
      setIsTie(checkForTie());
    }
  }, [activeInteraction.isOpen, activeInteraction.type, totalVotes, votes.counts]);

  // Pre-compute spotlight NPCs for display (avoids IIFE in JSX)
  const spotlightNpcsToShow: SpotlightNpc[] = activeInteraction.type === 'npc-spotlight'
    ? (activeInteraction.spotlightNpcs?.length
        ? activeInteraction.spotlightNpcs
        : activeInteraction.npcName
          ? [{ id: activeInteraction.npcId || 'legacy', name: activeInteraction.npcName, occupation: activeInteraction.npcOccupation || '', appearance: activeInteraction.npcAppearance || '' }]
          : [])
    : [];

  return (
    <div className={`display-container crt-overlay ${isShaking ? 'shake-intense' : ''}`}>
      {/* Audio unlock overlay - browsers require user gesture to enable audio */}
      {!audioUnlocked && (
        <div className="audio-unlock-overlay" onClick={handleEnableSound}>
          <div className="audio-unlock-content">
            <TMPSoundOff size={48} />
            <span>Click anywhere to enable sound</span>
          </div>
        </div>
      )}

      {/* Vote Particles Layer - Simple DOM version */}
      <VoteParticlesSimple enabled={activeInteraction.type === 'vote'} />

      {/* Persistent logo watermark - bottom left corner, visible during interactions */}
      <AnimatePresence>
        {!hideBar && activeInteraction.type !== 'none' && (
          <motion.div 
            className="persistent-logo"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.4 }}
            style={{
              position: 'absolute',
              bottom: '1.5rem',
              left: '1.5rem',
              zIndex: 50,
              opacity: 0.85,
            }}
          >
            <ThemeLogo size={80} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sound toggle - small, corner */}
      <button 
        className="sound-toggle"
        onClick={handleEnableSound}
        title={soundEnabled ? 'Sound enabled' : 'Click to enable sound'}
      >
        {soundEnabled ? <TMPSoundOn size={28} /> : <TMPSoundOff size={28} />}
      </button>

      {/* Persistent small QR code - visible during voting/submissions, hidden during idle and reveal */}
      <AnimatePresence>
        {!hideBar && activeInteraction.type !== 'none' && 
         !(activeInteraction.type === 'monster-vote' && activeInteraction.status === 'revealing') &&
         !(activeInteraction.type === 'monster-builder' && (builderData?.status === 'revealing' || builderData?.status === 'complete')) && (
          <motion.div 
            className="persistent-qr"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
          >
            <div className="persistent-qr-container">
              <QRCode value="https://play.themisadventuringparty.com/create" size={100} />
            </div>
            <span className="persistent-qr-label">SCAN TO JOIN</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NPC Arrival Toasts — always listening, bottom-right corner */}
      <NpcArrivalToast />

      <AnimatePresence mode="wait">
       <DisplayErrorBoundary key={activeInteraction.type}>
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
            {/* Changed QR URL to /create so audience lands on NPC creation — 2026-04-18 Betawave show */}
            <IdleDisplay 
              themeKey={theme.id}
              logo={<ThemeLogo size={180} />}
              url="https://play.themisadventuringparty.com/create"
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

            {/* Large Countdown Timer - visible from 20+ feet */}
            <AnimatePresence>
              {timeRemaining !== null && timeRemaining > 0 && activeInteraction.isOpen && (
                <motion.div 
                  className={`display-countdown ${timeRemaining <= 10 ? 'urgent' : ''}`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ 
                    scale: timeRemaining <= 10 ? [1, 1.05, 1] : 1, 
                    opacity: 1 
                  }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ 
                    scale: { repeat: timeRemaining <= 10 ? Infinity : 0, duration: 1 }
                  }}
                >
                  <span className="countdown-number">
                    {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Vote count with surging indicator */}
            <motion.div 
              className={`vote-count ${isSurging ? 'surging' : ''}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: 'spring' }}
            >
              <span className="count-number">{totalVotes}</span>
              <span className="count-label">votes cast</span>
              <AnimatePresence>
                {isSurging && (
                  <motion.span 
                    className="surge-indicator"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    🔥 SURGING!
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Milestone celebration overlay */}
            <AnimatePresence>
              {milestoneReached && (
                <motion.div 
                  className="milestone-celebration"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: 'spring', damping: 12 }}
                >
                  🎉 {milestoneReached} VOTES! 🎉
                </motion.div>
              )}
            </AnimatePresence>

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

            {/* � TIE-BREAKER DISPLAY - Dramatic moment before GM decides */}
            <AnimatePresence>
              {!activeInteraction.isOpen && isTie && showWinnerReveal && (
                <motion.div 
                  className="tie-breaker-display"
                  initial={{ scale: 0, opacity: 0, rotateX: -90 }}
                  animate={{ scale: 1, opacity: 1, rotateX: 0 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 100 }}
                >
                  <motion.div 
                    className="tie-text"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    ⚔️ IT'S A TIE! ⚔️
                  </motion.div>
                  <div className="tie-subtext">The GM shall decide your fate...</div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 🏆 WINNER ANNOUNCEMENT - GSAP Animated Theme Banner! (only if NOT a tie) */}
            <WinnerBanner
              show={!activeInteraction.isOpen && totalVotes > 0 && showWinnerReveal && !isTie}
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

        {/* Madlibs Display */}
        {activeInteraction.type === 'madlibs' && (
          <motion.div key="madlibs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Madlibs />
          </motion.div>
        )}

        {/* NPC Naming Display */}
        {activeInteraction.type === 'npc-naming' && (
          <motion.div key="npc-naming" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <NpcNaming />
          </motion.div>
        )}

        {activeInteraction.type === 'group-roll' && (
          <DiceRollerDisplay key="roll" />
        )}

        {/* Monster Assembly - Live voting display */}
        {activeInteraction.type === 'monster-vote' && activeInteraction.status !== 'revealing' && (
          <motion.div 
            className="monster-vote-display"
            key="monster-vote"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <motion.h2 
              className="vote-question monster-question"
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <span className="part-badge">🐲 Building the Beast: {activeInteraction.currentPart?.toUpperCase()}</span>
              {activeInteraction.question}
            </motion.h2>

            <div className="monster-progress-display">
              <span className="progress-label">
                Part {(activeInteraction.partIndex || 0) + 1} of 4
              </span>
            </div>

            <div className="vote-option-cards monster-options">
              {activeInteraction.options?.map((option, index) => {
                const colors = ['option-a', 'option-b', 'option-c', 'option-d'];
                return (
                  <motion.div
                    key={option.id}
                    className={`vote-option-card ${colors[index]}`}
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                  >
                    <span className="option-emoji">{option.emoji}</span>
                    <span className="option-label">{option.label}</span>
                  </motion.div>
                );
              })}
            </div>

            <motion.div 
              className={`voting-status ${activeInteraction.isOpen ? 'open' : 'closed'}`}
              animate={activeInteraction.isOpen ? { scale: [1, 1.02, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              {activeInteraction.isOpen ? (
                <>
                  <span className="status-indicator" />
                  VOTE NOW!
                </>
              ) : (
                <><TMPVotingClosed size={32} /> VOTING CLOSED</>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* Monster Reveal (Sequential Voting) */}
        {activeInteraction.type === 'monster-vote' && activeInteraction.status === 'revealing' && (
          <MonsterReveal 
            key="monster-reveal"
            show={true}
            onComplete={() => console.log('Monster reveal complete!')}
          />
        )}

        {/* Monster Builder Display (All Parts At Once - Lucky Straws) */}
        {activeInteraction.type === 'monster-builder' && (
          <motion.div
            key="monster-builder-display"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <MonsterBuilderDisplay 
              onComplete={() => console.log('Monster builder reveal complete!')}
            />
          </motion.div>
        )}

        {/* Villager Display */}
        {activeInteraction.type === 'villager-submit' && (
          <motion.div
            key="villager-display"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <VillagerDisplay 
              mode={activeInteraction.status === 'displaying' ? 'carousel' : 'grid'}
              rotationInterval={5}
            />
          </motion.div>
        )}

        {/* Decoder Ring — Well of Lines */}
        {activeInteraction.type === 'decoder-ring' && (
          <motion.div
            key="decoder-ring-display"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <DecoderRingDisplay onComplete={() => console.log('Decoder ring complete!')} />
          </motion.div>
        )}

        {/* Ship Combat */}
        {activeInteraction.type === 'ship-combat' && (
          <motion.div
            key="ship-combat-display"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ShipCombatDisplay onComplete={() => console.log('Ship combat complete!')} />
          </motion.div>
        )}

        {/* NPC Spotlight (multi-NPC) */}
        {activeInteraction.type === 'npc-spotlight' && spotlightNpcsToShow.length > 0 && (
          <NpcSpotlight key="npc-spotlight" npcs={spotlightNpcsToShow} />
        )}
       </DisplayErrorBoundary>
      </AnimatePresence>
    </div>
  );
}

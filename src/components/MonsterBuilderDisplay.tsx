/**
 * MonsterBuilderDisplay - Venue screen display for monster builder
 * 
 * Shows submission counter during building phase.
 * Plays dramatic reveal sequence when GM triggers it.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useTheme } from '../themes/ThemeProvider';
import { celebrateWinner } from '../utils/confetti';
import { audioMixer } from '../utils/audioMixer';
import {
  BUILDER_PART_ORDER,
  REVEAL_INTROS,
  DISPLAY_TEXT,
  getPartEmoji,
  calculateWinner,
  type MonsterBuilderState,
  type MonsterBuilderCategory,
} from '../types/monsterBuilder.types';
import './MonsterBuilderDisplay.css';

interface MonsterBuilderDisplayProps {
  onComplete?: () => void;
}

export default function MonsterBuilderDisplay({ onComplete }: MonsterBuilderDisplayProps) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [builderData, setBuilderData] = useState<MonsterBuilderState | null>(null);
  const [revealPhase, setRevealPhase] = useState<'waiting' | 'intro' | 'head' | 'torso' | 'arms' | 'legs' | 'complete'>('waiting');
  const [currentRevealPart, setCurrentRevealPart] = useState<MonsterBuilderCategory | null>(null);
  const [revealedParts, setRevealedParts] = useState<MonsterBuilderCategory[]>([]);
  const [winners, setWinners] = useState<Record<MonsterBuilderCategory, string>>({
    head: '',
    torso: '',
    arms: '',
    legs: '',
  });
  const [isAnimating, setIsAnimating] = useState(false);

  // Element refs for GSAP
  const titleRef = useRef<HTMLDivElement>(null);
  const partRevealRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const compilationRef = useRef<HTMLDivElement>(null);

  // Listen to monster builder state
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'monster-builder', 'current'),
      (snapshot) => {
        if (snapshot.exists()) {
          setBuilderData(snapshot.data() as MonsterBuilderState);
        }
      }
    );
    return () => unsubscribe();
  }, []);

  // Calculate winners when revealing - uses pre-calculated results or calculates from counts
  const calculateAllWinners = useCallback(() => {
    if (!builderData?.results) return;
    
    const newWinners: Record<MonsterBuilderCategory, string> = {
      head: '',
      torso: '',
      arms: '',
      legs: '',
    };

    BUILDER_PART_ORDER.forEach(part => {
      // First check if winner is pre-calculated in results
      const preCalculated = builderData.results[part];
      if (preCalculated && typeof preCalculated === 'string') {
        newWinners[part] = preCalculated;
      } else if (builderData.results.counts) {
        // Otherwise calculate from counts
        const counts = builderData.results.counts[part] || {};
        newWinners[part] = calculateWinner(counts);
      }
    });

    console.log('[MonsterBuilderDisplay] Calculated winners:', newWinners);
    setWinners(newWinners);
  }, [builderData]);

  // Play reveal animation when status changes to 'revealing'
  useEffect(() => {
    if (builderData?.status === 'revealing' && revealPhase === 'waiting') {
      calculateAllWinners();
      playRevealSequence();
    }
  }, [builderData?.status, revealPhase, calculateAllWinners]);

  // GM-controlled reveal step
  useEffect(() => {
    if (!builderData) return;
    
    const step = builderData.revealStep;
    if (step === 0) return;
    
    // Always calculate winners when step changes (ensures we have data)
    calculateAllWinners();
    
    // Set reveal phase to 'intro' if not already revealing
    if (revealPhase === 'waiting') {
      setRevealPhase('intro');
    }
    
    // If step changed, trigger that part's reveal
    if (step >= 1 && step <= 4) {
      const part = BUILDER_PART_ORDER[step - 1];
      // Small delay to ensure winners are calculated
      setTimeout(() => revealPart(part), 100);
    } else if (step === 5) {
      showFinalCompilation();
    }
  }, [builderData?.revealStep, calculateAllWinners]);

  // Reveal a single part with dramatic animation
  const revealPart = async (part: MonsterBuilderCategory) => {
    console.log('[MonsterBuilderDisplay] Revealing part:', part, 'winners:', winners);
    
    setCurrentRevealPart(part);
    setRevealPhase(part);
    // Add to revealed parts if not already there
    setRevealedParts(prev => {
      const newParts = prev.includes(part) ? prev : [...prev, part];
      console.log('[MonsterBuilderDisplay] revealedParts now:', newParts);
      return newParts;
    });
    
    // If refs aren't ready, that's okay - the state update will show the parts
    if (!partRevealRef.current || !emojiRef.current || !nameRef.current) {
      console.log('[MonsterBuilderDisplay] Refs not ready, skipping animation');
      return;
    }
    
    // Get winner data for this part (used in rendering via state)
    const _winner = winners[part];
    void _winner; // Mark as intentionally used

    const tl = gsap.timeline();

    // Reset elements
    gsap.set([partRevealRef.current, emojiRef.current, nameRef.current], {
      opacity: 0,
      scale: 0.5,
    });

    // Screen shake
    document.body.classList.add('shake-heavy');
    audioMixer.play('whoosh');

    // Show intro text
    tl.to(partRevealRef.current, {
      opacity: 1,
      scale: 1,
      duration: 0.5,
      ease: 'back.out(1.5)',
    });

    // Dramatic pause
    tl.to({}, { duration: 0.8 });

    // Show emoji
    tl.to(emojiRef.current, {
      opacity: 1,
      scale: 1,
      duration: 0.6,
      ease: 'elastic.out(1.2, 0.5)',
      onStart: () => {
        audioMixer.play('uiClick');
        document.body.classList.remove('shake-heavy');
      },
    });

    // Show name
    tl.to(nameRef.current, {
      opacity: 1,
      scale: 1,
      duration: 0.4,
      ease: 'back.out(1.2)',
    }, '-=0.2');

    // Hold
    tl.to({}, { duration: 1.5 });

    await tl.play();
  };

  // Full auto-reveal sequence (if not using step-by-step)
  const playRevealSequence = async () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setRevealPhase('intro');

    const tl = gsap.timeline();

    // Fade in container
    if (containerRef.current) {
      gsap.set(containerRef.current, { opacity: 0 });
      tl.to(containerRef.current, { opacity: 1, duration: 0.5 });
    }

    // Show title
    if (titleRef.current) {
      gsap.set(titleRef.current, { y: -100, opacity: 0 });
      tl.to(titleRef.current, {
        y: 0,
        opacity: 1,
        duration: 0.8,
        ease: 'bounce.out',
        onStart: () => audioMixer.play('whoosh'),
      });
    }

    // Dramatic pause
    tl.to({}, { duration: 1 });

    await tl.play();
    setIsAnimating(false);
  };

  // Show final creature compilation
  const showFinalCompilation = () => {
    setRevealPhase('complete');

    if (!compilationRef.current) return;

    const tl = gsap.timeline();

    gsap.set(compilationRef.current, { scale: 0, opacity: 0 });

    // Big reveal
    tl.to(compilationRef.current, {
      scale: 1,
      opacity: 1,
      duration: 1,
      ease: 'elastic.out(1.2, 0.5)',
      onStart: () => {
        audioMixer.play('victory');
        celebrateWinner({ intensity: 'epic' });
        document.body.classList.add('shake-heavy');
        setTimeout(() => document.body.classList.remove('shake-heavy'), 500);
      },
    });

    // Glow pulse
    tl.to(compilationRef.current, {
      boxShadow: '0 0 80px rgba(228, 161, 27, 0.9), 0 0 150px rgba(228, 161, 27, 0.5)',
      duration: 0.6,
      repeat: 3,
      yoyo: true,
    });

    tl.call(() => {
      onComplete?.();
    });
  };

  // Get submission count
  const submissionCount = Object.keys(builderData?.submissions || {}).length;

  // Building phase - show counter
  if (builderData?.status === 'building') {
    return (
      <div className={`monster-builder-display builder-display--${theme.id}`} ref={containerRef}>
        <div className="building-phase">
          <h1 className="building-title">CREATURES ARE FORMING...</h1>
          
          <motion.div 
            className="submission-counter"
            key={submissionCount}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          >
            <span className="counter-number">{submissionCount}</span>
          </motion.div>
          
          <p className="counter-label">submissions</p>
          
          <div className="silhouette-container">
            <motion.div 
              className="monster-silhouette"
              animate={{ 
                scale: [1, 1.02, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              🦴
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  // Closed phase - waiting for reveal
  if (builderData?.status === 'closed') {
    return (
      <div className={`monster-builder-display builder-display--${theme.id}`} ref={containerRef}>
        <div className="closed-phase">
          <h1 className="closed-title">THE BEAST STIRS...</h1>
          <p className="closed-count">{submissionCount} creatures submitted</p>
          <motion.div 
            className="pulse-container"
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
            }}
          >
            ⚔️
          </motion.div>
        </div>
      </div>
    );
  }

  // Revealing phase
  if (builderData?.status === 'revealing' || builderData?.status === 'complete') {
    return (
      <div className={`monster-builder-display builder-display--${theme.id} revealing`} ref={containerRef}>
        <div className="reveal-container">
          {/* Title */}
          <div ref={titleRef} className="reveal-title">
            <span className="title-pre">BEHOLD!</span>
            <span className="title-main">THE BEAST OF RIDGEFALL</span>
          </div>

          {/* Current part reveal */}
          {currentRevealPart && revealPhase !== 'complete' && (
            <div className="part-reveal-container">
              <div ref={partRevealRef} className="reveal-intro">
                {REVEAL_INTROS[currentRevealPart]}
              </div>
              <div ref={emojiRef} className="reveal-emoji">
                {getPartEmoji(currentRevealPart, winners[currentRevealPart])}
              </div>
              <div ref={nameRef} className="reveal-name">
                {DISPLAY_TEXT[currentRevealPart]?.[winners[currentRevealPart]] || winners[currentRevealPart]?.toUpperCase()}
              </div>
            </div>
          )}

          {/* Parts revealed so far */}
          <div className="revealed-parts">
            {BUILDER_PART_ORDER.map((part, index) => {
              // Show part if it's in the revealedParts array or if reveal is complete
              const isRevealed = revealedParts.includes(part) || revealPhase === 'complete';
              if (!isRevealed) return null;
              
              return (
                <motion.div 
                  key={part}
                  className="revealed-part"
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <span className="part-emoji">{getPartEmoji(part, winners[part])}</span>
                  <span className="part-label">{part.toUpperCase()}</span>
                </motion.div>
              );
            })}
          </div>

          {/* Final compilation */}
          <AnimatePresence>
            {revealPhase === 'complete' && (
              <motion.div 
                ref={compilationRef}
                className="final-compilation"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                <div className="compilation-emojis">
                  {BUILDER_PART_ORDER.map(part => (
                    <span key={part} className="compilation-emoji">
                      {getPartEmoji(part, winners[part])}
                    </span>
                  ))}
                </div>
                <div className="compilation-title">
                  THE BEAST IS BORN!
                </div>
                <div className="submission-final">
                  Created by {submissionCount} adventurers
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Default - nothing to show
  return null;
}

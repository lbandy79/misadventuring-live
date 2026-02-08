/**
 * MonsterReveal - Dramatic monster assembly reveal for DisplayView
 * 
 * GSAP-powered theatrical reveal: "THE BEAST HAS THE HEAD OF A RAM..."
 * Shows each part with dramatic timing, then full creature compilation.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useTheme } from '../themes/ThemeProvider';
import { celebrateWinner } from '../utils/confetti';
import { playSound } from '../utils/sounds';
import type { MonsterVoteState, MonsterPartCategory } from '../types/monster.types';
import { PART_ORDER, getPartConfig, compileMonsterID } from '../types/monster.types';
import './MonsterReveal.css';

interface MonsterRevealProps {
  /** Whether to show the reveal */
  show: boolean;
  /** Callback when full animation completes */
  onComplete?: () => void;
}

// Part reveal phrases for dramatic effect
const REVEAL_PHRASES: Record<MonsterPartCategory, string> = {
  head: 'THE HEAD OF A',
  torso: 'THE BODY OF A',
  arms: 'THE ARMS OF A',
  legs: 'THE LEGS OF A',
};

export default function MonsterReveal({ show, onComplete }: MonsterRevealProps) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [monsterData, setMonsterData] = useState<MonsterVoteState | null>(null);
  const [revealPhase, setRevealPhase] = useState<'intro' | 'parts' | 'name' | 'complete'>('intro');
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Element refs for GSAP
  const titleRef = useRef<HTMLDivElement>(null);
  const partRefs = useRef<(HTMLDivElement | null)[]>([]);
  const monsterNameRef = useRef<HTMLDivElement>(null);

  // Listen to monster vote data
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'monster-vote', 'current'),
      (snapshot) => {
        if (snapshot.exists()) {
          setMonsterData(snapshot.data() as MonsterVoteState);
        }
      }
    );
    return () => unsubscribe();
  }, []);

  // Get winner info for a part
  const getPartWinner = useCallback((part: MonsterPartCategory) => {
    if (!monsterData?.winners?.[part]) return null;
    const config = getPartConfig(part);
    const winnerId = monsterData.winners[part];
    return config.options.find(opt => opt.id === winnerId);
  }, [monsterData]);

  // Main reveal animation sequence
  const playRevealAnimation = useCallback(async () => {
    if (!containerRef.current || !monsterData || isAnimating) return;
    
    setIsAnimating(true);
    setRevealPhase('intro');
    
    const tl = gsap.timeline();
    
    // Initial setup
    gsap.set(containerRef.current, { opacity: 0 });
    gsap.set(titleRef.current, { y: -100, opacity: 0 });
    partRefs.current.forEach(ref => {
      if (ref) gsap.set(ref, { x: -100, opacity: 0, scale: 0.8 });
    });
    if (monsterNameRef.current) {
      gsap.set(monsterNameRef.current, { scale: 0, opacity: 0 });
    }

    // Fade in container
    tl.to(containerRef.current, {
      opacity: 1,
      duration: 0.3,
    });

    // Title drops in with impact
    tl.to(titleRef.current, {
      y: 0,
      opacity: 1,
      duration: 0.6,
      ease: 'bounce.out',
      onStart: () => playSound('whoosh'),
    });

    // Dramatic pause
    tl.to({}, { duration: 1 });

    // Reveal each part sequentially
    tl.call(() => setRevealPhase('parts'));
    
    for (let i = 0; i < PART_ORDER.length; i++) {
      const partRef = partRefs.current[i];
      if (!partRef) continue;

      tl.call(() => setCurrentPartIndex(i));
      
      // Part slides in
      tl.to(partRef, {
        x: 0,
        opacity: 1,
        scale: 1,
        duration: 0.5,
        ease: 'back.out(1.2)',
        onStart: () => playSound('vote'),
      });
      
      // Screen shake on each reveal
      tl.call(() => {
        document.body.classList.add('shake-subtle');
        setTimeout(() => document.body.classList.remove('shake-subtle'), 300);
      });
      
      // Pause between parts for drama
      tl.to({}, { duration: 1.5 });
    }

    // Final compilation
    tl.call(() => setRevealPhase('name'));
    
    // Monster name reveal with epic entrance
    if (monsterNameRef.current) {
      tl.to(monsterNameRef.current, {
        scale: 1,
        opacity: 1,
        duration: 0.8,
        ease: 'elastic.out(1.2, 0.5)',
        onStart: () => {
          playSound('victory');
          celebrateWinner({ intensity: 'epic' });
        },
      });
      
      // Glow pulse
      tl.to(monsterNameRef.current, {
        boxShadow: '0 0 60px rgba(228, 161, 27, 0.8), 0 0 100px rgba(228, 161, 27, 0.4)',
        duration: 0.5,
        repeat: 2,
        yoyo: true,
      });
    }

    tl.call(() => {
      setRevealPhase('complete');
      setIsAnimating(false);
      onComplete?.();
    });

    return tl;
  }, [monsterData, isAnimating, onComplete]);

  // Trigger animation when show becomes true
  useEffect(() => {
    if (show && monsterData?.status === 'revealing') {
      playRevealAnimation();
    }
  }, [show, monsterData?.status, playRevealAnimation]);

  if (!show || !monsterData) return null;

  const compiledId = compileMonsterID(monsterData.winners);

  return (
    <div 
      ref={containerRef}
      className={`monster-reveal-overlay monster-reveal--${theme.id}`}
    >
      <div className="monster-reveal-content">
        {/* Title */}
        <div ref={titleRef} className="reveal-title">
          <span className="title-pre">BEHOLD!</span>
          <span className="title-main">THE BEAST OF RIDGEFALL</span>
        </div>

        {/* Part reveals */}
        <div className="reveal-parts">
          {PART_ORDER.map((part, index) => {
            const winner = getPartWinner(part);
            
            return (
              <div 
                key={part}
                ref={el => { partRefs.current[index] = el; }}
                className={`reveal-part ${currentPartIndex >= index ? 'visible' : ''}`}
              >
                <span className="part-phrase">{REVEAL_PHRASES[part]}</span>
                <span className="part-name">
                  {winner?.emoji} {winner?.label?.toUpperCase() || '???'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Monster compilation */}
        <AnimatePresence>
          {(revealPhase === 'name' || revealPhase === 'complete') && (
            <motion.div 
              ref={monsterNameRef}
              className="monster-compilation"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <div className="monster-emoji-stack">
                {PART_ORDER.map(part => {
                  const winner = getPartWinner(part);
                  return (
                    <span key={part} className="monster-part-emoji">
                      {winner?.emoji || '❓'}
                    </span>
                  );
                })}
              </div>
              <div className="monster-id">
                <span className="id-label">CREATURE DESIGNATION:</span>
                <span className="id-value">{compiledId.toUpperCase()}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

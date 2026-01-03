/**
 * Epic Dice Roller Display Component
 * 
 * The projector/OBS view of collective dice rolls.
 * Built to put Dimension 20's dice tower to SHAME.
 * 
 * Features:
 * - 3D CSS dice with full rotation animation
 * - Particle bursts on roll completion
 * - Nat 20 / Nat 1 special effects
 * - Collective roll aggregation with live counter
 * - Theme-aware styling (wooden d20 for pirates, neon wireframe for nightmares)
 * 
 * "I'm gonna make some weird shit." - Star-Lord
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { useAwesomeMix } from '../hooks/useAwesomeMix';
import { useTheme } from '../themes/ThemeProvider';
import { quickCelebration, fireworks } from '../utils/confetti';
import './DiceRollerDisplay.css';

// =============================================================================
// TYPES
// =============================================================================

interface RollEntry {
  userId: string;
  result: number;
  timestamp: number;
}

interface RollData {
  prompt: string;
  diceType: string;
  modifier: number;
  dc: number;
  mode: 'collective' | 'individual' | 'best-of' | 'worst-of';
  rolls: RollEntry[];
  status: 'rolling' | 'results' | 'idle';
}

interface DiceRollerDisplayProps {
  /** Override with custom roll data (for testing) */
  testData?: RollData;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function DiceRollerDisplay({ testData }: DiceRollerDisplayProps) {
  const { themeId, theme } = useTheme();
  const { playSound, shakeScreen } = useAwesomeMix();
  
  const [rollData, setRollData] = useState<RollData | null>(testData ?? null);
  const [displayResult, setDisplayResult] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [lastRollCount, setLastRollCount] = useState(0);
  
  const diceRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ==========================================================================
  // FIREBASE SUBSCRIPTION
  // ==========================================================================

  useEffect(() => {
    if (testData) return; // Skip Firebase in test mode

    const unsubscribe = onSnapshot(doc(db, 'group-roll', 'current'), (snapshot) => {
      if (snapshot.exists()) {
        setRollData(snapshot.data() as RollData);
      } else {
        setRollData(null);
      }
    });

    return () => unsubscribe();
  }, [testData]);

  // ==========================================================================
  // ROLL ANIMATION TRIGGER
  // ==========================================================================

  // Animate when new rolls come in
  useEffect(() => {
    if (!rollData || rollData.status !== 'rolling') return;

    const currentRollCount = rollData.rolls?.length || 0;
    
    // New roll detected!
    if (currentRollCount > lastRollCount && currentRollCount > 0) {
      const latestRoll = rollData.rolls[rollData.rolls.length - 1];
      triggerRollAnimation(latestRoll.result);
    }

    setLastRollCount(currentRollCount);
  }, [rollData?.rolls?.length]);

  // Reset when status changes to rolling
  useEffect(() => {
    if (rollData?.status === 'rolling') {
      setDisplayResult(null);
      setLastRollCount(0);
    }
  }, [rollData?.status]);

  // ==========================================================================
  // ANIMATION LOGIC
  // ==========================================================================

  const triggerRollAnimation = useCallback((result: number) => {
    if (!diceRef.current || isAnimating) return;

    setIsAnimating(true);
    playSound('diceRoll');

    const dice = diceRef.current;
    const diceType = rollData?.diceType || 'd20';
    const sides = parseInt(diceType.replace('d', ''));
    const dc = rollData?.dc || 10;
    const modifier = rollData?.modifier || 0;
    const totalResult = result + modifier;
    const isNat20 = sides === 20 && result === 20;
    const isNat1 = result === 1;
    const isSuccess = totalResult >= dc;

    // GSAP Timeline for the epic roll
    const tl = gsap.timeline({
      onComplete: () => {
        setIsAnimating(false);
        setDisplayResult(result);
      },
    });

    // Phase 1: Anticipation (lift and wind-up)
    tl.to(dice, {
      y: -50,
      scale: 0.8,
      rotateX: -30,
      rotateY: -30,
      duration: 0.3,
      ease: 'power2.out',
    });

    // Phase 2: The Tumble
    const tumbleSteps = 12;
    const tumbleDuration = 1.2;
    
    // Generate tumbling numbers
    const numberEl = dice.querySelector('.dice-number');

    for (let i = 0; i < tumbleSteps; i++) {
      const progress = i / tumbleSteps;
      const stepDuration = (tumbleDuration / tumbleSteps) * (1 + progress * 0.8);
      const decay = 1 - progress * 0.7;
      
      tl.to(dice, {
        rotateX: `+=${180 + Math.random() * 180}`,
        rotateY: `+=${180 + Math.random() * 180}`,
        rotateZ: `+=${(Math.random() - 0.5) * 60}`,
        y: -30 * decay,
        scale: 0.85 + progress * 0.35,
        duration: stepDuration,
        ease: progress < 0.5 ? 'none' : 'power1.out',
        onStart: () => {
          // Show random numbers during tumble
          if (numberEl) {
            const fakeRoll = Math.floor(Math.random() * sides) + 1;
            numberEl.textContent = String(fakeRoll);
          }
        },
      });
    }

    // Phase 3: Impact
    tl.call(() => {
      playSound('diceImpact');
      shakeScreen({ intensity: isNat20 || isNat1 ? 'heavy' : 'medium', duration: 0.3 });
    });

    // Slam down
    tl.to(dice, {
      y: 10,
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
      scale: 1.3,
      duration: 0.15,
      ease: 'power4.in',
    });

    // Bounce back
    tl.to(dice, {
      y: 0,
      scale: 1.1,
      duration: 0.2,
      ease: 'bounce.out',
    });

    // Phase 4: Reveal the result
    tl.call(() => {
      if (numberEl) {
        numberEl.textContent = String(result);
      }
    }, [], '<');

    // Phase 5: Result-specific effects
    if (isNat20) {
      // NAT 20 - THE BIG ONE!
      tl.call(() => {
        playSound('victory');
        dice.classList.add('nat-20');
      });

      tl.to(dice, {
        scale: 1.5,
        boxShadow: '0 0 60px #FFD700, 0 0 120px #FFA500, 0 0 180px #FFD700',
        duration: 0.4,
        ease: 'back.out(2)',
      });

      tl.call(() => {
        fireworks(4000);
      }, [], '-=0.2');

      // Gold particle burst would go here with tsParticles
      
    } else if (isNat1) {
      // NAT 1 - Critical Fail
      tl.call(() => {
        playSound('error');
        dice.classList.add('nat-1');
      });

      tl.to(dice, {
        filter: 'grayscale(100%) brightness(0.5)',
        scale: 0.9,
        rotateZ: 5,
        duration: 0.3,
      });

      // Sad wobble
      tl.to(dice, {
        rotateZ: -5,
        duration: 0.1,
        repeat: 3,
        yoyo: true,
      });

      tl.to(dice, {
        filter: 'none',
        scale: 1,
        rotateZ: 0,
        duration: 0.5,
      }, '+=0.5');

    } else if (isSuccess) {
      // Normal success
      tl.call(() => {
        dice.classList.add('success');
        quickCelebration({ x: 0.5, y: 0.4 });
      });

      tl.to(dice, {
        boxShadow: `0 0 30px ${theme.colors.status.success}`,
        duration: 0.3,
      });

    } else {
      // Normal fail
      tl.call(() => {
        dice.classList.add('fail');
      });

      tl.to(dice, {
        boxShadow: `0 0 20px ${theme.colors.status.error}`,
        duration: 0.3,
      });
    }

    // Phase 6: Settle
    tl.to(dice, {
      scale: 1,
      duration: 0.4,
      ease: 'power2.out',
    }, '+=0.5');

  }, [isAnimating, playSound, shakeScreen, rollData, theme]);

  // ==========================================================================
  // RESULTS CALCULATION
  // ==========================================================================

  const calculateResults = useCallback(() => {
    if (!rollData?.rolls?.length) return null;

    const rolls = rollData.rolls;
    const modifier = rollData.modifier || 0;
    const dc = rollData.dc || 10;

    const successes = rolls.filter(r => r.result + modifier >= dc).length;
    const failures = rolls.length - successes;
    const total = rolls.reduce((sum, r) => sum + r.result, 0);
    const average = total / rolls.length;
    const highest = Math.max(...rolls.map(r => r.result));
    const lowest = Math.min(...rolls.map(r => r.result));
    const nat20s = rolls.filter(r => r.result === 20).length;
    const nat1s = rolls.filter(r => r.result === 1).length;

    return {
      successes,
      failures,
      total,
      average,
      highest,
      lowest,
      nat20s,
      nat1s,
      successRate: (successes / rolls.length) * 100,
    };
  }, [rollData]);

  // ==========================================================================
  // RENDER: IDLE STATE
  // ==========================================================================

  if (!rollData || rollData.status === 'idle') {
    return (
      <div className={`dice-roller-display idle theme-${themeId}`} ref={containerRef}>
        <motion.div
          className="idle-dice"
          animate={{
            rotateY: [0, 360],
            rotateX: [0, 15, 0, -15, 0],
          }}
          transition={{
            rotateY: { duration: 8, repeat: Infinity, ease: 'linear' },
            rotateX: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
          }}
        >
          <div className="dice-3d d20">
            <div className="dice-face">
              <span className="dice-number">20</span>
            </div>
          </div>
        </motion.div>
        <h2 className="idle-text">Awaiting Roll...</h2>
      </div>
    );
  }

  // ==========================================================================
  // RENDER: ROLLING STATE
  // ==========================================================================

  if (rollData.status === 'rolling') {
    const rollCount = rollData.rolls?.length || 0;
    const diceType = rollData.diceType || 'd20';

    return (
      <div className={`dice-roller-display rolling theme-${themeId}`} ref={containerRef}>
        <h2 className="roll-prompt">{rollData.prompt || 'Roll!'}</h2>
        
        <div className="roll-info-bar">
          <span className="dice-type-badge">{diceType}</span>
          {rollData.modifier !== 0 && (
            <span className="modifier-badge">
              {rollData.modifier > 0 ? '+' : ''}{rollData.modifier}
            </span>
          )}
          <span className="dc-badge">DC {rollData.dc}</span>
        </div>

        {/* THE DICE */}
        <div className="dice-stage">
          <div
            ref={diceRef}
            className={`dice-3d ${diceType} ${isAnimating ? 'rolling' : ''}`}
          >
            <div className="dice-face">
              <span className="dice-number">
                {displayResult ?? '?'}
              </span>
            </div>
          </div>
        </div>

        {/* Roll counter */}
        <motion.div
          className="roll-counter"
          key={rollCount}
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <span className="count">{rollCount}</span>
          <span className="label">Adventurers Rolling</span>
        </motion.div>

        {/* Live roll feed */}
        <div className="live-roll-feed">
          <AnimatePresence mode="popLayout">
            {rollData.rolls?.slice(-8).map((roll) => (
              <motion.div
                key={roll.timestamp}
                className={`roll-pip ${roll.result === 20 ? 'nat-20' : roll.result === 1 ? 'nat-1' : roll.result + (rollData.modifier || 0) >= (rollData.dc || 10) ? 'success' : 'fail'}`}
                initial={{ scale: 0, x: 50, opacity: 0 }}
                animate={{ scale: 1, x: 0, opacity: 1 }}
                exit={{ scale: 0, x: -50, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              >
                {roll.result}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER: RESULTS STATE
  // ==========================================================================

  if (rollData.status === 'results') {
    const results = calculateResults();
    if (!results) return null;

    return (
      <div className={`dice-roller-display results theme-${themeId}`} ref={containerRef}>
        <motion.h2
          className="results-title"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          The Dice Have Spoken!
        </motion.h2>

        <div className="results-hero">
          <motion.div
            className="hero-stat successes"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
          >
            <span className="value">{results.successes}</span>
            <span className="label">Successes</span>
          </motion.div>

          <motion.div
            className="hero-stat failures"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
          >
            <span className="value">{results.failures}</span>
            <span className="label">Failures</span>
          </motion.div>
        </div>

        {/* Success rate bar */}
        <div className="success-rate-container">
          <div className="success-rate-bar">
            <motion.div
              className="success-fill"
              initial={{ width: 0 }}
              animate={{ width: `${results.successRate}%` }}
              transition={{ delay: 0.5, duration: 1, ease: 'easeOut' }}
            />
          </div>
          <motion.span
            className="success-rate-label"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            {Math.round(results.successRate)}% Success Rate
          </motion.span>
        </div>

        {/* Stats grid */}
        <motion.div
          className="stats-grid"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <div className="stat">
            <span className="value">{results.average.toFixed(1)}</span>
            <span className="label">Average</span>
          </div>
          <div className="stat highlight">
            <span className="value">{results.highest}</span>
            <span className="label">Highest</span>
          </div>
          <div className="stat">
            <span className="value">{results.lowest}</span>
            <span className="label">Lowest</span>
          </div>
          {results.nat20s > 0 && (
            <div className="stat nat-20">
              <span className="value">{results.nat20s}</span>
              <span className="label">NAT 20s! 🎉</span>
            </div>
          )}
          {results.nat1s > 0 && (
            <div className="stat nat-1">
              <span className="value">{results.nat1s}</span>
              <span className="label">NAT 1s 💀</span>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return null;
}

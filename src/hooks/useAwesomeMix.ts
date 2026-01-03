/**
 * useAwesomeMix - The Orchestration Engine
 * 
 * Coordinates GSAP timelines + Howler audio + canvas-confetti + tsParticles
 * into choreographed moments that make audiences go "how did they do that?"
 * 
 * "We're just like Kevin Bacon!" - Peter Quill
 */

import { useCallback, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { audioMixer, type SoundKey } from '../utils/audioMixer';
import {
  initConfetti,
  celebrateWinner,
  quickCelebration,
  themedCelebration,
  fireworks,
} from '../utils/confetti';
import { useTheme } from '../themes/ThemeProvider';
import type { ThemeId } from '../themes/theme.types';

// =============================================================================
// TYPES
// =============================================================================

export interface WinnerRevealOptions {
  /** Element containing the vote bars */
  barsContainer: HTMLElement | null;
  /** The winning bar element */
  winnerBar: HTMLElement | null;
  /** Celebration intensity */
  intensity?: 'normal' | 'epic' | 'legendary';
  /** Custom confetti colors */
  confettiColors?: string[];
  /** Callback when reveal completes */
  onComplete?: () => void;
}

export interface DiceRollOptions {
  /** The dice container element */
  diceElement: HTMLElement | null;
  /** Number of sides (affects animation style) */
  sides: 6 | 20;
  /** Final result to display */
  result: number;
  /** Success threshold (for success/fail effects) */
  dc?: number;
  /** Is this a critical hit/miss? */
  isCritical?: boolean;
  /** Callback when roll completes */
  onComplete?: (result: number) => void;
}

export interface ScreenShakeOptions {
  /** Shake intensity */
  intensity?: 'subtle' | 'medium' | 'heavy' | 'earthquake';
  /** Duration in seconds */
  duration?: number;
}

export interface VoteParticleOptions {
  /** Starting position (phone screen edge) */
  from: { x: number; y: number };
  /** Ending position (tally bar) */
  to: { x: number; y: number };
  /** Vote option (A, B, C) for theming */
  option: 'A' | 'B' | 'C';
}

// =============================================================================
// HOOK
// =============================================================================

export function useAwesomeMix() {
  const { themeId, theme } = useTheme();
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const isInitializedRef = useRef(false);

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  useEffect(() => {
    if (isInitializedRef.current) return;

    // Initialize subsystems on mount
    initConfetti();
    audioMixer.init();

    isInitializedRef.current = true;

    return () => {
      // Cleanup active timeline
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
    };
  }, []);

  // Load theme audio when theme changes
  useEffect(() => {
    audioMixer.loadTheme(themeId);
  }, [themeId]);

  // ==========================================================================
  // SOUND HELPERS
  // ==========================================================================

  const playSound = useCallback((sound: SoundKey, options?: { volume?: number }) => {
    audioMixer.play(sound, options);
  }, []);

  const startBattleMusic = useCallback(() => {
    audioMixer.startBattleMusic();
  }, []);

  const stopBattleMusic = useCallback(() => {
    audioMixer.stopBattleMusic();
  }, []);

  const startAmbient = useCallback(() => {
    audioMixer.startAmbient();
  }, []);

  const stopAmbient = useCallback(() => {
    audioMixer.stopAmbient();
  }, []);

  // ==========================================================================
  // SCREEN SHAKE
  // ==========================================================================

  const shakeScreen = useCallback((options: ScreenShakeOptions = {}) => {
    const { intensity = 'medium', duration = 0.5 } = options;

    const intensityValues = {
      subtle: { x: 2, y: 2, rotation: 0.5 },
      medium: { x: 5, y: 5, rotation: 1 },
      heavy: { x: 10, y: 8, rotation: 2 },
      earthquake: { x: 20, y: 15, rotation: 4 },
    };

    const values = intensityValues[intensity];
    const target = document.body;

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(target, { x: 0, y: 0, rotation: 0 });
      },
    });

    // Rapid shake using keyframes
    const shakeCount = Math.floor(duration * 20); // 20 shakes per second
    for (let i = 0; i < shakeCount; i++) {
      const progress = i / shakeCount;
      const decay = 1 - progress; // Reduce intensity over time
      
      tl.to(target, {
        x: (Math.random() - 0.5) * values.x * 2 * decay,
        y: (Math.random() - 0.5) * values.y * 2 * decay,
        rotation: (Math.random() - 0.5) * values.rotation * 2 * decay,
        duration: duration / shakeCount,
        ease: 'none',
      });
    }

    return tl;
  }, []);

  // ==========================================================================
  // WINNER REVEAL - The Big One!
  // ==========================================================================

  const triggerWinnerReveal = useCallback((options: WinnerRevealOptions) => {
    const { barsContainer, winnerBar, intensity = 'epic', confettiColors, onComplete } = options;

    // Kill any existing timeline
    if (timelineRef.current) {
      timelineRef.current.kill();
    }

    const tl = gsap.timeline({
      onComplete,
    });

    timelineRef.current = tl;

    // Phase 1: Screen shake + tension build
    tl.call(() => {
      playSound('timerEnd');
    });

    tl.to(document.body, {
      scale: 1.02,
      duration: 0.3,
      ease: 'power2.in',
    });

    tl.add(shakeScreen({ intensity: 'heavy', duration: 0.4 }), '<');

    tl.to(document.body, {
      scale: 1,
      duration: 0.2,
      ease: 'power2.out',
    });

    // Phase 2: Bars stagger animation
    if (barsContainer) {
      const bars = barsContainer.querySelectorAll('[data-vote-bar]');
      
      tl.fromTo(
        bars,
        { scaleX: 0, transformOrigin: 'left center' },
        {
          scaleX: 1,
          duration: 0.8,
          stagger: 0.15,
          ease: 'power3.out',
        },
        '+=0.2'
      );
    }

    // Phase 3: Winner highlight
    if (winnerBar) {
      tl.call(() => {
        playSound('victory');
      });

      tl.to(winnerBar, {
        scale: 1.1,
        duration: 0.3,
        ease: 'back.out(1.7)',
      });

      tl.to(winnerBar, {
        boxShadow: '0 0 30px currentColor, 0 0 60px currentColor',
        duration: 0.2,
      }, '<');

      // Add winner glow class
      tl.call(() => {
        winnerBar.classList.add('winner-glow');
      });

      tl.to(winnerBar, {
        scale: 1,
        duration: 0.4,
        ease: 'power2.out',
      }, '+=0.3');
    }

    // Phase 4: Confetti explosion!
    tl.call(() => {
      const colors = confettiColors || getThemeConfettiColors(themeId);
      celebrateWinner({ colors, intensity });
    }, [], '+=0.1');

    return tl;
  }, [playSound, shakeScreen, themeId]);

  // ==========================================================================
  // DICE ROLL SEQUENCE
  // ==========================================================================

  const triggerDiceRoll = useCallback((options: DiceRollOptions) => {
    const { diceElement, sides, result, dc, isCritical, onComplete } = options;

    if (timelineRef.current) {
      timelineRef.current.kill();
    }

    const tl = gsap.timeline({
      onComplete: () => onComplete?.(result),
    });

    timelineRef.current = tl;

    if (!diceElement) {
      console.warn('No dice element provided');
      return tl;
    }

    // Phase 1: Anticipation (wind-up)
    tl.to(diceElement, {
      scale: 0.8,
      rotateZ: -10,
      duration: 0.3,
      ease: 'power2.in',
    });

    // Phase 2: The Roll (tumble with random rotation)
    tl.call(() => {
      playSound('diceRoll');
    });

    const rollDuration = 1.5;
    const tumbleSteps = 15;
    
    for (let i = 0; i < tumbleSteps; i++) {
      const progress = i / tumbleSteps;
      const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
      
      tl.to(diceElement, {
        rotateX: `+=${Math.random() * 180 + 90}`,
        rotateY: `+=${Math.random() * 180 + 90}`,
        rotateZ: `+=${Math.random() * 90 - 45}`,
        scale: 0.8 + easeProgress * 0.4, // Grow as it settles
        y: -20 * (1 - easeProgress), // Bounce effect
        duration: (rollDuration / tumbleSteps) * (1 + easeProgress * 0.5),
        ease: 'power1.out',
      });
    }

    // Phase 3: Impact
    tl.call(() => {
      playSound('diceImpact');
      shakeScreen({ intensity: 'subtle', duration: 0.2 });
    });

    tl.to(diceElement, {
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
      scale: 1.2,
      y: 0,
      duration: 0.2,
      ease: 'back.out(1.7)',
    });

    tl.to(diceElement, {
      scale: 1,
      duration: 0.3,
      ease: 'power2.out',
    });

    // Phase 4: Result reveal
    tl.call(() => {
      // Update dice face to show result
      diceElement.setAttribute('data-result', String(result));
    }, [], '-=0.2');

    // Phase 5: Success/Fail effects
    const isSuccess = dc !== undefined && result >= dc;
    const isNat1 = result === 1;
    const isNat20 = sides === 20 && result === 20;

    if (isNat20 || (isCritical && isSuccess)) {
      // CRITICAL SUCCESS! 
      tl.call(() => {
        playSound('victory');
        celebrateWinner({ intensity: 'legendary', colors: ['#FFD700', '#FFFF00', '#FFA500'] });
      });

      tl.to(diceElement, {
        scale: 1.5,
        duration: 0.3,
        ease: 'back.out(2)',
      });

      tl.to(diceElement, {
        boxShadow: '0 0 50px #FFD700, 0 0 100px #FFA500',
        duration: 0.2,
      }, '<');
    } else if (isNat1) {
      // CRITICAL FAIL!
      tl.call(() => {
        playSound('error');
      });

      tl.to(diceElement, {
        filter: 'grayscale(100%) brightness(0.5)',
        scale: 0.9,
        duration: 0.3,
      });

      tl.to(diceElement, {
        filter: 'none',
        scale: 1,
        duration: 0.5,
      }, '+=0.5');
    } else if (isSuccess) {
      // Normal success
      tl.call(() => {
        playSound('victory', { volume: 0.6 });
        quickCelebration({ x: 0.5, y: 0.3 });
      });
    }

    return tl;
  }, [playSound, shakeScreen]);

  // ==========================================================================
  // COUNTDOWN
  // ==========================================================================

  const triggerCountdownTick = useCallback((secondsRemaining: number) => {
    audioMixer.playCountdownTick(secondsRemaining);

    // Visual feedback for last 5 seconds
    if (secondsRemaining <= 5 && secondsRemaining > 0) {
      const intensity = 1 - (secondsRemaining / 5);
      
      gsap.to(document.body, {
        scale: 1 + 0.02 * intensity,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        ease: 'power2.inOut',
      });
    }
  }, []);

  // ==========================================================================
  // VOTE CAST EFFECT
  // ==========================================================================

  const triggerVoteCast = useCallback((option: 'A' | 'B' | 'C') => {
    playSound('votecast');
    quickCelebration({ x: 0.5, y: 0.7 });
  }, [playSound]);

  // ==========================================================================
  // BATTLE MODE
  // ==========================================================================

  const enterBattleMode = useCallback(() => {
    startBattleMusic();
    
    // Dramatic entrance
    const tl = gsap.timeline();
    
    tl.to(document.body, {
      filter: 'saturate(1.3) contrast(1.1)',
      duration: 0.5,
    });

    shakeScreen({ intensity: 'medium', duration: 0.3 });

    return tl;
  }, [startBattleMusic, shakeScreen]);

  const exitBattleMode = useCallback(() => {
    stopBattleMusic();
    
    gsap.to(document.body, {
      filter: 'none',
      duration: 1,
    });
  }, [stopBattleMusic]);

  // ==========================================================================
  // THEME TRANSITION
  // ==========================================================================

  const transitionTheme = useCallback((toThemeId: ThemeId, setThemeId: (id: ThemeId) => void) => {
    const tl = gsap.timeline();

    // Fade out
    tl.to(document.body, {
      opacity: 0,
      scale: 0.95,
      duration: 0.3,
      ease: 'power2.in',
    });

    // Swap theme at midpoint
    tl.call(() => {
      audioMixer.loadTheme(toThemeId);
      setThemeId(toThemeId);
      playSound('whoosh');
    });

    // Fade in
    tl.to(document.body, {
      opacity: 1,
      scale: 1,
      duration: 0.5,
      ease: 'power2.out',
    });

    // Theme-specific entrance
    tl.call(() => {
      if (toThemeId === 'neon-nightmares') {
        // Glitch effect entrance
        gsap.to(document.body, {
          skewX: 2,
          duration: 0.05,
          yoyo: true,
          repeat: 5,
        });
      } else if (toThemeId === 'soggy-bottom-pirates') {
        // Wave effect entrance
        gsap.from(document.body, {
          rotateZ: -1,
          duration: 0.5,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: 2,
        });
      }
    });

    return tl;
  }, [playSound]);

  // ==========================================================================
  // CELEBRATION TRIGGERS
  // ==========================================================================

  const triggerCelebration = useCallback((type: 'quick' | 'winner' | 'fireworks' = 'quick') => {
    switch (type) {
      case 'quick':
        quickCelebration();
        break;
      case 'winner':
        themedCelebration(themeId as 'soggy-bottom-pirates' | 'neon-nightmares');
        break;
      case 'fireworks':
        fireworks(5000);
        break;
    }
  }, [themeId]);

  // ==========================================================================
  // RETURN API
  // ==========================================================================

  return {
    // Sound controls
    playSound,
    startBattleMusic,
    stopBattleMusic,
    startAmbient,
    stopAmbient,

    // Visual effects
    shakeScreen,
    triggerCelebration,

    // Orchestrated sequences
    triggerWinnerReveal,
    triggerDiceRoll,
    triggerCountdownTick,
    triggerVoteCast,

    // Mode switches
    enterBattleMode,
    exitBattleMode,
    transitionTheme,

    // Direct audio mixer access for advanced use
    audioMixer,
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function getThemeConfettiColors(themeId: ThemeId): string[] {
  const themeColors: Record<ThemeId, string[]> = {
    'tmp-base': ['#FF1493', '#00CED1', '#FFD700', '#FF6B6B', '#4ECDC4'],
    'soggy-bottom-pirates': ['#E4A11B', '#4A90A4', '#5C4033', '#F5E6D3', '#FF6B35'],
    'neon-nightmares': ['#FF00FF', '#00FFFF', '#FF0080', '#80FF00', '#FFFF00'],
  };

  return themeColors[themeId] || themeColors['tmp-base'];
}

export default useAwesomeMix;

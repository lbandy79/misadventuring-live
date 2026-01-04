/**
 * WinnerBanner - Animated winner announcement with GSAP
 * 
 * Don Bluth-inspired celebration with theme-specific styling.
 * Uses GSAP for dramatic entrance animations.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { useTheme } from '../themes/ThemeProvider';
import { ThemeIcon } from '../themes/ThemeAssets';
import { celebrateWinner, quickCelebration } from '../utils/confetti';
import { playSound } from '../utils/sounds';
import './WinnerBanner.css';

interface WinnerBannerProps {
  /** The winning option label */
  winner: string;
  /** Winner option ID for icon display */
  winnerId?: string;
  /** Custom message (default: "THE PEOPLE HAVE SPOKEN!") */
  message?: string;
  /** Winning percentage */
  percentage?: number;
  /** Callback when animation completes */
  onAnimationComplete?: () => void;
  /** Whether to show the banner */
  show: boolean;
}

export default function WinnerBanner({
  winner,
  winnerId,
  message = "THE PEOPLE HAVE SPOKEN!",
  percentage,
  onAnimationComplete,
  show,
}: WinnerBannerProps) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const winnerRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Get particle type from theme
  const particleType = theme.assets?.winnerBanner?.particles || 'confetti';

  const playEntranceAnimation = useCallback(() => {
    if (!containerRef.current || !bannerRef.current) return;

    setIsAnimating(true);
    const tl = gsap.timeline({
      onComplete: () => {
        setIsAnimating(false);
        onAnimationComplete?.();
      }
    });

    // Reset initial states
    gsap.set(containerRef.current, { opacity: 0 });
    gsap.set(bannerRef.current, { scale: 0, rotation: -15 });
    gsap.set(messageRef.current, { y: 30, opacity: 0 });
    gsap.set(winnerRef.current, { y: 50, opacity: 0, scale: 0.8 });

    // Container fade in
    tl.to(containerRef.current, {
      opacity: 1,
      duration: 0.2,
    });

    // Banner dramatic entrance - scale + rotation
    tl.to(bannerRef.current, {
      scale: 1,
      rotation: 0,
      duration: 0.6,
      ease: 'elastic.out(1.2, 0.5)',
    }, '-=0.1');

    // Play victory sound at peak of animation
    tl.call(() => {
      playSound('victory');
      // Fire themed particles
      if (particleType === 'confetti') {
        celebrateWinner({ intensity: 'epic' });
      } else if (particleType === 'sparkle' || particleType === 'splash') {
        quickCelebration();
      }
      // Glitch effect handled by CSS for neon theme
    }, [], '-=0.3');

    // Message slides up
    tl.to(messageRef.current, {
      y: 0,
      opacity: 1,
      duration: 0.4,
      ease: 'power2.out',
    }, '-=0.2');

    // Winner name with bounce
    tl.to(winnerRef.current, {
      y: 0,
      opacity: 1,
      scale: 1,
      duration: 0.5,
      ease: 'elastic.out(1, 0.6)',
    }, '-=0.2');

    // Add glow pulse loop
    tl.to(bannerRef.current, {
      boxShadow: theme.id === 'neon-nightmares' 
        ? '0 0 60px rgba(255, 45, 149, 0.8), 0 0 100px rgba(0, 245, 255, 0.5)'
        : '0 0 40px rgba(228, 161, 27, 0.6)',
      duration: 0.8,
      repeat: 2,
      yoyo: true,
      ease: 'sine.inOut',
    }, '-=0.3');

    return tl;
  }, [theme.id, particleType, onAnimationComplete]);

  useEffect(() => {
    if (show && !isAnimating) {
      playEntranceAnimation();
    }
  }, [show, playEntranceAnimation, isAnimating]);

  if (!show) return null;

  return (
    <div 
      ref={containerRef} 
      className={`winner-banner-overlay winner-banner--${theme.id}`}
      role="alert"
      aria-live="assertive"
    >
      <div ref={bannerRef} className="winner-banner">
        {/* Decorative top flourish */}
        <div className="winner-banner__flourish winner-banner__flourish--top" />
        
        {/* Message */}
        <div ref={messageRef} className="winner-banner__message">
          {message}
        </div>
        
        {/* Winner display */}
        <div ref={winnerRef} className="winner-banner__winner">
          {winnerId && (
            <ThemeIcon 
              iconKey={winnerId === 'a' ? 'optionA' : winnerId === 'b' ? 'optionB' : 'optionC'}
              size={80}
              selected
              className="winner-banner__icon"
            />
          )}
          <span className="winner-banner__name">{winner}</span>
          {percentage !== undefined && (
            <span className="winner-banner__percentage">
              {Math.round(percentage)}% of the vote
            </span>
          )}
        </div>

        {/* Decorative bottom flourish */}
        <div className="winner-banner__flourish winner-banner__flourish--bottom" />
      </div>
    </div>
  );
}

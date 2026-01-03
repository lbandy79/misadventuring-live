/**
 * VoteParticlesSimple - DOM-based vote particles
 * 
 * Shows votes flying from screen edges to their chosen option bars.
 * Uses simple DOM elements + CSS animations (reliable, no canvas issues).
 */

import { useCallback, useEffect, useRef } from 'react';
import { useTheme } from '../themes';
import './VoteParticlesSimple.css';

// =============================================================================
// COMPONENT
// =============================================================================

interface VoteParticlesSimpleProps {
  /** Whether particles are active */
  enabled?: boolean;
}

export default function VoteParticlesSimple({ enabled = true }: VoteParticlesSimpleProps) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);

  // Get theme-aware colors
  const particleColors = [
    theme?.colors?.voting?.optionA || '#FFD700',
    theme?.colors?.voting?.optionB || '#00D4FF', 
    theme?.colors?.voting?.optionC || '#FF6B35',
    theme?.colors?.primary || '#FFFFFF',
  ];

  // Emit a particle from random edge toward center
  const emitParticle = useCallback((optionId: string, targetElement?: HTMLElement) => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    
    // Random edge spawn
    const edges = ['top', 'left', 'right', 'bottom'] as const;
    const edge = edges[Math.floor(Math.random() * edges.length)];
    
    let startX: number, startY: number;
    switch (edge) {
      case 'top':
        startX = Math.random() * containerRect.width;
        startY = -20;
        break;
      case 'bottom':
        startX = Math.random() * containerRect.width;
        startY = containerRect.height + 20;
        break;
      case 'left':
        startX = -20;
        startY = Math.random() * containerRect.height;
        break;
      case 'right':
        startX = containerRect.width + 20;
        startY = Math.random() * containerRect.height;
        break;
    }

    // Target position (center of target element or center of screen)
    let targetX = containerRect.width / 2;
    let targetY = containerRect.height / 2;
    
    if (targetElement) {
      const targetRect = targetElement.getBoundingClientRect();
      targetX = targetRect.left + targetRect.width / 2 - containerRect.left;
      targetY = targetRect.top + targetRect.height / 2 - containerRect.top;
    }

    // Create particle element
    const particle = document.createElement('div');
    particle.className = 'vote-particle';
    
    // Random color from theme
    const colorIndex = optionId === 'a' ? 0 : optionId === 'b' ? 1 : optionId === 'c' ? 2 : 3;
    const color = particleColors[colorIndex] || particleColors[Math.floor(Math.random() * particleColors.length)];
    
    // BIG size for visibility
    const size = 40 + Math.random() * 30;
    
    particle.style.cssText = `
      left: ${startX}px;
      top: ${startY}px;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      box-shadow: 0 0 ${size}px ${color}, 0 0 ${size * 2}px ${color}, 0 0 ${size * 3}px ${color};
      --target-x: ${targetX - startX}px;
      --target-y: ${targetY - startY}px;
    `;
    
    container.appendChild(particle);
    
    // Trigger animation
    requestAnimationFrame(() => {
      particle.classList.add('flying');
    });
    
    // Remove after animation
    particle.addEventListener('animationend', () => {
      particle.remove();
    });
    
    // Fallback removal
    setTimeout(() => particle.remove(), 2000);
    
    console.log(`✨ DOM Particle emitted for ${optionId} from (${startX.toFixed(0)}, ${startY.toFixed(0)}) to (${targetX.toFixed(0)}, ${targetY.toFixed(0)})`);
  }, [enabled, particleColors]);

  // Expose emit function globally
  useEffect(() => {
    const windowWithEmit = window as unknown as { emitVoteParticle?: typeof emitParticle };
    windowWithEmit.emitVoteParticle = emitParticle;
    console.log('🎯 Vote particle emitter registered');
    return () => {
      delete windowWithEmit.emitVoteParticle;
    };
  }, [emitParticle]);

  if (!enabled) return null;

  return (
    <div 
      ref={containerRef}
      className="vote-particles-simple-container"
      aria-hidden="true"
    />
  );
}

// =============================================================================
// HOOK FOR EXTERNAL USE
// =============================================================================

export function useVoteParticles() {
  // Stable function that reads from window at call time
  const emitVoteParticle = useCallback((optionId: string, _count: number = 1) => {
    const emitFn = (window as unknown as { emitVoteParticle?: (id: string, el?: HTMLElement) => void }).emitVoteParticle;
    if (emitFn) {
      emitFn(optionId);
      console.log(`🎆 useVoteParticles: emitted for ${optionId}`);
    } else {
      console.warn('Vote particles not ready - window.emitVoteParticle not found');
    }
  }, []);

  return { emitVoteParticle };
}

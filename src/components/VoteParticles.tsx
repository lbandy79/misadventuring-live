/**
 * VoteParticles - Real-time vote visualization
 * 
 * Shows votes flying from screen edges to their chosen option bars.
 * Each vote becomes a glowing particle that streams toward its destination.
 * 
 * "Audience members see their vote fly across the projector" - The Dream
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { Engine, ISourceOptions, Container } from '@tsparticles/engine';
import { useTheme } from '../themes';
import './VoteParticles.css';

// =============================================================================
// TYPES
// =============================================================================

interface VoteTarget {
  /** Vote option ID (A, B, C, etc.) */
  optionId: string;
  /** Target element's bounding rect */
  rect: DOMRect;
  /** Emoji for this option */
  emoji?: string;
}

interface VoteParticlesProps {
  /** Whether particles are active */
  enabled?: boolean;
  /** Current vote targets (bars to fly toward) */
  targets?: VoteTarget[];
  /** Callback to get particle colors from theme */
  className?: string;
}

interface ParticleEmission {
  optionId: string;
  timestamp: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function VoteParticles({ 
  enabled = true, 
  targets = [],
  className = '',
}: VoteParticlesProps) {
  const { theme } = useTheme();
  const [particlesReady, setParticlesReady] = useState(false);
  const containerRef = useRef<Container | null>(null);
  const emissionQueueRef = useRef<ParticleEmission[]>([]);

  // Get theme-aware colors (use theme voting colors or defaults)
  const particleColors = [
    theme?.colors?.voting?.optionA || '#FFD700', // Gold
    theme?.colors?.voting?.optionB || '#FFA500', // Orange
    theme?.colors?.voting?.optionC || '#FF6B35', // Coral
    theme?.colors?.primary || '#00D4FF', // Cyan
  ];

  // Initialize tsParticles engine
  useEffect(() => {
    initParticlesEngine(async (engine: Engine) => {
      await loadSlim(engine);
    }).then(() => {
      setParticlesReady(true);
      console.log('✨ Vote particles engine ready');
    });
  }, []);

  // Emit particles toward a target
  const emitVoteParticle = useCallback((optionId: string, count: number = 1) => {
    const container = containerRef.current;
    console.log('🎯 emitVoteParticle called:', { optionId, count, hasContainer: !!container, enabled });
    
    if (!container || !enabled) {
      console.log('❌ Particle emission blocked - container:', !!container, 'enabled:', enabled);
      return;
    }

    const target = targets.find(t => t.optionId === optionId);
    console.log('🎯 Target lookup:', { optionId, foundTarget: !!target, allTargets: targets });
    
    if (!target) {
      console.warn('No target found for vote option:', optionId);
      return;
    }

    // Random edge spawn position
    const edges = ['top', 'left', 'right', 'bottom'] as const;
    const edge = edges[Math.floor(Math.random() * edges.length)];
    
    let startX: number, startY: number;
    const canvasRect = container.canvas.element?.getBoundingClientRect();
    console.log('🎯 Canvas rect:', canvasRect);
    
    if (!canvasRect) {
      console.log('❌ No canvas rect found');
      return;
    }
    
    switch (edge) {
      case 'top':
        startX = Math.random() * canvasRect.width;
        startY = 0;
        break;
      case 'bottom':
        startX = Math.random() * canvasRect.width;
        startY = canvasRect.height;
        break;
      case 'left':
        startX = 0;
        startY = Math.random() * canvasRect.height;
        break;
      case 'right':
        startX = canvasRect.width;
        startY = Math.random() * canvasRect.height;
        break;
    }

    // Target center position (relative to canvas)
    const targetX = target.rect.left + target.rect.width / 2 - canvasRect.left;
    const targetY = target.rect.top + target.rect.height / 2 - canvasRect.top;

    // Calculate direction
    const dx = targetX - startX;
    const dy = targetY - startY;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    console.log('🎯 Particle params:', { startX, startY, targetX, targetY, angle, edge });

    // Emit particles
    for (let i = 0; i < count; i++) {
      try {
        // Simple particle add - let the base config handle most settings
        const particle = container.particles.addParticle({
          x: startX + Math.random() * 20 - 10,
          y: startY + Math.random() * 20 - 10,
        });
        console.log(`✨ Particle added:`, particle, `at (${startX.toFixed(0)}, ${startY.toFixed(0)})`);
      } catch (err) {
        console.error('❌ Failed to add particle:', err);
      }
    }

    console.log(`✨ Emitted ${count} vote particle(s) for option ${optionId}`);
  }, [enabled, targets, particleColors]);

  // Process queued emissions
  useEffect(() => {
    if (!particlesReady) return;
    
    const queue = emissionQueueRef.current;
    if (queue.length > 0) {
      queue.forEach(emission => {
        emitVoteParticle(emission.optionId);
      });
      emissionQueueRef.current = [];
    }
  }, [particlesReady, emitVoteParticle]);

  // Expose emit function globally for other components
  useEffect(() => {
    (window as unknown as { emitVoteParticle: typeof emitVoteParticle }).emitVoteParticle = emitVoteParticle;
    return () => {
      delete (window as unknown as { emitVoteParticle?: typeof emitVoteParticle }).emitVoteParticle;
    };
  }, [emitVoteParticle]);

  if (!enabled || !particlesReady) return null;

  // Much more visible particles for debugging
  const baseConfig: ISourceOptions = {
    fullScreen: false,
    background: { color: { value: 'transparent' } },
    fpsLimit: 60,
    particles: {
      number: { value: 0 },
      color: { value: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'] }, // Bright obvious colors
      shape: { type: 'circle' },
      opacity: {
        value: 1, // Full opacity
      },
      size: { value: 30 }, // Much bigger
      move: {
        enable: true,
        speed: 5,
        direction: 'none',
        outModes: { default: 'destroy' },
      },
      life: {
        duration: { sync: false, value: 5 }, // Live longer
        count: 1,
      },
    },
    detectRetina: true,
  };

  return (
    <Particles
      id="vote-particles"
      className={`vote-particles-container ${className}`}
      particlesLoaded={async (container) => {
        containerRef.current = container || null;
        console.log('✨ Vote particles container loaded', container?.canvas.element?.getBoundingClientRect());
      }}
      options={baseConfig}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  );
}

// =============================================================================
// HOOK FOR EXTERNAL USE
// =============================================================================

/**
 * Hook to emit vote particles from anywhere
 */
export function useVoteParticles() {
  const emit = useCallback((optionId: string, count: number = 1) => {
    const emitFn = (window as unknown as { emitVoteParticle?: (id: string, count: number) => void }).emitVoteParticle;
    if (emitFn) {
      emitFn(optionId, count);
    } else {
      console.warn('Vote particles not ready');
    }
  }, []);

  return { emitVoteParticle: emit };
}

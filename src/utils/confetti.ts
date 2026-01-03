/**
 * Confetti Celebration Effects
 * 
 * canvas-confetti wrapper for those "THE PEOPLE HAVE SPOKEN" moments.
 * Uses Web Worker for smooth 60fps even during React updates.
 */

import confetti from 'canvas-confetti';

// Reusable confetti instance with Web Worker (performance!)
let confettiCanvas: HTMLCanvasElement | null = null;
let confettiInstance: confetti.CreateTypes | null = null;

/**
 * Initialize confetti canvas (call once on display mount)
 */
export function initConfetti(): void {
  if (confettiCanvas) return;
  
  confettiCanvas = document.createElement('canvas');
  confettiCanvas.style.cssText = `
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 10000;
  `;
  document.body.appendChild(confettiCanvas);
  
  confettiInstance = confetti.create(confettiCanvas, {
    resize: true,
    useWorker: true, // Offload physics to Web Worker!
  });
}

/**
 * Winner celebration burst - the big one!
 * Call when voting closes and winner is revealed.
 */
export function celebrateWinner(options?: {
  colors?: string[];
  intensity?: 'normal' | 'epic' | 'legendary';
}): void {
  const instance = confettiInstance || confetti;
  const colors = options?.colors || ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#45B7D1'];
  
  const intensitySettings = {
    normal: { particleCount: 100, spread: 70, duration: 1 },
    epic: { particleCount: 200, spread: 100, duration: 2 },
    legendary: { particleCount: 300, spread: 180, duration: 3 },
  };
  
  const settings = intensitySettings[options?.intensity || 'epic'];
  
  // Initial burst from bottom center
  instance({
    particleCount: settings.particleCount,
    spread: settings.spread,
    origin: { y: 0.7, x: 0.5 },
    colors,
    startVelocity: 45,
    gravity: 0.8,
    ticks: 300,
  });

  // Side cannons for epic/legendary
  if (settings.duration >= 2) {
    setTimeout(() => {
      instance({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors,
      });
      instance({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors,
      });
    }, 200);
  }

  // Finale burst for legendary
  if (settings.duration >= 3) {
    setTimeout(() => {
      instance({
        particleCount: 150,
        spread: 180,
        origin: { y: 0.5, x: 0.5 },
        colors,
        startVelocity: 30,
        gravity: 0.5,
      });
    }, 500);
  }
}

/**
 * Quick celebration - for smaller wins or vote submissions
 */
export function quickCelebration(origin?: { x: number; y: number }): void {
  const instance = confettiInstance || confetti;
  
  instance({
    particleCount: 30,
    spread: 50,
    origin: origin || { y: 0.7, x: 0.5 },
    colors: ['#FFD700', '#FFA500'],
    startVelocity: 25,
    gravity: 1.2,
    ticks: 100,
  });
}

/**
 * Themed confetti - matches current campaign theme
 */
export function themedCelebration(theme: 'soggy-bottom-pirates' | 'neon-nightmares'): void {
  const themeColors = {
    'soggy-bottom-pirates': ['#E4A11B', '#4A90A4', '#5C4033', '#F5E6D3', '#FF6B35'],
    'neon-nightmares': ['#FF00FF', '#00FFFF', '#FF0080', '#80FF00', '#FFFF00'],
  };
  
  celebrateWinner({
    colors: themeColors[theme],
    intensity: 'epic',
  });
}

/**
 * Fireworks effect - for really special moments
 */
export function fireworks(duration: number = 3000): void {
  const instance = confettiInstance || confetti;
  const end = Date.now() + duration;
  const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];

  const frame = () => {
    instance({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
      colors,
    });
    instance({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
      colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };
  
  frame();
}

/**
 * Clean up confetti canvas
 */
export function destroyConfetti(): void {
  if (confettiCanvas) {
    confettiCanvas.remove();
    confettiCanvas = null;
    confettiInstance = null;
  }
}

/**
 * Neon Nightmares Theme
 * 
 * 80s VHS Horror Aesthetic
 * - Synth-wave meets Stranger Things
 * - Aesthetic: Tracking errors, neon glow, analog horror
 * - Colors: Hot neon pink, electric cyan, CRT green
 * - Vibe: Retro horror, be kind rewind, late night terror
 */

import type { TMPTheme } from './theme.types';

export const neonNightmaresTheme: TMPTheme = {
  id: 'neon-nightmares',
  name: 'Neon Nightmares',
  description: 'Be Kind, Rewind... if you dare.',
  system: 'kids-on-bikes',

  colors: {
    primary: '#FF2D95',           // Hot neon pink
    secondary: '#00F5FF',         // Electric cyan
    tertiary: '#39FF14',          // CRT green (phosphor)

    background: {
      main: '#0A0A0F',            // VHS black
      card: '#12121A',            // TV static dark
      elevated: '#1A1A2E',        // Midnight purple
    },

    text: {
      primary: '#EAEAEA',         // CRT white
      secondary: '#A0A0B0',       // Static gray
      onPrimary: '#0A0A0F',       // Dark for neon buttons
    },

    voting: {
      optionA: '#FF2D95',         // Neon pink
      optionB: '#00F5FF',         // Electric cyan
      optionC: '#39FF14',         // CRT green
      progressTrack: '#1A1A2E',   // Midnight
    },

    status: {
      success: '#39FF14',         // Phosphor green
      warning: '#FFD700',         // Gold VHS label
      error: '#FF3366',           // Blood neon
      info: '#00F5FF',            // Cyan
    },
  },

  typography: {
    fonts: {
      display: '"VT323", "Courier New", monospace',
      body: '"Inter", "Segoe UI", sans-serif',
      accent: '"Orbitron", sans-serif',
    },
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=VT323&family=Inter:wght@400;500;600;700&family=Orbitron:wght@500;700&display=swap',
    sizes: {
      hero: '4rem',
      h1: '2.5rem',
      h2: '2rem',
      h3: '1.5rem',
      body: '1rem',
      small: '0.875rem',
    },
    weights: {
      normal: 400,
      medium: 500,
      bold: 600,
      black: 700,
    },
  },

  animations: {
    easing: {
      default: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      enter: 'cubic-bezier(0, 0.55, 0.45, 1)',
      exit: 'cubic-bezier(0.55, 0, 1, 0.45)',
    },
    duration: {
      fast: 100,
      normal: 250,
      slow: 400,
      voteUpdate: 350,
    },
    keyframes: {
      voteSelect: 'nn-glitch',
      voteIncrement: 'nn-flicker',
      progressUpdate: 'nn-scan',
      idle: 'nn-static',
      victory: 'nn-strobe',
      buttonHover: 'nn-glow-pulse',
    },
  },

  sounds: {
    votecast: '/sounds/nn/synth-hit.mp3',
    timerTick: '/sounds/nn/tick-digital.mp3',
    timerEnd: '/sounds/nn/vhs-stop.mp3',
    victory: '/sounds/nn/synth-victory.mp3',
    uiClick: '/sounds/nn/button-click.mp3',
    error: '/sounds/nn/static-burst.mp3',
    ambient: '/sounds/nn/synth-ambient.mp3',
  },

  effects: {
    borderRadius: {
      small: '2px',
      medium: '4px',
      large: '8px',
      button: '4px',
      card: '6px',
    },
    shadows: {
      small: '0 0 5px rgba(255, 45, 149, 0.3)',
      medium: '0 0 15px rgba(255, 45, 149, 0.4)',
      large: '0 0 30px rgba(255, 45, 149, 0.5)',
      glow: `
        0 0 10px rgba(255, 45, 149, 0.8),
        0 0 20px rgba(255, 45, 149, 0.6),
        0 0 40px rgba(255, 45, 149, 0.4)
      `,
    },
    backgroundEffects: {
      main: `
        repeating-linear-gradient(
          0deg,
          rgba(0, 0, 0, 0.1) 0px,
          rgba(0, 0, 0, 0.1) 1px,
          transparent 1px,
          transparent 2px
        ),
        linear-gradient(180deg, #0A0A0F 0%, #1A1A2E 100%)
      `,
      overlay: 'url(/images/nn/scanlines.svg)',
    },
  },
};

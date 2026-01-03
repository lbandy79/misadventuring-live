/**
 * TMP Base Theme
 * 
 * The Misadventuring Party - Flagship Brand Theme
 * "Where Failing is Fun"
 * 
 * - Colors: Navy, Hot Pink, Cyan (from the logo)
 * - Vibe: Bold, fun, unapologetically chaotic
 * - The D20 showing a "1" is our spirit animal
 */

import type { TMPTheme } from './theme.types';

export const tmpBaseTheme: TMPTheme = {
  id: 'tmp-base',
  name: 'TMP Base',
  description: 'The Misadventuring Party flagship theme - Where Failing is Fun!',
  system: 'universal',

  colors: {
    primary: '#e84393',           // Hot pink (from logo)
    secondary: '#5dade2',         // Cyan (from logo)
    tertiary: '#f39c12',          // Warm gold accent

    background: {
      main: '#0a1628',            // Deep navy (logo background)
      card: '#0f2137',            // Slightly lighter navy
      elevated: '#163354',        // Elevated surfaces
    },

    text: {
      primary: '#ffffff',         // Pure white
      secondary: '#a8c5d8',       // Soft cyan-grey
      onPrimary: '#ffffff',       // White on pink
    },

    voting: {
      optionA: '#e84393',         // Hot pink
      optionB: '#5dade2',         // Cyan
      optionC: '#f39c12',         // Gold
      progressTrack: '#0a1628',   // Navy
    },

    status: {
      success: '#27ae60',         // Emerald green
      warning: '#f39c12',         // Warm gold
      error: '#e74c3c',           // Soft red
      info: '#5dade2',            // Cyan
    },
  },

  typography: {
    fonts: {
      display: '"Righteous", "Impact", sans-serif',
      body: '"Nunito", "Segoe UI", sans-serif',
      accent: '"Bangers", cursive',
    },
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Righteous&family=Nunito:wght@400;600;700;800&family=Bangers&display=swap',
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
      medium: 600,
      bold: 700,
      black: 800,
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
      fast: 150,
      normal: 300,
      slow: 500,
      voteUpdate: 400,
    },
    keyframes: {
      voteSelect: 'tmp-pop',
      voteIncrement: 'tmp-pulse',
      progressUpdate: 'tmp-grow',
      idle: 'tmp-float',
      victory: 'tmp-explode',
      buttonHover: 'tmp-glow',
    },
  },

  sounds: {
    votecast: '/sounds/tmp/dice-roll.mp3',
    timerTick: '/sounds/tmp/tick.mp3',
    timerEnd: '/sounds/tmp/buzzer.mp3',
    victory: '/sounds/tmp/fanfare.mp3',
    uiClick: '/sounds/tmp/click.mp3',
    error: '/sounds/tmp/fumble.mp3',
    ambient: '/sounds/tmp/tavern-ambience.mp3',
  },

  effects: {
    borderRadius: {
      small: '4px',
      medium: '8px',
      large: '16px',
      button: '12px',
      card: '16px',
    },
    shadows: {
      small: '0 2px 4px rgba(0, 0, 0, 0.3)',
      medium: '0 4px 12px rgba(0, 0, 0, 0.4)',
      large: '0 8px 24px rgba(0, 0, 0, 0.5)',
      glow: '0 0 30px rgba(232, 67, 147, 0.5)',
    },
    backgroundEffects: {
      main: `
        radial-gradient(ellipse at 30% 20%, rgba(232, 67, 147, 0.15) 0%, transparent 50%),
        radial-gradient(ellipse at 70% 80%, rgba(93, 173, 226, 0.1) 0%, transparent 50%),
        linear-gradient(180deg, #0a1628 0%, #0f2137 100%)
      `,
      overlay: 'none',
    },
  },
};

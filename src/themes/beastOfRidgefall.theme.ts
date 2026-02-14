/**
 * Beast of Ridgefall Theme
 * 
 * Dragon's Lair-inspired adventure theme featuring:
 * - Deep castle purples and warm amber-orange
 * - Rich dark backgrounds with mystical glow
 * - Bold fantasy typography
 * 
 * Evokes the classic Dragon's Lair arcade aesthetic.
 */

import type { TMPTheme } from './theme.types';

export const beastOfRidgefallTheme: TMPTheme = {
  id: 'beast-of-ridgefall',
  name: 'Beast of Ridgefall',
  description: 'A Dragon\'s Lair-inspired adventure theme with castle purples and amber-orange',
  system: 'universal',

  colors: {
    // Primary - Dragon's Lair Amber-Orange (Dirk's armor)
    primary: '#E8872A',      // Amber-orange
    // Secondary - Castle Purple (Dragon's sky)
    secondary: '#6B2FA0',    // Deep castle purple
    // Tertiary - Mystical Violet
    tertiary: '#9B30FF',     // Bright violet
    // Accent - Orange (main call-to-action)
    accent: '#E8872A',       // Orange for buttons/highlights
    
    // Backgrounds - Deep purple-black
    background: {
      main: '#0D0618',       // Deep purple-black
      card: '#120B20',       // Purple-tinted dark
      elevated: '#1A1230',   // Slightly elevated purple
    },
    
    // Text - Light text for dark background
    text: {
      primary: '#FFFFFF',    // Pure white
      secondary: '#C4A8E0',  // Lavender
      onPrimary: '#000000',  // Black on orange buttons
    },
    
    // Voting colors - Dragon's Lair palette
    voting: {
      optionA: '#E8872A',    // Amber-orange
      optionB: '#6B2FA0',    // Castle purple
      optionC: '#9B30FF',    // Bright violet
      progressTrack: '#1A1230',
    },
    
    // Status colors
    status: {
      success: '#4ADE80',    // Bright green
      error: '#EF4444',      // Red
      warning: '#E8872A',    // Orange
      info: '#6B2FA0',       // Purple
    },
  },

  typography: {
    fonts: {
      display: '"MedievalSharp", "Georgia", serif',    // D&D-style display font
      body: '"Spectral", "Georgia", serif',            // Sourcebook-style body
      accent: '"Pirata One", cursive',                 // Adventure accent for numbers/timers
    },
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=MedievalSharp&family=Spectral:wght@400;500;600;700&family=Pirata+One&display=swap',
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
      default: 'cubic-bezier(0.4, 0, 0.2, 1)',
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
      voteSelect: 'bor-vote-cast',
      voteIncrement: 'bor-vote-pulse',
      progressUpdate: 'bor-progress-fill',
      idle: 'bor-subtle-glow',
      victory: 'bor-winner-reveal',
      buttonHover: 'bor-hover-lift',
    },
  },

  sounds: {
    votecast: '/sounds/beast-of-ridgefall/vote-cast.mp3',
    timerTick: '/sounds/beast-of-ridgefall/timer-tick.mp3',
    timerEnd: '/sounds/beast-of-ridgefall/timer-end.mp3',
    victory: '/sounds/beast-of-ridgefall/victory.mp3',
    uiClick: '/sounds/beast-of-ridgefall/ui-click.mp3',
    error: '/sounds/beast-of-ridgefall/error.mp3',
    ambient: '/sounds/beast-of-ridgefall/ambient-village.mp3',
    // Extended ambient options
    ambientTavern: '/sounds/beast-of-ridgefall/ambient-tavern.mp3',
    ambientForest: '/sounds/beast-of-ridgefall/ambient-forest.mp3',
    ambientMystery: '/sounds/beast-of-ridgefall/ambient-mystery.mp3',
    // Battle music
    battleCombat: '/sounds/beast-of-ridgefall/battle-combat.mp3',
    battleBoss: '/sounds/beast-of-ridgefall/battle-boss.mp3',
    battleTension: '/sounds/beast-of-ridgefall/battle-tension.mp3',
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
      small: '0 2px 4px rgba(0, 0, 0, 0.4)',
      medium: '0 4px 12px rgba(0, 0, 0, 0.5)',
      large: '0 8px 24px rgba(0, 0, 0, 0.6)',
      glow: '0 0 25px rgba(232, 135, 42, 0.5)',  // Orange glow
    },
    backgroundEffects: {
      main: `
        radial-gradient(ellipse at 50% 0%, rgba(232, 135, 42, 0.08) 0%, transparent 50%),
        radial-gradient(ellipse at 20% 80%, rgba(107, 47, 160, 0.1) 0%, transparent 40%),
        radial-gradient(ellipse at 80% 60%, rgba(232, 135, 42, 0.06) 0%, transparent 50%),
        linear-gradient(180deg, #0D0618 0%, #120B20 40%, #0D0618 100%)
      `,
      overlay: 'none',
    },
  },

  assets: {
    basePath: '/assets/themes/beast-of-ridgefall',
    
    logo: {
      src: '/assets/themes/beast-of-ridgefall/logo.png?v=2',
      alt: 'Beast of Ridgefall',
    },
    
    voteIcons: {
      optionA: {
        src: '/assets/themes/beast-of-ridgefall/icons/vote-a.svg',
        type: 'svg',
        alt: 'Option A',
        idleAnimation: 'bor-subtle-glow',
        selectAnimation: 'bor-vote-cast',
      },
      optionB: {
        src: '/assets/themes/beast-of-ridgefall/icons/vote-b.svg',
        type: 'svg',
        alt: 'Option B',
        idleAnimation: 'bor-subtle-glow',
        selectAnimation: 'bor-vote-cast',
      },
      optionC: {
        src: '/assets/themes/beast-of-ridgefall/icons/vote-c.svg',
        type: 'svg',
        alt: 'Option C',
        idleAnimation: 'bor-subtle-glow',
        selectAnimation: 'bor-vote-cast',
      },
    },
    
    cardFrame: {
      border: '/assets/themes/beast-of-ridgefall/frames/card-frame.svg',
      effect: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))',
    },
    
    progressBar: {
      fillStyle: 'linear-gradient(180deg, #C4A8E0 0%, #9B6DC8 50%, #6B2FA0 100%)',
    },
    
    winnerBanner: {
      graphic: '/assets/themes/beast-of-ridgefall/banners/winner-banner.svg',
      particles: 'sparkle',
    },
  },
};

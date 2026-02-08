/**
 * Beast of Ridgefall Theme
 * 
 * A whimsical adventure theme featuring:
 * - Jewel tones (sapphire, emerald, amethyst)
 * - Rich stone backgrounds
 * - Topaz gold accents
 * 
 * Evokes D&D sourcebooks and fairy tale adventure.
 */

import type { TMPTheme } from './theme.types';

export const beastOfRidgefallTheme: TMPTheme = {
  id: 'beast-of-ridgefall',
  name: 'Beast of Ridgefall',
  description: 'A whimsical adventure theme with jewel tones and D&D-inspired typography',
  system: 'universal',

  colors: {
    // Primary - Cap'n Crunch Gold (from MTP logo)
    primary: '#E4A11B',      // Gold
    // Secondary - Ocean Blue (from logo D20)
    secondary: '#1E6091',    // Deep ocean blue
    // Tertiary - Berry Pink
    tertiary: '#C13584',     // Berry pink
    // Accent - Gold (main call-to-action)
    accent: '#E4A11B',       // Gold for buttons/highlights
    
    // Backgrounds - Pure black
    background: {
      main: '#000000',       // Pure black
      card: '#0a0a0a',       // Near black for cards
      elevated: '#141414',   // Slightly elevated
    },
    
    // Text - Light text for dark background
    text: {
      primary: '#FFFFFF',    // Pure white
      secondary: '#A8C5D8',  // Sea foam blue
      onPrimary: '#000000',  // Black on gold buttons
    },
    
    // Voting colors - MTP Logo palette
    voting: {
      optionA: '#E4A11B',    // Gold
      optionB: '#1E6091',    // Ocean blue
      optionC: '#C13584',    // Berry pink
      progressTrack: '#1a1a1a',
    },
    
    // Status colors
    status: {
      success: '#4ADE80',    // Bright green
      error: '#EF4444',      // Red
      warning: '#E4A11B',    // Gold
      info: '#1E6091',       // Ocean blue
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
      glow: '0 0 25px rgba(228, 161, 27, 0.5)',  // Gold glow
    },
    backgroundEffects: {
      main: `
        radial-gradient(ellipse at 50% 0%, rgba(228, 161, 27, 0.08) 0%, transparent 50%),
        radial-gradient(ellipse at 20% 80%, rgba(30, 96, 145, 0.1) 0%, transparent 40%),
        radial-gradient(ellipse at 80% 60%, rgba(228, 161, 27, 0.06) 0%, transparent 50%),
        linear-gradient(180deg, #000000 0%, #0a0a0a 40%, #000000 100%)
      `,
      overlay: 'none',
    },
  },

  assets: {
    basePath: '/assets/themes/beast-of-ridgefall',
    
    logo: {
      src: '/assets/themes/beast-of-ridgefall/logo.png',
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
      fillStyle: 'linear-gradient(180deg, #8FC1E8 0%, #5B9BD5 50%, #3A7BB5 100%)',
    },
    
    winnerBanner: {
      graphic: '/assets/themes/beast-of-ridgefall/banners/winner-banner.svg',
      particles: 'sparkle',
    },
  },
};

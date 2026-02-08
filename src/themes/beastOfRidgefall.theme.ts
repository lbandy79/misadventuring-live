/**
 * Beast of Ridgefall Theme
 * 
 * A fairy tale fantasy theme featuring:
 * - Sky blues (primary)
 * - Stone greys (backgrounds)
 * - Forest and grass greens (secondary/accents)
 * 
 * Evokes classic storybook illustrations and medieval fantasy.
 */

import type { TMPTheme } from './theme.types';

export const beastOfRidgefallTheme: TMPTheme = {
  id: 'beast-of-ridgefall',
  name: 'Beast of Ridgefall',
  description: 'A fairy tale fantasy theme with sky blues, stone greys, and verdant greens',
  system: 'universal',

  colors: {
    // Primary - Sky Blue (fairy tale sky)
    primary: '#5B9BD5',
    // Secondary - Forest Green
    secondary: '#4A7C59',
    // Tertiary - Grass Green (bright accent)
    tertiary: '#7CB342',
    
    // Backgrounds - Stone Greys
    background: {
      main: '#2C2F33',       // Dark stone
      card: '#3A3F44',       // Medium stone
      elevated: '#4A5058',   // Light stone
    },
    
    // Text
    text: {
      primary: '#F5F5F0',    // Warm parchment white
      secondary: '#B8C4CE',  // Soft grey-blue
      onPrimary: '#1E2124',  // Dark charcoal
    },
    
    // Voting colors - Fantasy themed
    voting: {
      optionA: '#5B9BD5',    // Sky blue
      optionB: '#7CB342',    // Grass green
      optionC: '#9C7AB5',    // Mystic purple
      progressTrack: '#2C2F33', // Dark stone background
    },
    
    // Status colors
    status: {
      success: '#4CAF50',    // Verdant green
      error: '#C75050',      // Muted dragon red
      warning: '#E8A33C',    // Golden amber
      info: '#5B9BD5',       // Sky blue
    },
  },

  typography: {
    fonts: {
      display: '"Cinzel", "Georgia", serif',           // Medieval/fantasy display font
      body: '"Lora", "Georgia", serif',                // Readable storybook body
      accent: '"Uncial Antiqua", cursive',             // Celtic/medieval accent
    },
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Lora:wght@400;500;600&family=Uncial+Antiqua&display=swap',
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
    ambient: '/sounds/beast-of-ridgefall/ambient.mp3',
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
      glow: '0 0 20px rgba(91, 155, 213, 0.4)',  // Sky blue glow
    },
    backgroundEffects: {
      main: `
        radial-gradient(ellipse at 30% 20%, rgba(91, 155, 213, 0.10) 0%, transparent 50%),
        radial-gradient(ellipse at 70% 80%, rgba(74, 124, 89, 0.08) 0%, transparent 50%),
        linear-gradient(180deg, #2C2F33 0%, #3A3F44 100%)
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

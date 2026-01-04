/**
 * Soggy Bottom Pirates Theme
 * 
 * The Cereal-Punk D&D Campaign!
 * - Captain Malvoy's crew aboard the Soggy Bottom
 * - Aesthetic: Cereal mascots meet golden age of piracy
 * - Colors: Cap'n Crunch golds, Milk-splash creams, Berry blues
 * - Vibe: Playful, nautical, breakfast-themed chaos
 */

import type { TMPTheme } from './theme.types';

export const soggyBottomPiratesTheme: TMPTheme = {
  id: 'soggy-bottom-pirates',
  name: 'Soggy Bottom Pirates',
  description: 'Cereal-punk pirate adventures on the high seas of breakfast!',
  system: 'dnd-5e',

  colors: {
    primary: '#E4A11B',          // Cap'n Crunch gold
    secondary: '#1E6091',         // Deep ocean blue
    tertiary: '#C13584',          // Berry pink

    background: {
      main: '#0A1628',            // Night ocean
      card: '#132238',            // Ship deck
      elevated: '#1A3050',        // Captain's quarters
    },

    text: {
      primary: '#FFF8E7',         // Cream/milk white
      secondary: '#A8C5D8',       // Sea foam
      onPrimary: '#1A1A1A',       // Dark for gold buttons
    },

    voting: {
      optionA: '#E4A11B',         // Gold
      optionB: '#1E6091',         // Ocean blue
      optionC: '#C13584',         // Berry
      progressTrack: '#0D1B2A',   // Deep water
    },

    status: {
      success: '#4ADE80',         // Lucky charm green
      warning: '#FBBF24',         // Honey glow
      error: '#EF4444',           // Fruit loops red
      info: '#38BDF8',            // Sky blue
    },
  },

  typography: {
    fonts: {
      display: '"Luckiest Guy", "Titan One", cursive',
      body: '"Patrick Hand", "Comic Neue", cursive',
      accent: '"Permanent Marker", cursive',
    },
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Luckiest+Guy&family=Patrick+Hand&family=Titan+One&family=Permanent+Marker&display=swap',
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
      voteSelect: 'sbp-splash',
      voteIncrement: 'sbp-bob',
      progressUpdate: 'sbp-wave',
      idle: 'sbp-float',
      victory: 'sbp-treasure',
      buttonHover: 'sbp-shine',
    },
  },

  sounds: {
    votecast: '/sounds/sbp/cannon-shot.mp3',
    timerTick: '/sounds/sbp/ship-bell.mp3',
    timerEnd: '/sounds/sbp/anchor-drop.mp3',
    victory: '/sounds/sbp/treasure-found.mp3',
    uiClick: '/sounds/sbp/wood-creak.mp3',
    error: '/sounds/sbp/splash.mp3',
    ambient: '/sounds/sbp/ocean-waves.mp3',
  },

  effects: {
    borderRadius: {
      small: '4px',
      medium: '8px',
      large: '16px',
      button: '8px',
      card: '12px',
    },
    shadows: {
      small: '0 2px 4px rgba(0, 0, 0, 0.3)',
      medium: '0 4px 12px rgba(0, 0, 0, 0.4)',
      large: '0 8px 24px rgba(0, 0, 0, 0.5)',
      glow: '0 0 20px rgba(228, 161, 27, 0.4)',
    },
    backgroundEffects: {
      main: `
        radial-gradient(ellipse at 50% 100%, rgba(30, 96, 145, 0.3) 0%, transparent 50%),
        linear-gradient(180deg, #0A1628 0%, #132238 100%)
      `,
      overlay: 'url(/images/sbp/wave-pattern.svg)',
    },
  },

  assets: {
    basePath: '/assets/themes/soggy-bottom-pirates',
    
    voteIcons: {
      optionA: {
        src: '/assets/themes/soggy-bottom-pirates/icons/anchor.svg',
        type: 'svg',
        alt: 'Golden Anchor',
        idleAnimation: 'sbp-float',
        selectAnimation: 'sbp-splash',
      },
      optionB: {
        src: '/assets/themes/soggy-bottom-pirates/icons/treasure.svg',
        type: 'svg',
        alt: 'Treasure Chest',
        idleAnimation: 'sbp-bob',
        selectAnimation: 'sbp-treasure',
      },
      optionC: {
        src: '/assets/themes/soggy-bottom-pirates/icons/skull.svg',
        type: 'svg',
        alt: 'Jolly Roger',
        idleAnimation: 'sbp-float',
        selectAnimation: 'sbp-splash',
      },
    },
    
    cardFrame: {
      border: '/assets/themes/soggy-bottom-pirates/frames/card-frame.svg',
      texture: '/assets/themes/soggy-bottom-pirates/frames/parchment-texture.png',
      effect: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))',
    },
    
    progressBar: {
      trackTexture: '/assets/themes/soggy-bottom-pirates/frames/rope-track.svg',
      fillStyle: 'linear-gradient(180deg, #FFD700 0%, #E4A11B 50%, #C4920B 100%)',
      endCap: '/assets/themes/soggy-bottom-pirates/icons/anchor.svg',
    },
    
    winnerBanner: {
      graphic: '/assets/themes/soggy-bottom-pirates/banners/winner-scroll.svg',
      particles: 'confetti',
    },
    
    decorations: {
      divider: '/assets/themes/soggy-bottom-pirates/frames/rope-divider.svg',
      corner: '/assets/themes/soggy-bottom-pirates/frames/corner-flourish.svg',
    },
  },
};

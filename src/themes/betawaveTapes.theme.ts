/**
 * Betawave Tapes: Last Call Theme
 * 
 * 1991 small-town America. VHS era. A going-away party at the local bar
 * that curdles into analog horror. The app itself is diegetic — tracking
 * lines and static on the audience's phones are the Betawave bleeding
 * into their devices.
 * 
 * Forked from neon-nightmares with warm amber accent for bar-light feel.
 * Color arc: Act 1 warm amber → Act 2 cold cyan/static
 */

import type { TMPTheme } from './theme.types';

export const betawaveTapesTheme: TMPTheme = {
  id: 'betawave-tapes',
  name: 'The Betawave Tapes: Last Call',
  description: 'Tape #1 — 1991. A going-away party. Something in the static.',
  system: 'kids-on-bikes',

  colors: {
    primary: '#FF2D95',           // Neon magenta (VHS label energy)
    secondary: '#00E5EE',         // Electric cyan (CRT glow)
    tertiary: '#F59E0B',          // Warm amber (bar light, beer signs)

    background: {
      main: '#0A0A0F',            // VHS black
      card: '#111118',            // Darker than neon-nightmares for more contrast
      elevated: '#1A1825',        // Midnight with warmth
    },

    text: {
      primary: '#EAEAEA',         // CRT white
      secondary: '#9B9BAA',       // Static gray (warmer)
      onPrimary: '#0A0A0F',       // Dark for neon buttons
    },

    voting: {
      optionA: '#FF2D95',         // Neon magenta
      optionB: '#00E5EE',         // Cyan
      optionC: '#F59E0B',         // Amber
      progressTrack: '#1A1825',
    },

    status: {
      success: '#39FF14',         // CRT phosphor green
      warning: '#F59E0B',         // Bar amber
      error: '#FF3366',           // Blood neon
      info: '#00E5EE',            // Cyan
    },
  },

  typography: {
    fonts: {
      display: '"Monoton", cursive',
      body: '"VT323", "Courier New", monospace',
      accent: '"Orbitron", "Share Tech Mono", sans-serif',
    },
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Monoton&family=VT323&family=Orbitron:wght@500;700&family=Share+Tech+Mono&display=swap',
    sizes: {
      hero: '3.5rem',
      h1: '2.5rem',
      h2: '1.8rem',
      h3: '1.4rem',
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
      voteSelect: 'bw-glitch',
      voteIncrement: 'bw-flicker',
      progressUpdate: 'bw-scan',
      idle: 'bw-static',
      victory: 'bw-strobe',
      buttonHover: 'bw-glow-pulse',
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
      medium: '0 0 15px rgba(255, 45, 149, 0.3), 0 0 15px rgba(245, 158, 11, 0.15)',
      large: '0 0 30px rgba(255, 45, 149, 0.4), 0 0 30px rgba(245, 158, 11, 0.2)',
      glow: `
        0 0 10px rgba(255, 45, 149, 0.7),
        0 0 20px rgba(255, 45, 149, 0.4),
        0 0 40px rgba(245, 158, 11, 0.2)
      `,
    },
    backgroundEffects: {
      main: `
        repeating-linear-gradient(
          0deg,
          rgba(0, 0, 0, 0.12) 0px,
          rgba(0, 0, 0, 0.12) 1px,
          transparent 1px,
          transparent 2px
        ),
        linear-gradient(180deg, #0A0A0F 0%, #11101A 50%, #0A0A0F 100%)
      `,
    },
  },

  // Share neon-nightmares assets for now — can be replaced with Betawave-specific assets later
  assets: {
    basePath: '/assets/themes/neon-nightmares',

    logo: {
      src: '/assets/themes/neon-nightmares/logo.png',
      alt: 'The Betawave Tapes: Last Call',
    },

    voteIcons: {
      optionA: {
        src: '/assets/themes/neon-nightmares/icons/eye.svg',
        type: 'svg',
        alt: 'Watching Eye',
        idleAnimation: 'bw-glow-pulse',
        selectAnimation: 'bw-glitch',
      },
      optionB: {
        src: '/assets/themes/neon-nightmares/icons/vhs.svg',
        type: 'svg',
        alt: 'VHS Tape',
        idleAnimation: 'bw-static',
        selectAnimation: 'bw-flicker',
      },
      optionC: {
        src: '/assets/themes/neon-nightmares/icons/static.svg',
        type: 'svg',
        alt: 'Static TV',
        idleAnimation: 'bw-scan',
        selectAnimation: 'bw-strobe',
      },
    },

    cardFrame: {
      border: '/assets/themes/neon-nightmares/frames/card-frame.svg',
      texture: '/assets/themes/neon-nightmares/frames/crt-overlay.png',
      effect: `
        drop-shadow(0 0 8px rgba(255, 45, 149, 0.4))
        drop-shadow(0 0 16px rgba(245, 158, 11, 0.2))
      `,
    },

    progressBar: {
      trackTexture: '/assets/themes/neon-nightmares/frames/vhs-track.svg',
      fillStyle: `
        linear-gradient(90deg,
          #FF2D95 0%,
          #F59E0B 50%,
          #00E5EE 100%
        )
      `,
      endCap: '/assets/themes/neon-nightmares/icons/eye.svg',
    },

    winnerBanner: {
      graphic: '/assets/themes/neon-nightmares/banners/winner-glitch.svg',
      animation: '/assets/themes/neon-nightmares/banners/winner-glitch.json',
      particles: 'glitch',
    },

    decorations: {
      divider: '/assets/themes/neon-nightmares/frames/scanline-divider.svg',
      corner: '/assets/themes/neon-nightmares/frames/corner-static.svg',
    },
  },
};

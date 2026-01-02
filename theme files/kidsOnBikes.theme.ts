/**
 * Kids on Bikes Theme
 * 
 * A vaporwave/VHS aesthetic for 80s supernatural mystery adventures.
 * Inspired by Stranger Things, The Lost Boys, Monster Squad, and E.T.
 * 
 * VISUAL DIRECTION:
 * - Neon pink and cyan on deep purple/black backgrounds
 * - VHS scan lines, tracking artifacts, CRT glow
 * - Retro-futuristic typography with synth-wave flair
 * - Glitchy, flickering animations
 * - Sounds: synth stabs, tape hiss, arcade bleeps
 * 
 * SYSTEM CONTEXT:
 * Kids on Bikes is a rules-light collaborative storytelling game
 * about small-town kids facing supernatural mysteries. The tone
 * balances childhood wonder with creeping horror.
 */

import { TMPTheme } from '../types/theme.types';

export const kidsOnBikesTheme: TMPTheme = {
  id: 'kids-on-bikes',
  name: 'Kids on Bikes',
  description: '80s vaporwave VHS aesthetic for supernatural mystery',
  system: 'kids-on-bikes',
  
  // ===========================================================================
  // COLORS - Neon on dark, CRT glow
  // ===========================================================================
  colors: {
    // Hot neon pink - the hero accent
    primary: '#FF2D95',
    
    // Electric cyan - secondary neon
    secondary: '#00F0FF',
    
    // Warm amber - like streetlights or flashlight beams
    tertiary: '#FFB800',
    
    background: {
      // Deep purple-black - like a CRT screen off
      main: '#0D0221',
      // Slightly lighter for cards - midnight purple
      card: '#1A0A2E',
      // Elevated surfaces with subtle purple
      elevated: '#2D1B4E',
    },
    
    text: {
      // Slightly warm white - like old CRT phosphor
      primary: '#F0E6FF',
      // Muted lavender
      secondary: '#9B8AA8',
      // Dark text on neon backgrounds
      onPrimary: '#0D0221',
    },
    
    voting: {
      // Option A - Hot pink (bold choice)
      optionA: '#FF2D95',
      // Option B - Electric cyan (cautious choice)
      optionB: '#00F0FF',
      // Option C - Amber (wild card)
      optionC: '#FFB800',
      // Progress track - deep purple
      progressTrack: '#1A0A2E',
    },
    
    status: {
      success: '#00FF9F',  // Matrix green
      warning: '#FFB800',  // Amber
      error: '#FF3366',    // Hot red-pink
      info: '#00F0FF',     // Cyan
    },
  },
  
  // ===========================================================================
  // TYPOGRAPHY - Retro-futuristic, arcade-inspired
  // ===========================================================================
  typography: {
    fonts: {
      // Display: Bold retro-futuristic - Orbitron has that 80s sci-fi feel
      display: '"Orbitron", "Audiowide", "Rajdhani", sans-serif',
      
      // Body: Clean but with character - Space Mono for that terminal feel
      body: '"Space Mono", "VT323", "Courier New", monospace',
      
      // Accent: For spooky/supernatural moments
      accent: '"Creepster", "Nosifer", cursive',
    },
    
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Space+Mono:wght@400;700&family=Creepster&display=swap',
    
    sizes: {
      // Hero size - big and bold for venue visibility
      hero: 'clamp(2.5rem, 8vw, 5rem)',
      h1: 'clamp(2rem, 5vw, 3.5rem)',
      h2: 'clamp(1.5rem, 3vw, 2rem)',
      h3: 'clamp(1.25rem, 2.5vw, 1.5rem)',
      body: '1rem',
      small: '0.875rem',
    },
    
    weights: {
      normal: 400,
      medium: 500,
      bold: 700,
      black: 900,
    },
  },
  
  // ===========================================================================
  // ANIMATIONS - Glitchy, flickering, CRT artifacts
  // ===========================================================================
  animations: {
    easing: {
      // Sharp, digital feeling
      default: 'cubic-bezier(0.23, 1, 0.32, 1)',
      // Glitchy bounce
      bounce: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
      // Snappy digital entrance
      enter: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
      // Quick cut exit
      exit: 'cubic-bezier(0.4, 0.0, 1, 1)',
    },
    
    duration: {
      fast: 100,
      normal: 250,
      slow: 400,
      // Vote updates should feel snappy
      voteUpdate: 300,
    },
    
    // These reference CSS @keyframes defined in kidsOnBikes.animations.css
    keyframes: {
      voteSelect: 'kob-glitch-select',
      voteIncrement: 'kob-flicker',
      progressUpdate: 'kob-scan-fill',
      idle: 'kob-static',
      victory: 'kob-neon-burst',
      buttonHover: 'kob-glow-pulse',
    },
  },
  
  // ===========================================================================
  // SOUNDS - Synth stabs, tape artifacts, arcade bleeps
  // ===========================================================================
  sounds: {
    // Synth stab when casting vote
    votecast: '/sounds/kids-on-bikes/synth-vote.mp3',
    
    // VHS play button click + tape whir
    votingOpen: '/sounds/kids-on-bikes/vcr-play.mp3',
    
    // Tape stop + static burst
    votingClose: '/sounds/kids-on-bikes/vcr-stop.mp3',
    
    // Digital beep countdown
    countdownTick: '/sounds/kids-on-bikes/arcade-tick.mp3',
    
    // Triumphant synth fanfare
    victory: '/sounds/kids-on-bikes/synth-victory.mp3',
    
    // Low synth drone + tape hiss (optional ambient)
    ambient: '/sounds/kids-on-bikes/vhs-ambient.mp3',
    
    // Subtle electronic chirp
    buttonHover: '/sounds/kids-on-bikes/blip.mp3',
  },
  
  // ===========================================================================
  // EFFECTS - CRT glow, scan lines, neon edges
  // ===========================================================================
  effects: {
    borderRadius: {
      small: '2px',
      medium: '4px',
      large: '8px',
      // Cards get minimal rounding - more digital/angular
      card: '4px',
      // Buttons slightly more rounded
      button: '4px',
    },
    
    shadows: {
      // Subtle lift
      small: '0 2px 4px rgba(0, 0, 0, 0.5)',
      // Card elevation with neon bleed
      medium: '0 4px 20px rgba(255, 45, 149, 0.2), 0 4px 12px rgba(0, 0, 0, 0.4)',
      // Modal/popup - dramatic neon glow
      large: '0 8px 40px rgba(255, 45, 149, 0.3), 0 8px 32px rgba(0, 0, 0, 0.5)',
      // Neon glow for active/selected states
      glow: '0 0 20px rgba(255, 45, 149, 0.6), 0 0 40px rgba(0, 240, 255, 0.3), 0 0 60px rgba(255, 45, 149, 0.2)',
    },
    
    backgroundEffects: {
      // Dark gradient with subtle grid pattern suggestion
      main: `
        linear-gradient(180deg, #0D0221 0%, #1A0A2E 50%, #0D0221 100%)
      `,
      // Scan line overlay for cards
      cardOverlay: `
        repeating-linear-gradient(
          0deg,
          transparent,
          transparent 2px,
          rgba(0, 0, 0, 0.1) 2px,
          rgba(0, 0, 0, 0.1) 4px
        )
      `,
      // Heavy scan lines for that CRT feel
      useGrain: true,
      grainOpacity: 0.05,
    },
    
    // Use emoji for simplicity, but spookier options
    iconSet: 'emoji',
    
    // Root class for theme-specific global styles
    rootClassName: 'theme-kids-on-bikes',
  },
};

// =============================================================================
// THEME-SPECIFIC ICON MAPPINGS
// =============================================================================

/**
 * Suggested icons for common vote options in Kids on Bikes.
 * Lean into the small-town mystery/horror vibe.
 */
export const kidsOnBikesIcons: Record<string, string> = {
  // Investigation actions
  investigate: '🔍',
  search: '🔦',
  sneak: '🤫',
  hide: '🙈',
  run: '🏃',
  fight: '👊',
  
  // Social actions
  talk: '💬',
  convince: '🗣️',
  lie: '🤥',
  help: '🤝',
  
  // Supernatural
  psychic: '🔮',
  power: '⚡',
  strange: '👁️',
  monster: '👹',
  
  // Locations
  woods: '🌲',
  school: '🏫',
  home: '🏠',
  downtown: '🏪',
  
  // Items
  bike: '🚲',
  flashlight: '🔦',
  walkie: '📻',
  camera: '📷',
  
  // Emotions/States
  brave: '💪',
  scared: '😰',
  curious: '🤔',
  
  // General
  yes: '✅',
  no: '❌',
  maybe: '❓',
  
  // Default
  default: '🎲',
};

/**
 * Get the appropriate icon for a vote option label.
 */
export function getKidsOnBikesIcon(label: string): string {
  const key = label.toLowerCase().trim();
  return kidsOnBikesIcons[key] || kidsOnBikesIcons.default;
}

export default kidsOnBikesTheme;

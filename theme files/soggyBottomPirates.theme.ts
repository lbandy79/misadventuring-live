/**
 * Soggy Bottom Pirates Theme
 * 
 * A cereal-punk pirate aesthetic for The Misadventuring Party live app.
 * Inspired by 80s cereal box art, Saturday morning cartoons, and nautical adventure.
 * 
 * VISUAL DIRECTION:
 * - Bright, saturated cereal-box primaries (Cap'n Crunch yellows, Froot Loop rainbow)
 * - Warm cream backgrounds evoking milk
 * - Chunky, playful typography with nautical flair
 * - Animations that "bob" and "splash" like floating on milk
 * - Sounds: crunchy foley, nautical bells, triumphant fanfares
 * 
 * CAMPAIGN CONTEXT:
 * Set in the Milky Bowl - a cereal-themed pirate world with races like:
 * - Crunch Sailors (seasoned mariners)
 * - Honeykin (tiny bee-folk)
 * - Sugarborn (resilient peacemakers)
 * - Little Mikeys (curious explorers)
 * - Cuckoo Birds (chaotic avians)
 */

import { TMPTheme } from '../types/theme.types';

export const soggyBottomPiratesTheme: TMPTheme = {
  id: 'soggy-bottom-pirates',
  name: 'Soggy Bottom Pirates',
  description: 'Cereal-punk pirate adventure on the Milky Bowl (D&D 5e reskin)',
  system: 'dnd-5e',
  
  // ===========================================================================
  // COLORS - Cereal box primaries with milk-cream backgrounds
  // ===========================================================================
  colors: {
    // Cap'n Crunch gold - the hero color
    primary: '#FFD700',
    
    // Ocean blue of the Milky Bowl
    secondary: '#1E90FF',
    
    // Froot Loop coral/red accent
    tertiary: '#FF6B6B',
    
    background: {
      // Deep navy - like the deep Milky Bowl at night
      main: '#0A1628',
      // Slightly lighter navy for cards
      card: '#132238',
      // Elevated surfaces get a touch of the primary
      elevated: '#1A2D4A',
    },
    
    text: {
      // Warm cream - like milk
      primary: '#FFF8E7',
      // Muted cream
      secondary: '#B8A88A',
      // Dark text on gold backgrounds
      onPrimary: '#1A1A2E',
    },
    
    voting: {
      // Fight option - bold coral red (Fruit Brute energy)
      optionA: '#E63946',
      // Flee option - adventurous green (Lucky Charms)
      optionB: '#2ECC71',
      // Third option - ocean blue
      optionC: '#3498DB',
      // Progress track - dark navy
      progressTrack: '#1A2D4A',
    },
    
    status: {
      success: '#2ECC71',
      warning: '#F39C12',
      error: '#E74C3C',
      info: '#3498DB',
    },
  },
  
  // ===========================================================================
  // TYPOGRAPHY - Chunky, playful, readable from across a venue
  // ===========================================================================
  typography: {
    fonts: {
      // Display: Bold, chunky, slightly rounded - cereal box energy
      // Lilita One has that perfect cartoon weight
      display: '"Lilita One", "Bangers", "Comic Neue", cursive',
      
      // Body: Clean but friendly
      body: '"Nunito", "Quicksand", sans-serif',
      
      // Accent: For special callouts (pirate-y flair)
      accent: '"Pirata One", "Jolly Lodger", cursive',
    },
    
    // Import these fonts in your app's index.html or via CSS
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Lilita+One&family=Nunito:wght@400;600;700;800&family=Pirata+One&display=swap',
    
    sizes: {
      // Hero size for display view question
      hero: 'clamp(2.5rem, 8vw, 5rem)',
      h1: 'clamp(2rem, 5vw, 3.5rem)',
      h2: 'clamp(1.5rem, 3vw, 2rem)',
      h3: 'clamp(1.25rem, 2.5vw, 1.5rem)',
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
  
  // ===========================================================================
  // ANIMATIONS - Bobbing, splashing, floating on milk
  // ===========================================================================
  animations: {
    easing: {
      // Slightly bouncy default
      default: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      // Playful bounce for celebrations
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      // Snappy entrance
      enter: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
      // Smooth exit
      exit: 'cubic-bezier(0.4, 0.0, 1, 1)',
    },
    
    duration: {
      fast: 150,
      normal: 300,
      slow: 500,
      // Vote count updates should feel satisfying
      voteUpdate: 400,
    },
    
    // These reference CSS @keyframes defined in theme.animations.css
    keyframes: {
      voteSelect: 'sbp-vote-splash',
      voteIncrement: 'sbp-vote-bob',
      progressUpdate: 'sbp-wave-fill',
      idle: 'sbp-float',
      victory: 'sbp-victory-burst',
      buttonHover: 'sbp-ripple',
    },
  },
  
  // ===========================================================================
  // SOUNDS - Crunchy, nautical, triumphant
  // ===========================================================================
  sounds: {
    // Satisfying crunch when casting vote
    votecast: '/sounds/soggy-bottom/crunch-vote.mp3',
    
    // Ship's bell + splash
    votingOpen: '/sounds/soggy-bottom/bell-splash-open.mp3',
    
    // Anchor drop + wave
    votingClose: '/sounds/soggy-bottom/anchor-close.mp3',
    
    // Tick-tock with nautical flavor
    countdownTick: '/sounds/soggy-bottom/tick.mp3',
    
    // Triumphant fanfare - "Breakfast is served!"
    victory: '/sounds/soggy-bottom/victory-fanfare.mp3',
    
    // Gentle ocean ambiance (optional loop)
    ambient: '/sounds/soggy-bottom/milky-bowl-ambient.mp3',
    
    // Subtle bubble pop on hover
    buttonHover: '/sounds/soggy-bottom/bubble-pop.mp3',
  },
  
  // ===========================================================================
  // EFFECTS - Rounded, warm, nautical decorations
  // ===========================================================================
  effects: {
    borderRadius: {
      small: '4px',
      medium: '8px',
      large: '16px',
      // Vote cards get chunky, playful rounding
      card: '16px',
      // Buttons slightly less rounded
      button: '12px',
    },
    
    shadows: {
      // Subtle lift
      small: '0 2px 4px rgba(0, 0, 0, 0.3)',
      // Card elevation with warm tint
      medium: '0 4px 12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 215, 0, 0.1)',
      // Modal/popup - dramatic
      large: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 215, 0, 0.2)',
      // Gold glow for active/selected states
      glow: '0 0 20px rgba(255, 215, 0, 0.4), 0 0 40px rgba(255, 215, 0, 0.2)',
    },
    
    backgroundEffects: {
      // Gradient from deep navy to slightly lighter, with subtle radial "milk" effect
      main: `
        radial-gradient(ellipse at 50% 100%, rgba(255, 248, 231, 0.05) 0%, transparent 50%),
        linear-gradient(180deg, #0A1628 0%, #132238 100%)
      `,
      // Subtle inner glow for cards
      cardOverlay: 'linear-gradient(135deg, rgba(255, 215, 0, 0.05) 0%, transparent 50%)',
      // Light grain for texture
      useGrain: true,
      grainOpacity: 0.03,
    },
    
    // Use emoji for vote icons - fits the playful aesthetic
    iconSet: 'emoji',
    
    // Add this class to root for theme-specific global styles
    rootClassName: 'theme-soggy-bottom',
  },
};

// =============================================================================
// THEME-SPECIFIC ICON MAPPINGS
// =============================================================================

/**
 * Suggested icons for common vote options in Soggy Bottom Pirates.
 * Use these in your VoteOption component.
 */
export const soggyBottomIcons: Record<string, string> = {
  // Combat
  fight: '⚔️',
  flee: '🏃',
  negotiate: '🤝',
  attack: '⚔️',
  defend: '🛡️',
  
  // Navigation
  north: '🧭',
  south: '⚓',
  east: '🌅',
  west: '🌊',
  explore: '🗺️',
  
  // Pirate actions
  plunder: '💰',
  sail: '⛵',
  anchor: '⚓',
  board: '🏴‍☠️',
  parley: '🏳️',
  
  // Cereal-specific (for Milky Bowl flavor)
  crunch: '🥣',
  splash: '💦',
  swim: '🏊',
  dive: '🤿',
  
  // General
  yes: '✅',
  no: '❌',
  maybe: '🤔',
  help: '🆘',
  
  // Default fallback
  default: '🎲',
};

/**
 * Get the appropriate icon for a vote option label.
 * Falls back to default dice if no match found.
 */
export function getSoggyBottomIcon(label: string): string {
  const key = label.toLowerCase().trim();
  return soggyBottomIcons[key] || soggyBottomIcons.default;
}

export default soggyBottomPiratesTheme;

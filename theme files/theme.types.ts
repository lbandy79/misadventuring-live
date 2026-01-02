/**
 * TMP Live App Theme System - Type Definitions
 * 
 * This file defines the contract for all themes in The Misadventuring Party
 * live audience interaction app. Each theme controls colors, typography,
 * animations, and sound cues to create a cohesive visual identity.
 * 
 * ADDING A NEW THEME:
 * 1. Create a new file in /themes/ (e.g., bladesInTheDark.theme.ts)
 * 2. Export an object that satisfies the TMPTheme interface
 * 3. Register it in the THEMES constant in ThemeProvider.tsx
 * 
 * @example
 * // Creating a new theme
 * import { TMPTheme } from '../types/theme.types';
 * 
 * export const myNewTheme: TMPTheme = {
 *   id: 'my-theme',
 *   name: 'My New Theme',
 *   // ... rest of theme properties
 * };
 */

// =============================================================================
// CORE THEME INTERFACE
// =============================================================================

export interface TMPTheme {
  /** Unique identifier for the theme (kebab-case) */
  id: string;
  
  /** Display name shown in theme selector */
  name: string;
  
  /** Brief description of the theme's aesthetic */
  description: string;
  
  /** Associated game system or campaign */
  system: 'dnd-5e' | 'kids-on-bikes' | 'monster-disco' | 'custom';
  
  /** Color palette */
  colors: ThemeColors;
  
  /** Typography settings */
  typography: ThemeTypography;
  
  /** Animation configurations */
  animations: ThemeAnimations;
  
  /** Sound cue URLs or identifiers */
  sounds: ThemeSounds;
  
  /** Visual effects and decorations */
  effects: ThemeEffects;
}

// =============================================================================
// COLOR DEFINITIONS
// =============================================================================

export interface ThemeColors {
  /** Primary brand color - used for main UI elements */
  primary: string;
  
  /** Secondary accent color - used for highlights */
  secondary: string;
  
  /** Tertiary color - additional accent */
  tertiary: string;
  
  /** Background colors */
  background: {
    /** Main page background */
    main: string;
    /** Card/panel backgrounds */
    card: string;
    /** Elevated surface backgrounds */
    elevated: string;
  };
  
  /** Text colors */
  text: {
    /** Primary text on dark backgrounds */
    primary: string;
    /** Secondary/muted text */
    secondary: string;
    /** Text on primary-colored backgrounds */
    onPrimary: string;
  };
  
  /** Semantic colors for voting options */
  voting: {
    /** First option (typically "positive" choice like Fight) */
    optionA: string;
    /** Second option (typically "alternative" choice like Flee) */
    optionB: string;
    /** Third option if present */
    optionC?: string;
    /** Progress bar background */
    progressTrack: string;
  };
  
  /** Status colors */
  status: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };
}

// =============================================================================
// TYPOGRAPHY DEFINITIONS
// =============================================================================

export interface ThemeTypography {
  /** Font families */
  fonts: {
    /** Display/heading font - should be distinctive */
    display: string;
    /** Body text font - should be readable */
    body: string;
    /** Accent font for special elements (optional) */
    accent?: string;
  };
  
  /** Google Fonts import URL (if using web fonts) */
  googleFontsUrl?: string;
  
  /** Font size scale */
  sizes: {
    /** Hero text (vote question on display view) */
    hero: string;
    /** Large headings */
    h1: string;
    /** Section headings */
    h2: string;
    /** Card titles */
    h3: string;
    /** Body text */
    body: string;
    /** Small text/labels */
    small: string;
  };
  
  /** Font weights */
  weights: {
    normal: number;
    medium: number;
    bold: number;
    black: number;
  };
}

// =============================================================================
// ANIMATION DEFINITIONS
// =============================================================================

export interface ThemeAnimations {
  /** Timing functions */
  easing: {
    /** Standard ease for most animations */
    default: string;
    /** Bouncy/playful ease */
    bounce: string;
    /** Snappy entrance */
    enter: string;
    /** Smooth exit */
    exit: string;
  };
  
  /** Duration presets (in ms) */
  duration: {
    fast: number;
    normal: number;
    slow: number;
    /** Vote count update animation */
    voteUpdate: number;
  };
  
  /** Named keyframe animation identifiers */
  keyframes: {
    /** Animation for vote button when selected */
    voteSelect: string;
    /** Animation for vote count incrementing */
    voteIncrement: string;
    /** Animation for progress bar updates */
    progressUpdate: string;
    /** Idle/ambient animation for waiting states */
    idle: string;
    /** Victory/completion animation */
    victory: string;
    /** Button hover effect */
    buttonHover: string;
  };
}

// =============================================================================
// SOUND DEFINITIONS
// =============================================================================

export interface ThemeSounds {
  /** Sound when user casts a vote */
  votecast: string;
  
  /** Sound when voting opens */
  votingOpen: string;
  
  /** Sound when voting closes */
  votingClose: string;
  
  /** Countdown tick sound (last 10 seconds) */
  countdownTick?: string;
  
  /** Victory fanfare */
  victory: string;
  
  /** Ambient/background music loop (optional) */
  ambient?: string;
  
  /** Button hover sound (optional) */
  buttonHover?: string;
}

// =============================================================================
// VISUAL EFFECTS DEFINITIONS
// =============================================================================

export interface ThemeEffects {
  /** Border radius scale */
  borderRadius: {
    small: string;
    medium: string;
    large: string;
    /** For vote option cards */
    card: string;
    /** For buttons */
    button: string;
  };
  
  /** Box shadow presets */
  shadows: {
    /** Subtle elevation */
    small: string;
    /** Card elevation */
    medium: string;
    /** Modal/popup elevation */
    large: string;
    /** Glow effect for active states */
    glow: string;
  };
  
  /** Background effects */
  backgroundEffects: {
    /** CSS for main background (can include gradients, patterns) */
    main: string;
    /** Overlay effect for cards */
    cardOverlay?: string;
    /** Whether to use grain/noise texture */
    useGrain: boolean;
    /** Grain opacity if used */
    grainOpacity?: number;
  };
  
  /** Icon set identifier (for vote option icons) */
  iconSet: 'emoji' | 'lucide' | 'custom';
  
  /** Custom CSS class to add to root element */
  rootClassName?: string;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/** Theme identifiers for type-safe theme switching */
export type ThemeId = 
  | 'soggy-bottom-pirates'
  | 'kids-on-bikes'
  | 'dnd-classic'
  | 'monster-disco'
  | string; // Allow custom themes

/** Props for components that accept theme overrides */
export interface ThemeableProps {
  /** Override specific theme values */
  themeOverrides?: Partial<TMPTheme>;
  /** Force a specific theme regardless of context */
  forceTheme?: ThemeId;
}

// =============================================================================
// CSS VARIABLE MAPPING
// =============================================================================

/**
 * Maps theme properties to CSS custom property names.
 * Used by ThemeProvider to generate CSS variables.
 * 
 * @example
 * // Theme value: theme.colors.primary = '#FFD700'
 * // Generates: --tmp-color-primary: #FFD700;
 * // Usage in CSS: color: var(--tmp-color-primary);
 */
export const CSS_VAR_PREFIX = '--tmp';

export const CSS_VAR_MAP = {
  // Colors
  'colors.primary': 'color-primary',
  'colors.secondary': 'color-secondary',
  'colors.tertiary': 'color-tertiary',
  'colors.background.main': 'bg-main',
  'colors.background.card': 'bg-card',
  'colors.background.elevated': 'bg-elevated',
  'colors.text.primary': 'text-primary',
  'colors.text.secondary': 'text-secondary',
  'colors.text.onPrimary': 'text-on-primary',
  'colors.voting.optionA': 'vote-option-a',
  'colors.voting.optionB': 'vote-option-b',
  'colors.voting.optionC': 'vote-option-c',
  'colors.voting.progressTrack': 'vote-progress-track',
  'colors.status.success': 'status-success',
  'colors.status.warning': 'status-warning',
  'colors.status.error': 'status-error',
  'colors.status.info': 'status-info',
  
  // Typography
  'typography.fonts.display': 'font-display',
  'typography.fonts.body': 'font-body',
  'typography.fonts.accent': 'font-accent',
  'typography.sizes.hero': 'size-hero',
  'typography.sizes.h1': 'size-h1',
  'typography.sizes.h2': 'size-h2',
  'typography.sizes.h3': 'size-h3',
  'typography.sizes.body': 'size-body',
  'typography.sizes.small': 'size-small',
  
  // Animation durations
  'animations.duration.fast': 'duration-fast',
  'animations.duration.normal': 'duration-normal',
  'animations.duration.slow': 'duration-slow',
  'animations.duration.voteUpdate': 'duration-vote-update',
  
  // Effects
  'effects.borderRadius.small': 'radius-small',
  'effects.borderRadius.medium': 'radius-medium',
  'effects.borderRadius.large': 'radius-large',
  'effects.borderRadius.card': 'radius-card',
  'effects.borderRadius.button': 'radius-button',
  'effects.shadows.small': 'shadow-small',
  'effects.shadows.medium': 'shadow-medium',
  'effects.shadows.large': 'shadow-large',
  'effects.shadows.glow': 'shadow-glow',
} as const;

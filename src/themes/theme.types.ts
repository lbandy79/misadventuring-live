/**
 * TMP Live App Theme System - Type Definitions
 * 
 * Defines the contract for all themes in The Misadventuring Party.
 * Each theme controls colors, typography, animations, and sound cues.
 */

// =============================================================================
// CORE THEME INTERFACE
// =============================================================================

export interface TMPTheme {
  /** Unique identifier for the theme (kebab-case) */
  id: ThemeId;
  
  /** Display name shown in theme selector */
  name: string;
  
  /** Brief description of the theme's aesthetic */
  description: string;
  
  /** Associated game system or campaign */
  system: 'dnd-5e' | 'kids-on-bikes' | 'universal' | 'custom';
  
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
// THEME IDS - Add new themes here
// =============================================================================

export type ThemeId = 'tmp-base' | 'soggy-bottom-pirates' | 'neon-nightmares';

// =============================================================================
// COLOR DEFINITIONS
// =============================================================================

export interface ThemeColors {
  /** Primary brand color */
  primary: string;
  
  /** Secondary accent color */
  secondary: string;
  
  /** Tertiary color */
  tertiary: string;
  
  /** Background colors */
  background: {
    main: string;
    card: string;
    elevated: string;
  };
  
  /** Text colors */
  text: {
    primary: string;
    secondary: string;
    onPrimary: string;
  };
  
  /** Voting option colors */
  voting: {
    optionA: string;
    optionB: string;
    optionC?: string;
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
  fonts: {
    /** Display/headline font */
    display: string;
    /** Body text font */
    body: string;
    /** Accent/decorative font */
    accent: string;
  };
  
  /** Google Fonts URL to load */
  googleFontsUrl?: string;
  
  sizes: {
    hero: string;
    h1: string;
    h2: string;
    h3: string;
    body: string;
    small: string;
  };
  
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
  easing: {
    default: string;
    bounce: string;
    enter: string;
    exit: string;
  };
  
  duration: {
    fast: number;
    normal: number;
    slow: number;
    voteUpdate: number;
  };
  
  /** CSS keyframe animation names */
  keyframes: {
    voteSelect: string;
    voteIncrement: string;
    progressUpdate: string;
    idle: string;
    victory: string;
    buttonHover: string;
  };
}

// =============================================================================
// SOUND DEFINITIONS
// =============================================================================

export interface ThemeSounds {
  /** Vote cast confirmation */
  votecast: string | null;
  /** Timer tick (last 10 seconds) */
  timerTick: string | null;
  /** Timer end / voting closed */
  timerEnd: string | null;
  /** Victory/winner announcement */
  victory: string | null;
  /** UI click/tap */
  uiClick: string | null;
  /** Error/invalid action */
  error: string | null;
  /** Ambient/background */
  ambient: string | null;
}

// =============================================================================
// EFFECTS DEFINITIONS
// =============================================================================

export interface ThemeEffects {
  borderRadius: {
    small: string;
    medium: string;
    large: string;
    button: string;
    card: string;
  };
  
  shadows: {
    small: string;
    medium: string;
    large: string;
    glow: string;
  };
  
  /** CSS for special background effects */
  backgroundEffects: {
    main: string;
    overlay?: string;
  };
}

// =============================================================================
// CONTEXT TYPES
// =============================================================================

export interface ThemeContextValue {
  /** Current active theme */
  theme: TMPTheme;
  
  /** Current theme ID */
  themeId: ThemeId;
  
  /** Switch to a different theme */
  setThemeId: (themeId: ThemeId) => void;
  
  /** List of available theme IDs */
  availableThemes: ThemeId[];
  
  /** Play a sound from the current theme */
  playSound: (soundKey: keyof ThemeSounds) => void;
  
  /** Check if sounds are enabled */
  soundEnabled: boolean;
  
  /** Toggle sound on/off */
  setSoundEnabled: (enabled: boolean) => void;
}

// =============================================================================
// CSS VARIABLE PREFIX
// =============================================================================

export const CSS_VAR_PREFIX = '--tmp';

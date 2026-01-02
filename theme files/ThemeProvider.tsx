/**
 * TMP Live App Theme Provider
 * 
 * React context provider that manages theme state and generates CSS variables.
 * Wrap your app with <ThemeProvider> to enable theming throughout.
 * 
 * USAGE:
 * ```tsx
 * // In App.tsx
 * import { ThemeProvider } from './context/ThemeProvider';
 * 
 * function App() {
 *   return (
 *     <ThemeProvider defaultTheme="soggy-bottom-pirates">
 *       <YourApp />
 *     </ThemeProvider>
 *   );
 * }
 * 
 * // In any component
 * import { useTheme } from './context/ThemeProvider';
 * 
 * function VoteButton() {
 *   const { theme, setTheme, playSound } = useTheme();
 *   
 *   return (
 *     <button 
 *       style={{ background: theme.colors.primary }}
 *       onClick={() => playSound('votecast')}
 *     >
 *       Vote
 *     </button>
 *   );
 * }
 * ```
 */

import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  useCallback,
  useMemo,
  ReactNode 
} from 'react';

import { TMPTheme, ThemeId, CSS_VAR_PREFIX } from '../types/theme.types';
import { soggyBottomPiratesTheme } from '../themes/soggyBottomPirates.theme';
import { kidsOnBikesTheme } from '../themes/kidsOnBikes.theme';

// =============================================================================
// THEME REGISTRY - Add new themes here
// =============================================================================

/**
 * Registry of all available themes.
 * To add a new theme:
 * 1. Create the theme file in /themes/
 * 2. Import it here
 * 3. Add it to this THEMES object
 */
export const THEMES: Record<ThemeId, TMPTheme> = {
  'soggy-bottom-pirates': soggyBottomPiratesTheme,
  'kids-on-bikes': kidsOnBikesTheme,
  // Add more themes here as you create them:
  // 'dnd-classic': dndClassicTheme,
  // 'monster-disco': monsterDiscoTheme,
};

// Default theme if none specified
const DEFAULT_THEME_ID: ThemeId = 'soggy-bottom-pirates';

// =============================================================================
// CONTEXT TYPES
// =============================================================================

interface ThemeContextValue {
  /** Current active theme */
  theme: TMPTheme;
  
  /** Current theme ID */
  themeId: ThemeId;
  
  /** Switch to a different theme */
  setTheme: (themeId: ThemeId) => void;
  
  /** List of available theme IDs */
  availableThemes: ThemeId[];
  
  /** Play a sound from the current theme */
  playSound: (soundKey: keyof TMPTheme['sounds']) => void;
  
  /** Check if sounds are enabled */
  soundEnabled: boolean;
  
  /** Toggle sound on/off */
  setSoundEnabled: (enabled: boolean) => void;
  
  /** Get a CSS variable reference string */
  cssVar: (path: string) => string;
}

interface ThemeProviderProps {
  children: ReactNode;
  /** Initial theme to use */
  defaultTheme?: ThemeId;
  /** Persist theme selection to localStorage */
  persistSelection?: boolean;
  /** localStorage key for persisted theme */
  storageKey?: string;
  /** Initially enable/disable sounds */
  defaultSoundEnabled?: boolean;
}

// =============================================================================
// CONTEXT CREATION
// =============================================================================

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// =============================================================================
// CSS VARIABLE GENERATION
// =============================================================================

/**
 * Recursively flattens a nested object into CSS variable declarations.
 * 
 * @example
 * flattenToCSSVars({ colors: { primary: '#FFD700' } }, '--tmp')
 * // Returns: { '--tmp-colors-primary': '#FFD700' }
 */
function flattenToCSSVars(
  obj: Record<string, any>,
  prefix: string,
  result: Record<string, string> = {}
): Record<string, string> {
  for (const key in obj) {
    const value = obj[key];
    const varName = `${prefix}-${key}`;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      flattenToCSSVars(value, varName, result);
    } else if (typeof value === 'string' || typeof value === 'number') {
      result[varName] = String(value);
    }
  }
  
  return result;
}

/**
 * Generates CSS custom properties from a theme object.
 * Returns a style object to apply to a root element.
 */
function generateCSSVariables(theme: TMPTheme): Record<string, string> {
  const vars: Record<string, string> = {};
  
  // Flatten colors
  flattenToCSSVars(theme.colors, `${CSS_VAR_PREFIX}-color`, vars);
  
  // Flatten typography
  flattenToCSSVars(theme.typography.fonts, `${CSS_VAR_PREFIX}-font`, vars);
  flattenToCSSVars(theme.typography.sizes, `${CSS_VAR_PREFIX}-size`, vars);
  flattenToCSSVars(theme.typography.weights, `${CSS_VAR_PREFIX}-weight`, vars);
  
  // Flatten animations
  flattenToCSSVars(theme.animations.easing, `${CSS_VAR_PREFIX}-ease`, vars);
  flattenToCSSVars(theme.animations.duration, `${CSS_VAR_PREFIX}-duration`, vars);
  flattenToCSSVars(theme.animations.keyframes, `${CSS_VAR_PREFIX}-anim`, vars);
  
  // Flatten effects
  flattenToCSSVars(theme.effects.borderRadius, `${CSS_VAR_PREFIX}-radius`, vars);
  flattenToCSSVars(theme.effects.shadows, `${CSS_VAR_PREFIX}-shadow`, vars);
  
  // Add background effect as a single variable
  vars[`${CSS_VAR_PREFIX}-bg-effect`] = theme.effects.backgroundEffects.main;
  
  return vars;
}

/**
 * Applies CSS variables to the document root element.
 */
function applyCSSVariablesToRoot(vars: Record<string, string>): void {
  const root = document.documentElement;
  
  for (const [varName, value] of Object.entries(vars)) {
    root.style.setProperty(varName, value);
  }
}

/**
 * Injects Google Fonts link if theme uses web fonts.
 */
function injectGoogleFonts(url: string | undefined): void {
  if (!url) return;
  
  const existingLink = document.querySelector(`link[href="${url}"]`);
  if (existingLink) return;
  
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
}

// =============================================================================
// AUDIO MANAGEMENT
// =============================================================================

// Cache for preloaded audio elements
const audioCache: Map<string, HTMLAudioElement> = new Map();

/**
 * Preloads audio files for a theme.
 */
function preloadThemeSounds(theme: TMPTheme): void {
  const sounds = theme.sounds;
  
  for (const [key, url] of Object.entries(sounds)) {
    if (url && !audioCache.has(url)) {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = url;
      audioCache.set(url, audio);
    }
  }
}

/**
 * Plays a sound from the cache.
 */
function playSoundFromCache(url: string): void {
  const cached = audioCache.get(url);
  
  if (cached) {
    // Clone the audio element to allow overlapping plays
    const audio = cached.cloneNode() as HTMLAudioElement;
    audio.play().catch(err => {
      // Ignore autoplay restrictions - user interaction required
      console.debug('Audio play prevented:', err.message);
    });
  }
}

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

export function ThemeProvider({
  children,
  defaultTheme = DEFAULT_THEME_ID,
  persistSelection = true,
  storageKey = 'tmp-live-theme',
  defaultSoundEnabled = true,
}: ThemeProviderProps) {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    // Try to restore from localStorage
    if (persistSelection && typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored && THEMES[stored]) {
        return stored as ThemeId;
      }
    }
    return defaultTheme;
  });
  
  const [soundEnabled, setSoundEnabled] = useState(defaultSoundEnabled);
  
  // Get the actual theme object
  const theme = useMemo(() => THEMES[themeId] || THEMES[DEFAULT_THEME_ID], [themeId]);
  
  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------
  
  // Apply CSS variables and fonts when theme changes
  useEffect(() => {
    const vars = generateCSSVariables(theme);
    applyCSSVariablesToRoot(vars);
    injectGoogleFonts(theme.typography.googleFontsUrl);
    
    // Update root class for theme-specific styles
    document.documentElement.classList.forEach(cls => {
      if (cls.startsWith('theme-')) {
        document.documentElement.classList.remove(cls);
      }
    });
    if (theme.effects.rootClassName) {
      document.documentElement.classList.add(theme.effects.rootClassName);
    }
    
    // Preload sounds
    preloadThemeSounds(theme);
  }, [theme]);
  
  // Persist theme selection
  useEffect(() => {
    if (persistSelection && typeof window !== 'undefined') {
      localStorage.setItem(storageKey, themeId);
    }
  }, [themeId, persistSelection, storageKey]);
  
  // ---------------------------------------------------------------------------
  // Callbacks
  // ---------------------------------------------------------------------------
  
  const setTheme = useCallback((newThemeId: ThemeId) => {
    if (THEMES[newThemeId]) {
      setThemeId(newThemeId);
    } else {
      console.warn(`Theme "${newThemeId}" not found. Available themes:`, Object.keys(THEMES));
    }
  }, []);
  
  const playSound = useCallback((soundKey: keyof TMPTheme['sounds']) => {
    if (!soundEnabled) return;
    
    const url = theme.sounds[soundKey];
    if (url) {
      playSoundFromCache(url);
    }
  }, [soundEnabled, theme.sounds]);
  
  const cssVar = useCallback((path: string) => {
    // Convert dot notation to CSS var name
    // e.g., 'colors.primary' -> 'var(--tmp-color-primary)'
    const varName = `${CSS_VAR_PREFIX}-${path.replace(/\./g, '-')}`;
    return `var(${varName})`;
  }, []);
  
  // ---------------------------------------------------------------------------
  // Context Value
  // ---------------------------------------------------------------------------
  
  const contextValue = useMemo<ThemeContextValue>(() => ({
    theme,
    themeId,
    setTheme,
    availableThemes: Object.keys(THEMES) as ThemeId[],
    playSound,
    soundEnabled,
    setSoundEnabled,
    cssVar,
  }), [theme, themeId, setTheme, playSound, soundEnabled, cssVar]);
  
  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  
  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to access theme context.
 * Must be used within a ThemeProvider.
 * 
 * @example
 * const { theme, setTheme, playSound } = useTheme();
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

export { THEMES as availableThemes };
export type { ThemeProviderProps, ThemeContextValue };

/**
 * TMP Theme Provider
 * 
 * React context provider that:
 * - Manages active theme state
 * - Generates CSS variables from theme
 * - Injects Google Fonts
 * - Handles sound playback
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';

import type {
  TMPTheme,
  ThemeId,
  ThemeContextValue,
  ThemeSounds,
} from './theme.types';

import { CSS_VAR_PREFIX } from './theme.types';
import { themeRegistry, defaultThemeId, getTheme, getAvailableThemes } from './index';

// =============================================================================
// CONTEXT
// =============================================================================

const ThemeContext = createContext<ThemeContextValue | null>(null);

// =============================================================================
// CSS VARIABLE GENERATION
// =============================================================================

function generateCSSVariables(theme: TMPTheme): string {
  const vars: string[] = [];
  const prefix = CSS_VAR_PREFIX;

  // Colors
  vars.push(`${prefix}-color-primary: ${theme.colors.primary}`);
  vars.push(`${prefix}-color-secondary: ${theme.colors.secondary}`);
  vars.push(`${prefix}-color-tertiary: ${theme.colors.tertiary}`);
  
  vars.push(`${prefix}-bg-main: ${theme.colors.background.main}`);
  vars.push(`${prefix}-bg-card: ${theme.colors.background.card}`);
  vars.push(`${prefix}-bg-elevated: ${theme.colors.background.elevated}`);
  
  vars.push(`${prefix}-text-primary: ${theme.colors.text.primary}`);
  vars.push(`${prefix}-text-secondary: ${theme.colors.text.secondary}`);
  vars.push(`${prefix}-text-on-primary: ${theme.colors.text.onPrimary}`);
  
  vars.push(`${prefix}-vote-option-a: ${theme.colors.voting.optionA}`);
  vars.push(`${prefix}-vote-option-b: ${theme.colors.voting.optionB}`);
  if (theme.colors.voting.optionC) {
    vars.push(`${prefix}-vote-option-c: ${theme.colors.voting.optionC}`);
  }
  vars.push(`${prefix}-vote-track: ${theme.colors.voting.progressTrack}`);
  
  vars.push(`${prefix}-status-success: ${theme.colors.status.success}`);
  vars.push(`${prefix}-status-warning: ${theme.colors.status.warning}`);
  vars.push(`${prefix}-status-error: ${theme.colors.status.error}`);
  vars.push(`${prefix}-status-info: ${theme.colors.status.info}`);

  // Typography
  vars.push(`${prefix}-font-display: ${theme.typography.fonts.display}`);
  vars.push(`${prefix}-font-body: ${theme.typography.fonts.body}`);
  vars.push(`${prefix}-font-accent: ${theme.typography.fonts.accent}`);
  
  vars.push(`${prefix}-size-hero: ${theme.typography.sizes.hero}`);
  vars.push(`${prefix}-size-h1: ${theme.typography.sizes.h1}`);
  vars.push(`${prefix}-size-h2: ${theme.typography.sizes.h2}`);
  vars.push(`${prefix}-size-h3: ${theme.typography.sizes.h3}`);
  vars.push(`${prefix}-size-body: ${theme.typography.sizes.body}`);
  vars.push(`${prefix}-size-small: ${theme.typography.sizes.small}`);

  // Animations
  vars.push(`${prefix}-ease-default: ${theme.animations.easing.default}`);
  vars.push(`${prefix}-ease-bounce: ${theme.animations.easing.bounce}`);
  vars.push(`${prefix}-ease-enter: ${theme.animations.easing.enter}`);
  vars.push(`${prefix}-ease-exit: ${theme.animations.easing.exit}`);
  
  vars.push(`${prefix}-duration-fast: ${theme.animations.duration.fast}ms`);
  vars.push(`${prefix}-duration-normal: ${theme.animations.duration.normal}ms`);
  vars.push(`${prefix}-duration-slow: ${theme.animations.duration.slow}ms`);
  vars.push(`${prefix}-duration-vote: ${theme.animations.duration.voteUpdate}ms`);

  // Effects
  vars.push(`${prefix}-radius-small: ${theme.effects.borderRadius.small}`);
  vars.push(`${prefix}-radius-medium: ${theme.effects.borderRadius.medium}`);
  vars.push(`${prefix}-radius-large: ${theme.effects.borderRadius.large}`);
  vars.push(`${prefix}-radius-button: ${theme.effects.borderRadius.button}`);
  vars.push(`${prefix}-radius-card: ${theme.effects.borderRadius.card}`);
  
  vars.push(`${prefix}-shadow-small: ${theme.effects.shadows.small}`);
  vars.push(`${prefix}-shadow-medium: ${theme.effects.shadows.medium}`);
  vars.push(`${prefix}-shadow-large: ${theme.effects.shadows.large}`);
  vars.push(`${prefix}-shadow-glow: ${theme.effects.shadows.glow}`);

  return vars.join(';\n  ');
}

// =============================================================================
// GOOGLE FONTS INJECTION
// =============================================================================

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
// PROVIDER COMPONENT
// =============================================================================

interface ThemeProviderProps {
  children: ReactNode;
  initialThemeId?: ThemeId;
}

export function ThemeProvider({ 
  children, 
  initialThemeId = defaultThemeId 
}: ThemeProviderProps) {
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    // Try to load from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tmp-theme-id');
      if (saved && saved in themeRegistry) {
        return saved as ThemeId;
      }
    }
    return initialThemeId;
  });
  
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tmp-sound-enabled') !== 'false';
    }
    return true;
  });

  const theme = useMemo(() => getTheme(themeId), [themeId]);
  const availableThemes = useMemo(() => getAvailableThemes(), []);

  // Inject CSS variables when theme changes
  useEffect(() => {
    const cssVars = generateCSSVariables(theme);
    const styleId = 'tmp-theme-variables';
    
    let styleElement = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = `:root {\n  ${cssVars};\n}`;
    
    // Also set the theme ID as a data attribute for CSS selectors
    document.documentElement.setAttribute('data-theme', theme.id);
  }, [theme]);

  // Inject Google Fonts
  useEffect(() => {
    injectGoogleFonts(theme.typography.googleFontsUrl);
  }, [theme.typography.googleFontsUrl]);

  // Persist theme selection
  useEffect(() => {
    localStorage.setItem('tmp-theme-id', themeId);
  }, [themeId]);

  // Persist sound preference
  useEffect(() => {
    localStorage.setItem('tmp-sound-enabled', String(soundEnabled));
  }, [soundEnabled]);

  // Sound playback function
  const playSound = useCallback((soundKey: keyof ThemeSounds) => {
    if (!soundEnabled) return;
    
    const soundUrl = theme.sounds[soundKey];
    if (!soundUrl) return;

    try {
      const audio = new Audio(soundUrl);
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Autoplay may be blocked - that's okay
        console.debug(`Sound playback blocked: ${soundKey}`);
      });
    } catch (error) {
      console.debug(`Sound playback error: ${soundKey}`, error);
    }
  }, [soundEnabled, theme.sounds]);

  const contextValue = useMemo<ThemeContextValue>(() => ({
    theme,
    themeId,
    setThemeId,
    availableThemes,
    playSound,
    soundEnabled,
    setSoundEnabled,
  }), [theme, themeId, availableThemes, playSound, soundEnabled]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
}

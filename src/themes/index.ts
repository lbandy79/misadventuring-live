/**
 * Theme System Index
 * 
 * Central export for the TMP theme system.
 */

// Type exports
export type {
  TMPTheme,
  ThemeId,
  ThemeColors,
  ThemeTypography,
  ThemeAnimations,
  ThemeSounds,
  ThemeEffects,
  ThemeContextValue,
} from './theme.types';

export { CSS_VAR_PREFIX } from './theme.types';

// Theme exports
export { tmpBaseTheme } from './tmpBase.theme';
export { soggyBottomPiratesTheme } from './soggyBottomPirates.theme';
export { neonNightmaresTheme } from './neonNightmares.theme';

// Provider exports
export { ThemeProvider, useTheme } from './ThemeProvider';

// Theme registry
import type { TMPTheme, ThemeId } from './theme.types';
import { tmpBaseTheme } from './tmpBase.theme';
import { soggyBottomPiratesTheme } from './soggyBottomPirates.theme';
import { neonNightmaresTheme } from './neonNightmares.theme';

export const themeRegistry: Record<ThemeId, TMPTheme> = {
  'tmp-base': tmpBaseTheme,
  'soggy-bottom-pirates': soggyBottomPiratesTheme,
  'neon-nightmares': neonNightmaresTheme,
};

export const defaultThemeId: ThemeId = 'tmp-base';

export const getTheme = (id: ThemeId): TMPTheme => {
  return themeRegistry[id] ?? themeRegistry[defaultThemeId];
};

export const getAvailableThemes = (): ThemeId[] => {
  return Object.keys(themeRegistry) as ThemeId[];
};

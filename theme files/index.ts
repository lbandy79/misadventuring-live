/**
 * TMP Live App Theme System
 * 
 * A modular theming system for The Misadventuring Party live audience
 * interaction app. Supports multiple game system themes with colors,
 * typography, animations, and sound cues.
 * 
 * QUICK START:
 * ```tsx
 * import { ThemeProvider, useTheme } from 'tmp-live-app-themes';
 * 
 * // Wrap your app
 * <ThemeProvider defaultTheme="soggy-bottom-pirates">
 *   <App />
 * </ThemeProvider>
 * 
 * // Use in components
 * const { theme, playSound } = useTheme();
 * ```
 * 
 * ADDING NEW THEMES:
 * See types/theme.types.ts for the theme interface.
 * Create a new theme file in /themes/ and register it in ThemeProvider.tsx.
 */

// Types
export type {
  TMPTheme,
  ThemeColors,
  ThemeTypography,
  ThemeAnimations,
  ThemeSounds,
  ThemeEffects,
  ThemeId,
  ThemeableProps,
} from './types/theme.types';

export { CSS_VAR_PREFIX, CSS_VAR_MAP } from './types/theme.types';

// Context & Hook
export { 
  ThemeProvider, 
  useTheme,
  THEMES as availableThemes,
} from './context/ThemeProvider';

export type { 
  ThemeProviderProps, 
  ThemeContextValue 
} from './context/ThemeProvider';

// Individual Themes
export { 
  soggyBottomPiratesTheme,
  soggyBottomIcons,
  getSoggyBottomIcon,
} from './themes/soggyBottomPirates.theme';

export {
  kidsOnBikesTheme,
  kidsOnBikesIcons,
  getKidsOnBikesIcon,
} from './themes/kidsOnBikes.theme';

// Future themes will be exported here:
// export { dndClassicTheme } from './themes/dndClassic.theme';
// export { monsterDiscoTheme } from './themes/monsterDisco.theme';

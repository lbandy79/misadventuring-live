/**
 * Theme System for The Misadventuring Party
 * 
 * Each theme defines the visual identity for a TTRPG system.
 * Add new themes here as you expand to new systems.
 */

export const themes = {
  // Default D&D / High Fantasy theme
  fantasy: {
    id: 'fantasy',
    name: 'Dark Fantasy',
    description: 'D&D, Pathfinder, and other high fantasy systems',
    colors: {
      // Backgrounds
      bgPrimary: '#0a0a0f',
      bgSecondary: '#1a1a2e',
      bgTertiary: '#16213e',
      bgCard: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      
      // Accent colors
      accent: '#ffd700',
      accentHover: '#ffaa00',
      accentMuted: 'rgba(255, 215, 0, 0.3)',
      
      // Text
      textPrimary: '#eeeeee',
      textSecondary: '#888888',
      textMuted: '#666666',
      
      // Semantic colors
      success: '#27ae60',
      successLight: '#2ecc71',
      danger: '#c0392b',
      dangerLight: '#e74c3c',
      warning: '#f39c12',
      warningLight: '#e67e22',
      
      // Vote option colors
      optionA: 'linear-gradient(135deg, #c0392b 0%, #962d22 100%)',
      optionB: 'linear-gradient(135deg, #27ae60 0%, #1e8449 100%)',
      optionC: 'linear-gradient(135deg, #8e44ad 0%, #6c3483 100%)',
      
      // Bars
      barA: 'linear-gradient(90deg, #c0392b, #e74c3c)',
      barB: 'linear-gradient(90deg, #27ae60, #2ecc71)',
      barC: 'linear-gradient(90deg, #8e44ad, #9b59b6)',
      
      // UI elements
      border: '#333333',
      borderLight: '#2a2a4a',
    },
    fonts: {
      heading: "Georgia, 'Times New Roman', serif",
      body: "'Segoe UI', system-ui, -apple-system, sans-serif",
    },
    effects: {
      glow: '0 0 20px rgba(255, 215, 0, 0.3)',
      glowStrong: '0 0 25px rgba(255, 215, 0, 0.4)',
    }
  },

  // Kids on Bikes / 80s Mystery theme
  kidsOnBikes: {
    id: 'kidsOnBikes',
    name: 'Kids on Bikes',
    description: '80s nostalgia, Stranger Things vibes',
    colors: {
      // Backgrounds - darker with hints of blue
      bgPrimary: '#0a0a12',
      bgSecondary: '#12121f',
      bgTertiary: '#1a1a2a',
      bgCard: 'linear-gradient(135deg, #12121f 0%, #1a1a2a 100%)',
      
      // Accent colors - neon pink/magenta
      accent: '#ff2d95',
      accentHover: '#ff5caa',
      accentMuted: 'rgba(255, 45, 149, 0.3)',
      
      // Text
      textPrimary: '#e0e0e0',
      textSecondary: '#8888aa',
      textMuted: '#666688',
      
      // Semantic colors - neon variants
      success: '#00ff88',
      successLight: '#50ffa8',
      danger: '#ff3366',
      dangerLight: '#ff5c85',
      warning: '#ffcc00',
      warningLight: '#ffdd44',
      
      // Vote option colors - synthwave palette
      optionA: 'linear-gradient(135deg, #ff2d95 0%, #cc2277 100%)',
      optionB: 'linear-gradient(135deg, #00ccff 0%, #0099cc 100%)',
      optionC: 'linear-gradient(135deg, #aa55ff 0%, #8833dd 100%)',
      
      // Bars
      barA: 'linear-gradient(90deg, #ff2d95, #ff5caa)',
      barB: 'linear-gradient(90deg, #00ccff, #33ddff)',
      barC: 'linear-gradient(90deg, #aa55ff, #cc77ff)',
      
      // UI elements
      border: '#333344',
      borderLight: '#2a2a3a',
    },
    fonts: {
      heading: "'Courier New', Courier, monospace", // Retro typewriter feel
      body: "'Segoe UI', system-ui, -apple-system, sans-serif",
    },
    effects: {
      glow: '0 0 20px rgba(255, 45, 149, 0.4)',
      glowStrong: '0 0 30px rgba(255, 45, 149, 0.5)',
    }
  }
};

// Helper to get a theme by ID, with fallback
export function getTheme(themeId) {
  return themes[themeId] || themes.fantasy;
}

// Convert theme to CSS custom properties
export function themeToCSSVars(theme) {
  return {
    '--bg-primary': theme.colors.bgPrimary,
    '--bg-secondary': theme.colors.bgSecondary,
    '--bg-tertiary': theme.colors.bgTertiary,
    '--bg-card': theme.colors.bgCard,
    '--accent': theme.colors.accent,
    '--accent-hover': theme.colors.accentHover,
    '--accent-muted': theme.colors.accentMuted,
    '--text-primary': theme.colors.textPrimary,
    '--text-secondary': theme.colors.textSecondary,
    '--text-muted': theme.colors.textMuted,
    '--success': theme.colors.success,
    '--success-light': theme.colors.successLight,
    '--danger': theme.colors.danger,
    '--danger-light': theme.colors.dangerLight,
    '--warning': theme.colors.warning,
    '--warning-light': theme.colors.warningLight,
    '--option-a': theme.colors.optionA,
    '--option-b': theme.colors.optionB,
    '--option-c': theme.colors.optionC,
    '--bar-a': theme.colors.barA,
    '--bar-b': theme.colors.barB,
    '--bar-c': theme.colors.barC,
    '--border': theme.colors.border,
    '--border-light': theme.colors.borderLight,
    '--font-heading': theme.fonts.heading,
    '--font-body': theme.fonts.body,
    '--glow': theme.effects.glow,
    '--glow-strong': theme.effects.glowStrong,
  };
}

export default themes;

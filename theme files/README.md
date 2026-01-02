# TMP Live App Theme System

A modular theming system for **The Misadventuring Party** live audience interaction app. Supports multiple game system themes with colors, typography, animations, and sound cues.

## Architecture Overview

```
tmp-live-app-themes/
├── index.ts                    # Barrel exports
├── types/
│   └── theme.types.ts          # TypeScript interfaces for themes
├── context/
│   └── ThemeProvider.tsx       # React context + hook
├── themes/
│   └── soggyBottomPirates.theme.ts  # Cereal-punk pirate theme
├── styles/
│   └── soggyBottomPirates.animations.css  # CSS keyframes
└── README.md
```

## Quick Start

### 1. Install & Import

```tsx
// In your app's entry point (App.tsx or main.tsx)
import { ThemeProvider } from './themes';
import './themes/styles/soggyBottomPirates.animations.css';

function App() {
  return (
    <ThemeProvider defaultTheme="soggy-bottom-pirates">
      <YourLiveApp />
    </ThemeProvider>
  );
}
```

### 2. Use the Hook

```tsx
import { useTheme } from './themes';

function VoteButton({ option, onVote }) {
  const { theme, playSound } = useTheme();
  
  const handleClick = () => {
    playSound('votecast');  // Plays theme-specific sound
    onVote(option);
  };
  
  return (
    <button
      onClick={handleClick}
      style={{
        background: theme.colors.voting.optionA,
        fontFamily: theme.typography.fonts.display,
        borderRadius: theme.effects.borderRadius.button,
      }}
    >
      {option.label}
    </button>
  );
}
```

### 3. Use CSS Variables

All theme values are automatically injected as CSS custom properties:

```css
.vote-card {
  background: var(--tmp-color-voting-optionA);
  font-family: var(--tmp-font-display);
  border-radius: var(--tmp-radius-card);
  box-shadow: var(--tmp-shadow-medium);
}

.vote-card:hover {
  animation: sbp-vote-splash 0.3s ease;
  box-shadow: var(--tmp-shadow-glow);
}
```

## Theme Structure

Every theme must implement the `TMPTheme` interface:

```typescript
interface TMPTheme {
  id: string;           // 'soggy-bottom-pirates'
  name: string;         // 'Soggy Bottom Pirates'
  description: string;  // 'Cereal-punk pirate adventure'
  system: string;       // 'soggy-bottom' | 'dnd-5e' | etc.
  
  colors: {
    primary: string;
    secondary: string;
    tertiary: string;
    background: { main, card, elevated };
    text: { primary, secondary, onPrimary };
    voting: { optionA, optionB, optionC?, progressTrack };
    status: { success, warning, error, info };
  };
  
  typography: {
    fonts: { display, body, accent? };
    googleFontsUrl?: string;
    sizes: { hero, h1, h2, h3, body, small };
    weights: { normal, medium, bold, black };
  };
  
  animations: {
    easing: { default, bounce, enter, exit };
    duration: { fast, normal, slow, voteUpdate };
    keyframes: { voteSelect, voteIncrement, progressUpdate, idle, victory, buttonHover };
  };
  
  sounds: {
    votecast: string;
    votingOpen: string;
    votingClose: string;
    countdownTick?: string;
    victory: string;
    ambient?: string;
    buttonHover?: string;
  };
  
  effects: {
    borderRadius: { small, medium, large, card, button };
    shadows: { small, medium, large, glow };
    backgroundEffects: { main, cardOverlay?, useGrain, grainOpacity? };
    iconSet: 'emoji' | 'lucide' | 'custom';
    rootClassName?: string;
  };
}
```

## Adding a New Theme

### 1. Create the Theme File

```typescript
// themes/dndClassic.theme.ts
import { TMPTheme } from '../types/theme.types';

export const dndClassicTheme: TMPTheme = {
  id: 'dnd-classic',
  name: 'D&D Classic',
  description: 'High fantasy medieval aesthetic',
  system: 'dnd-5e',
  
  colors: {
    primary: '#8B4513',      // Leather brown
    secondary: '#DAA520',    // Gold
    tertiary: '#2F4F4F',     // Dark slate
    // ... rest of colors
  },
  
  typography: {
    fonts: {
      display: '"Cinzel Decorative", serif',
      body: '"Crimson Text", serif',
    },
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Cinzel+Decorative&family=Crimson+Text&display=swap',
    // ... rest of typography
  },
  
  // ... rest of theme
};
```

### 2. Create Animations CSS

```css
/* styles/dndClassic.animations.css */
@keyframes dnd-sword-slash { /* ... */ }
@keyframes dnd-magic-glow { /* ... */ }
```

### 3. Register in ThemeProvider

```typescript
// context/ThemeProvider.tsx
import { dndClassicTheme } from '../themes/dndClassic.theme';

export const THEMES: Record<ThemeId, TMPTheme> = {
  'soggy-bottom-pirates': soggyBottomPiratesTheme,
  'dnd-classic': dndClassicTheme,  // Add here
};
```

### 4. Export from Index

```typescript
// index.ts
export { dndClassicTheme } from './themes/dndClassic.theme';
```

## CSS Variable Reference

### Colors
```
--tmp-color-primary
--tmp-color-secondary
--tmp-color-tertiary
--tmp-color-background-main
--tmp-color-background-card
--tmp-color-background-elevated
--tmp-color-text-primary
--tmp-color-text-secondary
--tmp-color-text-onPrimary
--tmp-color-voting-optionA
--tmp-color-voting-optionB
--tmp-color-voting-optionC
--tmp-color-voting-progressTrack
--tmp-color-status-success
--tmp-color-status-warning
--tmp-color-status-error
--tmp-color-status-info
```

### Typography
```
--tmp-font-display
--tmp-font-body
--tmp-font-accent
--tmp-size-hero
--tmp-size-h1
--tmp-size-h2
--tmp-size-h3
--tmp-size-body
--tmp-size-small
--tmp-weight-normal
--tmp-weight-medium
--tmp-weight-bold
--tmp-weight-black
```

### Effects
```
--tmp-radius-small
--tmp-radius-medium
--tmp-radius-large
--tmp-radius-card
--tmp-radius-button
--tmp-shadow-small
--tmp-shadow-medium
--tmp-shadow-large
--tmp-shadow-glow
```

### Animation Timing
```
--tmp-ease-default
--tmp-ease-bounce
--tmp-ease-enter
--tmp-ease-exit
--tmp-duration-fast
--tmp-duration-normal
--tmp-duration-slow
--tmp-duration-voteUpdate
```

## Soggy Bottom Pirates Theme (D&D 5e)

A cereal-punk pirate reskin of D&D 5e, set in the Milky Bowl.

### Visual Direction
- **Colors**: Cereal-box primaries (Cap'n Crunch gold, Froot Loop rainbow, ocean blues)
- **Typography**: Chunky, playful (Lilita One display, Nunito body)
- **Animations**: Bobbing, splashing, floating on milk
- **Sounds**: Crunchy foley, nautical bells, triumphant fanfares

### Available Animations
```css
.sbp-animate-float     /* Gentle bobbing */
.sbp-animate-drift     /* Slow rotation */
.sbp-animate-splash-in /* Element rises from below */
.sbp-animate-sink-out  /* Element sinks down */
.sbp-animate-pulse     /* Attention-grabbing pulse */
.sbp-animate-winner    /* Winning option glow */
.sbp-animate-shake     /* Error/rejection shake */
```

### Icon Mapping
```typescript
import { getSoggyBottomIcon } from './themes';

getSoggyBottomIcon('fight');   // ⚔️
getSoggyBottomIcon('flee');    // 🏃
getSoggyBottomIcon('plunder'); // 💰
getSoggyBottomIcon('sail');    // ⛵
```

---

## Kids on Bikes Theme

80s vaporwave/VHS aesthetic for supernatural small-town mystery.

### Visual Direction
- **Colors**: Neon pink (#FF2D95) and cyan (#00F0FF) on deep purple-black
- **Typography**: Retro-futuristic (Orbitron display, Space Mono body)
- **Animations**: Glitchy, flickering, VHS tracking artifacts, CRT scan lines
- **Sounds**: Synth stabs, VCR clicks, arcade bleeps, tape hiss

### Available Animations
```css
.kob-animate-static       /* Subtle signal interference */
.kob-animate-neon-breathe /* Slow neon pulse */
.kob-animate-tracking     /* VHS horizontal wobble */
.kob-animate-glitch-in    /* Glitchy entrance */
.kob-animate-static-out   /* Dissolve to noise */
.kob-animate-pulse        /* Neon ring expansion */
.kob-animate-winner       /* Pulsing neon glow */
.kob-animate-shake        /* Digital shake */
.kob-animate-chromatic    /* RGB split on hover */
```

### Special Effects
```css
.kob-neon-text       /* Pink neon glow */
.kob-neon-text-cyan  /* Cyan neon glow */
.kob-neon-text-dual  /* Dual-color chromatic text */
.kob-tracking-bar    /* VHS tracking bar (trigger class) */
```

### Icon Mapping
```typescript
import { getKidsOnBikesIcon } from './themes';

getKidsOnBikesIcon('investigate'); // 🔍
getKidsOnBikesIcon('sneak');       // 🤫
getKidsOnBikesIcon('run');         // 🏃
getKidsOnBikesIcon('bike');        // 🚲
getKidsOnBikesIcon('flashlight');  // 🔦
```

## Theme Switching

```tsx
function ThemeSelector() {
  const { themeId, setTheme, availableThemes } = useTheme();
  
  return (
    <select value={themeId} onChange={e => setTheme(e.target.value)}>
      {availableThemes.map(id => (
        <option key={id} value={id}>{id}</option>
      ))}
    </select>
  );
}
```

## Sound Management

```tsx
const { playSound, soundEnabled, setSoundEnabled } = useTheme();

// Play specific sounds
playSound('votecast');     // When user votes
playSound('votingOpen');   // When GM opens voting
playSound('votingClose');  // When voting ends
playSound('victory');      // Winner announcement

// Toggle sounds
<button onClick={() => setSoundEnabled(!soundEnabled)}>
  {soundEnabled ? '🔊' : '🔇'}
</button>
```

## Implemented Themes

- [x] **Soggy Bottom Pirates** - Cereal-punk pirate D&D 5e reskin
- [x] **Kids on Bikes** - 80s vaporwave/VHS supernatural mystery

## Planned Themes

- [ ] **D&D Classic** - High fantasy medieval (parchment, gold, candlelight)
- [ ] **Monster Disco** - Supernatural funk (purple, glitter, disco balls)
- [ ] **Blades in the Dark** - Industrial noir (soot, gaslight, shadows)

---

Built for The Misadventuring Party live shows.

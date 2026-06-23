import type { MonsterBuilderConfig } from './types';

/**
 * Live Monster Builder — show config for Monster of the Week (June 27, 2026 show).
 *
 * WHY THIS FILE LIVES IN THE LEGACY APP DIRECTORY:
 *   The platform app (`platform/`) reaches back into `src/data/` via the
 *   `@mtp/data` path alias (wired in `platform/vite.config.ts`). This keeps
 *   show-specific data files in one place — the legacy `src/` tree is the
 *   shared data layer; the platform app is the consumer.
 *
 * HOW THE CONFIG SYSTEM WORKS:
 *   - Each show gets its own `.config.ts` here.
 *   - Register it in `index.ts` keyed by showId.
 *   - The platform resolves it at runtime via `getMonsterConfig(showId)` where
 *     showId comes from `useShow()` → Firestore `config/platform.currentShowId`.
 *   - No code changes needed between shows — only config file + registration.
 *
 * TYPE HINTS:
 *   Each option's `typeHints[]` lists the MotW monster type ids that pick suggests.
 *   The GM output panel tallies these across all 4 locked slots and surfaces the
 *   top types — Keeper pattern-matches by eye, no separate audience type vote.
 */
export const demoMonsterConfig: MonsterBuilderConfig = {
  showId: 'monster-of-the-week',
  showName: 'Monster of the Week — Live',

  slots: [
    {
      id: 'appearance',
      label: 'What does it look like?',
      revealPrefix: 'It appears as',
      allowWriteIn: true,
      options: [
        { text: 'Too Many',      emoji: '🕷️', typeHints: ['beast', 'devourer'] },
        { text: 'Wrong Skin',    emoji: '🩸', typeHints: ['parasite', 'queen'] },
        { text: 'Almost Human',  emoji: '👤', typeHints: ['trickster', 'parasite'] },
        { text: 'All Teeth',     emoji: '🦷', typeHints: ['beast', 'devourer'] },
        { text: 'Living Shadow', emoji: '🌑', typeHints: ['sorcerer', 'devourer'] },
        { text: 'Stolen Faces',  emoji: '🪞', typeHints: ['collector', 'trickster'] },
      ],
    },
    {
      id: 'habitat',
      label: 'Where has it been seen?',
      revealPrefix: 'It lurks in',
      allowWriteIn: true,
      options: [
        { text: 'Empty Houses',   emoji: '🚪', typeHints: ['executioner', 'torturer'] },
        { text: 'Still Water',    emoji: '🌊', typeHints: ['destroyer', 'beast'] },
        { text: 'Deep Woods',     emoji: '🌲', typeHints: ['beast', 'torturer'] },
        { text: 'Your Walls',     emoji: '🛏️', typeHints: ['parasite', 'queen'] },
        { text: 'Holy Ground',    emoji: '⛪', typeHints: ['sorcerer', 'destroyer'] },
        { text: 'The Underneath', emoji: '🕳️', typeHints: ['devourer', 'beast'] },
      ],
    },
    {
      id: 'behavior',
      label: 'How does it hunt?',
      revealPrefix: 'When it hunts, it',
      allowWriteIn: true,
      options: [
        { text: 'Wears Faces',    emoji: '🎭', typeHints: ['trickster', 'queen'] },
        { text: 'Sings First',    emoji: '🎵', typeHints: ['sorcerer', 'trickster'] },
        { text: 'Never Blinks',   emoji: '👁️', typeHints: ['executioner', 'torturer'] },
        { text: 'Whispers Names', emoji: '🤫', typeHints: ['sorcerer', 'parasite'] },
        { text: 'Hollows Them',   emoji: '🩻', typeHints: ['devourer', 'parasite'] },
        { text: 'Snuffs Light',   emoji: '🕯️', typeHints: ['destroyer', 'executioner'] },
      ],
    },
    {
      id: 'weakness',
      label: "What's the only way to stop it?",
      revealPrefix: 'The only way to stop it:',
      allowWriteIn: true,
      options: [
        { text: 'Burn It',        emoji: '🔥', typeHints: ['destroyer', 'beast'] },
        { text: 'True Name',      emoji: '⚙️', typeHints: ['sorcerer', 'trickster'] },
        { text: 'Its Reflection', emoji: '🪞', typeHints: ['trickster', 'queen'] },
        { text: 'Salt Circle',    emoji: '🧂', typeHints: ['sorcerer', 'destroyer'] },
        { text: 'Old Blood',      emoji: '🩸', typeHints: ['parasite', 'sorcerer'] },
        { text: 'First Light',    emoji: '🌅', typeHints: ['devourer', 'torturer'] },
      ],
    },
  ],

  bystander: {
    openPrompt: 'Give us a bystander — someone the monster will cross paths with tonight.',
    movePresets: [
      { label: 'Try to help the hunters', text: 'Try to help the hunters' },
      { label: 'Get in the way',          text: 'Get in the way' },
      { label: 'Reveal something',        text: 'Reveal something' },
      { label: 'Freak out in terror',     text: 'Freak out in terror' },
    ],
  },
};

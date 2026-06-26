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

  // Icon slugs for game-icons: verify/browse at https://game-icons.net
  // Fluent Emoji names: verify/browse at https://github.com/microsoft/fluentui-emoji/tree/main/assets
  slots: [
    {
      id: 'appearance',
      label: 'What does it look like?',
      revealPrefix: 'It appears as',
      allowWriteIn: true,
      options: [
        { text: 'Too Many',      emoji: '🕷️', typeHints: ['beast', 'devourer'],     gameIcon: 'lorc/spider-face',       fluentEmoji: 'Spider' },
        { text: 'Wrong Skin',    emoji: '🩸', typeHints: ['parasite', 'queen'],      gameIcon: 'lorc/dripping-goo',      fluentEmoji: 'Drop of Blood' },
        { text: 'Almost Human',  emoji: '👤', typeHints: ['trickster', 'parasite'],  gameIcon: 'delapouite/person',       fluentEmoji: 'Bust in Silhouette' },
        { text: 'All Teeth',     emoji: '🦷', typeHints: ['beast', 'devourer'],      gameIcon: 'lorc/fangs',             fluentEmoji: 'Tooth' },
        { text: 'Living Shadow', emoji: '🌑', typeHints: ['sorcerer', 'devourer'],   gameIcon: 'lorc/shadow-follower',   fluentEmoji: 'New Moon' },
        { text: 'Stolen Faces',  emoji: '🪞', typeHints: ['collector', 'trickster'], gameIcon: 'lorc/cracked-glass',     fluentEmoji: 'Mirror' },
      ],
    },
    {
      id: 'habitat',
      label: 'Where has it been seen?',
      revealPrefix: 'It lurks in',
      allowWriteIn: true,
      options: [
        { text: 'Empty Houses',   emoji: '🚪', typeHints: ['executioner', 'torturer'], gameIcon: 'delapouite/house',        fluentEmoji: 'House' },
        { text: 'Still Water',    emoji: '🌊', typeHints: ['destroyer', 'beast'],      gameIcon: 'lorc/water-drop',         fluentEmoji: 'Water Wave' },
        { text: 'Deep Woods',     emoji: '🌲', typeHints: ['beast', 'torturer'],       gameIcon: 'delapouite/pine-tree',    fluentEmoji: 'Evergreen Tree' },
        { text: 'Your Walls',     emoji: '🛏️', typeHints: ['parasite', 'queen'],      gameIcon: 'delapouite/door',         fluentEmoji: 'Bed' },
        { text: 'Holy Ground',    emoji: '⛪', typeHints: ['sorcerer', 'destroyer'],   gameIcon: 'delapouite/church',       fluentEmoji: 'Church' },
        { text: 'The Underneath', emoji: '🕳️', typeHints: ['devourer', 'beast'],      gameIcon: 'delapouite/tunnel',       fluentEmoji: 'Hole' },
      ],
    },
    {
      id: 'behavior',
      label: 'How does it hunt?',
      revealPrefix: 'When it hunts, it',
      allowWriteIn: true,
      options: [
        { text: 'Wears Faces',    emoji: '🎭', typeHints: ['trickster', 'queen'],      gameIcon: 'lorc/drama-masks',        fluentEmoji: 'Performing Arts' },
        { text: 'Sings First',    emoji: '🎵', typeHints: ['sorcerer', 'trickster'],   gameIcon: 'delapouite/musical-notes', fluentEmoji: 'Musical Notes' },
        { text: 'Never Blinks',   emoji: '👁️', typeHints: ['executioner', 'torturer'], gameIcon: 'lorc/eye',                fluentEmoji: 'Eye' },
        { text: 'Whispers Names', emoji: '🤫', typeHints: ['sorcerer', 'parasite'],    gameIcon: 'lorc/whistle',            fluentEmoji: 'Shushing Face' },
        { text: 'Hollows Them',   emoji: '🩻', typeHints: ['devourer', 'parasite'],    gameIcon: 'lorc/skeleton',           fluentEmoji: 'Anatomical Heart' },
        { text: 'Snuffs Light',   emoji: '🕯️', typeHints: ['destroyer', 'executioner'], gameIcon: 'lorc/candle-light',     fluentEmoji: 'Candle' },
      ],
    },
    {
      id: 'weakness',
      label: "What's the only way to stop it?",
      revealPrefix: 'The only way to stop it:',
      allowWriteIn: true,
      // secret: audience votes on this, but the result never appears on the
      // projector — GM-only via admin panel. Hunters must discover the weakness
      // during play; showing it on screen would give the game away.
      secret: true,
      options: [
        { text: 'Burn It',        emoji: '🔥', typeHints: ['destroyer', 'beast'],     gameIcon: 'lorc/fire-ray',           fluentEmoji: 'Fire' },
        { text: 'True Name',      emoji: '⚙️', typeHints: ['sorcerer', 'trickster'],  gameIcon: 'lorc/book',               fluentEmoji: 'Open Book' },
        { text: 'Its Reflection', emoji: '🪞', typeHints: ['trickster', 'queen'],     gameIcon: 'lorc/cracked-glass',      fluentEmoji: 'Mirror' },
        { text: 'Salt Circle',    emoji: '🧂', typeHints: ['sorcerer', 'destroyer'],  gameIcon: 'lorc/ringed-planet',      fluentEmoji: 'Salt' },
        { text: 'Old Blood',      emoji: '🩸', typeHints: ['parasite', 'sorcerer'],   gameIcon: 'lorc/dripping-goo',       fluentEmoji: 'Drop of Blood' },
        { text: 'First Light',    emoji: '🌅', typeHints: ['devourer', 'torturer'],   gameIcon: 'lorc/sun-rise',           fluentEmoji: 'Sunrise' },
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

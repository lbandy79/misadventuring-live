import type { MonsterSlotOption } from './types';

/**
 * Live Monster Builder — reusable option pools.
 *
 * One large pool per slot. Each show's config picks 4–6 via `pickOptions()`
 * so every show can present a different spread without new writing. Options
 * used at a past show are tagged with the episode date; rotate them back in
 * after a show or two.
 *
 * ICON NOTES (July 2026 audit):
 *   - fluentEmoji folder names are SENTENCE CASE ("Drop of blood", not
 *     "Drop of Blood") — the CDN path is case-sensitive. Every name in this
 *     file was verified live against jsDelivr. If you add options, verify:
 *     https://github.com/microsoft/fluentui-emoji/tree/main/assets
 *   - gameIcon is intentionally omitted: `gameIconUrl()` in
 *     LiveMonsterDisplayPage builds a colorway path game-icons.net doesn't
 *     serve (only ffffff/000000 exists as a static file), and several of the
 *     old slugs were never real. The display's SlotIcon falls back to
 *     fluentEmoji, so these render as the colorful 3D icons. Re-add gameIcon
 *     per option only after fixing gameIconUrl and verifying each slug.
 */

// ─── Appearance: "What does it look like?" ────────────────────────────────────

export const appearancePool: MonsterSlotOption[] = [
  // Used 2026-06-27 (Episode One)
  { text: 'Too Many',      emoji: '🕷️', typeHints: ['beast', 'devourer'],      fluentEmoji: 'Spider' },
  { text: 'Wrong Skin',    emoji: '🩸', typeHints: ['parasite', 'queen'],      fluentEmoji: 'Drop of blood' },
  { text: 'Almost Human',  emoji: '👤', typeHints: ['trickster', 'parasite'],  fluentEmoji: 'Bust in silhouette' },
  { text: 'All Teeth',     emoji: '🦷', typeHints: ['beast', 'devourer'],      fluentEmoji: 'Tooth' },
  { text: 'Living Shadow', emoji: '🌑', typeHints: ['sorcerer', 'devourer'],   fluentEmoji: 'New moon' },
  { text: 'Stolen Faces',  emoji: '🪞', typeHints: ['collector', 'trickster'], fluentEmoji: 'Mirror' },
  // Used 2026-07-25 (Episode Two)
  { text: 'Beautiful',     emoji: '🦋', typeHints: ['queen', 'trickster'],     fluentEmoji: 'Butterfly' },
  { text: 'Child-Sized',   emoji: '🧸', typeHints: ['trickster', 'collector'], fluentEmoji: 'Teddy bear' },
  { text: 'Antlered',      emoji: '🦌', typeHints: ['beast', 'executioner'],   fluentEmoji: 'Deer' },
  { text: 'Made of Rot',   emoji: '🍄', typeHints: ['parasite', 'devourer'],   fluentEmoji: 'Mushroom' },
  { text: 'Bone Thin',     emoji: '💀', typeHints: ['devourer', 'torturer'],   fluentEmoji: 'Skull' },
  { text: 'Grinning Wide', emoji: '😁', typeHints: ['trickster', 'torturer'],  fluentEmoji: 'Grinning face' },
  // Fresh (added Aug 2026 for Episode Three)
  { text: 'Dripping Wet',  emoji: '💧', typeHints: ['beast', 'destroyer'],     fluentEmoji: 'Droplet' },
  { text: 'Static-Faced',  emoji: '📺', typeHints: ['trickster', 'sorcerer'],  fluentEmoji: 'Television' },
  { text: 'Patchwork',     emoji: '🧵', typeHints: ['collector', 'torturer'],  fluentEmoji: 'Thread' },
];

// ─── Habitat: "Where has it been seen?" ───────────────────────────────────────

export const habitatPool: MonsterSlotOption[] = [
  // Used 2026-06-27 (Episode One)
  { text: 'Empty Houses',    emoji: '🚪', typeHints: ['executioner', 'torturer'], fluentEmoji: 'House' },
  { text: 'Still Water',     emoji: '🌊', typeHints: ['destroyer', 'beast'],      fluentEmoji: 'Water wave' },
  { text: 'Deep Woods',      emoji: '🌲', typeHints: ['beast', 'torturer'],       fluentEmoji: 'Evergreen tree' },
  { text: 'Your Walls',      emoji: '🛏️', typeHints: ['parasite', 'queen'],      fluentEmoji: 'Bed' },
  { text: 'Holy Ground',     emoji: '⛪', typeHints: ['sorcerer', 'destroyer'],   fluentEmoji: 'Church' },
  { text: 'The Underneath',  emoji: '🕳️', typeHints: ['devourer', 'beast'],      fluentEmoji: 'Hole' },
  // Used 2026-07-25 (Episode Two)
  { text: 'The County Fair', emoji: '🎡', typeHints: ['trickster', 'collector'],  fluentEmoji: 'Ferris wheel' },
  { text: 'The Graveyard',   emoji: '🪦', typeHints: ['sorcerer', 'executioner'], fluentEmoji: 'Headstone' },
  { text: 'The Dead Mall',   emoji: '🛍️', typeHints: ['collector', 'parasite'],  fluentEmoji: 'Shopping bags' },
  { text: 'The High School', emoji: '🏫', typeHints: ['queen', 'trickster'],      fluentEmoji: 'School' },
  { text: 'Storm Drains',    emoji: '🌀', typeHints: ['devourer', 'beast'],       fluentEmoji: 'Cyclone' },
  { text: 'The Old Motel',   emoji: '🛎️', typeHints: ['torturer', 'destroyer'],  fluentEmoji: 'Bellhop bell' },
  // Fresh (added Aug 2026 for Episode Three)
  { text: 'This Very Bar',    emoji: '🍺', typeHints: ['trickster', 'devourer'],  fluentEmoji: 'Beer mug' },
  { text: 'The Radio Tower',  emoji: '📡', typeHints: ['sorcerer', 'destroyer'],  fluentEmoji: 'Satellite antenna' },
  { text: 'The Orange Groves', emoji: '🍊', typeHints: ['queen', 'parasite'],     fluentEmoji: 'Tangerine' },
];

// ─── Behavior: "How does it hunt?" ────────────────────────────────────────────

export const behaviorPool: MonsterSlotOption[] = [
  // Used 2026-06-27 (Episode One)
  { text: 'Wears Faces',       emoji: '🎭', typeHints: ['trickster', 'queen'],       fluentEmoji: 'Performing arts' },
  { text: 'Sings First',       emoji: '🎵', typeHints: ['sorcerer', 'trickster'],    fluentEmoji: 'Musical notes' },
  { text: 'Never Blinks',      emoji: '👁️', typeHints: ['executioner', 'torturer'], fluentEmoji: 'Eye' },
  { text: 'Whispers Names',    emoji: '🤫', typeHints: ['sorcerer', 'parasite'],     fluentEmoji: 'Shushing face' },
  { text: 'Hollows Them',      emoji: '🩻', typeHints: ['devourer', 'parasite'],     fluentEmoji: 'Anatomical heart' },
  { text: 'Snuffs Light',      emoji: '🕯️', typeHints: ['destroyer', 'executioner'], fluentEmoji: 'Candle' },
  // Used 2026-07-25 (Episode Two)
  { text: 'Mimics Voices',     emoji: '🗣️', typeHints: ['trickster', 'parasite'],   fluentEmoji: 'Speaking head' },
  { text: 'Collects Trophies', emoji: '🏆', typeHints: ['collector', 'executioner'], fluentEmoji: 'Trophy' },
  { text: 'Waits by Roads',    emoji: '🛣️', typeHints: ['executioner', 'beast'],    fluentEmoji: 'Motorway' },
  { text: 'Feeds on Fear',     emoji: '😱', typeHints: ['torturer', 'devourer'],     fluentEmoji: 'Face screaming in fear' },
  { text: 'Marks Its Prey',    emoji: '❌', typeHints: ['beast', 'queen'],           fluentEmoji: 'Cross mark' },
  { text: 'Knocks Twice',      emoji: '🚪', typeHints: ['trickster', 'sorcerer'],    fluentEmoji: 'Door' },
  // Fresh (added Aug 2026 for Episode Three)
  { text: 'Steals Sleep',      emoji: '😴', typeHints: ['parasite', 'torturer'],     fluentEmoji: 'Sleeping face' },
  { text: 'Answers Prayers',   emoji: '🌟', typeHints: ['sorcerer', 'queen'],        fluentEmoji: 'Glowing star' },
  { text: 'Follows the Rules', emoji: '📜', typeHints: ['executioner', 'collector'], fluentEmoji: 'Scroll' },
];

// ─── Weakness: "What's the only way to stop it?" ──────────────────────────────

export const weaknessPool: MonsterSlotOption[] = [
  // Used 2026-06-27 (Episode One)
  { text: 'Burn It',        emoji: '🔥', typeHints: ['destroyer', 'beast'],     fluentEmoji: 'Fire' },
  { text: 'True Name',      emoji: '⚙️', typeHints: ['sorcerer', 'trickster'],  fluentEmoji: 'Open book' },
  { text: 'Its Reflection', emoji: '🪞', typeHints: ['trickster', 'queen'],     fluentEmoji: 'Mirror' },
  { text: 'Salt Circle',    emoji: '🧂', typeHints: ['sorcerer', 'destroyer'],  fluentEmoji: 'Salt' },
  { text: 'Old Blood',      emoji: '🩸', typeHints: ['parasite', 'sorcerer'],   fluentEmoji: 'Drop of blood' },
  { text: 'First Light',    emoji: '🌅', typeHints: ['devourer', 'torturer'],   fluentEmoji: 'Sunrise' },
  // Used 2026-07-25 (Episode Two)
  { text: 'Cold Iron',      emoji: '⛓️', typeHints: ['sorcerer', 'queen'],      fluentEmoji: 'Chains' },
  { text: 'A Lullaby',      emoji: '🎶', typeHints: ['queen', 'torturer'],      fluentEmoji: 'Musical notes' },
  { text: 'Silver',         emoji: '💍', typeHints: ['beast', 'parasite'],      fluentEmoji: 'Ring' },
  { text: 'Its Own Kind',   emoji: '👥', typeHints: ['collector', 'devourer'],  fluentEmoji: 'Busts in silhouette' },
  { text: 'An Honest Gift', emoji: '🎁', typeHints: ['trickster', 'collector'], fluentEmoji: 'Wrapped gift' },
  { text: 'Starve It',      emoji: '🍽️', typeHints: ['devourer', 'parasite'],  fluentEmoji: 'Fork and knife' },
  // Fresh (added Aug 2026 for Episode Three)
  { text: 'Laughter',       emoji: '🤣', typeHints: ['trickster', 'torturer'],  fluentEmoji: 'Rolling on the floor laughing' },
  { text: 'A Fair Trade',   emoji: '🤝', typeHints: ['collector', 'trickster'], fluentEmoji: 'Handshake' },
  { text: 'Bury It',        emoji: '⚰️', typeHints: ['sorcerer', 'executioner'], fluentEmoji: 'Coffin' },
];

/**
 * Pull named options out of a pool, in the order given. Throws on a name
 * that isn't in the pool — the error surfaces at module load, so a typo in
 * a show config breaks loudly in dev instead of silently dropping an option.
 */
export function pickOptions(pool: MonsterSlotOption[], texts: string[]): MonsterSlotOption[] {
  return texts.map((text) => {
    const option = pool.find((o) => o.text === text);
    if (!option) {
      throw new Error(
        `Monster option "${text}" not found in pool. Available: ${pool.map((o) => o.text).join(', ')}`
      );
    }
    return option;
  });
}

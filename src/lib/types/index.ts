/**
 * Shared types barrel — `src/lib/types`
 *
 * Single import surface for all cross-cutting types. Re-exports existing
 * `src/types/*` modules unchanged plus new platform-level types added in
 * Phase 2a (Interaction, Show).
 *
 * Usage:
 *   import type { NPC, Reservation, Show, ActiveInteraction } from '../lib/types';
 */

// Existing domain types (unchanged location, re-exported for convenience).
export type { NPC } from '../../types/npc.types';
export type { Reservation } from '../../types/reservation.types';
export type {
  SystemConfig,
  SystemInfo,
  Stat,
  DiceConfig,
  AgeGroup,
  Trope,
  Strength,
  Flaw,
  StatCheckRules,
  DifficultyLevel,
  AdversityTokenRules,
  NpcFormField,
  NpcStatAssignment,
  NpcCreatorConfig,
  ShowSetting,
  NpcCreatorOverrides,
  ShowConfig as SystemShowConfig,
} from '../../types/system.types';

// Theme types (re-exported from themes/ since they describe shared infra).
export type {
  TMPTheme,
  ThemeId,
  ThemeColors,
  ThemeTypography,
} from '../../themes/theme.types';

// New platform-level types introduced in Phase 2a.
export type {
  InteractionType,
  ActiveInteraction,
  VoteOption,
} from './interaction.types';
export type { Show } from './show.types';

/**
 * Live Monster Builder — config registry.
 *
 * This file and its siblings live in the legacy `src/data/` tree so the
 * platform app can reach them via the `@mtp/data` path alias without
 * duplicating files. The legacy app itself does not import from here.
 *
 * To add a new show:
 *   1. Create `<showId>.config.ts` next to demo.config.ts
 *   2. Import it below and add it to the registry map
 *   3. Set Firestore `config/platform.currentShowId` to the new showId before the show
 */

import type { MonsterBuilderConfig } from './types';
import { demoMonsterConfig } from './demo.config';

// ─── Registry ─────────────────────────────────────────────────────────────────

const registry: Record<string, MonsterBuilderConfig> = {
  [demoMonsterConfig.showId]: demoMonsterConfig,
};

/**
 * Look up the monster builder config for a given show.
 * Returns null if no config is registered for that showId.
 */
export function getMonsterConfig(showId: string): MonsterBuilderConfig | null {
  return registry[showId] ?? null;
}

export type {
  MonsterBuilderConfig,
  MonsterSlotConfig,
  MonsterSlotOption,
  BystanderConfig,
  BystanderMovePreset,
} from './types';

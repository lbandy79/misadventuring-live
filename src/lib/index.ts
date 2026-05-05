/**
 * `src/lib` — Shared infrastructure for the unified TMP platform.
 *
 * Each subfolder is a self-contained module that will eventually be
 * portable to the rebuild app:
 *
 *   - types/      Phase 2a — cross-cutting type definitions
 *   - realtime/   Phase 2b — Firebase listener hooks (planned)
 *   - audio-fx/   Phase 2c — audioMixer + cue bus (planned)
 *
 * Import sub-barrels directly (e.g. `import type { Show } from '@/lib/types'`)
 * rather than from this top-level barrel; this file exists for documentation.
 */

export * from './types';
export * from './realtime';

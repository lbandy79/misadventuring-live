/**
 * Phase 2c shim — original module relocated to `src/lib/audio-fx/audioMixer`.
 * This re-export keeps existing import paths working with no behavior change.
 * Prefer importing from `src/lib/audio-fx` (or the barrel) in new code.
 */
export * from '../lib/audio-fx/audioMixer';
export { default } from '../lib/audio-fx/audioMixer';

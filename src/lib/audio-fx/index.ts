/**
 * `src/lib/audio-fx` — Audio + visual effects bus.
 *
 * Phase 2c relocation: moved from src/utils and src/hooks. Behavior is
 * unchanged. Original paths still work via shim re-exports for backward
 * compatibility; new code should import from this barrel.
 *
 * Modules:
 *   - audioMixer       Howler-based theme-aware sound playback (singleton)
 *   - sounds           Lightweight synth-based UI sounds (vote, tick, etc.)
 *   - confetti         canvas-confetti wrappers (celebrateWinner, fireworks)
 *   - useAwesomeMix    GSAP + audio + confetti orchestration hook
 *   - useCueListener   Firebase live-cues bus (battle, shake, ambient)
 */

export { audioMixer, type SoundKey } from './audioMixer';
export { playSound, initAudio } from './sounds';
export {
  initConfetti,
  destroyConfetti,
  celebrateWinner,
  quickCelebration,
  themedCelebration,
  fireworks,
} from './confetti';
export {
  useAwesomeMix,
  type WinnerRevealOptions,
  type DiceRollOptions,
  type ScreenShakeOptions,
  type VoteParticleOptions,
} from './useAwesomeMix';
export { useCueListener, broadcastCue, type CueType } from './useCueListener';

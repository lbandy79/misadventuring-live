/**
 * useCueListener - Firebase Cue Sync System
 * 
 * Listens for broadcast cues from the GM and triggers synchronized effects
 * across all connected displays. The magic that makes "Battle Mode" hit
 * every screen at once.
 * 
 * "We're just like Kevin Bacon!" - Peter Quill
 */

import { useEffect, useRef, useCallback } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAwesomeMix } from './useAwesomeMix';

// =============================================================================
// TYPES
// =============================================================================

export type CueType = 
  | 'battle-start'
  | 'battle-end'
  | 'celebration-quick'
  | 'celebration-winner'
  | 'celebration-fireworks'
  | 'shake-light'
  | 'shake-heavy'
  | 'shake-earthquake'
  | 'fanfare'
  | 'ambient-start'
  | 'ambient-stop'
  | 'sound-effect'
  | 'none';

export interface LiveCue {
  /** The type of cue to trigger */
  type: CueType;
  /** Timestamp to detect new cues (even if same type) */
  timestamp: number;
  /** Optional intensity or variant */
  intensity?: 'quick' | 'winner' | 'fireworks' | 'subtle' | 'medium' | 'heavy' | 'earthquake';
  /** Optional sound key for sound-effect type */
  soundKey?: string;
  /** Server timestamp for sync verification */
  serverTime?: ReturnType<typeof serverTimestamp>;
}

// =============================================================================
// CUE BROADCASTER (for Admin use)
// =============================================================================

/**
 * Broadcast a cue to all connected clients
 * Call this from AdminPanel when triggering effects
 */
export async function broadcastCue(
  type: CueType,
  options?: { intensity?: LiveCue['intensity']; soundKey?: string }
): Promise<void> {
  try {
    // Build the document data, excluding undefined values (Firestore doesn't allow them)
    const cueData: Record<string, unknown> = {
      type,
      timestamp: Date.now(),
      serverTime: serverTimestamp(),
    };
    
    // Only add optional fields if they have values
    if (options?.intensity !== undefined) {
      cueData.intensity = options.intensity;
    }
    if (options?.soundKey !== undefined) {
      cueData.soundKey = options.soundKey;
    }

    await setDoc(doc(db, 'config', 'live-cues'), cueData);
    console.log(`📡 Broadcast cue: ${type}`, options);
  } catch (error) {
    console.error('Failed to broadcast cue:', error);
  }
}

/**
 * Clear the current cue (reset to none)
 */
export async function clearCue(): Promise<void> {
  await broadcastCue('none');
}

// =============================================================================
// CUE LISTENER HOOK
// =============================================================================

interface UseCueListenerOptions {
  /** Whether this client should respond to cues (default: true) */
  enabled?: boolean;
  /** Callback when any cue is received */
  onCue?: (cue: LiveCue) => void;
}

/**
 * Hook that listens for broadcast cues and triggers synchronized effects
 * 
 * @example
 * // In DisplayView or any component that should react to cues
 * useCueListener(); // That's it! Effects trigger automatically.
 * 
 * @example
 * // With custom handling
 * useCueListener({
 *   onCue: (cue) => console.log('Got cue:', cue),
 * });
 */
export function useCueListener(options: UseCueListenerOptions = {}) {
  const { enabled = true, onCue } = options;
  
  const {
    playSound,
    shakeScreen,
    triggerCelebration,
    enterBattleMode,
    exitBattleMode,
    startAmbient,
    stopAmbient,
  } = useAwesomeMix();

  // Track last processed cue to avoid duplicate triggers
  const lastCueTimestampRef = useRef<number>(0);
  const isFirstLoadRef = useRef(true);

  // Process incoming cue
  const processCue = useCallback((cue: LiveCue) => {
    // Skip if disabled
    if (!enabled) {
      console.log('⏭️ Cue skipped (disabled)');
      return;
    }

    // Skip if we've already processed this cue
    if (cue.timestamp <= lastCueTimestampRef.current) {
      console.log('⏭️ Cue skipped (already processed)', cue.timestamp, '<=', lastCueTimestampRef.current);
      return;
    }

    // Skip the initial load (don't replay old cues on page refresh)
    if (isFirstLoadRef.current) {
      console.log('⏭️ Cue skipped (first load - preventing replay of old cue)');
      isFirstLoadRef.current = false;
      lastCueTimestampRef.current = cue.timestamp;
      return;
    }

    // Update last processed timestamp
    lastCueTimestampRef.current = cue.timestamp;

    // Call custom handler if provided
    onCue?.(cue);

    // Skip 'none' type (used to clear cues)
    if (cue.type === 'none') return;

    console.log(`🎬 EXECUTING CUE: ${cue.type}`, cue);

    // Trigger the appropriate effect
    switch (cue.type) {
      case 'battle-start':
        enterBattleMode();
        break;

      case 'battle-end':
        exitBattleMode();
        break;

      case 'celebration-quick':
        triggerCelebration('quick');
        break;

      case 'celebration-winner':
        triggerCelebration('winner');
        break;

      case 'celebration-fireworks':
        triggerCelebration('fireworks');
        break;

      case 'shake-light':
        shakeScreen({ intensity: 'subtle' });
        break;

      case 'shake-heavy':
        shakeScreen({ intensity: 'heavy' });
        break;

      case 'shake-earthquake':
        shakeScreen({ intensity: 'earthquake', duration: 1 });
        break;

      case 'fanfare':
        playSound('victory');
        break;

      case 'ambient-start':
        startAmbient();
        break;

      case 'ambient-stop':
        stopAmbient();
        break;

      case 'sound-effect':
        if (cue.soundKey) {
          playSound(cue.soundKey as Parameters<typeof playSound>[0]);
        }
        break;

      default:
        console.warn(`Unknown cue type: ${cue.type}`);
    }
  }, [
    enabled,
    onCue,
    playSound,
    shakeScreen,
    triggerCelebration,
    enterBattleMode,
    exitBattleMode,
    startAmbient,
    stopAmbient,
  ]);

  // Subscribe to Firebase cue document
  useEffect(() => {
    if (!enabled) return;

    console.log('🎧 Cue listener starting up...');

    const unsubscribe = onSnapshot(
      doc(db, 'config', 'live-cues'),
      (snapshot) => {
        if (snapshot.exists()) {
          const cue = snapshot.data() as LiveCue;
          console.log('📥 Received cue from Firebase:', cue.type, 'timestamp:', cue.timestamp);
          processCue(cue);
        } else {
          console.log('📥 No cue document exists yet');
        }
      },
      (error) => {
        console.error('Cue listener error:', error);
      }
    );

    return () => {
      console.log('🎧 Cue listener shutting down');
      unsubscribe();
    };
  }, [enabled, processCue]);

  return {
    /** Manually broadcast a cue (convenience re-export) */
    broadcastCue,
    /** Clear the current cue */
    clearCue,
  };
}

export default useCueListener;

/**
 * useFirebaseDoc — Generic Firestore document subscription hook.
 *
 * Wraps the `onSnapshot` boilerplate that's currently repeated 20+ times
 * across the codebase. Returns the typed document data plus loading/error
 * state. Unsubscribes automatically on unmount or path change.
 *
 * Phase 2b — proof of concept. Components migrate at their own pace; the
 * direct `onSnapshot` calls elsewhere keep working.
 *
 * Usage:
 *   const { data, isLoading, error } = useFirebaseDoc<VoteDoc>('votes', 'current-vote');
 */

import { useEffect, useState } from 'react';
import { doc, onSnapshot, type FirestoreError } from 'firebase/firestore';
import { db } from '../../firebase';

export interface FirebaseDocResult<T> {
  data: T | null;
  isLoading: boolean;
  error: FirestoreError | null;
  exists: boolean;
}

/**
 * Subscribe to a Firestore document by path segments.
 *
 * @example useFirebaseDoc<NPC>('npcs', npcId)
 * @example useFirebaseDoc<ActiveInteraction>('config', 'active-interaction')
 */
export function useFirebaseDoc<T = Record<string, unknown>>(
  ...pathSegments: string[]
): FirebaseDocResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [exists, setExists] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  // Stable key for effect dep — segments are short strings.
  const key = pathSegments.join('/');

  useEffect(() => {
    if (pathSegments.some((s) => !s)) {
      // Empty segment → treat as paused subscription.
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const ref = doc(db, pathSegments[0], ...pathSegments.slice(1));
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setData(snap.data() as T);
          setExists(true);
        } else {
          setData(null);
          setExists(false);
        }
        setIsLoading(false);
      },
      (err) => {
        console.error(`useFirebaseDoc(${key}) listener error:`, err);
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data, isLoading, error, exists };
}

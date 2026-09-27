/**
 * One live subscription to the art thumbnails for the whole session, shared
 * by every Labs page. Thumbs are small but there are dozens; re-fetching
 * them on every navigation would waste the crew's phone data.
 *
 * Started lazily by the first component that needs art while the viewer is
 * cast/admin. A permission error (e.g. after sign-out) resets the store so
 * the next eligible mount retries.
 */

import { useEffect, useSyncExternalStore } from 'react';
import { subscribeToSbpArtThumbs, type SbpArtThumb } from '@mtp/lib';

interface ArtState {
  thumbs: Record<string, SbpArtThumb>;
  loaded: boolean;
}

let state: ArtState = { thumbs: {}, loaded: false };
let started = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

function start() {
  if (started) return;
  started = true;
  subscribeToSbpArtThumbs(
    (thumbs) => {
      state = { thumbs, loaded: true };
      emit();
    },
    (err) => {
      console.warn('sbp-art subscription failed:', err);
      started = false;
      state = { thumbs: {}, loaded: true };
      emit();
    },
  );
}

export function useSbpArt(enabled: boolean): ArtState {
  useEffect(() => {
    if (enabled) start();
  }, [enabled]);
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => state,
  );
}

/**
 * ShowProvider — Resolves the currently active Show.
 *
 * Source of truth: the `showId` field on `config/active-interaction`.
 * Falls back to `defaultShowId` from the registry if the doc is missing
 * or the field is unset.
 *
 * Phase 3a: provider + hook only. No consumer wired yet — components
 * still derive theme/system from their own paths. Phase 3b will start
 * stamping `showId` onto Firestore writes; Phase 3c will collapse vote
 * components and consume `useShow()` directly.
 *
 * Usage:
 *   <ShowProvider><App /></ShowProvider>
 *   const { show, showId, isLoading } = useShow();
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Show } from '../types/show.types';
import type { ActiveInteraction } from '../types/interaction.types';
import { useFirebaseDoc } from '../realtime/useFirebaseDoc';
import { defaultShowId, getShow, shows } from './registry';

export interface ShowContextValue {
  /** Resolved show, or null while loading / if id is unknown. */
  show: Show | null;
  /** The id we're trying to resolve (live-show value or default). */
  showId: string;
  /** True while the underlying Firestore doc subscription is initializing. */
  isLoading: boolean;
  /** True if `showId` was provided but no Show is registered for it. */
  isUnknown: boolean;
  /** All registered shows — useful for selectors. */
  allShows: Show[];
}

const ShowContext = createContext<ShowContextValue | null>(null);

interface ShowProviderProps {
  children: ReactNode;
  /**
   * Override the live-show resolution for tests, story books, or
   * single-show standalone routes (e.g. /shows/beast-of-ridgefall).
   */
  forceShowId?: string;
}

export function ShowProvider({ children, forceShowId }: ShowProviderProps) {
  const { data, isLoading } = useFirebaseDoc<ActiveInteraction>(
    'config',
    'active-interaction'
  );

  const value = useMemo<ShowContextValue>(() => {
    const resolvedId = forceShowId ?? data?.showId ?? defaultShowId;
    const show = getShow(resolvedId) ?? null;
    return {
      show,
      showId: resolvedId,
      isLoading: forceShowId ? false : isLoading,
      isUnknown: !!resolvedId && !show,
      allShows: shows,
    };
  }, [data?.showId, forceShowId, isLoading]);

  return <ShowContext.Provider value={value}>{children}</ShowContext.Provider>;
}

/** Read the active Show. Throws if used outside <ShowProvider>. */
export function useShow(): ShowContextValue {
  const ctx = useContext(ShowContext);
  if (!ctx) {
    throw new Error('useShow() must be used inside <ShowProvider>');
  }
  return ctx;
}

/**
 * Read the active Show without requiring a provider — returns a sane
 * default-only value if no provider is mounted. Useful during the
 * Phase 3 migration when not every entry point is wrapped yet.
 */
export function useShowOptional(): ShowContextValue {
  const ctx = useContext(ShowContext);
  if (ctx) return ctx;
  return {
    show: getShow(defaultShowId) ?? null,
    showId: defaultShowId,
    isLoading: false,
    isUnknown: false,
    allShows: shows,
  };
}

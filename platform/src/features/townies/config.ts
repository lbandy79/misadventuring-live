/**
 * The bits of a show's system JSON (`showConfig`) the Townies panel needs.
 * Loaded at runtime, like every other show-config consumer.
 */

import { useEffect, useState } from 'react';

export interface TownieField {
  id: string;
  type: string;
  label: string;
  fieldType: 'personal' | 'world';
  options?: string[];
  writeInPlaceholder?: string;
}

export interface TowniesShowConfig {
  /** Firestore episode id (= config/platform.currentShowId on show night). */
  showId: string;
  showName: string;
  fields: TownieField[];
  namePlaceholder?: string;
  /** True for shows built around stingers (Honey Heist). Those keep the
   *  older NPC panel with its stinger, world-vote and email tools. */
  usesStingers: boolean;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; config: TowniesShowConfig };

export function useTowniesConfig(systemId: string | undefined): LoadState {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    if (!systemId) return;
    (async () => {
      try {
        const mod = await import(`../../../../src/systems/${systemId}.system.json`);
        const sc = (mod.default ?? mod)?.showConfig;
        if (cancelled) return;
        if (!sc?.showId) {
          setState({ status: 'error' });
          return;
        }
        setState({
          status: 'ready',
          config: {
            showId: sc.showId,
            showName: sc.showName ?? systemId,
            fields: (sc.npcCreation?.fields ?? []) as TownieField[],
            namePlaceholder: sc.npcCreation?.copy?.namePlaceholder,
            usesStingers: !!sc.stingerQueue,
          },
        });
      } catch {
        if (!cancelled) setState({ status: 'error' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [systemId]);
  return state;
}

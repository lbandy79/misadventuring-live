/**
 * JoinRedirectPage — /join
 *
 * The one URL the show QR should ever encode. Reads
 * `config/platform.currentShowId` and forwards the phone to whatever the
 * current show's audience experience is (see `resolveJoinTarget`):
 * the live monster builder, a show's NPC submission page, or the landing
 * page when nothing is running.
 */

import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useShow, resolveJoinTarget } from '@mtp/lib';
import { getMonsterConfig } from '@mtp/data/liveMonster';

export default function JoinRedirectPage() {
  const { showId, isLoading, allShows } = useShow();
  const [npcEpisodes, setNpcEpisodes] = useState<Record<string, string> | null>(null);

  // Episode ids for npc-creation shows live in their system JSON, so load
  // those (a couple of small files) to recognise a dated currentShowId.
  useEffect(() => {
    let cancelled = false;
    const npcShows = allShows.filter((s) => s.audienceMode === 'npc-creation');
    Promise.all(
      npcShows.map(async (s) => {
        try {
          const mod = await import(`../../../src/systems/${s.systemId}.system.json`);
          const episodeId: unknown = (mod.default ?? mod)?.showConfig?.showId;
          return typeof episodeId === 'string' ? ([episodeId, s.id] as const) : null;
        } catch {
          return null;
        }
      }),
    ).then((pairs) => {
      if (cancelled) return;
      setNpcEpisodes(Object.fromEntries(pairs.filter((p) => p !== null)));
    });
    return () => { cancelled = true; };
  }, [allShows]);

  if (isLoading || !npcEpisodes) {
    return (
      <section className="page-card join-page">
        <p className="join-loading">Finding tonight's show…</p>
      </section>
    );
  }

  const target = resolveJoinTarget(showId, {
    shows: allShows,
    hasMonsterConfig: (id) => getMonsterConfig(id) !== null,
    npcEpisodes,
  });
  return <Navigate to={target} replace />;
}

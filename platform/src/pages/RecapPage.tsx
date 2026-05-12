import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import HeroSection from './recap/HeroSection';
import FeaturedCharacter from './recap/FeaturedCharacter';
import CharacterGrid from './recap/CharacterGrid';
import MonsterStickyNote from './recap/MonsterStickyNote';
import ComingNextStickyNote from './recap/ComingNextStickyNote';
import AboutPageFooter from './recap/AboutPageFooter';
import { getRecapConfig } from './recap/recapConfig';
import {
  fetchRecapData,
  fetchHighlightBeats,
  type RecapData,
  type Beat,
} from './recap/recapApi';
import './recap/recap.css';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; data: RecapData; stingerHighlights: Beat[] }
  | { status: 'error'; message: string };

export default function RecapPage() {
  const { showId = '' } = useParams<{ showId: string }>();
  const config = useMemo(() => getRecapConfig(showId), [showId]);
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    if (!showId) {
      setLoad({ status: 'error', message: 'Missing show id.' });
      return;
    }
    let cancelled = false;
    setLoad({ status: 'loading' });

    const beatIds = config?.stingerHighlights ?? [];
    Promise.all([fetchRecapData(showId), fetchHighlightBeats(beatIds)])
      .then(([data, stingerHighlights]) => {
        if (!cancelled) setLoad({ status: 'ready', data, stingerHighlights });
      })
      .catch((err) => {
        console.error('[recap] fetch failed:', err);
        if (!cancelled) {
          setLoad({ status: 'error', message: "We couldn't pull this show's recap. Try again in a moment." });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [showId, config]);

  if (!config) {
    return (
      <div className="recap-page recap-paper-bg">
        <section className="recap-empty">
          <h1>No recap on file for this show.</h1>
          <p>
            We only publish recaps for shows that have actually happened.
            Browse the <Link to="/shows">show list</Link> to see what is running.
          </p>
        </section>
      </div>
    );
  }

  if (load.status === 'loading') {
    return (
      <div className="recap-page recap-paper-bg">
        <p className="recap-loading">developing the tape&hellip;</p>
      </div>
    );
  }

  if (load.status === 'error') {
    return (
      <div className="recap-page recap-paper-bg">
        <section className="recap-empty">
          <h1>Signal lost.</h1>
          <p>{load.message}</p>
        </section>
      </div>
    );
  }

  const { data, stingerHighlights } = load;
  const featured = config.featuredReservationId
    ? data.npcs.find((n) => n.reservationId === config.featuredReservationId) ?? null
    : null;

  const npcCount = data.npcCount;
  const hasFunnel = data.reservationCount > 0 || npcCount > 0;
  const hasClips = (config.clips?.length ?? 0) > 0;
  const hasStingerHighlights = stingerHighlights.length > 0;

  return (
    <div className={'recap-page recap-paper-bg costume-' + config.costume}>
      <HeroSection config={config} />

      {config.summary && (
        <section className="recap-section recap-summary-section">
          <p className="recap-summary">{config.summary}</p>
        </section>
      )}

      {(config.fullEpisodeYoutubeId || hasClips) && (
        <section className="recap-section recap-video-section">
          <h2 className="recap-section-heading">Watch</h2>

          {config.fullEpisodeYoutubeId && (
            <div className="recap-video-full">
              <p className="recap-video-label">Full episode</p>
              <div className="recap-embed-wrap">
                <iframe
                  src={'https://www.youtube.com/embed/' + config.fullEpisodeYoutubeId}
                  title="Full episode"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="recap-embed"
                />
              </div>
            </div>
          )}

          {hasClips && (
            <div className="recap-clips">
              {config.clips!.map((clip) => (
                <div key={clip.youtubeId} className="recap-clip">
                  <p className="recap-clip-label">{clip.label}</p>
                  <div className="recap-embed-wrap">
                    <iframe
                      src={'https://www.youtube.com/embed/' + clip.youtubeId}
                      title={clip.label}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="recap-embed"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {hasStingerHighlights && (
        <section className="recap-section recap-stingers-section">
          <h2 className="recap-section-heading">Best Stingers</h2>
          <ol className="recap-stinger-list">
            {stingerHighlights.map((beat) => (
              <li key={beat.id} className="recap-stinger-item">
                <span className="recap-stinger-name">{beat.npcDisplayName}</span>
                {beat.response && (
                  <span className="recap-stinger-text">{beat.response.assembledText}</span>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {(npcCount > 0 || hasFunnel) && (
        <section className="recap-section">
          <h2 className="recap-section-heading">The Crowd at the Table</h2>
          {hasFunnel && npcCount > 0 && (
            <p className="recap-funnel">
              <strong>{npcCount}</strong> {npcCount === 1 ? 'person' : 'people'} built a character. Here is who showed up.
            </p>
          )}
          {featured && <FeaturedCharacter npc={featured} />}
          <CharacterGrid
            npcs={data.npcs}
            excludeReservationId={featured?.reservationId}
          />
        </section>
      )}

      {config.monsterStatus === 'lost' && (
        <section className="recap-section">
          <MonsterStickyNote status="lost" />
        </section>
      )}

      {config.next && (
        <section className="recap-section recap-next-section">
          <ComingNextStickyNote next={config.next} />
        </section>
      )}

      <AboutPageFooter />
    </div>
  );
}

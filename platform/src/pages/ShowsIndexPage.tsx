/**
 * ShowsIndexPage — Phase 6.
 *
 * Lists every public show, grouped by lifecycle. Upcoming/live shows
 * surface "Reserve a seat"; past shows surface "Watch the recap" so
 * visitors can revisit the episode instead of attempting to register
 * for something that has already aired. Shelved shows are hidden.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useShow, getShowEra, type Show } from '@mtp/lib';

function isExternalRecap(
  show: Show
): show is Show & { recap: { kind: 'external'; url: string; label?: string } } {
  return show.recap?.kind === 'external';
}

function isFirestoreRecap(
  show: Show
): show is Show & { recap: { kind: 'firestore'; recapId: string } } {
  return show.recap?.kind === 'firestore';
}

function ShowCard({
  show,
  isLive,
}: {
  show: Show;
  isLive: boolean;
}) {
  const era = getShowEra(show);

  // Past shows: card links straight to the recap (in-app for firestore,
  // YouTube in a new tab for external). No reserve affordance anywhere.
  if (era === 'past') {
    if (isFirestoreRecap(show)) {
      return (
        <Link to={`/recap/${show.recap.recapId}`} className="show-card">
          <ShowCardBody show={show} badge={<span className="status">past</span>} />
          <span className="show-card-cta">Watch the recap →</span>
        </Link>
      );
    }
    if (isExternalRecap(show)) {
      return (
        <a
          href={show.recap.url}
          target="_blank"
          rel="noopener noreferrer"
          className="show-card"
        >
          <ShowCardBody show={show} badge={<span className="status">past</span>} />
          <span className="show-card-cta">
            {show.recap.label ?? 'Watch the recap'} ↗
          </span>
        </a>
      );
    }
    // Past show with no recap target — render as a plain detail link.
    return (
      <Link to={`/shows/${show.id}`} className="show-card">
        <ShowCardBody show={show} badge={<span className="status">past</span>} />
        <span className="show-card-cta">View show →</span>
      </Link>
    );
  }

  // Live or upcoming: existing detail-page behavior.
  return (
    <Link to={`/shows/${show.id}`} className="show-card">
      <ShowCardBody
        show={show}
        badge={
          isLive ? (
            <span className="live-badge">● Live</span>
          ) : (
            <span className={`status ${era === 'upcoming' ? '' : 'draft'}`}>
              {era}
            </span>
          )
        }
      />
      <span className="show-card-cta">
        {isLive ? 'Enter the live show →' : 'View show →'}
      </span>
    </Link>
  );
}

function ShowCardBody({
  show,
  badge,
}: {
  show: Show;
  badge: React.ReactNode;
}) {
  const [metadataLabel, setMetadataLabel] = useState<string | null>(null);

  useEffect(() => {
    // Try to dynamically load the system config to check for schema-specific metadata
    (async () => {
      try {
        // Attempt to load system JSON file
        const module = await import(`../../../src/systems/${show.systemId}.system.json`);
        const config = module.default ?? module;
        
        // Check if this system has mad libs in showConfig
        if (config?.showConfig?.madLibs && Array.isArray(config.showConfig.madLibs)) {
          setMetadataLabel(`${config.showConfig.madLibs.length} mad libs`);
        } else {
          // Fall back to interactions count
          setMetadataLabel(`${show.enabledInteractions.length} interactions`);
        }
      } catch (err) {
        // If system config can't be loaded, just use interactions count
        setMetadataLabel(`${show.enabledInteractions.length} interactions`);
      }
    })();
  }, [show.systemId, show.enabledInteractions.length]);

  // Use the loaded metadata, or show interactions count as fallback
  const interactionLabel = metadataLabel ?? `${show.enabledInteractions.length} interactions`;

  return (
    <>
      <div className="show-card-head">
        <span className="name">{show.name}</span>
        {badge}
      </div>
      <div className="meta">
        {show.themeId} · {show.systemId} · {interactionLabel}
      </div>
      {show.description && <p className="desc">{show.description}</p>}
    </>
  );
}

export default function ShowsIndexPage() {
  const { allShows, showId: currentLiveId } = useShow();

  const publicShows = allShows.filter((s) => getShowEra(s) !== 'shelved');
  const upcoming = publicShows.filter((s) => {
    const era = getShowEra(s);
    return era === 'upcoming' || era === 'live';
  });
  const past = publicShows.filter((s) => getShowEra(s) === 'past');

  return (
    <section>
      <header className="page-card">
        <h1>Shows</h1>
        <p>
          Each show has its own world, system, and audience interactions.
          Reserve a seat for what's coming — or revisit what's already aired.
        </p>
      </header>

      {upcoming.length > 0 && (
        <>
          <h2 className="section-title">Upcoming</h2>
          <div className="show-grid">
            {upcoming.map((s) => (
              <ShowCard
                key={s.id}
                show={s}
                isLive={s.id === currentLiveId && s.status === 'live'}
              />
            ))}
          </div>
        </>
      )}

      {past.length > 0 && (
        <>
          <h2 className="section-title" style={{ marginTop: '3rem' }}>
            Past shows
          </h2>
          <div className="show-grid">
            {past.map((s) => (
              <ShowCard key={s.id} show={s} isLive={false} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

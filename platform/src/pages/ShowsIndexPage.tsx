/**
 * ShowsIndexPage — Phase 6.
 *
 * Lists every registered show as a clickable card. Highlights the show
 * that is currently live (platform.currentShowId === show.id) so audience
 * members landing here at a venue immediately see "this one, right now."
 */

import { Link } from 'react-router-dom';
import { useShow } from '@mtp/lib';

export default function ShowsIndexPage() {
  const { allShows, showId: currentLiveId } = useShow();

  return (
    <section>
      <header className="page-card">
        <h1>Shows</h1>
        <p>
          Each show has its own world, system, and audience interactions.
          Pick one to see details, reserve a seat, or — if it's currently
          running — punch in your access code.
        </p>
      </header>

      <div className="show-grid">
        {allShows.map((s) => {
          const isLive = s.id === currentLiveId && s.status === 'live';
          return (
            <Link key={s.id} to={`/shows/${s.id}`} className="show-card">
              <div className="show-card-head">
                <span className="name">{s.name}</span>
                {isLive ? (
                  <span className="live-badge">● Live</span>
                ) : s.status ? (
                  <span className={`status ${s.status === 'draft' ? 'draft' : ''}`}>
                    {s.status}
                  </span>
                ) : null}
              </div>
              <div className="meta">
                {s.themeId} · {s.systemId} · {s.enabledInteractions.length} interactions
              </div>
              {s.description && <p className="desc">{s.description}</p>}
              <span className="show-card-cta">
                {isLive ? 'Enter the live show →' : 'View show →'}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

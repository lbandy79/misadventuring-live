/**
 * ShowPage — Phase 6.
 *
 * Per-show landing/detail page. Pulls Show metadata from the registry,
 * indicates "live now" when this show is the platform's current active
 * show, and routes audience/reserve flows.
 */

import { useParams, Link } from 'react-router-dom';
import { getShow, useShow } from '@mtp/lib';

export default function ShowPage() {
  const { showId } = useParams<{ showId: string }>();
  const show = showId ? getShow(showId) : undefined;

  // useShow() reads the platform-wide current show (Firestore config/platform).
  // We compare to the URL show to render a "Live now" badge.
  const platform = useShow();
  const isLiveNow = !!show && platform.showId === show.id && show.status === 'live';

  if (!show || !showId) {
    return (
      <section className="page-card">
        <h1>Show not found</h1>
        <p>No show is registered with id "{showId}".</p>
        <p>
          <Link to="/shows">← Back to all shows</Link>
        </p>
      </section>
    );
  }

  return (
    <section className="page-card show-detail-card">
      <div className="show-detail-head">
        <div>
          <h1 className="show-detail-title">{show.name}</h1>
          {show.seriesName && (
            <p className="show-detail-series">part of {show.seriesName}</p>
          )}
        </div>
        <div className="show-detail-badges">
          {isLiveNow && <span className="live-badge">● Live now</span>}
          {!isLiveNow && show.status && (
            <span className={`upcoming-badge ${show.status}`}>{show.status}</span>
          )}
        </div>
      </div>

      {show.description && <p className="show-detail-desc">{show.description}</p>}

      <div className="show-detail-grid">
        <div>
          <h3>Theme</h3>
          <p>{show.themeId}</p>
        </div>
        <div>
          <h3>System</h3>
          <p>{show.systemId}</p>
        </div>
        <div>
          <h3>Audience interactions</h3>
          <p>{show.enabledInteractions.length} enabled</p>
        </div>
      </div>

      <details className="show-detail-interactions">
        <summary>What you can do as the audience</summary>
        <ul>
          {show.enabledInteractions.map((i) => (
            <li key={i}>{i.replace(/-/g, ' ')}</li>
          ))}
        </ul>
      </details>

      <div className="show-detail-cta-row">
        {isLiveNow ? (
          <Link to={`/shows/${show.id}/audience`} className="btn-primary btn-lg">
            Enter the live show →
          </Link>
        ) : (
          <Link
            to={`/reserve?show=${encodeURIComponent(show.id)}`}
            className="btn-primary btn-lg"
          >
            Reserve a seat
          </Link>
        )}
        <Link to={`/shows/${show.id}/audience`} className="btn-secondary btn-lg">
          I have an access code
        </Link>
      </div>

      <p style={{ marginTop: '2rem' }}>
        <Link to="/shows">← Back to all shows</Link>
      </p>
    </section>
  );
}

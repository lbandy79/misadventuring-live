/**
 * ShowPage — Phase 6.
 *
 * Per-show detail page. Branches CTA on the show's lifecycle `era`:
 *   - 'live'     → enter the live show
 *   - 'upcoming' → reserve a seat
 *   - 'past'     → watch the recap (Firestore in-app or external YouTube)
 *   - 'shelved'  → render a 404-equivalent so the entry is invisible
 *
 * Reservation forms are hidden on past/shelved shows so visitors can never
 * accidentally try to register for something that has already aired.
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getShow, getShowEra, useShow } from '@mtp/lib';

export default function ShowPage() {
  const { showId } = useParams<{ showId: string }>();
  const show = showId ? getShow(showId) : undefined;
  const [systemConfig, setSystemConfig] = useState<any>(null);

  // Load system config dynamically to access schema-specific data (mad libs, system description, etc.)
  useEffect(() => {
    if (!show) return;
    
    (async () => {
      try {
        const module = await import(`../../../src/systems/${show.systemId}.system.json`);
        setSystemConfig(module.default ?? module);
      } catch (err) {
        // System config not found or can't be loaded; that's okay for display purposes
        setSystemConfig(null);
      }
    })();
  }, [show]);

  // useShow() reads the platform-wide current show (Firestore config/platform).
  // We compare to the URL show to render a "Live now" badge.
  const platform = useShow();
  const era = show ? getShowEra(show) : undefined;
  const isLiveNow =
    !!show && platform.showId === show.id && show.status === 'live' && era === 'live';

  if (!show || !showId || era === 'shelved') {
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

  const recapHref =
    show.recap?.kind === 'firestore'
      ? `/recap/${show.recap.recapId}`
      : show.recap?.kind === 'external'
        ? show.recap.url
        : undefined;
  const recapIsExternal = show.recap?.kind === 'external';
  const recapLabel =
    show.recap?.kind === 'external'
      ? (show.recap.label ?? 'Watch the recap')
      : 'Watch the recap';

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
          {!isLiveNow && era && (
            <span className={`upcoming-badge ${era}`}>{era}</span>
          )}
        </div>
      </div>

      {era === 'past' && (
        <p className="show-detail-wrapped" style={{ fontStyle: 'italic', opacity: 0.85 }}>
          This show has wrapped. Catch the recap below.
        </p>
      )}

      {show.description && <p className="show-detail-desc">{show.description}</p>}

      <div className="show-detail-grid">
        <div>
          <h3>Theme</h3>
          <p>{show.themeId}</p>
        </div>
        <div>
          <h3>System</h3>
          <p>{show.systemId}</p>
          {systemConfig?.system?.description && (
            <p style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '0.5rem' }}>
              {systemConfig.system.description}
            </p>
          )}
        </div>
        <div>
          <h3>Audience interactions</h3>
          <p>{show.enabledInteractions.length} enabled</p>
        </div>
      </div>

      {era !== 'past' && (
        <details className="show-detail-interactions">
          <summary>What you can do as the audience</summary>
          <ul>
            {show.enabledInteractions.map((i) => (
              <li key={i}>{i.replace(/-/g, ' ')}</li>
            ))}
          </ul>
        </details>
      )}

      {systemConfig?.showConfig?.madLibs && Array.isArray(systemConfig.showConfig.madLibs) && (
        <section className="show-detail-madlibs" style={{ marginTop: '2rem' }}>
          <h3>Mad Libs</h3>
          <p style={{ opacity: 0.85, fontSize: '0.95rem', marginBottom: '1rem' }}>
            Help shape the story before the show starts.
          </p>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {systemConfig.showConfig.madLibs.map((madlib: any) => (
              <div
                key={madlib.id}
                style={{
                  padding: '1rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                }}
              >
                <h4 style={{ margin: '0 0 0.5rem 0' }}>{madlib.title}</h4>
                <p style={{ margin: '0', opacity: 0.85, fontSize: '0.9rem' }}>
                  {madlib.prompt}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="show-detail-cta-row">
        {era === 'past' && recapHref ? (
          recapIsExternal ? (
            <a
              href={recapHref}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary btn-lg"
            >
              {recapLabel} ↗
            </a>
          ) : (
            <Link to={recapHref} className="btn-primary btn-lg">
              {recapLabel} →
            </Link>
          )
        ) : isLiveNow ? (
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

        {/* Secondary YouTube link when a Firestore recap is the primary CTA. */}
        {era === 'past' && show.recap?.kind === 'firestore' && show.youtubeUrl && (
          <a
            href={show.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary btn-lg"
          >
            Watch on YouTube ↗
          </a>
        )}

        {era !== 'past' && (
          <Link to={`/shows/${show.id}/audience`} className="btn-secondary btn-lg">
            I have an access code
          </Link>
        )}
      </div>

      <p style={{ marginTop: '2rem' }}>
        <Link to="/shows">← Back to all shows</Link>
      </p>
    </section>
  );
}

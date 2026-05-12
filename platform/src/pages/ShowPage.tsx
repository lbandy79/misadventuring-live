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

import type { CSSProperties } from 'react';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getShow, getShowEra, useShow } from '@mtp/lib';
import { CampaignDecor } from '../components/CampaignDecor';

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
      ? `/shows/${show.recap.recapId}/recap`
      : show.recap?.kind === 'external'
        ? show.recap.url
        : undefined;
  const recapIsExternal = show.recap?.kind === 'external';
  const recapLabel =
    show.recap?.kind === 'external'
      ? (show.recap.label ?? 'Watch the recap')
      : 'Watch the recap';

  // Per-show accent color flows via CSS custom properties on the page wrapper.
  const accentStyle = (show.accentColor
    ? ({
        ['--accent' as any]: show.accentColor,
        ...(show.accentInk ? { ['--accent-ink' as any]: show.accentInk } : {}),
      } as CSSProperties)
    : undefined);

  const campaignId: string | undefined = systemConfig?.showConfig?.theme?.campaignId;
  const isNpcMadLibs = !!systemConfig?.showConfig?.npcCreation;

  return (
    <section className="page-card show-detail-card" style={accentStyle}>
      {campaignId && <CampaignDecor campaignId={campaignId} />}
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
        <p className="show-detail-wrapped">
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
            <p className="show-detail-grid-note">
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

      {systemConfig?.showConfig?.npcCreation && era !== 'past' && (
        <section className="show-detail-madlibs">
          <p className="show-detail-madlibs-blurb">
            You write the words. The bears live with them.
          </p>
          <div className="show-detail-madlibs-cta">
            <Link to={`/shows/${show.id}/join`} className="btn-primary">
              Help shape the heist →
            </Link>
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
        ) : null}

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
      </div>

      <p className="show-detail-back">
        <Link to="/shows">← Back to all shows</Link>
      </p>
    </section>
  );
}

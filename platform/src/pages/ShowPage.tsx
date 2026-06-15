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
  const pitch = systemConfig?.showConfig?.pitch as {
    hook?: string;
    genreNote?: string;
    genreComps?: string[];
    audienceActions?: { label: string; detail: string }[];
  } | undefined;

  const systemName: string =
    systemConfig?.system?.name ??
    show.systemId.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const upcomingDateLabel = show.nextDate
    ? new Date(show.nextDate + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      })
    : null;

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
            <span className={`upcoming-badge ${era}`}>
              {era === 'upcoming' && upcomingDateLabel ? upcomingDateLabel : era}
            </span>
          )}
        </div>
      </div>

      {pitch?.hook && (
        <p className="show-detail-hook">{pitch.hook}</p>
      )}

      {era === 'past' && (
        <p className="show-detail-wrapped">
          This show has wrapped. Catch the recap below.
        </p>
      )}

      {era === 'upcoming' && (
        <p className="show-detail-wrapped">
          Coming up at Lucky Straws, Winter Garden, FL. Walk in — no ticket needed.
        </p>
      )}

      {show.description && <p className="show-detail-desc">{show.description}</p>}

      {pitch?.genreComps && pitch.genreComps.length > 0 && (
        <div className="show-detail-genre">
          {pitch.genreNote && <p className="show-detail-genre-note">{pitch.genreNote}</p>}
          <div className="show-detail-genre-chips">
            {pitch.genreComps.map((comp) => (
              <span key={comp} className="show-detail-genre-chip">{comp}</span>
            ))}
          </div>
        </div>
      )}

      {pitch?.audienceActions && pitch.audienceActions.length > 0 && era !== 'past' ? (
        <div className="show-detail-actions">
          <p className="show-detail-actions-label">What you'll do as the audience</p>
          <div className="show-detail-action-list">
            {pitch.audienceActions.map((action) => (
              <div key={action.label} className="show-detail-action-card">
                <h4>{action.label}</h4>
                <p>{action.detail}</p>
              </div>
            ))}
          </div>
        </div>
      ) : era !== 'past' ? (
        <details className="show-detail-interactions" open={era === 'upcoming' || era === 'live'}>
          <summary>What you can do as the audience</summary>
          <ul>
            {show.enabledInteractions.map((i) => (
              <li key={i}>{i.replace(/-/g, ' ')}</li>
            ))}
          </ul>
        </details>
      ) : null}

      {(systemConfig?.system?.description || systemName) && (
        <div className="show-detail-grid">
          <div>
            <h3>System</h3>
            <p>{systemName}</p>
            {systemConfig?.system?.description && (
              <p className="show-detail-grid-note">
                {systemConfig.system.description}
              </p>
            )}
          </div>
        </div>
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

      {era === 'upcoming' && (
        <div className="show-detail-friend">
          <p className="show-detail-friend-headline">Walk in free. Bring someone brave.</p>
          <p className="show-detail-friend-note">No tickets. No app. No rules knowledge required. Just show up at Lucky Straws.</p>
        </div>
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
              {recapLabel} →
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

        {era === 'past' && show.recap?.kind === 'firestore' && show.youtubeUrl && (
          <a
            href={show.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary btn-lg"
          >
            Watch on YouTube →
          </a>
        )}
      </div>

      <p className="show-detail-back">
        <Link to="/shows">← Back to all shows</Link>
      </p>
    </section>
  );
}

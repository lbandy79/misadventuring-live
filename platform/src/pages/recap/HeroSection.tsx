/**
 * Hero — Betawave VHS costume layered over the pen-and-paper substrate.
 *
 * Lined notebook paper shows through the broadcast distortion (CSS scanlines
 * + a slow vertical tracking sweep). Title in Bowlby One sharpie, subhead
 * handwritten in Kalam, fact strip typewritten in Special Elite.
 */

import type { RecapConfig } from './recapConfig';

interface HeroSectionProps {
  config: RecapConfig;
}

function formatDate(iso: string): string {
  // Avoid timezone wobble on a date-only string.
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const local = new Date(y, m - 1, d);
  return local.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function HeroSection({ config }: HeroSectionProps) {
  const isBetawave = config.costume === 'betawave-vhs';

  return (
    <header className={`recap-hero ${isBetawave ? 'recap-hero-betawave' : ''}`}>
      <div className="recap-hero-paper">
        <p className="recap-hero-eyebrow">{config.seriesName}</p>
        <h1 className="recap-hero-title">{config.episodeTitle}</h1>
        <p className="recap-hero-chapter">{config.chapter}</p>

        <dl className="recap-hero-facts">
          <div>
            <dt>Date</dt>
            <dd>{formatDate(config.date)}</dd>
          </div>
          <div>
            <dt>Venue</dt>
            <dd>{config.venue}</dd>
          </div>
          <div>
            <dt>System</dt>
            <dd>
              <span className="recap-hero-badge">{config.systemName}</span>
            </dd>
          </div>
        </dl>
      </div>

      {isBetawave && (
        <>
          <div className="recap-hero-scanlines" aria-hidden />
          <div className="recap-hero-sweep" aria-hidden />
          <div className="recap-hero-corner" aria-hidden>
            <span className="recap-hero-rec">● REC</span>
            <span className="recap-hero-tracking">SP / 02:14:00</span>
          </div>
        </>
      )}
    </header>
  );
}

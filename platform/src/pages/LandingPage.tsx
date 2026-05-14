/**
 * LandingPage — Phase 5, post-pivot.
 *
 * No reservation system. Content-first: last recap + next show scan CTA,
 * friction-free How It Works, featured shows linking to recap pages.
 * Hero "now / next" pointers are hardcoded constants — 30-second edit
 * each season.
 */

import { Link } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { useShow, getShowEra, type Show } from '@mtp/lib';
import { recapConfigs } from './recap/recapConfig';

function accentStyleFor(show: Show): CSSProperties | undefined {
  if (!show.accentColor) return undefined;
  return {
    ['--accent' as any]: show.accentColor,
    ...(show.accentInk ? { ['--accent-ink' as any]: show.accentInk } : {}),
  } as CSSProperties;
}

/** Returns the canonical recap href for a show, or null if no recap exists. */
function recapHrefFor(show: Show): string | null {
  if (show.recap?.kind === 'external') return show.recap.url;
  if (show.recap?.kind === 'firestore') return `/shows/${show.recap.recapId}/recap`;
  // Fall back to scanning recapConfigs for a matching seriesName
  const entry = Object.values(recapConfigs).find(
    (c) => c.showId === show.id || c.seriesName === show.name,
  );
  if (entry) return `/shows/${entry.showId}/recap`;
  return null;
}

const LATEST_RECAP = {
  showName: 'Betawave: Last Call',
  href: '/shows/betawave-last-call-2026-04-18/recap',
};
const NEXT_SHOW = {
  showName: 'Mad Libs Honey Heist',
  dateLabel: 'May 23',
  joinHref: '/shows/mad-libs-honey-heist/join',
};

export default function LandingPage() {
  const { allShows } = useShow();
  const featured = allShows
    .filter((s) => getShowEra(s) !== 'shelved')
    .slice(0, 3);

  return (
    <>
      <section className="hero">
        <p className="hero-eyebrow">
          <span className="rec-badge" aria-hidden="true">REC</span>
          <span>Live tabletop comedy</span>
        </p>
        <h1 className="hero-title">
          The crowd writes the story.
          <br />
          We just roll <span className="scribble-underline">the dice.</span>
        </h1>

        <div className="hero-now-next">
          <p className="hero-now-next-line">
            <strong>Last show:</strong> {LATEST_RECAP.showName}.{' '}
            <Link to={LATEST_RECAP.href} className="hero-inline-cta">
              Watch the recap →
            </Link>
          </p>
          <p className="hero-now-next-line">
            <strong>Coming {NEXT_SHOW.dateLabel}:</strong> {NEXT_SHOW.showName}.{' '}
            <Link to={NEXT_SHOW.joinHref} className="hero-inline-cta">
              Scan in at the show →
            </Link>
          </p>
        </div>

        <p className="hero-lede">
          The Misadventuring Party runs interactive RPG performances where the
          audience names the villagers, builds the monster, and votes on every
          poor decision. You don't have to know the rules — you just have to
          show up and yell.
        </p>
        <div className="hero-cta-row">
          <Link to="/shows" className="btn-primary btn-lg">
            Browse shows
          </Link>
        </div>
      </section>

      <section className="how-it-works">
        <h2>How it works</h2>
        <ol className="steps">
          <li>
            <span className="step-num">1</span>
            <div>
              <h3>Show up.</h3>
              <p>No ticket, no code, no app. Lucky Straws, Winter Garden, FL. Walk in.</p>
            </div>
          </li>
          <li>
            <span className="step-num">2</span>
            <div>
              <h3>Scan the QR.</h3>
              <p>Your phone is the companion. Scan the QR at the door and join the show in thirty seconds.</p>
            </div>
          </li>
          <li>
            <span className="step-num">3</span>
            <div>
              <h3>Steer the chaos.</h3>
              <p>Build a character, vote on encounters, name the beasts. Your terrible ideas become canon in real time.</p>
            </div>
          </li>
        </ol>
      </section>

      <section>
        <h2 className="section-title">Featured shows</h2>
        {featured.length === 0 ? (
          <p className="section-empty">New shows announced soon.</p>
        ) : (
          <div className="show-grid">
            {featured.map((s) => {
              const era = getShowEra(s);
              const recap = recapHrefFor(s);
              const href = era === 'past' && recap ? recap : `/shows/${s.id}`;
              const isExternal = era === 'past' && s.recap?.kind === 'external';
              const ctaLabel = era === 'past' ? 'Watch the recap →' : 'View show →';

              return isExternal && recap ? (
                <a
                  key={s.id}
                  href={recap}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="show-card"
                  style={accentStyleFor(s)}
                >
                  <div className="show-card-head">
                    <span className="name">{s.name}</span>
                    <span className="status">past</span>
                  </div>
                  <div className="meta">{s.themeId} · {s.systemId}</div>
                  {s.description && <p className="desc">{s.description}</p>}
                  <span className="show-card-cta">{ctaLabel} ↗</span>
                </a>
              ) : (
                <Link key={s.id} to={href} className="show-card" style={accentStyleFor(s)}>
                  <div className="show-card-head">
                    <span className="name">{s.name}</span>
                    <span className={`status ${era === 'past' ? '' : 'draft'}`}>
                      {era}
                    </span>
                  </div>
                  <div className="meta">{s.themeId} · {s.systemId}</div>
                  {s.description && <p className="desc">{s.description}</p>}
                  <span className="show-card-cta">{ctaLabel}</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

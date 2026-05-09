/**
 * LandingPage — Phase 5.
 *
 * Real marketing copy: "now / next" hero (last show recap + next show
 * reservation), what-it-is explainer, featured shows pulled from the
 * platform Show registry, and a clear reservation CTA. Hero "now / next"
 * pointers are hardcoded constants — update them when the show calendar
 * advances.
 */

import { Link } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { useShow, getShowEra, type Show } from '@mtp/lib';

function accentStyleFor(show: Show): CSSProperties | undefined {
  if (!show.accentColor) return undefined;
  return {
    ['--accent' as any]: show.accentColor,
    ...(show.accentInk ? { ['--accent-ink' as any]: show.accentInk } : {}),
  } as CSSProperties;
}

// Hero "now / next" pointers. Hardcoded by design — flipping these is a
// 30-second edit when the next show is locked in.
const LATEST_RECAP = {
  showName: 'Betawave: Last Call',
  href: '/recap/betawave-last-call-2026-04-18',
};
const NEXT_SHOW = {
  showName: 'Mad Libs Honey Heist',
  dateLabel: 'May 23',
  reserveShowId: 'mad-libs-honey-heist',
};

export default function LandingPage() {
  const { allShows } = useShow();
  const featured = allShows
    .filter((s) => {
      const era = getShowEra(s);
      return era !== 'shelved';
    })
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
            <Link
              to={`/reserve?show=${encodeURIComponent(NEXT_SHOW.reserveShowId)}`}
              className="hero-inline-cta"
            >
              Reserve your seat →
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
          <Link
            to={`/reserve?show=${encodeURIComponent(NEXT_SHOW.reserveShowId)}`}
            className="btn-primary btn-lg"
          >
            Reserve a seat
          </Link>
          <Link to="/shows" className="btn-secondary btn-lg">
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
              <h3>Reserve a seat</h3>
              <p>Drop your name and email. We send you a 6-character access code.</p>
            </div>
          </li>
          <li>
            <span className="step-num">2</span>
            <div>
              <h3>Build a character</h3>
              <p>Open the companion at the show, punch in your code, and roll up an NPC the GM will weave into the story.</p>
            </div>
          </li>
          <li>
            <span className="step-num">3</span>
            <div>
              <h3>Steer the chaos</h3>
              <p>Vote on encounters, name the beasts, and watch your terrible ideas become canon in real time.</p>
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
              return (
                <Link key={s.id} to={`/shows/${s.id}`} className="show-card" style={accentStyleFor(s)}>
                  <div className="show-card-head">
                    <span className="name">{s.name}</span>
                    <span className={`status ${era === 'past' ? '' : 'draft'}`}>
                      {era}
                    </span>
                  </div>
                  <div className="meta">
                    {s.themeId} · {s.systemId}
                  </div>
                  {s.description && <p className="desc">{s.description}</p>}
                  <span className="show-card-cta">
                    {era === 'past' ? 'Watch the recap →' : 'View show →'}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

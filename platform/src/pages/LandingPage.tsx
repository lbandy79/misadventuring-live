/**
 * LandingPage — Phase 5.
 *
 * Real marketing copy: hero pitch, what-it-is explainer, featured upcoming
 * shows pulled from the platform Show registry, and a clear reservation
 * CTA. No press quotes / social proof yet — those wait until we have real
 * material to quote.
 */

import { Link } from 'react-router-dom';
import { useShow } from '@mtp/lib';

export default function LandingPage() {
  const { allShows } = useShow();
  const featured = allShows
    .filter((s) => s.status !== 'archived')
    .slice(0, 3);

  return (
    <>
      <section className="hero">
        <p className="hero-eyebrow">Live tabletop comedy</p>
        <h1 className="hero-title">
          The crowd writes the story.
          <br />
          We just roll the dice.
        </h1>
        <p className="hero-lede">
          The Misadventuring Party runs interactive RPG performances where the
          audience names the villagers, builds the monster, and votes on every
          poor decision. You don't have to know the rules — you just have to
          show up and yell.
        </p>
        <div className="hero-cta-row">
          <Link to="/reserve" className="btn-primary btn-lg">
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
            {featured.map((s) => (
              <Link key={s.id} to={`/shows/${s.id}`} className="show-card">
                <div className="show-card-head">
                  <span className="name">{s.name}</span>
                  {s.status && (
                    <span className={`status ${s.status === 'draft' ? 'draft' : ''}`}>
                      {s.status}
                    </span>
                  )}
                </div>
                <div className="meta">
                  {s.themeId} · {s.systemId}
                </div>
                {s.description && <p className="desc">{s.description}</p>}
                <span className="show-card-cta">View show →</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

/**
 * Landing page — Phase 5 will fill this in with hero, social proof,
 * upcoming-shows preview, and reservation CTA. Phase 4 ships a
 * placeholder so routing is verifiable.
 */

import { Link } from 'react-router-dom';
import { useShow } from '@mtp/lib';

export default function LandingPage() {
  const { allShows } = useShow();
  const upcoming = allShows.filter((s) => s.status !== 'archived').slice(0, 3);

  return (
    <>
      <section className="page-card">
        <h1>Live tabletop comedy. Audience-driven shows.</h1>
        <p>
          The Misadventuring Party runs interactive RPG performances where the
          crowd shapes the story in real time — votes, names, monsters, and the
          occasional poor decision.
        </p>
        <p style={{ marginTop: '1.5rem' }}>
          <Link
            to="/reserve"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              background: '#ffd700',
              color: '#0d0d14',
              borderRadius: '10px',
              fontWeight: 600,
            }}
          >
            Reserve a seat →
          </Link>
        </p>
        <div className="placeholder-banner">
          Phase 4 scaffold — Phase 5 will replace this with hero copy,
          show calendar, social proof, and press quotes.
        </div>
      </section>

      <section>
        <h2 style={{ paddingLeft: '0.25rem' }}>Featured shows</h2>
        {upcoming.map((s) => (
          <Link key={s.id} to={`/shows/${s.id}`} className="show-card">
            <div>
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
            {s.description && <div className="desc">{s.description}</div>}
          </Link>
        ))}
      </section>
    </>
  );
}

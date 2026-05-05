/**
 * Shows index — lists every registered show. Real implementation in
 * Phase 5/6 will pull schedule data, ticketing, and richer detail.
 */

import { Link } from 'react-router-dom';
import { useShow } from '@mtp/lib';

export default function ShowsIndexPage() {
  const { allShows } = useShow();

  return (
    <section className="page-card">
      <h1>Shows</h1>
      <p>The current MTP catalog. Each show defines its own theme, system, and audience interactions.</p>
      <div style={{ marginTop: '1.5rem' }}>
        {allShows.map((s) => (
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
              {s.themeId} · {s.systemId} · {s.enabledInteractions.length} interactions
            </div>
            {s.description && <div className="desc">{s.description}</div>}
          </Link>
        ))}
      </div>
    </section>
  );
}

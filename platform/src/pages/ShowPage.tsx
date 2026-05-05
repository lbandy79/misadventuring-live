/**
 * Single-show detail page. Phase 4: shows the registered Show metadata
 * so the route renders. Phase 6 will fold in the live audience
 * experience (existing AudienceView lives in the legacy app).
 */

import { useParams, Link } from 'react-router-dom';
import { getShow } from '@mtp/lib';

export default function ShowPage() {
  const { showId } = useParams<{ showId: string }>();
  const show = showId ? getShow(showId) : undefined;

  if (!show) {
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
    <section className="page-card">
      <h1>
        {show.name}
        {show.status && (
          <span
            className={`status ${show.status === 'draft' ? 'draft' : ''}`}
            style={{ fontSize: '0.55em', verticalAlign: 'middle', marginLeft: '0.75rem' }}
          >
            {show.status}
          </span>
        )}
      </h1>
      {show.description && <p>{show.description}</p>}
      <h2>Details</h2>
      <ul>
        <li>
          <strong>Theme:</strong> {show.themeId}
        </li>
        <li>
          <strong>System:</strong> {show.systemId}
        </li>
        {show.seriesName && (
          <li>
            <strong>Series:</strong> {show.seriesName}
          </li>
        )}
        <li>
          <strong>Audience interactions:</strong>{' '}
          {show.enabledInteractions.join(', ')}
        </li>
      </ul>
      <div className="placeholder-banner">
        Phase 6 will mount the live audience view here when this show is
        currently running.
      </div>
      <p style={{ marginTop: '1.5rem' }}>
        <Link to="/shows">← Back to all shows</Link>
      </p>
    </section>
  );
}

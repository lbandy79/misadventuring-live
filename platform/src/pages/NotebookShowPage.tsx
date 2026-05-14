/**
 * NotebookShowPage — /shows/:showId/notebook/:npcId
 *
 * URL pattern reserved for the per-audience Misadventuring Notebook.
 * Every audience profile saved from May 23 onward will have a notebook
 * at this URL once the feature is built — no migration needed.
 *
 * Replace this stub with the real Notebook page when ready.
 */

import { Link, useParams } from 'react-router-dom';

export default function NotebookShowPage() {
  const { showId } = useParams<{ showId: string; npcId: string }>();

  return (
    <section className="page-card notebook-placeholder">
      <header className="notebook-placeholder__header">
        <p className="notebook-placeholder__label">The Misadventuring Party</p>
        <h1 className="notebook-placeholder__title">Notebook coming soon.</h1>
      </header>
      <div className="notebook-placeholder__body">
        <p>Your personalized Misadventuring Notebook page is on the way.</p>
        <p>We're building it now. Check back after the next show.</p>
      </div>
      <div className="notebook-placeholder__ctas">
        {showId && (
          <Link to={`/shows/${showId}`} className="btn-primary notebook-placeholder__cta">
            Back to the show
          </Link>
        )}
        <Link to="/shows" className="btn-ghost notebook-placeholder__cta">
          Browse all shows
        </Link>
      </div>
    </section>
  );
}

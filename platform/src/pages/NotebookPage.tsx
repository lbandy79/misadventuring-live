/**
 * NotebookPage — /notebook
 *
 * Placeholder for the Misadventuring Notebook. Replaces /companion.
 * When the Notebook is built, per-audience pages live at:
 *   /shows/:showId/notebook/:npcId
 * This top-level route stays as the concept overview and coming-soon landing.
 */

import { Link } from 'react-router-dom';
import { shows, getShowEra } from '@mtp/lib';

export default function NotebookPage() {
  const activeShow = shows.find((s) => {
    const era = getShowEra(s);
    return era === 'live' || era === 'upcoming';
  });

  return (
    <section className="page-card notebook-placeholder">
      <header className="notebook-placeholder__header">
        <p className="notebook-placeholder__label">The Misadventuring Party</p>
        <h1 className="notebook-placeholder__title">The Misadventuring Notebook</h1>
        <p className="notebook-placeholder__soon">Coming soon.</p>
      </header>

      <div className="notebook-placeholder__body">
        <p>
          After every show, we mail you a personalized page from the Misadventuring Notebook.
          Your character, your Stingers, the world you helped build, and a few stickers we drew
          just for you.
        </p>
        <p>For now, the back room is empty. Catch the next show to fill it.</p>
      </div>

      <div className="notebook-placeholder__ctas">
        {activeShow ? (
          <Link to={`/shows/${activeShow.id}`} className="btn-primary notebook-placeholder__cta">
            See Tonight's Show
          </Link>
        ) : null}
        <Link
          to="/shows"
          className={activeShow ? 'btn-ghost notebook-placeholder__cta' : 'btn-primary notebook-placeholder__cta'}
        >
          Browse All Shows
        </Link>
      </div>
    </section>
  );
}

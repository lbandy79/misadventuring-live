/**
 * RecapPage — public, read-only artifact for one show.
 *
 * Pulls reservations + curated NPCs from Firestore by `showId`, picks the
 * featured character per recap config, and renders the pen-and-paper recap
 * (Betawave VHS costume on the Apr 18 show). Sections render only when
 * their data exists; empty states are styled features, not placeholders.
 *
 * No writes. `gmFlagged` and `gmNotes` are stripped at the data layer.
 */

import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import HeroSection from './recap/HeroSection';
import FeaturedCharacter from './recap/FeaturedCharacter';
import CharacterGrid from './recap/CharacterGrid';
import MonsterStickyNote from './recap/MonsterStickyNote';
import ComingNextStickyNote from './recap/ComingNextStickyNote';
import AboutPageFooter from './recap/AboutPageFooter';
import { getRecapConfig } from './recap/recapConfig';
import { fetchRecapData, type RecapData } from './recap/recapApi';
import './recap/recap.css';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; data: RecapData }
  | { status: 'error'; message: string };

export default function RecapPage() {
  const { showId = '' } = useParams<{ showId: string }>();
  const config = useMemo(() => getRecapConfig(showId), [showId]);
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    if (!showId) {
      setLoad({ status: 'error', message: 'Missing show id.' });
      return;
    }
    let cancelled = false;
    setLoad({ status: 'loading' });
    fetchRecapData(showId)
      .then((data) => {
        if (!cancelled) setLoad({ status: 'ready', data });
      })
      .catch((err) => {
        console.error('[recap] fetch failed:', err);
        if (!cancelled) {
          setLoad({
            status: 'error',
            message: 'We couldn’t pull this show’s recap. Try again in a moment.',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [showId]);

  // Unrecognized showId → friendly 404 in paper styling.
  if (!config) {
    return (
      <div className="recap-page recap-paper-bg">
        <section className="recap-empty">
          <h1>No recap on file for this show.</h1>
          <p>
            We only publish recaps for shows that have actually happened.
            Browse the <Link to="/shows">show list</Link> to see what's running.
          </p>
        </section>
      </div>
    );
  }

  if (load.status === 'loading') {
    return (
      <div className="recap-page recap-paper-bg">
        <p className="recap-loading">developing the tape&hellip;</p>
      </div>
    );
  }

  if (load.status === 'error') {
    return (
      <div className="recap-page recap-paper-bg">
        <section className="recap-empty">
          <h1>Signal lost.</h1>
          <p>{load.message}</p>
        </section>
      </div>
    );
  }

  const { data } = load;
  const featured =
    config.featuredReservationId
      ? data.npcs.find((n) => n.reservationId === config.featuredReservationId) ?? null
      : null;

  // Funnel stat copy. Build defensively in case Firestore returns 0/0 (a
  // recap config can exist before any data has been written).
  const reservationCount = data.reservationCount;
  const npcCount = data.npcCount;
  const hasFunnel = reservationCount > 0 || npcCount > 0;

  return (
    <div className={`recap-page recap-paper-bg costume-${config.costume}`}>
      <HeroSection config={config} />

      {(npcCount > 0 || hasFunnel) && (
        <section className="recap-section">
          <h2 className="recap-section-heading">The Crowd at the Table</h2>
          {hasFunnel && (
            <p className="recap-funnel">
              <strong>{reservationCount}</strong> {reservationCount === 1 ? 'person' : 'people'} reserved.{' '}
              <strong>{npcCount}</strong> brought a character. Here's who showed up.
            </p>
          )}

          {featured && <FeaturedCharacter npc={featured} />}

          <CharacterGrid
            npcs={data.npcs}
            excludeReservationId={featured?.reservationId}
          />
        </section>
      )}

      {config.monsterStatus === 'lost' && (
        <section className="recap-section">
          <MonsterStickyNote status="lost" />
        </section>
      )}

      {config.next && (
        <section className="recap-section recap-next-section">
          <ComingNextStickyNote next={config.next} />
        </section>
      )}

      <AboutPageFooter />
    </div>
  );
}

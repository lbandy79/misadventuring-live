import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import type { BladeRunnerCharacter } from '../../types/bladeRunner.types';
import '../BladeRunnerCreator/BladeRunnerCreator.css';
import './BladeRunnerRoster.css';

interface RosterEntry extends BladeRunnerCharacter {
  id: string;
  createdAt?: number;
}

export default function BladeRunnerRoster() {
  const [entries, setEntries] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'blade-runner-characters'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as BladeRunnerCharacter & { createdAt?: number }) }));
        setEntries(list);
        setLoading(false);
      },
      (err) => {
        console.error('Roster subscription failed', err);
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  return (
    <div className="br-creator-wrap">
      <div className="br-creator-card">
        <header className="br-roster-header">
          <h1>Blade Runner Roster</h1>
          <Link to="/blade-runner/create" className="br-primary br-link-btn">
            + New Character
          </Link>
        </header>

        {loading ? <p>Loading roster…</p> : null}
        {error ? <p className="br-error">Failed to load: {error}</p> : null}
        {!loading && !error && entries.length === 0 ? (
          <p>No characters yet. Create one to get started.</p>
        ) : null}

        <ul className="br-roster-list">
          {entries.map((entry) => {
            const natureLabel = entry.natureId === 'replicant' ? 'Replicant' : 'Human';
            const archetypeLabel = titleCase(entry.archetypeId);
            const yearsLabel = titleCase(entry.yearsOnForceId);
            return (
              <li key={entry.id}>
                <Link to={`/blade-runner/play/${entry.id}`} className="br-roster-card">
                  <div className="br-roster-card-head">
                    <h2>{entry.name || 'Unnamed Detective'}</h2>
                    {entry.createdAt ? (
                      <span className="br-roster-date">{formatDate(entry.createdAt)}</span>
                    ) : null}
                  </div>
                  {entry.playerName ? (
                    <p className="br-roster-player">Played by {entry.playerName}</p>
                  ) : (
                    <p className="br-roster-player br-roster-player-missing">No player name</p>
                  )}
                  <p className="br-roster-tags">
                    <span>{natureLabel}</span>
                    <span>{archetypeLabel}</span>
                    <span>{yearsLabel}</span>
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function titleCase(s: string): string {
  if (!s) return '';
  return s
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map((word) => (word.length ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

function formatDate(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

/**
 * MadLibsAdminPanel — live tallies for admins.
 *
 * Reuses the existing public API (`subscribeToMadLibVotes` + `tallyVotes`)
 * but ignores the showtime lock so the GM can watch results stream in
 * during open voting. Read-only.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  deleteAllMadLibVotes,
  subscribeToMadLibVotes,
  tallyVotes,
  type FieldTally,
  type MadLibVote,
} from '@mtp/lib';

interface MadLibField {
  id: string;
  label: string;
  options: string[];
}

interface MadLibDef {
  id: string;
  title: string;
  prompt: string;
  fields?: MadLibField[];
}

interface SystemConfig {
  showConfig?: {
    madLibs?: MadLibDef[];
  };
}

interface Props {
  /** Show id whose votes we tally (matches `showId` on each vote doc). */
  showId: string;
  /** System id whose JSON config holds the Mad Libs field definitions. */
  systemId: string;
  /** Display name shown in the panel header. */
  showName?: string;
}

export default function MadLibsAdminPanel({ showId, systemId, showName }: Props) {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [selectedMadLibId, setSelectedMadLibId] = useState<string>('');
  const [votes, setVotes] = useState<MadLibVote[]>([]);
  const [clearStatus, setClearStatus] = useState<
    | { kind: 'idle' }
    | { kind: 'clearing' }
    | { kind: 'done'; count: number }
    | { kind: 'error'; message: string }
  >({ kind: 'idle' });

  // Load system config (shares the same path the vote page uses).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import(`../../../../src/systems/${systemId}.system.json`);
        if (cancelled) return;
        const cfg = (mod.default ?? mod) as SystemConfig;
        setConfig(cfg);
        const first = cfg.showConfig?.madLibs?.[0]?.id ?? '';
        setSelectedMadLibId(first);
      } catch (err) {
        console.error('Admin: failed to load system config:', err);
        setConfigError('Could not load the show config.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [systemId]);

  // Subscribe to votes for the currently selected Mad Lib.
  useEffect(() => {
    if (!selectedMadLibId) return;
    setVotes([]);
    const unsub = subscribeToMadLibVotes(
      { showId, madLibId: selectedMadLibId },
      (next) => setVotes(next),
    );
    return unsub;
  }, [showId, selectedMadLibId]);

  const madLibs = config?.showConfig?.madLibs ?? [];
  const current = useMemo(
    () => madLibs.find((m) => m.id === selectedMadLibId),
    [madLibs, selectedMadLibId],
  );
  const fields: MadLibField[] = current?.fields ?? [];
  const tallies: FieldTally[] = useMemo(
    () => tallyVotes(votes, fields),
    [votes, fields],
  );

  const uniqueVoters = useMemo(() => {
    const ids = new Set(votes.map((v) => v.voterId));
    return ids.size;
  }, [votes]);

  async function handleClearVotes() {
    if (!current) return;
    const confirmed = window.confirm(
      `Delete every vote for "${current.title}"? This cannot be undone.`,
    );
    if (!confirmed) return;
    setClearStatus({ kind: 'clearing' });
    try {
      const count = await deleteAllMadLibVotes({
        showId,
        madLibId: current.id,
      });
      setClearStatus({ kind: 'done', count });
      window.setTimeout(() => {
        setClearStatus((s) => (s.kind === 'done' ? { kind: 'idle' } : s));
      }, 4000);
    } catch (err) {
      console.error('Failed to clear votes:', err);
      setClearStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  if (configError) {
    return (
      <section className="admin-madlibs">
        <h2>Mad Libs results</h2>
        <p style={{ color: 'tomato' }}>{configError}</p>
      </section>
    );
  }

  if (!config) {
    return (
      <section className="admin-madlibs">
        <h2>Mad Libs results</h2>
        <p>Loading…</p>
      </section>
    );
  }

  if (madLibs.length === 0) {
    return (
      <section className="admin-madlibs">
        <h2>Mad Libs results</h2>
        <p style={{ opacity: 0.7 }}>No Mad Libs defined for this show.</p>
      </section>
    );
  }

  return (
    <section className="admin-madlibs">
      <header className="admin-madlibs-head">
        <h2>Mad Libs results · {showName ?? showId}</h2>
        <p className="admin-madlibs-meta">
          {votes.length} {votes.length === 1 ? 'vote' : 'votes'} ·{' '}
          {uniqueVoters} {uniqueVoters === 1 ? 'voter' : 'voters'}
        </p>
      </header>

      <div className="admin-madlibs-actions">
        <button
          type="button"
          className="admin-madlibs-danger"
          onClick={handleClearVotes}
          disabled={
            clearStatus.kind === 'clearing' || votes.length === 0 || !current
          }
        >
          {clearStatus.kind === 'clearing'
            ? 'Clearing…'
            : `Clear all votes for "${current?.title ?? '—'}"`}
        </button>
        {clearStatus.kind === 'done' && (
          <span className="admin-madlibs-status">
            Cleared {clearStatus.count}{' '}
            {clearStatus.count === 1 ? 'vote' : 'votes'}.
          </span>
        )}
        {clearStatus.kind === 'error' && (
          <span className="admin-madlibs-status admin-madlibs-status-error">
            {clearStatus.message}
          </span>
        )}
      </div>

      {madLibs.length > 1 && (
        <div className="admin-madlibs-tabs" role="tablist">
          {madLibs.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={selectedMadLibId === m.id}
              className={
                'admin-madlibs-tab' +
                (selectedMadLibId === m.id ? ' is-active' : '')
              }
              onClick={() => setSelectedMadLibId(m.id)}
            >
              {m.title}
            </button>
          ))}
        </div>
      )}

      {current && (
        <p className="admin-madlibs-prompt">{current.prompt}</p>
      )}

      <div className="admin-madlibs-fields">
        {fields.map((field, idx) => {
          const tally = tallies[idx];
          const total = tally?.totalVotes ?? 0;
          return (
            <div key={field.id} className="admin-madlibs-field">
              <h3>
                <span className="admin-madlibs-num">{idx + 1}.</span>{' '}
                {field.label}
              </h3>
              <ul className="admin-madlibs-options">
                {field.options.map((opt, optIdx) => {
                  const count = tally?.counts[optIdx] ?? 0;
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  const isWinner =
                    tally?.hasVotes && tally.winnerIndex === optIdx;
                  return (
                    <li
                      key={optIdx}
                      className={
                        'admin-madlibs-option' +
                        (isWinner ? ' is-winner' : '')
                      }
                    >
                      <div className="admin-madlibs-option-row">
                        <span className="admin-madlibs-option-text">{opt}</span>
                        <span className="admin-madlibs-option-count">
                          {count} · {pct}%
                          {isWinner ? ' · winner' : ''}
                        </span>
                      </div>
                      <div className="admin-madlibs-bar">
                        <div
                          className="admin-madlibs-bar-fill"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
              {!tally?.hasVotes && (
                <p className="admin-madlibs-empty">No votes yet.</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * MadLibsAdminPanel — GM controls for any Mad Libs show.
 *
 * ─── Reusability ───────────────────────────────────────────────────────
 * System-agnostic. Renders a tab per Mad Lib defined in the show's system
 * config (`showConfig.madLibs[]`). The same panel drives Honey Heist,
 * Kids on Bikes, anything else — no per-system code lives here.
 *
 * ─── Controls ──────────────────────────────────────────────────────────
 *   📡 Push to audience  → writes `mad-lib-active/{showId}` so audience
 *                          phones (MadLibsVotePage) and the projector
 *                          (MadLibsDisplayPage) all switch in real time.
 *   ⏸ Idle audience      → clears the active pointer (audience sees a
 *                          "Waiting for the next Mad Lib…" card).
 *   🔒 Close voting      → manual lock toggle, overrides showtime lock.
 *   🗑 Delete submission  → per-vote delete (for accidental/troll votes).
 *   🚨 Reset everything   → show-day panic button: clears all votes AND
 *                          reopens voting for the active Mad Lib.
 *
 * GM also sees live tallies during open voting (audience phones don't, to
 * avoid bandwagoning).
 */

import { useEffect, useMemo, useState } from 'react';
import {
  deleteAllMadLibVotes,
  deleteMadLibVote,
  setActiveMadLib,
  setMadLibLock,
  subscribeToActiveMadLib,
  subscribeToMadLibLock,
  subscribeToMadLibVotes,
  tallyVotes,
  useAuth,
  type ActiveMadLibPointer,
  type FieldTally,
  type MadLibLock,
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
  const { user } = useAuth();
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [selectedMadLibId, setSelectedMadLibId] = useState<string>('');
  const [votes, setVotes] = useState<MadLibVote[]>([]);
  const [lock, setLock] = useState<MadLibLock | null>(null);
  const [lockBusy, setLockBusy] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const [activePointer, setActivePointer] =
    useState<ActiveMadLibPointer | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [deletingVoteId, setDeletingVoteId] = useState<string | null>(null);
  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null);
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

  // Subscribe to manual-lock state for the currently selected Mad Lib.
  useEffect(() => {
    if (!selectedMadLibId) return;
    setLock(null);
    const unsub = subscribeToMadLibLock(
      { showId, madLibId: selectedMadLibId },
      (next) => setLock(next),
    );
    return unsub;
  }, [showId, selectedMadLibId]);

  // Subscribe to the show-wide active-Mad-Lib pointer.
  useEffect(() => {
    setActivePointer(null);
    const unsub = subscribeToActiveMadLib(
      { showId },
      (next) => setActivePointer(next),
    );
    return unsub;
  }, [showId]);

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

  const isManualLocked = !!lock?.manualLockedAt;
  const activeMadLibId = activePointer?.activeMadLibId ?? null;
  const isPushedToAudience =
    !!current && activeMadLibId === current.id;

  async function handlePushToAudience(targetId: string | null) {
    const label =
      targetId === null
        ? 'idle'
        : madLibs.find((m) => m.id === targetId)?.title ?? targetId;
    const confirmed = window.confirm(
      targetId === null
        ? 'Clear active Mad Lib (audience phones go idle)?'
        : `Push "${label}" to audience phones now?`,
    );
    if (!confirmed) return;
    setPushBusy(true);
    setPushError(null);
    try {
      await setActiveMadLib({
        showId,
        madLibId: targetId,
        updatedBy: user?.email ?? null,
      });
    } catch (err) {
      console.error('Failed to push Mad Lib:', err);
      setPushError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setPushBusy(false);
    }
  }

  async function handleToggleLock() {
    if (!current) return;
    const nextLocked = !isManualLocked;
    const verb = nextLocked ? 'CLOSE voting' : 'REOPEN voting';
    const confirmed = window.confirm(
      `${verb} for "${current.title}"? Audience will see this immediately.`,
    );
    if (!confirmed) return;
    setLockBusy(true);
    setLockError(null);
    try {
      await setMadLibLock({
        showId,
        madLibId: current.id,
        locked: nextLocked,
        lockedBy: user?.email ?? null,
      });
    } catch (err) {
      console.error('Failed to toggle lock:', err);
      setLockError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLockBusy(false);
    }
  }

  async function handleResetEverything() {
    if (!current) return;
    const confirmed = window.confirm(
      `RESET "${current.title}"?\n\nThis will:\n  • Delete every vote\n  • Reopen voting (clear manual lock)\n\nUse this as the show-day panic button. Cannot be undone.`,
    );
    if (!confirmed) return;
    setClearStatus({ kind: 'clearing' });
    setLockBusy(true);
    setLockError(null);
    try {
      const count = await deleteAllMadLibVotes({
        showId,
        madLibId: current.id,
      });
      await setMadLibLock({
        showId,
        madLibId: current.id,
        locked: false,
        lockedBy: user?.email ?? null,
      });
      setClearStatus({ kind: 'done', count });
      window.setTimeout(() => {
        setClearStatus((s) => (s.kind === 'done' ? { kind: 'idle' } : s));
      }, 4000);
    } catch (err) {
      console.error('Failed to reset Mad Lib:', err);
      setClearStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setLockBusy(false);
    }
  }

  async function handleDeleteVote(vote: MadLibVote, optionLabel: string) {
    const confirmed = window.confirm(
      `Delete this single vote?\n  • ${optionLabel}\n  • voter: ${vote.voterId}\n\nThe voter can re-submit if voting is still open.`,
    );
    if (!confirmed) return;
    setDeletingVoteId(vote.id);
    try {
      await deleteMadLibVote(vote.id);
    } catch (err) {
      console.error('Failed to delete vote:', err);
      window.alert(
        `Could not delete that vote: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    } finally {
      setDeletingVoteId((id) => (id === vote.id ? null : id));
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
          {isManualLocked ? ' · 🔒 voting closed by admin' : ''}
        </p>
      </header>

      <div className="admin-madlibs-actions">
        <button
          type="button"
          className={
            'admin-madlibs-push' +
            (isPushedToAudience ? ' is-active' : '')
          }
          onClick={() => handlePushToAudience(current?.id ?? null)}
          disabled={pushBusy || !current || isPushedToAudience}
          title="Make this Mad Lib the active one on audience phones."
        >
          {pushBusy
            ? 'Pushing…'
            : isPushedToAudience
              ? '📡 Live on audience phones'
              : `📡 Push "${current?.title ?? '—'}" to audience`}
        </button>
        <button
          type="button"
          className="admin-madlibs-push-clear"
          onClick={() => handlePushToAudience(null)}
          disabled={pushBusy || activeMadLibId === null}
          title="Clear the active Mad Lib (audience phones go idle)."
        >
          ⏸ Idle audience
        </button>
        <button
          type="button"
          className={
            'admin-madlibs-lock' +
            (isManualLocked ? ' is-locked' : '')
          }
          onClick={handleToggleLock}
          disabled={lockBusy || !current}
        >
          {lockBusy
            ? 'Working…'
            : isManualLocked
              ? '🔓 Reopen voting'
              : '🔒 Close voting now'}
        </button>
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
        <button
          type="button"
          className="admin-madlibs-danger admin-madlibs-panic"
          onClick={handleResetEverything}
          disabled={clearStatus.kind === 'clearing' || lockBusy || !current}
          title="Show-day panic button: clears all votes AND reopens voting."
        >
          🚨 Reset everything
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
        {lockError && (
          <span className="admin-madlibs-status admin-madlibs-status-error">
            Lock failed: {lockError}
          </span>
        )}
        {pushError && (
          <span className="admin-madlibs-status admin-madlibs-status-error">
            Push failed: {pushError}
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
          const fieldVotes = votes
            .filter((v) => v.fieldId === field.id)
            .sort((a, b) => {
              const aT = a.timestamp?.toMillis?.() ?? 0;
              const bT = b.timestamp?.toMillis?.() ?? 0;
              return bT - aT;
            });
          const isExpanded = expandedFieldId === field.id;
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
              {fieldVotes.length > 0 && (
                <div className="admin-madlibs-submissions">
                  <button
                    type="button"
                    className="admin-madlibs-submissions-toggle"
                    onClick={() =>
                      setExpandedFieldId((prev) =>
                        prev === field.id ? null : field.id,
                      )
                    }
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? '▾' : '▸'} Individual submissions (
                    {fieldVotes.length})
                  </button>
                  {isExpanded && (
                    <ul className="admin-madlibs-submissions-list">
                      {fieldVotes.map((vote) => {
                        const optionLabel =
                          field.options[vote.optionIndex] ??
                          `option #${vote.optionIndex}`;
                        const voterShort = vote.voterId.startsWith('res:')
                          ? `🎫 ${vote.voterId.slice(4, 12)}…`
                          : `👤 ${vote.voterId.slice(5, 13)}…`;
                        return (
                          <li
                            key={vote.id}
                            className="admin-madlibs-submission-row"
                          >
                            <span className="admin-madlibs-submission-voter">
                              {voterShort}
                            </span>
                            <span className="admin-madlibs-submission-pick">
                              {optionLabel}
                            </span>
                            <button
                              type="button"
                              className="admin-madlibs-submission-delete"
                              onClick={() => handleDeleteVote(vote, optionLabel)}
                              disabled={deletingVoteId === vote.id}
                              title="Delete this single vote"
                            >
                              {deletingVoteId === vote.id ? '…' : '🗑'}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

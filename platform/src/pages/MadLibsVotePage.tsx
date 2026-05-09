/**
 * MadLibsVotePage — Phase 11 / Phase 2.
 *
 * Pre-show audience voting for the "The Setup" Mad Lib. Identity is
 * established beforehand by `MadLibsGatewayPage` (at /shows/:showId/vote)
 * and persisted to localStorage. If we land here without an identity we
 * redirect to the gateway.
 *
 * Tallies + winners are intentionally hidden during open voting (no
 * bandwagon). After lock, results stream in via Firestore onSnapshot.
 */

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  castVote,
  clearVoterIdentity,
  fetchOwnVotes,
  getShow,
  loadVoterIdentity,
  subscribeToMadLibVotes,
  tallyVotes,
  type FieldTally,
  type MadLibVote,
  type VoterIdentity,
} from '@mtp/lib';

const MAD_LIB_ID = 'the-setup';

/** Lock at showtime — pulled from the show's nextDate at 7pm CDT. */
function getLockTime(nextDate: string | undefined): number {
  if (!nextDate) return Number.POSITIVE_INFINITY;
  return new Date(`${nextDate}T19:00:00-05:00`).getTime();
}

interface MadLibField {
  id: string;
  label: string;
  options: string[];
}

interface SystemConfig {
  showConfig?: {
    showName?: string;
    venue?: string;
    date?: string;
    madLibs?: Array<{
      id: string;
      title: string;
      phase: string;
      prompt: string;
      fields?: MadLibField[];
    }>;
  };
}

export default function MadLibsVotePage() {
  const { showId } = useParams<{ showId: string }>();
  const show = showId ? getShow(showId) : undefined;
  const systemId = show?.systemId;

  // Identity gate: if no stored identity, redirect to gateway.
  const [identity] = useState<VoterIdentity | null>(() => loadVoterIdentity());
  const needsGateway = !identity;

  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  // Form state
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [savingField, setSavingField] = useState<string | null>(null);
  const [savedField, setSavedField] = useState<string | null>(null);
  const [castError, setCastError] = useState<string | null>(null);

  // Live votes (post-lock tally)
  const [allVotes, setAllVotes] = useState<MadLibVote[]>([]);

  // ── Load system config ─────────────────────────────────────────────
  useEffect(() => {
    if (!systemId || needsGateway) return;
    (async () => {
      try {
        const mod = await import(`../../../src/systems/${systemId}.system.json`);
        setConfig((mod.default ?? mod) as SystemConfig);
      } catch (err) {
        console.error('Failed to load system config:', err);
        setConfigError('Could not load the show config.');
      }
    })();
  }, [systemId, needsGateway]);

  // ── Lock state ─────────────────────────────────────────────────────
  const isLocked = useMemo(() => {
    return Date.now() >= getLockTime(show?.nextDate);
  }, [show?.nextDate]);

  const setup = useMemo(() => {
    return config?.showConfig?.madLibs?.find((m) => m.id === MAD_LIB_ID);
  }, [config]);

  const fields: MadLibField[] = setup?.fields ?? [];

  // ── Pre-fill selections from existing votes ────────────────────────
  useEffect(() => {
    if (!identity || !showId || fields.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const own = await fetchOwnVotes({
          showId,
          madLibId: MAD_LIB_ID,
          fieldIds: fields.map((f) => f.id),
          voterId: identity.voterId,
        });
        if (!cancelled && Object.keys(own).length > 0) {
          setSelections((prev) => ({ ...own, ...prev }));
        }
      } catch (err) {
        console.warn('Could not load existing votes:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [identity, showId, fields]);

  // ── Subscribe to all votes (only meaningful post-lock) ─────────────
  useEffect(() => {
    if (!isLocked || !showId) return;
    const unsub = subscribeToMadLibVotes(
      { showId, madLibId: MAD_LIB_ID },
      (votes) => setAllVotes(votes),
    );
    return unsub;
  }, [isLocked, showId]);

  // ── Cast / change a vote ───────────────────────────────────────────
  async function handleSelect(fieldId: string, optionIndex: number) {
    if (isLocked || !identity || !showId) return;
    setCastError(null);
    setSelections((prev) => ({ ...prev, [fieldId]: optionIndex }));
    setSavingField(fieldId);
    try {
      await castVote({
        showId,
        madLibId: MAD_LIB_ID,
        fieldId,
        optionIndex,
        voterId: identity.voterId,
        reservationId:
          identity.kind === 'reservation' && identity.reservation
            ? identity.reservation.id
            : null,
      });
      setSavedField(fieldId);
      window.setTimeout(() => {
        setSavedField((s) => (s === fieldId ? null : s));
      }, 1500);
    } catch (err) {
      console.error('Vote cast failed:', err);
      setCastError('We could not save that vote. Please try again.');
    } finally {
      setSavingField((s) => (s === fieldId ? null : s));
    }
  }

  function handleSwitchIdentity() {
    clearVoterIdentity();
    if (showId) window.location.assign(`/shows/${showId}/vote`);
  }

  // ── Render ─────────────────────────────────────────────────────────
  if (!showId || !show) {
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

  // Send first-time visitors through the gateway.
  if (needsGateway) {
    return <Navigate to={`/shows/${showId}/vote`} replace />;
  }

  if (configError) {
    return (
      <section className="page-card">
        <h1>Mad Libs voting</h1>
        <p>{configError}</p>
        <p>
          <Link to={`/shows/${showId}`}>← Back to the show</Link>
        </p>
      </section>
    );
  }

  if (!config || !setup) {
    return (
      <section className="page-card">
        <p>Loading the heist…</p>
      </section>
    );
  }

  const showName = config.showConfig?.showName ?? show.name;
  const totalSelected = Object.keys(selections).length;
  const totalFields = fields.length;
  const tallies: FieldTally[] = isLocked ? tallyVotes(allVotes, fields) : [];

  return (
    <section
      className="page-card madlibs-vote-card"
      style={
        show.accentColor
          ? ({
              ['--accent' as any]: show.accentColor,
              ...(show.accentInk ? { ['--accent-ink' as any]: show.accentInk } : {}),
            } as CSSProperties)
          : undefined
      }
    >
      <header className="madlibs-vote-header">
        <p className="madlibs-vote-meta">
          {showName} · {config.showConfig?.venue} · {config.showConfig?.date}
        </p>
        <h1 className="madlibs-vote-title">{setup.title}</h1>
        <p className="madlibs-vote-prompt">{setup.prompt}</p>
      </header>

      {/* Read-only identity chip */}
      <div className="madlibs-vote-identity-chip">
        <span>
          {identity!.kind === 'reservation' && identity!.reservation ? (
            <>
              Voting as <strong>{identity!.reservation.name}</strong> · code{' '}
              {identity!.reservation.accessCode}
            </>
          ) : (
            <>Voting anonymously</>
          )}
        </span>
        <button
          type="button"
          className="madlibs-vote-switch-link"
          onClick={handleSwitchIdentity}
        >
          Switch
        </button>
      </div>

      {/* Status banner */}
      {isLocked ? (
        <p className="madlibs-vote-banner madlibs-vote-banner-locked">
          🔒 Voting is closed. Here's what the audience picked.
        </p>
      ) : (
        <p className="madlibs-vote-banner madlibs-vote-banner-open">
          ✏️ Voting is open. Pick one option per question. Tallies stay hidden
          until showtime ({totalSelected}/{totalFields} answered).
        </p>
      )}

      {/* Fields */}
      <div className="madlibs-vote-fields">
        {fields.map((field, idx) => {
          const selected = selections[field.id];
          const tally = tallies[idx];
          return (
            <fieldset key={field.id} className="madlibs-vote-field">
              <legend>
                <span className="madlibs-vote-field-num">{idx + 1}.</span>{' '}
                {field.label}
              </legend>
              <div className="madlibs-vote-options">
                {field.options.map((opt, optIdx) => {
                  const checked = selected === optIdx;
                  const isWinner =
                    isLocked && tally?.hasVotes && tally.winnerIndex === optIdx;
                  const count = tally?.counts[optIdx] ?? 0;
                  const total = tally?.totalVotes ?? 0;
                  const pct =
                    total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <label
                      key={optIdx}
                      className={[
                        'madlibs-vote-option',
                        checked ? 'is-checked' : '',
                        isLocked ? 'is-locked' : '',
                        isWinner ? 'is-winner' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <input
                        type="radio"
                        name={field.id}
                        value={optIdx}
                        checked={checked}
                        disabled={isLocked || savingField === field.id}
                        onChange={() => handleSelect(field.id, optIdx)}
                      />
                      <span className="madlibs-vote-option-text">{opt}</span>
                      {isLocked && (
                        <span className="madlibs-vote-option-tally">
                          {count} {count === 1 ? 'vote' : 'votes'}
                          {total > 0 ? ` · ${pct}%` : ''}
                          {isWinner ? ' · winner' : ''}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
              {!isLocked && savedField === field.id && (
                <p className="madlibs-vote-saved">✓ Saved</p>
              )}
            </fieldset>
          );
        })}
      </div>

      {castError && (
        <p className="madlibs-vote-cast-error">{castError}</p>
      )}

      {/* Winning story readout (post-lock only) */}
      {isLocked && fields.length > 0 && (
        <ResultReadout fields={fields} tallies={tallies} />
      )}

      <p className="madlibs-vote-back">
        <Link to={`/shows/${showId}`}>← Back to the show</Link>
      </p>
    </section>
  );
}

/**
 * Combine the winning option per field into a continuous Mad-Libs-style
 * paragraph using the field labels as connective tissue.
 */
function ResultReadout({
  fields,
  tallies,
}: {
  fields: MadLibField[];
  tallies: FieldTally[];
}) {
  const sentences = fields.map((field, idx) => {
    const tally = tallies[idx];
    if (!tally?.hasVotes) {
      return `${field.label} (no votes cast).`;
    }
    const winning = field.options[tally.winnerIndex];
    return `${field.label} ${winning}.`;
  });

  const allLocked = tallies.every((t) => t.hasVotes);

  return (
    <section className="madlibs-vote-readout" aria-live="polite">
      <h2>The audience's heist</h2>
      {!allLocked && (
        <p className="madlibs-vote-readout-note">
          A few questions had no votes; gaps are noted inline.
        </p>
      )}
      <p className="madlibs-vote-readout-paragraph">
        {sentences.join(' ')}
      </p>
    </section>
  );
}

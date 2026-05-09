/**
 * MadLibsVotePage — Phase 11 / Phase 2.
 *
 * Pre-show audience voting for the "The Setup" Mad Lib (Mad Libs Honey
 * Heist, May 23 2026). One vote per field per voter; voters can change
 * their vote until the show locks at showtime.
 *
 * Tallies + winners are intentionally hidden during open voting (no
 * bandwagon). After lock, results stream in via Firestore onSnapshot.
 *
 * Identity:
 *   - With access code (?code=XXXXXX or entered) → reservation-scoped voter.
 *   - Otherwise → anonymous browser-scoped voter (localStorage UUID).
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  buildReservationVoterId,
  castVote,
  fetchOwnVotes,
  findReservationByCode,
  getOrCreateAnonVoterId,
  normalizeAccessCode,
  subscribeToMadLibVotes,
  tallyVotes,
  type FieldTally,
  type MadLibVote,
  type Reservation,
} from '@mtp/lib';

// Hard-coded for Phase 2: the only Mad Libs show running right now.
const SHOW_ID = 'mad-libs-honey-heist';
const MAD_LIB_ID = 'the-setup';
const SYSTEM_ID = 'honey-heist';
const SHOWTIME_ISO = '2026-05-23T19:00:00-05:00';

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
  const [searchParams, setSearchParams] = useSearchParams();

  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  // Identity
  const [accessCodeInput, setAccessCodeInput] = useState(
    searchParams.get('code') ?? '',
  );
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [reservationStatus, setReservationStatus] = useState<
    'idle' | 'checking' | 'linked' | 'invalid'
  >('idle');
  const [voterId, setVoterId] = useState<string>('');

  // Form state
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [savingField, setSavingField] = useState<string | null>(null);
  const [savedField, setSavedField] = useState<string | null>(null);
  const [castError, setCastError] = useState<string | null>(null);

  // Live votes (post-lock tally)
  const [allVotes, setAllVotes] = useState<MadLibVote[]>([]);

  // ── Load system config ─────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const mod = await import(`../../../src/systems/${SYSTEM_ID}.system.json`);
        setConfig((mod.default ?? mod) as SystemConfig);
      } catch (err) {
        console.error('Failed to load system config:', err);
        setConfigError('Could not load the show config.');
      }
    })();
  }, []);

  // ── Bootstrap voter id (anon by default) ───────────────────────────
  useEffect(() => {
    setVoterId(getOrCreateAnonVoterId());
  }, []);

  // ── Auto-resolve reservation if ?code= is in URL ───────────────────
  useEffect(() => {
    const initialCode = searchParams.get('code');
    if (!initialCode) return;
    void linkReservation(initialCode, /* fromUrl */ true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Lock state ─────────────────────────────────────────────────────
  const isLocked = useMemo(() => {
    return Date.now() >= new Date(SHOWTIME_ISO).getTime();
  }, []);

  const setup = useMemo(() => {
    return config?.showConfig?.madLibs?.find((m) => m.id === MAD_LIB_ID);
  }, [config]);

  const fields: MadLibField[] = setup?.fields ?? [];

  // ── Pre-fill selections from existing votes ────────────────────────
  useEffect(() => {
    if (!voterId || fields.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const own = await fetchOwnVotes({
          showId: SHOW_ID,
          madLibId: MAD_LIB_ID,
          fieldIds: fields.map((f) => f.id),
          voterId,
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
  }, [voterId, fields]);

  // ── Subscribe to all votes (only meaningful post-lock) ─────────────
  useEffect(() => {
    if (!isLocked) return;
    const unsub = subscribeToMadLibVotes(
      { showId: SHOW_ID, madLibId: MAD_LIB_ID },
      (votes) => setAllVotes(votes),
    );
    return unsub;
  }, [isLocked]);

  // ── Reservation linking ────────────────────────────────────────────
  async function linkReservation(rawCode: string, fromUrl = false) {
    const normalized = normalizeAccessCode(rawCode);
    if (normalized.length !== 6) {
      setReservationStatus('invalid');
      return;
    }
    setReservationStatus('checking');
    try {
      const found = await findReservationByCode(normalized, SHOW_ID);
      if (found) {
        setReservation(found);
        setVoterId(buildReservationVoterId(found.id));
        setReservationStatus('linked');
        if (!fromUrl) {
          // Reflect the code in URL so it survives refresh.
          const next = new URLSearchParams(searchParams);
          next.set('code', normalized);
          setSearchParams(next, { replace: true });
        }
      } else {
        setReservationStatus('invalid');
      }
    } catch (err) {
      console.error('Reservation lookup failed:', err);
      setReservationStatus('invalid');
    }
  }

  function unlinkReservation() {
    setReservation(null);
    setReservationStatus('idle');
    setAccessCodeInput('');
    setVoterId(getOrCreateAnonVoterId());
    const next = new URLSearchParams(searchParams);
    next.delete('code');
    setSearchParams(next, { replace: true });
    // Selections will refresh via the prefill effect when voterId changes.
    setSelections({});
  }

  // ── Cast / change a vote ───────────────────────────────────────────
  async function handleSelect(fieldId: string, optionIndex: number) {
    if (isLocked || !voterId) return;
    setCastError(null);
    setSelections((prev) => ({ ...prev, [fieldId]: optionIndex }));
    setSavingField(fieldId);
    try {
      await castVote({
        showId: SHOW_ID,
        madLibId: MAD_LIB_ID,
        fieldId,
        optionIndex,
        voterId,
        reservationId: reservation?.id ?? null,
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

  // ── Render ─────────────────────────────────────────────────────────
  if (configError) {
    return (
      <section className="page-card">
        <h1>Mad Libs voting</h1>
        <p>{configError}</p>
        <p>
          <Link to={`/shows/${SHOW_ID}`}>← Back to the show</Link>
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

  const showName = config.showConfig?.showName ?? 'Mad Libs Honey Heist';
  const totalSelected = Object.keys(selections).length;
  const totalFields = fields.length;
  const tallies: FieldTally[] = isLocked ? tallyVotes(allVotes, fields) : [];

  return (
    <section className="page-card madlibs-vote-card">
      <header style={{ marginBottom: '1.5rem' }}>
        <p style={{ margin: 0, opacity: 0.7, fontSize: '0.9rem' }}>
          {showName} · {config.showConfig?.venue} · {config.showConfig?.date}
        </p>
        <h1 style={{ marginTop: '0.25rem' }}>{setup.title}</h1>
        <p style={{ opacity: 0.85 }}>{setup.prompt}</p>
      </header>

      {/* Reservation link / unlink */}
      <div className="madlibs-vote-identity">
        {reservation ? (
          <div className="madlibs-vote-identity-linked">
            <div>
              <strong>{reservation.name}</strong>
              <span style={{ opacity: 0.7, marginLeft: '0.5rem' }}>
                code {reservation.accessCode}
              </span>
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={unlinkReservation}
            >
              Vote anonymously
            </button>
          </div>
        ) : (
          <details className="madlibs-vote-identity-anon">
            <summary>Voting anonymously — link my reservation?</summary>
            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={accessCodeInput}
                onChange={(e) => setAccessCodeInput(e.target.value)}
                placeholder="6-char access code"
                maxLength={8}
                autoCapitalize="characters"
                style={{ flex: '1 1 12rem', minWidth: 0 }}
                disabled={reservationStatus === 'checking'}
              />
              <button
                type="button"
                className="btn-primary"
                disabled={
                  reservationStatus === 'checking' ||
                  normalizeAccessCode(accessCodeInput).length !== 6
                }
                onClick={() => void linkReservation(accessCodeInput)}
              >
                {reservationStatus === 'checking' ? 'Checking…' : 'Link'}
              </button>
            </div>
            {reservationStatus === 'invalid' && (
              <p style={{ color: 'tomato', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                That code didn't match a reservation for this show.
              </p>
            )}
          </details>
        )}
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
        <p style={{ color: 'tomato', marginTop: '1rem' }}>{castError}</p>
      )}

      {/* Winning story readout (post-lock only) */}
      {isLocked && fields.length > 0 && (
        <ResultReadout fields={fields} tallies={tallies} />
      )}

      <p style={{ marginTop: '2rem' }}>
        <Link to={`/shows/${SHOW_ID}`}>← Back to the show</Link>
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
        <p style={{ opacity: 0.75, fontSize: '0.9rem' }}>
          A few questions had no votes; gaps are noted inline.
        </p>
      )}
      <p className="madlibs-vote-readout-paragraph">
        {sentences.join(' ')}
      </p>
    </section>
  );
}

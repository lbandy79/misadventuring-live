/**
 * MadLibsVotePage — audience phone view for any Mad Libs show.
 *
 * ─── Reusability ───────────────────────────────────────────────────────
 * System-agnostic. Reads `showConfig.madLibs[]` from the show's
 * `<systemId>.system.json` (see `src/systems/honey-heist.system.json` for
 * the canonical shape). To use this for Kids on Bikes, Blade Runner, etc.,
 * just add a `madLibs` array to that system's config — no changes here.
 *
 * Companion surfaces (all share the same Firestore collections, so they
 * stay in sync automatically):
 *   - MadLibsGatewayPage  — onboarding (reservation lookup / anon)
 *   - MadLibsAdminPanel   — GM controls
 *   - MadLibsDisplayPage  — projector / big screen
 *
 * ─── Behavior ──────────────────────────────────────────────────────────
 * Identity is established by the gateway and persisted to localStorage; if
 * we land here without one we redirect. Tallies are intentionally hidden
 * during open voting (no bandwagon); results stream in once locked.
 *
 * The "active" Mad Lib is whichever the GM has pushed via the admin panel
 * (Firestore: `mad-lib-active/{showId}`). Falls back to the first
 * `phase: 'pre-show'` Mad Lib so reservation-time voting Just Works
 * without any admin action.
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
  subscribeToActiveMadLib,
  subscribeToMadLibLock,
  subscribeToMadLibVotes,
  tallyVotes,
  type ActiveMadLibPointer,
  type FieldTally,
  type MadLibLock,
  type MadLibVote,
  type VoterIdentity,
} from '@mtp/lib';

/**
 * Default fallback when no admin pointer is set: prefer the first
 * `phase: 'pre-show'` Mad Lib, otherwise the first defined Mad Lib.
 * This preserves the original behavior of `/vote/:showId` always
 * landing on the pre-show form.
 */
function resolveDefaultMadLibId(
  madLibs: Array<{ id: string; phase: string }> | undefined,
): string | null {
  if (!madLibs || madLibs.length === 0) return null;
  const preShow = madLibs.find((m) => m.phase === 'pre-show');
  return (preShow ?? madLibs[0]).id;
}

/** Lock at showtime — pulled from the show's nextDate at 7pm CDT. */
function getLockTime(nextDate: string | undefined): number {
  if (!nextDate) return Number.POSITIVE_INFINITY;
  return new Date(`${nextDate}T19:00:00-05:00`).getTime();
}

interface MadLibSlot {
  id: string;
  type: string;
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
      template?: string;
      slots?: MadLibSlot[];
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
  const [castError, setCastError] = useState<string | null>(null);

  // Live votes (post-lock tally)
  const [allVotes, setAllVotes] = useState<MadLibVote[]>([]);

  // Manual close-voting toggle from admin (overrides time-based lock).
  const [manualLock, setManualLock] = useState<MadLibLock | null>(null);

  // Admin "now showing" pointer. null = no admin override; fall back
  // to the first pre-show Mad Lib so /vote/:showId still works without
  // any admin action.
  const [activePointer, setActivePointer] =
    useState<ActiveMadLibPointer | null>(null);

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
  const isManualLocked = !!manualLock?.manualLockedAt;
  const isLocked = useMemo(() => {
    if (isManualLocked) return true;
    return Date.now() >= getLockTime(show?.nextDate);
  }, [show?.nextDate, isManualLocked]);

  // ── Resolve which Mad Lib to render ────────────────────────────────
  // Pointer wins; otherwise default to the first pre-show Mad Lib.
  // `activePointer === null` AND `activeMadLibId === null` means the
  // admin explicitly cleared (idle state).
  const defaultMadLibId = useMemo(
    () => resolveDefaultMadLibId(config?.showConfig?.madLibs),
    [config],
  );
  const activeMadLibId: string | null =
    activePointer === null
      ? defaultMadLibId
      : (activePointer.activeMadLibId ?? null);

  const setup = useMemo(() => {
    if (!activeMadLibId) return undefined;
    return config?.showConfig?.madLibs?.find((m) => m.id === activeMadLibId);
  }, [config, activeMadLibId]);

  const slots: MadLibSlot[] = setup?.slots ?? [];

  // ── Pre-fill selections from existing votes ────────────────────────
  // Reset selections whenever the active Mad Lib changes (admin pushed a
  // new one), then refill from Firestore for that Mad Lib.
  useEffect(() => {
    setSelections({});
    setCastError(null);
  }, [activeMadLibId]);

  useEffect(() => {
    if (!identity || !showId || !activeMadLibId || slots.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const own = await fetchOwnVotes({
          showId,
          madLibId: activeMadLibId,
          fieldIds: slots.map((s) => s.id),
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
  }, [identity, showId, activeMadLibId, slots]);

  // ── Subscribe to all votes (only meaningful post-lock) ─────────────
  useEffect(() => {
    if (!isLocked || !showId || !activeMadLibId) return;
    const unsub = subscribeToMadLibVotes(
      { showId, madLibId: activeMadLibId },
      (votes) => setAllVotes(votes),
    );
    return unsub;
  }, [isLocked, showId, activeMadLibId]);
  // ── Subscribe to manual lock state ──────────────────────────────
  useEffect(() => {
    if (!showId || !activeMadLibId) {
      setManualLock(null);
      return;
    }
    const unsub = subscribeToMadLibLock(
      { showId, madLibId: activeMadLibId },
      (lock) => setManualLock(lock),
    );
    return unsub;
  }, [showId, activeMadLibId]);
  // ── Subscribe to admin's active-Mad-Lib pointer ────────────────────
  useEffect(() => {
    if (!showId) return;
    const unsub = subscribeToActiveMadLib(
      { showId },
      (pointer) => setActivePointer(pointer),
    );
    return unsub;
  }, [showId]);
  // ── Cast / change a vote ───────────────────────────────────────────
  async function handleSelect(fieldId: string, optionIndex: number) {
    if (isLocked || !identity || !showId || !activeMadLibId) return;
    setCastError(null);
    const previous = selections[fieldId];
    setSelections((prev) => ({ ...prev, [fieldId]: optionIndex }));
    setSavingField(fieldId);
    try {
      await castVote({
        showId,
        madLibId: activeMadLibId,
        fieldId,
        optionIndex,
        voterId: identity.voterId,
        reservationId:
          identity.kind === 'reservation' && identity.reservation
            ? identity.reservation.id
            : null,
      });
    } catch (err) {
      console.error('Vote cast failed:', err);
      setCastError('We could not save that pick. Please try again.');
      // Roll back optimistic selection so the confirmation does not lie.
      setSelections((prev) => {
        const next = { ...prev };
        if (previous === undefined) delete next[fieldId];
        else next[fieldId] = previous;
        return next;
      });
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

  if (!config) {
    return (
      <section className="page-card">
        <p>Loading the heist…</p>
      </section>
    );
  }

  // Admin has explicitly cleared the active Mad Lib (pointer doc exists,
  // activeMadLibId is null) → audience phones show an idle waiting state.
  const isAdminIdle =
    activePointer !== null && activePointer.activeMadLibId === null;
  if (isAdminIdle || !setup) {
    return (
      <section className="page-card madlibs-vote-card madlibs-vote-idle">
        <h1 className="madlibs-vote-title">Stand by.</h1>
        <p className="madlibs-vote-prompt">
          Don't close this. The next vote drops here when the crew cues it up.
        </p>
        <p className="madlibs-vote-back">
          <Link to={`/shows/${showId}`}>← Back to the show</Link>
        </p>
      </section>
    );
  }

  const showName = config.showConfig?.showName ?? show.name;
  const totalSelected = Object.keys(selections).length;
  const totalSlots = slots.length;
  const tallies: FieldTally[] = isLocked ? tallyVotes(allVotes, slots) : [];

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

      {/* Status banner — persistent, sticky on mobile so it stays visible. */}
      {isLocked ? (
        <p className="madlibs-vote-banner madlibs-vote-banner-locked">
          🔒 The votes are in{isManualLocked ? ' — GM locked it' : ''}. Here's what you all chose.
        </p>
      ) : totalSlots > 0 && totalSelected === totalSlots ? (
        <p className="madlibs-vote-banner madlibs-vote-banner-complete">
          ✓ All in. You can still change your mind until the GM locks it down.
        </p>
      ) : (
        <p className="madlibs-vote-banner madlibs-vote-banner-open">
          ✏️ Voting is open. {totalSelected} of {totalSlots} locked in. Results hidden until the reveal.
        </p>
      )}

      {/* Slots */}
      <div className="madlibs-vote-fields">
        {slots.map((slot, idx) => {
          const selected = selections[slot.id];
          const hasSelection = typeof selected === 'number';
          const isSaving = savingField === slot.id;
          const tally = tallies[idx];
          const selectedLabel =
            hasSelection && slot.options[selected as number]
              ? slot.options[selected as number]
              : null;
          return (
            <fieldset key={slot.id} className="madlibs-vote-field">
              <legend>
                <span className="madlibs-vote-slot-type">{slot.type}</span>
                <span className="madlibs-vote-slot-label">{slot.label}</span>
              </legend>
              <div className="madlibs-vote-options">
                {slot.options.map((opt, optIdx) => {
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
                        name={slot.id}
                        value={optIdx}
                        checked={checked}
                        disabled={isLocked || savingField === slot.id}
                        onChange={() => handleSelect(slot.id, optIdx)}
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
              {!isLocked && (
                <p
                  className={
                    'madlibs-vote-saved' +
                    (hasSelection ? ' is-confirmed' : ' is-pending') +
                    (isSaving ? ' is-saving' : '')
                  }
                  aria-live="polite"
                >
                  {isSaving
                    ? 'Saving…'
                    : selectedLabel
                      ? `✓ Your pick: ${selectedLabel}`
                      : 'Pick one. Lock it in.'}
                </p>
              )}
            </fieldset>
          );
        })}
      </div>

      {castError && (
        <p className="madlibs-vote-cast-error">{castError}</p>
      )}

      {/* Assembled paragraph readout (post-lock only) */}
      {isLocked && slots.length > 0 && (
        <ResultReadout slots={slots} tallies={tallies} template={setup.template} />
      )}

      <p className="madlibs-vote-back">
        <Link to={`/shows/${showId}`}>← Back to the show</Link>
      </p>
    </section>
  );
}

function ResultReadout({
  slots,
  tallies,
  template,
}: {
  slots: MadLibSlot[];
  tallies: FieldTally[];
  template?: string;
}) {
  const allVoted = tallies.every((t) => t.hasVotes);

  let paragraph: string;
  if (template) {
    paragraph = slots.reduce((text, slot, idx) => {
      const tally = tallies[idx];
      const winner = tally?.hasVotes ? slot.options[tally.winnerIndex] : '___';
      return text.replace(new RegExp(`\\{${slot.id}\\}`, 'g'), winner);
    }, template);
  } else {
    paragraph = slots
      .map((slot, idx) => {
        const tally = tallies[idx];
        if (!tally?.hasVotes) return `${slot.label}: (no votes).`;
        return `${slot.label}: ${slot.options[tally.winnerIndex]}.`;
      })
      .join(' ');
  }

  return (
    <section className="madlibs-vote-readout" aria-live="polite">
      <h2>What you all built</h2>
      {!allVoted && (
        <p className="madlibs-vote-readout-note">
          Some words had no votes. Those blanks are marked.
        </p>
      )}
      <p className="madlibs-vote-readout-paragraph">{paragraph}</p>
    </section>
  );
}

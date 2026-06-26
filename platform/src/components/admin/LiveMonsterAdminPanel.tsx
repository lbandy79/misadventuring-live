import { useState, useEffect, useCallback, useMemo } from 'react';
import { useShow } from '@mtp/lib/shows';
import { getMonsterConfig } from '@mtp/data/liveMonster';
import type { MonsterSlotConfig } from '@mtp/data/liveMonster';
import { BYSTANDER_TYPES } from '@mtp/data/liveMonster/bystanderTypes';
import {
  subscribeToMonsterSession,
  subscribeToSlotVotes,
  setMonsterPhase,
  setSlotResult,
  resetMonsterSession,
  setBystanderState,
  tallySlotVotes,
  type MonsterSession,
  type MonsterSlotVote,
  type MonsterPhase,
} from '@mtp/lib/liveMonster/liveMonsterApi';
import {
  subscribeToBystanderSubmissions,
  type BystanderSubmission,
} from '@mtp/lib/liveMonster/bystanderSubmissionsApi';
import './LiveMonsterAdminPanel.css';

const PHASE_ORDER: MonsterPhase[] = [
  'idle', 'active', 'reveal', 'bystander-name', 'bystander-move', 'done',
];

const PHASE_LABELS: Record<MonsterPhase, string> = {
  idle: 'Idle',
  active: 'Active',
  reveal: 'Reveal',
  'bystander-name': 'Bystanders',
  'bystander-move': 'Review',
  done: 'Done',
};

const MOTW_MOTIVATIONS: Record<string, string> = {
  beast:       'to run wild, destroying and killing',
  breeder:     'to give birth to, bring forth, or create evil',
  collector:   'to steal specific sorts of things',
  destroyer:   'to bring about the end of the world',
  devourer:    'to consume people',
  executioner: 'to punish the guilty',
  parasite:    'to infest, control and devour',
  queen:       'to possess and control',
  sorcerer:    'to usurp unnatural power',
  tempter:     'to tempt people into evil deeds',
  torturer:    'to hurt and terrify',
  trickster:   'to create chaos',
};

function computeTypeSuggestions(
  slots: MonsterSlotConfig[],
  slotResults: Record<string, string | null>,
): Array<{ typeId: string; count: number }> {
  const tally: Record<string, number> = {};
  for (const slot of slots) {
    const result = slotResults[slot.id];
    if (!result) continue;
    const matched = slot.options.find((o) => o.text === result);
    if (!matched?.typeHints) continue;
    for (const typeId of matched.typeHints) {
      tally[typeId] = (tally[typeId] ?? 0) + 1;
    }
  }
  return Object.entries(tally)
    .map(([typeId, count]) => ({ typeId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}


export default function LiveMonsterAdminPanel() {
  const { showId } = useShow();
  const config = showId ? getMonsterConfig(showId) : null;

  const [session, setSession] = useState<MonsterSession | null>(null);
  const [allSlotVotes, setAllSlotVotes] = useState<Record<string, MonsterSlotVote[]>>({});
  const [bystanderSubmissions, setBystanderSubmissions] = useState<BystanderSubmission[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pushStatus, setPushStatus] = useState<'idle' | 'pushing' | 'pushed'>('idle');

  useEffect(() => {
    if (!showId) return;
    return subscribeToMonsterSession(showId, setSession);
  }, [showId]);

  const phase = session?.phase ?? 'idle';

  useEffect(() => {
    if (!showId || !config) return;
    const unsubs = config.slots.map((slot) =>
      subscribeToSlotVotes(showId, slot.id, (votes) => {
        setAllSlotVotes((prev) => ({ ...prev, [slot.id]: votes }));
      }),
    );
    return () => unsubs.forEach((u) => u());
  }, [showId, config]);

  const bystanderPhaseActive = phase === 'bystander-name' || phase === 'bystander-move';

  useEffect(() => {
    if (!showId || !bystanderPhaseActive) { setBystanderSubmissions([]); return; }
    return subscribeToBystanderSubmissions(showId, setBystanderSubmissions);
  }, [showId, bystanderPhaseActive]);

  const run = useCallback(async (fn: () => Promise<void>) => {
    if (busy || !showId) return;
    setBusy(true);
    setPushStatus('pushing');
    try {
      await fn();
      setPushStatus('pushed');
      setTimeout(() => setPushStatus('idle'), 2200);
    } catch (err) {
      console.error('LiveMonsterAdminPanel action failed:', err);
      setPushStatus('idle');
    } finally {
      setBusy(false);
    }
  }, [busy, showId]);

  if (!config) {
    return (
      <div className="lm-panel">
        <h2 className="lm-panel-title">👹 Live Monster Builder</h2>
        <p className="lm-hint">
          No monster config registered for showId <code>{showId ?? '(none)'}</code>.
          Set <code>config/platform.currentShowId</code> in Firestore to <code>monster-of-the-week</code>.
        </p>
      </div>
    );
  }

  const slotResults = session?.slotResults ?? {};
  const bystanderStates = session?.bystanderStates ?? {};

  const hasAnySlotResult = config.slots.some((s) => slotResults[s.id] != null);
  const typeSuggestions = useMemo(
    () => computeTypeSuggestions(config.slots, slotResults),
    [config.slots, slotResults],
  );

  const featuredBystanders = bystanderSubmissions.filter(s => bystanderStates[s.id] === 'featured');

  function nextPhase(): MonsterPhase | null {
    const idx = PHASE_ORDER.indexOf(phase);
    if (idx < 0 || idx >= PHASE_ORDER.length - 1) return null;
    return PHASE_ORDER[idx + 1];
  }

  const next = nextPhase();
  const lockedSlotCount = config.slots.filter((s) => slotResults[s.id] != null).length;
  const nextLabel =
    next === null ? null :
    next === 'done' ? '✓ Done' :
    next === 'reveal' && lockedSlotCount < config.slots.length
      ? `→ Reveal (${lockedSlotCount}/${config.slots.length} locked)`
      : `→ ${PHASE_LABELS[next]}`;

  return (
    <div className="lm-panel">
      <div className="lm-panel-header">
        <h2 className="lm-panel-title">👹 Live Monster Builder</h2>
        <span className="lm-show-badge" title="config/platform.currentShowId">show: {showId}</span>
      </div>

      {/* Phase bar */}
      <div className="lm-phase-groups">
        <div className="lm-phase-group">
          <span className="lm-phase-group-label">State</span>
          {(['idle', 'active', 'reveal'] as MonsterPhase[]).map((p) => (
            <span
              key={p}
              role="button"
              tabIndex={0}
              className={`lm-phase-pip ${phase === p ? 'active' : 'clickable'}`}
              onClick={() => !busy && run(() => setMonsterPhase(showId!, p))}
              onKeyDown={(e) => e.key === 'Enter' && !busy && run(() => setMonsterPhase(showId!, p))}
            >
              {phase === p ? '● ' : ''}{PHASE_LABELS[p]}
            </span>
          ))}
        </div>
        <div className="lm-phase-group-divider" aria-hidden="true" />
        <div className="lm-phase-group">
          <span className="lm-phase-group-label">Bystander</span>
          {(['bystander-name', 'bystander-move', 'done'] as MonsterPhase[]).map((p) => (
            <span
              key={p}
              role="button"
              tabIndex={0}
              className={`lm-phase-pip ${phase === p ? 'active' : 'clickable'}`}
              onClick={() => !busy && run(() => setMonsterPhase(showId!, p))}
              onKeyDown={(e) => e.key === 'Enter' && !busy && run(() => setMonsterPhase(showId!, p))}
            >
              {phase === p ? '● ' : ''}{PHASE_LABELS[p]}
            </span>
          ))}
        </div>
        {pushStatus !== 'idle' && (
          <div
            className={`lm-push-toast lm-push-toast--${pushStatus}`}
            role="status"
            aria-live="polite"
          >
            {pushStatus === 'pushing' ? '…' : '✓ Pushed'}
          </div>
        )}
      </div>

      {/* Phase controls */}
      <div className="lm-row">
        {phase === 'idle' && (
          <button
            className="lm-btn lm-btn--primary"
            disabled={busy}
            onClick={() => run(() => setMonsterPhase(showId!, 'active'))}
          >
            ▶ Start
          </button>
        )}
        {(phase === 'reveal' || phase === 'bystander-name' || phase === 'bystander-move') && next && (
          <button
            className="lm-btn lm-btn--primary"
            disabled={busy}
            onClick={() => run(() => setMonsterPhase(showId!, next))}
          >
            {nextLabel}
          </button>
        )}
        <button
          className="lm-btn lm-btn--danger"
          disabled={busy}
          onClick={() => setConfirmReset(true)}
        >
          ↺ Reset
        </button>
      </div>

      {confirmReset && (
        <div className="lm-confirm">
          <p>Reset clears all votes and returns to idle.</p>
          <button
            className="lm-btn lm-btn--danger"
            disabled={busy}
            onClick={() => run(async () => { await resetMonsterSession(showId!); setConfirmReset(false); })}
          >
            Yes, Reset
          </button>
          <button className="lm-btn" onClick={() => setConfirmReset(false)}>Cancel</button>
        </div>
      )}

      {/* ── Monster slot tallies ── */}
      {(phase === 'active' || phase === 'reveal') && config.slots.map((slot) => {
        const votes = allSlotVotes[slot.id] ?? [];
        const tally = tallySlotVotes(votes, slot.options.length);
        const locked = slotResults[slot.id] != null;
        const total = tally.totalPreset + tally.totalWriteIn;
        const winner = slot.options[tally.winnerIndex];
        const canReveal = phase === 'reveal' && !locked;

        return (
          <div key={slot.id} className="lm-section">
            <h3 className="lm-section-title">
              {slot.revealPrefix}
              <span className="lm-count"> ({total} response{total !== 1 ? 's' : ''})</span>
            </h3>

            {locked ? (
              <p className="lm-locked-badge">✅ Locked: &ldquo;{slotResults[slot.id]}&rdquo;</p>
            ) : (
              <>
                <div className="lm-tallies">
                  {slot.options.map((option, i) => {
                    const count = tally.optionCounts[i];
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div
                        key={i}
                        className={`lm-tally-row lm-tally-row--readonly ${i === tally.winnerIndex && count > 0 ? 'winner' : ''}`}
                      >
                        <span className="lm-tally-label lm-tally-label--option">
                          {option.emoji} {option.text}
                        </span>
                        <div className="lm-bar-wrap">
                          <div className="lm-bar" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="lm-tally-count">{count}</span>
                      </div>
                    );
                  })}
                </div>

                {canReveal && tally.totalPreset > 0 && (
                  <button
                    className="lm-btn lm-btn--primary"
                    disabled={busy}
                    onClick={() => run(() => setSlotResult(showId!, slot.id, winner.text))}
                  >
                    Reveal: {winner.emoji} {winner.text}
                  </button>
                )}

                {canReveal && tally.writeIns.length > 0 && (
                  <div className="lm-writeins">
                    <h4 className="lm-writeins-title">Write-ins ({tally.totalWriteIn})</h4>
                    {tally.writeIns.map((v) => (
                      <div key={v.id} className="lm-writein-row">
                        <span className="lm-writein-text">&ldquo;{v.writeIn}&rdquo;</span>
                        <button
                          className="lm-btn lm-btn--small"
                          disabled={busy}
                          onClick={() => run(() => setSlotResult(showId!, slot.id, v.writeIn!))}
                        >
                          Reveal this
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      {/* ── Bystander roster ── */}
      {bystanderPhaseActive && (
        <div className="lm-section">
          <h3 className="lm-section-title">
            👤 Bystanders
            <span className="lm-count"> ({bystanderSubmissions.length} submitted)</span>
          </h3>

          {bystanderSubmissions.length === 0 ? (
            <p className="lm-hint">Waiting for submissions…</p>
          ) : (
            <div className="lm-bystander-roster">
              {bystanderSubmissions.map((sub) => {
                const typeName = BYSTANDER_TYPES[sub.typeId as keyof typeof BYSTANDER_TYPES]?.label ?? sub.typeId;
                const moveSummary = sub.movePreset
                  ? sub.movePreset
                  : `${sub.customTrigger} → ${sub.customEffect}`;
                const state: 'featured' | 'dead' | 'unfeatured' =
                  (bystanderStates[sub.id] as 'featured' | 'dead') ?? 'unfeatured';

                return (
                  <div key={sub.id} className={`lm-bystander-row ${state}`}>
                    <div className="lm-bystander-row-info">
                      <div className="lm-bystander-row-name-line">
                        <span className="lm-bystander-name">{sub.name}</span>
                        {state !== 'unfeatured' && (
                          <span className={`lm-bystander-state-badge lm-bystander-state-badge--${state}`}>
                            {state === 'featured' ? '● Live' : '✕ Dead'}
                          </span>
                        )}
                      </div>
                      <span className="lm-bystander-type">{typeName}</span>
                      <span className="lm-bystander-move-preview">{moveSummary}</span>
                    </div>
                    <div className="lm-bystander-row-actions">
                      {state === 'unfeatured' && (
                        <button
                          className="lm-btn lm-btn--primary lm-btn--small"
                          disabled={busy}
                          onClick={() => run(() => setBystanderState(showId!, sub.id, 'featured'))}
                        >
                          Feature
                        </button>
                      )}
                      {state === 'featured' && (
                        <button
                          className="lm-btn lm-btn--danger lm-btn--small"
                          disabled={busy}
                          onClick={() => run(() => setBystanderState(showId!, sub.id, 'dead'))}
                        >
                          Kill
                        </button>
                      )}
                      {state !== 'unfeatured' && (
                        <button
                          className="lm-btn lm-btn--small"
                          disabled={busy}
                          onClick={() => run(() => setBystanderState(showId!, sub.id, null))}
                        >
                          Unfeature
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── GM Output ── */}
      {hasAnySlotResult && (
        <div className="lm-section lm-gm-output">
          <h3 className="lm-section-title">👹 GM Output</h3>

          <div className="lm-gm-monster">
            {config.slots.map((slot) => {
              const result = slotResults[slot.id];
              const matched = result ? slot.options.find((o) => o.text === result) : null;
              return (
                <div key={slot.id} className={`lm-gm-token ${result ? 'locked' : 'pending'}`}>
                  <span className="lm-gm-token-emoji">{matched?.emoji ?? '···'}</span>
                  <div className="lm-gm-token-body">
                    <span className="lm-gm-token-prefix">{slot.revealPrefix}</span>
                    <span className="lm-gm-token-value">
                      {result ?? <span className="lm-gm-pending">pending</span>}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {typeSuggestions.length > 0 && (
            <div className="lm-gm-types">
              <p className="lm-gm-types-label">Suggested type{typeSuggestions.length > 1 ? 's' : ''}</p>
              {typeSuggestions.map(({ typeId, count }) => (
                <div key={typeId} className="lm-gm-type-row">
                  <span className="lm-gm-type-id">{typeId}</span>
                  <span className="lm-gm-type-motivation">{MOTW_MOTIVATIONS[typeId] ?? ''}</span>
                  <span className="lm-gm-type-count">{count} pick{count !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          )}

          {featuredBystanders.length > 0 && (
            <div className="lm-gm-bystander">
              <p className="lm-gm-types-label">👤 Featured Bystanders</p>
              {featuredBystanders.map((sub) => (
                <div key={sub.id} className="lm-gm-type-row">
                  <span className="lm-gm-type-id">{sub.name}</span>
                  <span className="lm-gm-type-motivation">
                    {BYSTANDER_TYPES[sub.typeId as keyof typeof BYSTANDER_TYPES]?.label ?? sub.typeId}
                    {' — '}
                    {sub.movePreset ?? `${sub.customTrigger} → ${sub.customEffect}`}
                  </span>
                </div>
              ))}
              <p className="lm-hint" style={{ marginTop: '0.5rem' }}>
                Fill weapon, harm, and tags in the Keeper wizard.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

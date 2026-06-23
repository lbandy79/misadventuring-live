import { useState, useEffect, useCallback } from 'react';
import { useShow } from '../lib/shows';
import './LiveMonsterAdminPanel.css';
import { getKeeperThreat, type KeeperThreat } from '../lib/threats/threatApi';
import { getMonsterConfig } from '../data/liveMonster';
import {
  subscribeToMonsterSession,
  subscribeToTypeVotes,
  subscribeToSlotVotes,
  setMonsterPhase,
  lockMonsterType,
  setSlotResult,
  resetMonsterSession,
  tallyTypeVotes,
  tallySlotVotes,
  parseSlotIndex,
  type MonsterSession,
  type MonsterTypeVote,
  type MonsterSlotVote,
  type MonsterPhase,
} from '../lib/liveMonster/liveMonsterApi';

const PHASE_ORDER: MonsterPhase[] = [
  'idle',
  'type-vote',
  'slot-0',
  'slot-1',
  'slot-2',
  'slot-3',
  'reveal',
];

export default function LiveMonsterAdminPanel() {
  const { showId } = useShow();
  const config = showId ? getMonsterConfig(showId) : null;

  const [session, setSession] = useState<MonsterSession | null>(null);
  const [typeVotes, setTypeVotes] = useState<MonsterTypeVote[]>([]);
  const [slotVotes, setSlotVotes] = useState<MonsterSlotVote[]>([]);
  const [threat, setThreat] = useState<KeeperThreat | null>(null);
  const [threatOpen, setThreatOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Subscribe to session
  useEffect(() => {
    if (!showId) return;
    return subscribeToMonsterSession(showId, setSession);
  }, [showId]);

  // Subscribe to type votes
  useEffect(() => {
    if (!showId) return;
    return subscribeToTypeVotes(showId, setTypeVotes);
  }, [showId]);

  // Subscribe to current slot votes
  const currentSlotIndex = session ? parseSlotIndex(session.phase) : -1;
  const currentSlot = config?.slots[currentSlotIndex] ?? null;

  useEffect(() => {
    if (!showId || !currentSlot) {
      setSlotVotes([]);
      return;
    }
    return subscribeToSlotVotes(showId, currentSlot.id, setSlotVotes);
  }, [showId, currentSlot]);

  // Fetch stat block when type locks
  useEffect(() => {
    if (!session?.linkedThreatId) {
      setThreat(null);
      return;
    }
    getKeeperThreat(session.linkedThreatId).then(setThreat).catch(console.error);
  }, [session?.linkedThreatId]);

  const run = useCallback(async (fn: () => Promise<void>) => {
    if (busy || !showId) return;
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }, [busy, showId]);

  if (!config) {
    return (
      <section className="admin-card config-card">
        <h2>👹 Live Monster Builder</h2>
        <p className="card-hint">
          No monster config registered for showId <code>{showId}</code>. Add one in{' '}
          <code>src/data/liveMonster/index.ts</code>.
        </p>
      </section>
    );
  }

  const phase = session?.phase ?? 'idle';
  const slotResults = session?.slotResults ?? {};
  const lockedTypeId = session?.lockedTypeId ?? null;
  const typeTally = tallyTypeVotes(typeVotes, config.monsterTypes.map((t) => t.id));
  const totalTypeVotes = typeVotes.length;

  const slotTally = currentSlot
    ? tallySlotVotes(slotVotes, currentSlot.options.length)
    : null;

  const currentSlotLocked = currentSlot ? slotResults[currentSlot.id] != null : false;

  function nextPhase(): MonsterPhase | null {
    const idx = PHASE_ORDER.indexOf(phase);
    if (idx < 0 || idx >= PHASE_ORDER.length - 1) return null;
    // Skip slot phases beyond the number of slots configured
    let next = PHASE_ORDER[idx + 1];
    if (next.startsWith('slot-')) {
      const slotIdx = parseInt(next.slice(5), 10);
      if (slotIdx >= config!.slots.length) next = 'reveal';
    }
    return next;
  }

  const next = nextPhase();

  return (
    <section className="admin-card config-card">
      <h2>👹 Live Monster Builder</h2>
      <p className="card-hint">
        Audience votes on the type, then fills in description slots one at a time. You promote the
        winner for each slot before advancing.
      </p>

      {/* ── Phase progress bar ── */}
      <div className="lm-phase-bar">
        {(['idle', 'type-vote', ...config.slots.map((_, i) => `slot-${i}` as MonsterPhase), 'reveal'] as MonsterPhase[]).map(
          (p) => {
            const label =
              p === 'idle'
                ? 'Idle'
                : p === 'type-vote'
                ? 'Type Vote'
                : p === 'reveal'
                ? 'Reveal'
                : `Slot ${parseInt(p.slice(5)) + 1}`;
            return (
              <span key={p} className={`lm-phase-pip ${phase === p ? 'active' : ''}`}>
                {label}
              </span>
            );
          },
        )}
      </div>

      {/* ── Phase advance ── */}
      <div className="lm-row">
        {next && (
          <button
            className="admin-btn primary"
            disabled={busy}
            onClick={() => run(() => setMonsterPhase(showId!, next))}
          >
            {phase === 'idle' ? '▶ Start Type Vote' : next === 'reveal' ? '🎉 Show Reveal' : `→ Next: ${next.startsWith('slot-') ? `Slot ${parseInt(next.slice(5)) + 1}` : next}`}
          </button>
        )}
        <button
          className="admin-btn danger"
          disabled={busy}
          onClick={() => setConfirmReset(true)}
        >
          ↺ Reset
        </button>
      </div>

      {confirmReset && (
        <div className="lm-confirm">
          <p>Reset clears all votes and returns to idle. Are you sure?</p>
          <button
            className="admin-btn danger"
            disabled={busy}
            onClick={() => run(async () => { await resetMonsterSession(showId!); setConfirmReset(false); })}
          >
            Yes, Reset Everything
          </button>
          <button className="admin-btn" onClick={() => setConfirmReset(false)}>Cancel</button>
        </div>
      )}

      {/* ── Type vote section ── */}
      {(phase === 'type-vote' || lockedTypeId) && (
        <div className="lm-section">
          <h3>Monster Type <span className="lm-count">({totalTypeVotes} votes)</span></h3>
          <div className="lm-tallies">
            {typeTally.map(({ optionId, count }) => {
              const typeConfig = config.monsterTypes.find((t) => t.id === optionId);
              if (!typeConfig) return null;
              const pct = totalTypeVotes > 0 ? Math.round((count / totalTypeVotes) * 100) : 0;
              const isWinner = lockedTypeId === optionId;
              return (
                <div key={optionId} className={`lm-tally-row ${isWinner ? 'winner' : ''}`}>
                  <span className="lm-tally-label">
                    {typeConfig.emoji} {typeConfig.name}
                  </span>
                  <div className="lm-bar-wrap">
                    <div className="lm-bar" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="lm-tally-count">{count}</span>
                  {!lockedTypeId && count > 0 && (
                    <button
                      className="admin-btn small"
                      disabled={busy}
                      onClick={() =>
                        run(() =>
                          lockMonsterType(showId!, optionId, typeConfig.threatId ?? null),
                        )
                      }
                    >
                      Lock
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {!lockedTypeId && totalTypeVotes > 0 && (
            <button
              className="admin-btn primary"
              disabled={busy}
              onClick={() => {
                const winner = typeTally.reduce((a, b) => (b.count > a.count ? b : a));
                const winnerConfig = config.monsterTypes.find((t) => t.id === winner.optionId);
                run(() =>
                  lockMonsterType(showId!, winner.optionId, winnerConfig?.threatId ?? null),
                );
              }}
            >
              🔒 Lock Winner
            </button>
          )}

          {lockedTypeId && (
            <p className="lm-locked-badge">
              Locked: {config.monsterTypes.find((t) => t.id === lockedTypeId)?.emoji}{' '}
              {config.monsterTypes.find((t) => t.id === lockedTypeId)?.name}
            </p>
          )}
        </div>
      )}

      {/* ── Stat block (collapsible) ── */}
      {threat && (
        <div className="lm-section lm-threat-card">
          <button
            className="lm-threat-toggle"
            onClick={() => setThreatOpen((o) => !o)}
          >
            📋 Stat Block: {threat.name} {threatOpen ? '▲' : '▼'}
          </button>
          {threatOpen && (
            <div className="lm-threat-body">
              <p className="lm-threat-desc">{threat.description}</p>
              <div className="lm-threat-stats">
                {threat.harmCapacity != null && <span>HP: {threat.harmCapacity}</span>}
                {threat.armour != null && <span>Armour: {threat.armour}</span>}
                {threat.attack && (
                  <span>
                    Attack: {threat.attack.name} ({threat.attack.harm} harm)
                  </span>
                )}
              </div>
              {threat.powers && threat.powers.length > 0 && (
                <div>
                  <strong>Powers:</strong>
                  <ul className="lm-list">
                    {threat.powers.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
              )}
              {threat.weaknesses && threat.weaknesses.length > 0 && (
                <div>
                  <strong>Weaknesses:</strong>
                  <ul className="lm-list">
                    {threat.weaknesses.map((w, i) => <li key={i}>{w.text}</li>)}
                  </ul>
                </div>
              )}
              {threat.customMoves && threat.customMoves.length > 0 && (
                <div>
                  <strong>Custom Moves:</strong>
                  {threat.customMoves.map((m, i) => (
                    <div key={i} className="lm-move">
                      <em>{m.trigger}</em> → {m.effect}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Current slot section ── */}
      {currentSlot && slotTally && (
        <div className="lm-section">
          <h3>
            Slot {currentSlotIndex + 1}: {currentSlot.label}
            <span className="lm-count"> ({slotTally.totalPreset + slotTally.totalWriteIn} responses)</span>
          </h3>

          {currentSlotLocked ? (
            <p className="lm-locked-badge">
              ✅ Locked: &ldquo;{slotResults[currentSlot.id]}&rdquo;
            </p>
          ) : (
            <>
              {/* Preset option tallies */}
              <div className="lm-tallies">
                {currentSlot.options.map((option, i) => {
                  const count = slotTally.optionCounts[i];
                  const total = slotTally.totalPreset + slotTally.totalWriteIn;
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  const isTopPreset = i === slotTally.winnerIndex && count > 0;
                  return (
                    <div key={i} className={`lm-tally-row ${isTopPreset ? 'winner' : ''}`}>
                      <span className="lm-tally-label lm-tally-label--option">{option}</span>
                      <div className="lm-bar-wrap">
                        <div className="lm-bar" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="lm-tally-count">{count}</span>
                      <button
                        className="admin-btn small"
                        disabled={busy}
                        onClick={() => run(() => setSlotResult(showId!, currentSlot.id, option))}
                      >
                        Promote
                      </button>
                    </div>
                  );
                })}
              </div>

              {slotTally.totalPreset > 0 && (
                <button
                  className="admin-btn primary"
                  disabled={busy}
                  onClick={() =>
                    run(() =>
                      setSlotResult(
                        showId!,
                        currentSlot.id,
                        currentSlot.options[slotTally.winnerIndex],
                      ),
                    )
                  }
                >
                  🏆 Promote Winner (option {slotTally.winnerIndex + 1})
                </button>
              )}

              {/* Write-in queue */}
              {slotTally.writeIns.length > 0 && (
                <div className="lm-writeins">
                  <h4>Write-ins ({slotTally.totalWriteIn})</h4>
                  {slotTally.writeIns.map((v) => (
                    <div key={v.id} className="lm-writein-row">
                      <span className="lm-writein-text">&ldquo;{v.writeIn}&rdquo;</span>
                      <button
                        className="admin-btn small"
                        disabled={busy}
                        onClick={() =>
                          run(() => setSlotResult(showId!, currentSlot.id, v.writeIn!))
                        }
                      >
                        Promote
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Slot result summary ── */}
      {Object.keys(slotResults).length > 0 && (
        <div className="lm-section">
          <h3>Locked Descriptions</h3>
          {config.slots.map((slot) => {
            const result = slotResults[slot.id];
            if (!result) return null;
            return (
              <div key={slot.id} className="lm-result-row">
                <span className="lm-result-label">{slot.revealPrefix}</span>
                <span className="lm-result-value">{result}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

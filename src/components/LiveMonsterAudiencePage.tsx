import { useState, useEffect, useCallback } from 'react';
import { useShow } from '../lib/shows';
import { saveAnonIdentity } from '../lib/madlibs/madLibsApi';
import { getMonsterConfig } from '../data/liveMonster';
import type { MonsterBuilderConfig } from '../data/liveMonster';
import {
  subscribeToMonsterSession,
  castTypeVote,
  castSlotVote,
  parseSlotIndex,
  type MonsterSession,
} from '../lib/liveMonster/liveMonsterApi';
import './LiveMonsterAudiencePage.css';

export default function LiveMonsterAudiencePage() {
  const { showId, show } = useShow();
  const config: MonsterBuilderConfig | null = showId ? getMonsterConfig(showId) : null;

  const [voterId, setVoterId] = useState<string | null>(null);
  const [session, setSession] = useState<MonsterSession | null>(null);

  // Per-phase local selections (optimistic, not persisted across reload)
  const [myTypeVote, setMyTypeVote] = useState<string | null>(null);
  const [mySlotOptionIndex, setMySlotOptionIndex] = useState<number | null>(null);
  const [myWriteIn, setMyWriteIn] = useState('');
  const [lastSubmittedSlotId, setLastSubmittedSlotId] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Establish voter identity on mount
  useEffect(() => {
    const identity = saveAnonIdentity();
    setVoterId(identity.voterId);
  }, []);

  // Subscribe to session
  useEffect(() => {
    if (!showId) return;
    return subscribeToMonsterSession(showId, setSession);
  }, [showId]);

  // Clear slot selections when phase advances to a new slot
  const phase = session?.phase ?? 'idle';
  const slotIndex = parseSlotIndex(phase);
  const currentSlot = config?.slots[slotIndex] ?? null;

  useEffect(() => {
    if (!currentSlot) return;
    if (currentSlot.id !== lastSubmittedSlotId) {
      setMySlotOptionIndex(null);
      setMyWriteIn('');
    }
  }, [currentSlot, lastSubmittedSlotId]);

  const handleTypeVote = useCallback(
    async (optionId: string) => {
      if (!showId || !voterId || submitting || session?.lockedTypeId) return;
      setSubmitting(true);
      setSubmitError(null);
      try {
        await castTypeVote(showId, optionId, voterId);
        setMyTypeVote(optionId);
      } catch {
        setSubmitError('Could not submit — try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [showId, voterId, submitting, session?.lockedTypeId],
  );

  const handleSlotSubmit = useCallback(async () => {
    if (!showId || !voterId || !currentSlot || submitting) return;
    if (mySlotOptionIndex === null && !myWriteIn.trim()) return;

    const slotLocked = (session?.slotResults ?? {})[currentSlot.id] != null;
    if (slotLocked) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload =
        myWriteIn.trim()
          ? { writeIn: myWriteIn.trim() }
          : { optionIndex: mySlotOptionIndex! };
      await castSlotVote(showId, currentSlot.id, payload, voterId);
      setLastSubmittedSlotId(currentSlot.id);
    } catch {
      setSubmitError('Could not submit — try again.');
    } finally {
      setSubmitting(false);
    }
  }, [showId, voterId, currentSlot, submitting, mySlotOptionIndex, myWriteIn, session?.slotResults]);

  if (!config) {
    return (
      <div className="lma-container">
        <div className="lma-idle">
          <p>{show?.name ?? 'The Misadventuring Party'}</p>
          <p className="lma-standby">Stand by. The creature is coming.</p>
        </div>
      </div>
    );
  }

  const slotResults = session?.slotResults ?? {};
  const currentSlotLocked = currentSlot ? slotResults[currentSlot.id] != null : false;
  const hasSubmittedSlot = lastSubmittedSlotId === currentSlot?.id;

  return (
    <div className="lma-container">
      <header className="lma-header">
        <h1>{config.showName}</h1>
        <p className="lma-subtitle">Build the Monster</p>
      </header>

      {/* ── Idle ── */}
      {phase === 'idle' && (
        <div className="lma-idle">
          <p className="lma-standby">Stand by. The creature is coming.</p>
        </div>
      )}

      {/* ── Type vote ── */}
      {phase === 'type-vote' && (
        <div className="lma-section">
          <p className="lma-prompt">What kind of monster is it?</p>

          {session?.lockedTypeId ? (
            <div className="lma-locked-msg">
              <span>🔒 The type has been decided.</span>
            </div>
          ) : (
            <>
              <div className="lma-type-grid">
                {config.monsterTypes.map((type) => (
                  <button
                    key={type.id}
                    className={`lma-type-card ${myTypeVote === type.id ? 'selected' : ''}`}
                    onClick={() => handleTypeVote(type.id)}
                    disabled={submitting}
                  >
                    <span className="lma-type-emoji">{type.emoji}</span>
                    <span className="lma-type-name">{type.name}</span>
                    <span className="lma-type-teaser">{type.teaser}</span>
                  </button>
                ))}
              </div>
              {myTypeVote && (
                <p className="lma-status">
                  ✓ You voted for{' '}
                  <strong>{config.monsterTypes.find((t) => t.id === myTypeVote)?.name}</strong>. Tap
                  another to change.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Slot voting ── */}
      {phase.startsWith('slot-') && currentSlot && (
        <div className="lma-section">
          <p className="lma-slot-round">Round {slotIndex + 1} of {config.slots.length}</p>
          <p className="lma-prompt">{currentSlot.label}</p>

          {currentSlotLocked ? (
            <div className="lma-locked-msg">
              <span>🔒 The answer is locked in.</span>
            </div>
          ) : (
            <>
              <div className="lma-options">
                {currentSlot.options.map((option, i) => (
                  <button
                    key={i}
                    className={`lma-option ${mySlotOptionIndex === i && !myWriteIn ? 'selected' : ''}`}
                    onClick={() => {
                      setMySlotOptionIndex(i);
                      setMyWriteIn('');
                    }}
                    disabled={submitting}
                  >
                    {option}
                  </button>
                ))}
              </div>

              {currentSlot.allowWriteIn && (
                <div className="lma-writein-wrap">
                  <label className="lma-writein-label">Or write your own:</label>
                  <input
                    className={`lma-writein-input ${myWriteIn.trim() ? 'selected' : ''}`}
                    type="text"
                    maxLength={120}
                    placeholder="Type something vivid..."
                    value={myWriteIn}
                    onChange={(e) => {
                      setMyWriteIn(e.target.value);
                      if (e.target.value.trim()) setMySlotOptionIndex(null);
                    }}
                  />
                </div>
              )}

              <button
                className="lma-submit-btn"
                disabled={submitting || (mySlotOptionIndex === null && !myWriteIn.trim())}
                onClick={handleSlotSubmit}
              >
                {hasSubmittedSlot ? '✓ Update Answer' : 'Submit'}
              </button>

              {hasSubmittedSlot && !submitting && (
                <p className="lma-status">✓ Submitted. You can change your answer until it locks.</p>
              )}

              {submitError && <p className="lma-error">{submitError}</p>}
            </>
          )}
        </div>
      )}

      {/* ── Reveal ── */}
      {phase === 'reveal' && (
        <div className="lma-idle">
          <p className="lma-reveal-msg">🎉 The creature has been assembled.</p>
          <p className="lma-standby">Watch the screen.</p>
        </div>
      )}
    </div>
  );
}

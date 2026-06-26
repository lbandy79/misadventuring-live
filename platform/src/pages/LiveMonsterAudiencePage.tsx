import { useState, useEffect, useCallback } from 'react';
import { Filter as ProfanityFilter } from 'bad-words';
import { useShow } from '@mtp/lib/shows';

const profanityFilter = new ProfanityFilter({ placeHolder: '*' });
function hasProfanity(...texts: string[]): boolean {
  return texts.some(t => t.trim() && profanityFilter.isProfane(t));
}
import { saveAnonIdentity } from '@mtp/lib/madlibs/madLibsApi';
import { getMonsterConfig } from '@mtp/data/liveMonster';
import type { MonsterBuilderConfig } from '@mtp/data/liveMonster';
import { BYSTANDER_TYPES, BYSTANDER_TYPE_IDS } from '@mtp/data/liveMonster/bystanderTypes';
import {
  subscribeToMonsterSession,
  castSlotVote,
  type MonsterSession,
} from '@mtp/lib/liveMonster/liveMonsterApi';
import {
  submitBystander,
  subscribeToVoterBystanderSubmissions,
  type BystanderSubmission,
} from '@mtp/lib/liveMonster/bystanderSubmissionsApi';
import './LiveMonsterAudiencePage.css';

const MAX_BYSTANDERS = 5;

type SlotSelection = { optionIndex: number | null; writeIn: string };

export default function LiveMonsterAudiencePage() {
  const { showId, show } = useShow();
  const config: MonsterBuilderConfig | null = showId ? getMonsterConfig(showId) : null;

  const [voterId, setVoterId] = useState<string | null>(null);
  const [session, setSession] = useState<MonsterSession | null>(null);

  const [selections, setSelections] = useState<Record<string, SlotSelection>>({});
  const [submittedSlots, setSubmittedSlots] = useState<Set<string>>(new Set());

  const [audienceStep, setAudienceStep] = useState(0);

  // Bystander form state (resets after each submission)
  const [bystanderName, setBystanderName] = useState('');
  const [bystanderTypeId, setBystanderTypeId] = useState<string | null>(null);
  const [bystanderMovePreset, setBystanderMovePreset] = useState<string | null>(null);
  const [bystanderCustomTrigger, setBystanderCustomTrigger] = useState('');
  const [bystanderCustomEffect, setBystanderCustomEffect] = useState('');

  // Voter's own submitted bystanders for this show
  const [voterSubmissions, setVoterSubmissions] = useState<BystanderSubmission[]>([]);
  // Controls whether the add-bystander form is visible (vs the submitted list)
  const [isAddingBystander, setIsAddingBystander] = useState(false);

  const [flashSlot, setFlashSlot] = useState<string | null>(null);
  const [flashBystander, setFlashBystander] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const identity = saveAnonIdentity();
    setVoterId(identity.voterId);
  }, []);

  useEffect(() => {
    if (!showId) return;
    return subscribeToMonsterSession(showId, setSession);
  }, [showId]);

  const phase = session?.phase ?? 'idle';
  const slotResults = session?.slotResults ?? {};

  const bystanderPhaseActive = phase === 'bystander-name' || phase === 'bystander-move';

  // Subscribe to the voter's own submissions during bystander phase
  useEffect(() => {
    if (!showId || !voterId || !bystanderPhaseActive) { setVoterSubmissions([]); return; }
    return subscribeToVoterBystanderSubmissions(showId, voterId, setVoterSubmissions);
  }, [showId, voterId, bystanderPhaseActive]);

  // Auto-advance audience to bystander step when GM opens that phase
  useEffect(() => {
    if (bystanderPhaseActive) {
      setAudienceStep(s => Math.max(s, 4));
    }
  }, [bystanderPhaseActive]);

  const maxStep = bystanderPhaseActive ? 4 : 3;
  const step = Math.min(audienceStep, maxStep);

  // ── Monster slot submit ───────────────────────────────────────────────────

  const handleSlotSubmit = useCallback(async (slotId: string) => {
    if (!showId || !voterId || submitting) return;
    const sel = selections[slotId];
    if (!sel || (sel.optionIndex === null && !sel.writeIn.trim())) return;
    if (slotResults[slotId] != null) return;

    if (sel.writeIn.trim() && hasProfanity(sel.writeIn)) {
      setSubmitError('Please keep it clean — this shows on the big screen!');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = sel.writeIn.trim()
        ? { writeIn: sel.writeIn.trim() }
        : { optionIndex: sel.optionIndex! };
      await castSlotVote(showId, slotId, payload, voterId);
      setSubmittedSlots(prev => new Set(prev).add(slotId));
      setFlashSlot(slotId);
      setTimeout(() => setFlashSlot(null), 800);
    } catch {
      setSubmitError('Could not submit — try again.');
    } finally {
      setSubmitting(false);
    }
  }, [showId, voterId, submitting, selections, slotResults]);

  // ── Bystander submit ──────────────────────────────────────────────────────

  const bystanderValid = (() => {
    if (!bystanderName.trim() || !bystanderTypeId) return false;
    if (bystanderMovePreset) return true;
    return bystanderCustomTrigger.trim().length > 0 && bystanderCustomEffect.trim().length > 0;
  })();

  const handleBystanderSubmit = useCallback(async () => {
    if (!showId || !voterId || submitting || !bystanderValid) return;
    if (hasProfanity(bystanderName, bystanderCustomTrigger, bystanderCustomEffect)) {
      setSubmitError('Please keep it clean — this shows on the big screen!');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitBystander(showId, voterId, {
        name: bystanderName.trim(),
        typeId: bystanderTypeId!,
        ...(bystanderMovePreset
          ? { movePreset: bystanderMovePreset }
          : {
              customTrigger: bystanderCustomTrigger.trim(),
              customEffect: bystanderCustomEffect.trim(),
            }),
      });
      // Reset form for the next potential submission
      setBystanderName('');
      setBystanderTypeId(null);
      setBystanderMovePreset(null);
      setBystanderCustomTrigger('');
      setBystanderCustomEffect('');
      setIsAddingBystander(false);
      setFlashBystander(true);
      setTimeout(() => setFlashBystander(false), 800);
    } catch (err) {
      if (err instanceof Error && err.message === 'max-submissions-reached') {
        setSubmitError(`You've already submitted ${MAX_BYSTANDERS} bystanders — that's the max!`);
      } else {
        setSubmitError('Could not submit — try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    showId, voterId, submitting, bystanderValid,
    bystanderName, bystanderTypeId, bystanderMovePreset,
    bystanderCustomTrigger, bystanderCustomEffect,
  ]);

  // ── No config ─────────────────────────────────────────────────────────────

  if (!config) {
    return (
      <div className="lma-container">
        <div className="lma-idle">
          <img src="/assets/themes/monster-of-the-week/MotW logo.png" alt="The Misadventuring Party" className="lma-idle-logo" />
          <p>{show?.name ?? 'The Misadventuring Party'}</p>
          <p className="lma-standby">Stand by. The creature is coming.</p>
        </div>
      </div>
    );
  }

  // ── Idle ──────────────────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className="lma-container">
        <header className="lma-header"><h1>{config.showName}</h1></header>
        <div className="lma-idle">
          <img src="/assets/themes/monster-of-the-week/MotW logo.png" alt="The Misadventuring Party" className="lma-idle-logo" />
          <p className="lma-standby">Stand by. The creature is coming.</p>
        </div>
      </div>
    );
  }

  // ── Reveal / Done ─────────────────────────────────────────────────────────
  if (phase === 'reveal' || phase === 'done') {
    return (
      <div className="lma-container">
        <header className="lma-header"><h1>{config.showName}</h1></header>
        <div className="lma-idle">
          <img src="/assets/themes/monster-of-the-week/MotW logo.png" alt="The Misadventuring Party" className="lma-idle-logo" />
          <p className="lma-standby">Watch the screen.</p>
        </div>
      </div>
    );
  }

  // ── Active ballot ─────────────────────────────────────────────────────────
  const isMonsterStep = step <= 3;
  const slot = isMonsterStep ? config.slots[step] : null;
  const slotLocked = slot ? slotResults[slot.id] != null : false;
  const sel: SlotSelection = slot
    ? (selections[slot.id] ?? { optionIndex: null, writeIn: '' })
    : { optionIndex: null, writeIn: '' };
  const hasSubmittedThisSlot = slot ? submittedSlots.has(slot.id) : false;
  const canSubmitSlot = !slotLocked && (sel.optionIndex !== null || sel.writeIn.trim().length > 0);

  const showBystanderForm = voterSubmissions.length === 0 || isAddingBystander;
  const atMax = voterSubmissions.length >= MAX_BYSTANDERS;

  return (
    <div className="lma-container">
      <header className="lma-header"><h1>{config.showName}</h1></header>

      {/* ── Monster slot step ── */}
      {isMonsterStep && slot && (
        <div className={`lma-section${flashSlot === slot.id ? ' lma-section--flash' : ''}`}>
          <p className="lma-slot-round">
            {step + 1} of {config.slots.length}
          </p>
          <p className="lma-prompt">{slot.label}</p>

          {slotLocked ? (
            <div className="lma-locked-msg"><span>🔒 Locked in.</span></div>
          ) : (
            <>
              <div className="lma-chip-grid">
                {slot.options.map((option, i) => (
                  <button
                    key={i}
                    className={`lma-chip ${sel.optionIndex === i && !sel.writeIn ? 'selected' : ''}`}
                    onClick={() => setSelections(prev => ({
                      ...prev,
                      [slot.id]: { optionIndex: i, writeIn: '' },
                    }))}
                    disabled={submitting}
                  >
                    <span className="lma-chip-emoji">{option.emoji}</span>
                    <span className="lma-chip-text">{option.text}</span>
                  </button>
                ))}
              </div>

              {slot.allowWriteIn && (
                <div className="lma-writein-wrap">
                  <label className="lma-writein-label">Or write your own:</label>
                  <input
                    className={`lma-writein-input ${sel.writeIn.trim() ? 'selected' : ''}`}
                    type="text"
                    maxLength={120}
                    placeholder="Type something vivid..."
                    value={sel.writeIn}
                    onChange={(e) => setSelections(prev => ({
                      ...prev,
                      [slot.id]: { optionIndex: null, writeIn: e.target.value },
                    }))}
                  />
                </div>
              )}

              <button
                className="lma-submit-btn"
                disabled={submitting || !canSubmitSlot}
                onClick={() => handleSlotSubmit(slot.id)}
              >
                {hasSubmittedThisSlot ? '✓ Change My Choice' : 'Submit'}
              </button>

              {hasSubmittedThisSlot && !submitting && (
                <p key={`status-${flashSlot}`} className="lma-status lma-status--visible">
                  ✓ Submitted. You can change your answer until it locks.
                </p>
              )}
              {submitError && <p className="lma-error">{submitError}</p>}
            </>
          )}
        </div>
      )}

      {/* ── Bystander step ── */}
      {step === 4 && (
        <div className={`lma-section lma-bystander-form${flashBystander ? ' lma-section--flash' : ''}`}>
          <p className="lma-slot-round">Also tonight</p>

          {/* List of already-submitted bystanders */}
          {voterSubmissions.length > 0 && !isAddingBystander && (
            <div className="lma-bystander-submitted-list">
              <p className="lma-bystander-submitted-count">
                Your bystanders ({voterSubmissions.length}/{MAX_BYSTANDERS})
              </p>
              {voterSubmissions.map(sub => {
                const typeInfo = BYSTANDER_TYPES[sub.typeId as keyof typeof BYSTANDER_TYPES];
                return (
                  <div key={sub.id} className="lma-bystander-submitted-item">
                    <span className="lma-bystander-submitted-name">{sub.name}</span>
                    <span className="lma-bystander-submitted-type">
                      {typeInfo?.label ?? sub.typeId}
                    </span>
                  </div>
                );
              })}
              {!atMax && (
                <button
                  className="lma-submit-btn"
                  style={{ marginTop: '0.5rem' }}
                  onClick={() => { setSubmitError(null); setIsAddingBystander(true); }}
                >
                  + Add Another Bystander
                </button>
              )}
              {atMax && (
                <p className="lma-bystander-max-msg">
                  You've submitted {MAX_BYSTANDERS} bystanders — that's the max!
                </p>
              )}
            </div>
          )}

          {/* Add-bystander form */}
          {showBystanderForm && !atMax && (
            <>
              <p className="lma-prompt lma-prompt--sm">{config.bystander.openPrompt}</p>

              {/* Name */}
              <div className="lma-field-group">
                <label className="lma-writein-label">Their name</label>
                <input
                  className="lma-writein-input lma-writein-input--name"
                  type="text"
                  maxLength={60}
                  placeholder="A name..."
                  value={bystanderName}
                  onChange={e => setBystanderName(e.target.value)}
                />
              </div>

              {/* Type grid */}
              <div className="lma-field-group">
                <label className="lma-writein-label">Their role</label>
                <div className="lma-type-grid">
                  {BYSTANDER_TYPE_IDS.map(typeId => {
                    const info = BYSTANDER_TYPES[typeId];
                    return (
                      <button
                        key={typeId}
                        className={`lma-type-chip ${bystanderTypeId === typeId ? 'selected' : ''}`}
                        onClick={() => setBystanderTypeId(typeId)}
                        disabled={submitting}
                      >
                        <span className="lma-type-chip-label">{info.label}</span>
                        <span className="lma-type-chip-tagline">{info.tagline}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Move */}
              <div className="lma-field-group">
                <label className="lma-writein-label">What do they do?</label>
                <div className="lma-move-grid">
                  {config.bystander.movePresets.map((preset, i) => (
                    <button
                      key={i}
                      className={`lma-move-chip ${bystanderMovePreset === preset.text ? 'selected' : ''}`}
                      onClick={() => {
                        setBystanderMovePreset(preset.text);
                        setBystanderCustomTrigger('');
                        setBystanderCustomEffect('');
                      }}
                      disabled={submitting}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="lma-custom-move">
                  <p className="lma-custom-move-or">— or write your own —</p>
                  <label className="lma-writein-label">When…</label>
                  <input
                    className={`lma-writein-input ${bystanderCustomTrigger.trim() && !bystanderMovePreset ? 'selected' : ''}`}
                    type="text"
                    maxLength={120}
                    placeholder="the witness tries to leave..."
                    value={bystanderCustomTrigger}
                    onChange={e => {
                      setBystanderCustomTrigger(e.target.value);
                      if (e.target.value.trim()) setBystanderMovePreset(null);
                    }}
                  />
                  <label className="lma-writein-label" style={{ marginTop: '0.5rem' }}>…they</label>
                  <input
                    className={`lma-writein-input ${bystanderCustomEffect.trim() && !bystanderMovePreset ? 'selected' : ''}`}
                    type="text"
                    maxLength={120}
                    placeholder="reveal the killer's name."
                    value={bystanderCustomEffect}
                    onChange={e => {
                      setBystanderCustomEffect(e.target.value);
                      if (e.target.value.trim()) setBystanderMovePreset(null);
                    }}
                  />
                </div>
              </div>

              <button
                className="lma-submit-btn"
                disabled={submitting || !bystanderValid}
                onClick={handleBystanderSubmit}
              >
                Submit Bystander
              </button>

              {isAddingBystander && (
                <button
                  className="lma-nav-btn lma-nav-btn--back"
                  style={{ marginTop: '0.5rem', width: '100%' }}
                  disabled={submitting}
                  onClick={() => { setSubmitError(null); setIsAddingBystander(false); }}
                >
                  ← Back to your list
                </button>
              )}

              {submitError && <p className="lma-error">{submitError}</p>}
            </>
          )}
        </div>
      )}

      {/* ── Back / Next navigation ── */}
      <div className="lma-nav">
        {step > 0 && (
          <button
            className="lma-nav-btn lma-nav-btn--back"
            disabled={submitting}
            onClick={() => setAudienceStep(step - 1)}
          >
            ← Back
          </button>
        )}
        {step < maxStep && (
          <button
            className="lma-nav-btn lma-nav-btn--next"
            disabled={submitting}
            onClick={() => setAudienceStep(step + 1)}
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}

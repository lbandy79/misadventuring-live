/**
 * StingerPrompt — overlay shown when the GM fires a Stinger at an NPC.
 *
 * Receives the pending Beat and the stingerQueue config from system.json.
 * The audience member fills in the Mad-Lib slots and submits.
 * On submit, respondToBeat() writes the assembled text to Firestore and
 * the component calls onDismiss so the parent can clear the active beat.
 */

import { useState } from 'react';
import type { Beat, BeatResponseSlot } from '../../../src/lib/npcs/npcApi';
import { respondToBeat } from '../../../src/lib/npcs/npcApi';

interface StingerPromptProps {
  beat: Beat;
  onDismiss: () => void;
}

export function StingerPrompt({ beat, onDismiss }: StingerPromptProps) {
  const [slotValues, setSlotValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const slots: BeatResponseSlot[] = beat.responseSlots ?? [];
  const allFilled = slots.every((s) => slotValues[s.id]);

  function assembleText(): string {
    return slots.reduce(
      (text, slot) =>
        text.replace(new RegExp(`\\{${slot.id}\\}`, 'g'), slotValues[slot.id] ?? `_${slot.id}_`),
      beat.responseTemplate,
    );
  }

  async function handleSubmit() {
    if (!allFilled || submitting) return;
    setSubmitting(true);
    try {
      await respondToBeat(beat.id, {
        slotValues,
        assembledText: assembleText(),
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="stinger-overlay" role="dialog" aria-modal="true" aria-label="Stinger prompt">
      <div className="stinger-prompt">
        <p className="stinger-prompt__label">Stinger</p>
        <p className="stinger-prompt__question">{beat.promptText}</p>

        {!submitted ? (
          <>
            <div className="stinger-prompt__slots">
              {slots.map((slot) => (
                <fieldset key={slot.id} className="stinger-slot">
                  <legend className="stinger-slot__legend">
                    <span className="stinger-slot__type">{slot.type}</span>
                  </legend>
                  <div className="stinger-slot__options" role="radiogroup">
                    {slot.options.map((opt) => (
                      <label
                        key={opt}
                        className={[
                          'stinger-slot__option',
                          slotValues[slot.id] === opt ? 'stinger-slot__option--selected' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <input
                          type="radio"
                          name={slot.id}
                          value={opt}
                          checked={slotValues[slot.id] === opt}
                          onChange={() =>
                            setSlotValues((prev) => ({ ...prev, [slot.id]: opt }))
                          }
                          className="stinger-slot__radio"
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>

            <button
              className="stinger-prompt__submit"
              onClick={handleSubmit}
              disabled={!allFilled || submitting}
            >
              {submitting ? 'Sending…' : 'Send it'}
            </button>
          </>
        ) : (
          <div className="stinger-prompt__success">
            <p className="stinger-prompt__success-text">{assembleText()}</p>
            <p className="stinger-prompt__success-sub">Waiting for the GM to approve.</p>
            <button className="stinger-prompt__dismiss" onClick={onDismiss}>
              Got it
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

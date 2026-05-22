/**
 * StingerPrompt — overlay shown when the GM fires a Stinger at an NPC.
 *
 * Slots with freeText: true show a "write your own" input below the radio
 * options. Picking a radio option clears the write-in; typing clears the
 * radio selection. Either counts as filling the slot.
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
  const allFilled = slots.every((s) => (slotValues[s.id] ?? '').trim().length > 0);

  function isWriteIn(slot: BeatResponseSlot): boolean {
    const val = slotValues[slot.id] ?? '';
    return val.length > 0 && !(slot.options ?? []).includes(val);
  }

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

                  {slot.freeText && !(slot.options ?? []).length ? (
                    // Pure free-text slot (no presets)
                    <input
                      type="text"
                      className="stinger-slot__text-input"
                      placeholder={slot.label}
                      value={slotValues[slot.id] ?? ''}
                      maxLength={120}
                      onChange={(e) =>
                        setSlotValues((prev) => ({ ...prev, [slot.id]: e.target.value }))
                      }
                    />
                  ) : (
                    // Radio options, optionally with a write-in at the bottom
                    <>
                      <div className="stinger-slot__options" role="radiogroup">
                        {(slot.options ?? []).map((opt) => (
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

                      {slot.freeText && (
                        <input
                          type="text"
                          className={[
                            'stinger-slot__text-input',
                            isWriteIn(slot) ? 'stinger-slot__text-input--active' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          placeholder="or write your own…"
                          value={isWriteIn(slot) ? slotValues[slot.id] : ''}
                          maxLength={80}
                          onChange={(e) =>
                            setSlotValues((prev) => ({ ...prev, [slot.id]: e.target.value }))
                          }
                        />
                      )}
                    </>
                  )}
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

import { deriveCharacter } from '@mtp/lib';
import { DerivedSummary } from '../DerivedSummary';
import type { StepProps } from './types';

export function ReviewStep({ draft, rules, onChange }: StepProps) {
  const derived = deriveCharacter(draft, rules.loaded);

  return (
    <div className="wizard-step">
      <h2 className="wizard-step-heading">Name and review</h2>
      <label className="wizard-label" htmlFor="sbp-name">Character name</label>
      <input
        id="sbp-name"
        className="wizard-input"
        value={draft.name}
        maxLength={80}
        placeholder="e.g. a name the crew will shout across the deck"
        onChange={(e) => onChange({ ...draft, name: e.target.value })}
        autoComplete="off"
      />
      {derived.issues.map((msg) => <p key={msg} className="wizard-warning">{msg}</p>)}
      {derived.pendingChoices.length > 0 && (
        <p className="wizard-warning">Still to pick: {derived.pendingChoices.map((p) => p.label).join(' · ')}</p>
      )}
      <DerivedSummary d={derived} />
    </div>
  );
}

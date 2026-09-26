import { withChoices } from '@mtp/lib';
import { OptionCard } from '../OptionCard';
import type { StepProps } from './types';

export function SpeciesStep({ draft, rules, onChange }: StepProps) {
  const selected = rules.origins.species.find((s) => s.id === draft.speciesId);

  function pick(id: string) {
    // Size is species-specific, so a new species clears the old size pick.
    const next = withChoices({ ...draft, speciesId: id }, 1, { speciesSize: undefined });
    onChange(next);
  }

  return (
    <div className="wizard-step">
      <h2 className="wizard-step-heading">Who are you?</h2>
      <p className="wizard-step-hint">Species grant traits. Ability increases come from your background.</p>
      <div className="type-grid">
        {rules.origins.species.map((s) => (
          <OptionCard
            key={s.id}
            name={s.name}
            detail={s.flavor}
            selected={s.id === draft.speciesId}
            onSelect={() => pick(s.id)}
            playtest={s.playtest}
            maturity={s.maturity}
          />
        ))}
      </div>
      {selected && (
        <div className="sbp-detail">
          <h3 className="wizard-subheading">{selected.name} traits</h3>
          <ul className="sbp-list">
            {selected.traits.map((t) => (
              <li key={t.id}>
                <strong>{t.name}</strong>
                {t.unlock_level && t.unlock_level > 1 ? <em className="sbp-muted"> (level {t.unlock_level})</em> : null}
                {' — '}{t.text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

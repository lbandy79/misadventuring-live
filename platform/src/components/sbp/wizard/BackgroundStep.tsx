import { withChoices } from '@mtp/lib';
import type { Background } from '@mtp/lib';
import { OptionCard } from '../OptionCard';
import type { StepProps } from './types';

export function describeIncrease(b: Background): string {
  const asi = b.ability_score_increase;
  if (asi?.mode === 'flexible') return `+2/+1 or +1/+1/+1 across ${(asi.options ?? []).join(', ')}`;
  return Object.entries(asi?.values ?? {}).map(([k, v]) => `+${v} ${k}`).join(', ');
}

export function BackgroundStep({ draft, rules, onChange }: StepProps) {
  const selected = rules.origins.backgrounds.find((b) => b.id === draft.backgroundId);
  const feat = selected ? rules.origins.feats.find((f) => f.id === selected.origin_feat) : undefined;

  function pick(id: string) {
    // Tool picks and the flexible increase belong to the old background.
    onChange(withChoices({ ...draft, backgroundId: id }, 1, { backgroundTools: undefined, backgroundAsi: undefined }));
  }

  return (
    <div className="wizard-step">
      <h2 className="wizard-step-heading">Where did you come from?</h2>
      <p className="wizard-step-hint">Your background sets your ability increase, two skills, tools, and an origin feat.</p>
      <div className="type-grid">
        {rules.origins.backgrounds.map((b) => (
          <OptionCard
            key={b.id}
            name={b.name}
            detail={describeIncrease(b)}
            selected={b.id === draft.backgroundId}
            onSelect={() => pick(b.id)}
            playtest={b.playtest}
            maturity={b.maturity}
            note={b.collides_with && b.collides_with === draft.classId ? 'Shares its name with your class.' : undefined}
          />
        ))}
      </div>
      {selected && (
        <div className="sbp-detail">
          {selected.flavor && <p className="sbp-flavor">{selected.flavor}</p>}
          <ul className="sbp-list">
            <li><strong>Skills</strong> — {(selected.skill_proficiencies ?? []).join(', ') || 'none'}</li>
            <li>
              <strong>Tools</strong> — {(selected.tool_proficiencies?.fixed ?? []).join(', ') || 'none'}
              {selected.tool_proficiencies?.choose ? ` (+ choose ${selected.tool_proficiencies.choose})` : ''}
            </li>
            {feat && <li><strong>{feat.name}</strong> — {feat.text}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

import StatPicker from '../components/StatPicker';
import type { AttributeLevel, BladeRunnerAttribute } from '../../../types/bladeRunner.types';
import type { BladeRunnerArchetype } from '../hooks/useCharacterCreation';

interface AttributesStepProps {
  attributes: BladeRunnerAttribute[];
  values: Record<BladeRunnerAttribute['id'], AttributeLevel>;
  onChange: (id: BladeRunnerAttribute['id'], level: AttributeLevel) => void;
  selectedArchetype: BladeRunnerArchetype | null;
  selectedNatureId: 'human' | 'replicant' | null;
  budget: number;
  spent: number;
  health: number;
  resolve: number;
  validation: {
    oneDropMax: boolean;
    replicantRestriction: boolean;
    keyAttributeMeetsMinimum: boolean;
  };
}

const RANK_LABEL: Record<AttributeLevel, string> = {
  D: 'Feeble',
  C: 'Average',
  B: 'Capable',
  A: 'Extraordinary',
};

const RANK_DIE: Record<AttributeLevel, string> = {
  D: 'D6',
  C: 'D8',
  B: 'D10',
  A: 'D12',
};

export default function AttributesStep({
  attributes,
  values,
  onChange,
  selectedArchetype,
  selectedNatureId,
  budget,
  spent,
  health,
  resolve,
  validation,
}: AttributesStepProps) {
  const remaining = budget - spent;
  const overBudget = remaining < 0;
  const isReplicant = selectedNatureId === 'replicant';

  return (
    <section className="br-step">
      <header>
        <h2>Attributes</h2>
        <p>
          Every attribute starts at <strong>C (D8)</strong>. Raise your key attribute to at least <strong>B (D10)</strong>,
          then spend the rest of your points however you like.
        </p>
      </header>

      <div className="br-sub-card br-rank-legend">
        <strong>Ranks</strong>
        <ul>
          <li><span className="br-rank-pill">A</span> D12 — Extraordinary</li>
          <li><span className="br-rank-pill">B</span> D10 — Capable</li>
          <li><span className="br-rank-pill">C</span> D8 — Average <em>(starting rank)</em></li>
          <li><span className="br-rank-pill">D</span> D6 — Feeble</li>
        </ul>
        <p className="br-help">
          Raising from C→B costs 1 point. C→A costs 2. You may drop <em>one</em> attribute from C to D for <strong>+1 extra point</strong>.
          {isReplicant ? ' Replicants get +1 point that must go into Strength or Agility, and may not drop STR or AGL to D.' : ''}
        </p>
      </div>

      <div className="br-budget-row">
        <strong className={overBudget ? 'br-error-text' : ''}>
          Points: {remaining >= 0 ? `${remaining} left` : `${Math.abs(remaining)} over`}{' '}
          <span className="br-help-inline">({spent} of {budget} spent)</span>
        </strong>
        <strong>Health: {health}</strong>
        <strong>Resolve: {resolve}</strong>
      </div>

      <div className="br-list">
        {attributes.map((attribute) => {
          const isKey = selectedArchetype?.keyAttribute === attribute.id;
          const currentLevel = values[attribute.id];
          return (
            <div key={attribute.id} className={`br-list-item ${isKey ? 'key' : ''}`}>
              <div>
                <h3>
                  {attribute.name}
                  {isKey ? <span className="br-inline-badge">Key attribute</span> : null}
                  <span className="br-current-rank">
                    {currentLevel} · {RANK_DIE[currentLevel]} · {RANK_LABEL[currentLevel]}
                  </span>
                </h3>
                <p>{attribute.description}</p>
              </div>
              <StatPicker value={currentLevel} onChange={(level) => onChange(attribute.id, level)} />
            </div>
          );
        })}
      </div>

      <div className="br-validation">
        {overBudget ? <p>You've spent more points than your budget allows. Lower an attribute to continue.</p> : null}
        {!overBudget && remaining > 0 ? <p>You still have {remaining} point{remaining === 1 ? '' : 's'} to spend before you can continue.</p> : null}
        {!validation.oneDropMax ? <p>Only one attribute can be dropped to D.</p> : null}
        {isReplicant && !validation.replicantRestriction ? (
          <p>Replicants must keep Strength and Agility at C or higher, and put their bonus point into STR or AGL.</p>
        ) : null}
        {!validation.keyAttributeMeetsMinimum ? (
          <p>Your key attribute ({selectedArchetype?.name ? `for ${selectedArchetype.name}` : ''}) must be rank B (D10) or higher.</p>
        ) : null}
      </div>
    </section>
  );
}


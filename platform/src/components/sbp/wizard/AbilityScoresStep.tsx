import { useMemo } from 'react';
import {
  ABILITY_KEYS,
  abilityModifier,
  abilityScoreConfigFrom,
  formatModifier,
  pointBuyCost,
  validateBaseScores,
  type AbilityKey,
  type AbilityScoreMethod,
  type AbilityScores,
} from '@mtp/lib';
import type { StepProps } from './types';

const METHODS: Array<{ id: AbilityScoreMethod; label: string; hint: string }> = [
  { id: 'standard_array', label: 'Standard array', hint: 'Fastest. Good for playtest builds.' },
  { id: 'point_buy', label: 'Point buy', hint: 'Spend a budget across the six scores.' },
  { id: 'rolled', label: 'Rolled', hint: 'Roll at the table, type the results.' },
];

const ABILITY_NAMES: Record<AbilityKey, string> = {
  STR: 'Strength', DEX: 'Dexterity', CON: 'Constitution', INT: 'Intelligence', WIS: 'Wisdom', CHA: 'Charisma',
};

export function defaultScores(method: AbilityScoreMethod, standardArray: number[]): AbilityScores {
  const fill = (n: number) => Object.fromEntries(ABILITY_KEYS.map((k) => [k, n])) as AbilityScores;
  if (method === 'standard_array') {
    return Object.fromEntries(ABILITY_KEYS.map((k, i) => [k, standardArray[i] ?? 10])) as AbilityScores;
  }
  return method === 'point_buy' ? fill(8) : fill(10);
}

export function AbilityScoresStep({ draft, rules, onChange }: StepProps) {
  const config = useMemo(() => abilityScoreConfigFrom(rules.origins), [rules.origins]);
  const { method, base } = draft.abilityScores;
  const klass = rules.classes.classes.find((k) => k.id === draft.classId);
  const background = rules.origins.backgrounds.find((b) => b.id === draft.backgroundId);
  const bgIncrease = background?.ability_score_increase.mode === 'fixed' ? background.ability_score_increase.values ?? {} : {};
  const issues = validateBaseScores(method, base, config);

  const set = (next: Partial<typeof draft.abilityScores>) =>
    onChange({ ...draft, abilityScores: { ...draft.abilityScores, ...next } });

  function setMethod(m: AbilityScoreMethod) {
    if (m === method) return;
    set({ method: m, base: defaultScores(m, config.standardArray) });
  }

  const setScore = (k: AbilityKey, v: number) => set({ base: { ...base, [k]: v } });

  const pbCosts = Object.keys(config.pointBuy.costs).map(Number).sort((a, b) => a - b);
  const spent = method === 'point_buy' ? pointBuyCost(base, config) : null;

  return (
    <div className="wizard-step">
      <h2 className="wizard-step-heading">Ability scores</h2>
      <p className="wizard-step-hint">
        Base scores only — your background adds {Object.entries(bgIncrease).map(([k, v]) => `+${v} ${k}`).join(', ') || 'its increase'} on top.
        {klass?.primary_ability ? ` ${klass.name} leans on ${Array.isArray(klass.primary_ability) ? klass.primary_ability.join('/') : klass.primary_ability}.` : ''}
      </p>

      <div className="sbp-methods" role="radiogroup" aria-label="Ability score method">
        {METHODS.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={method === m.id}
            className={`type-card sbp-method ${method === m.id ? 'type-card--selected' : ''}`}
            onClick={() => setMethod(m.id)}
          >
            <span className="type-card-id">{m.label}</span>
            <span className="type-card-motivation">{m.hint}</span>
          </button>
        ))}
      </div>

      {method === 'point_buy' && (
        <p className="wizard-derived-notice">
          {spent === null ? 'Scores out of range' : `${spent} / ${config.pointBuy.budget} points spent`}
        </p>
      )}
      {method === 'standard_array' && (
        <p className="wizard-derived-notice">Assign {config.standardArray.join(', ')} — each once.</p>
      )}

      <div className="sbp-abilities">
        {ABILITY_KEYS.map((k) => {
          const v = base[k];
          const final = v + (bgIncrease[k] ?? 0);
          return (
            <div key={k} className="sbp-ability">
              <label className="sbp-ability__key" htmlFor={`ab-${k}`}>{k}<span className="sbp-ability__name">{ABILITY_NAMES[k]}</span></label>
              {method === 'standard_array' && (
                <select id={`ab-${k}`} className="wizard-input sbp-ability__input" value={v} onChange={(e) => setScore(k, Number(e.target.value))}>
                  {[...new Set(config.standardArray)].sort((a, b) => b - a).map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              )}
              {method === 'point_buy' && (
                <div className="stepper-row sbp-ability__stepper">
                  <button type="button" className="stepper-btn" onClick={() => setScore(k, v - 1)} disabled={v <= pbCosts[0]} aria-label={`Lower ${k}`}>−</button>
                  <span className="stepper-value">{v}</span>
                  <button type="button" className="stepper-btn" onClick={() => setScore(k, v + 1)} disabled={v >= pbCosts[pbCosts.length - 1]} aria-label={`Raise ${k}`}>+</button>
                </div>
              )}
              {method === 'rolled' && (
                <input
                  id={`ab-${k}`}
                  type="number"
                  className="wizard-input sbp-ability__input"
                  min={config.rolled.min}
                  max={config.rolled.max}
                  value={v}
                  onChange={(e) => setScore(k, Number(e.target.value))}
                />
              )}
              <span className="sbp-ability__final" title="After background increase">
                {final} <small>({formatModifier(abilityModifier(final))})</small>
              </span>
            </div>
          );
        })}
      </div>

      {issues.map((msg) => <p key={msg} className="wizard-warning">{msg}</p>)}
    </div>
  );
}

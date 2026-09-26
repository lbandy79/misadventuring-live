/**
 * Level-1 picks the rules ask for: class skills, species size, background
 * tool choice, flexible background increase. Which controls appear comes
 * from the data, so a background switching to `mode: "flexible"` shows up
 * here without a code change.
 */

import { ABILITY_KEYS, deriveCharacter, withChoices, type AbilityKey } from '@mtp/lib';
import type { StepProps } from './types';

function toggle(list: string[], item: string, max: number): string[] {
  if (list.includes(item)) return list.filter((x) => x !== item);
  return list.length >= max ? list : [...list, item];
}

export function ChoicesStep({ draft, rules, onChange }: StepProps) {
  const klass = rules.classes.classes.find((k) => k.id === draft.classId);
  const species = rules.origins.species.find((s) => s.id === draft.speciesId);
  const background = rules.origins.backgrounds.find((b) => b.id === draft.backgroundId);
  const c1 = draft.choices['1'] ?? {};
  const derived = deriveCharacter(draft, rules.loaded);
  const pendingHere = derived.pendingChoices.filter((p) => p.level === 1);

  const skillRule = klass?.proficiencies?.skills as { choose?: number; from?: string[] } | undefined;
  const sizeOptions = species && typeof species.size !== 'string' ? species.size?.choose_one : undefined;
  const toolRule = background?.tool_proficiencies;
  const flexAsi = background?.ability_score_increase.mode === 'flexible' ? background.ability_score_increase : null;

  const bgSkills = background?.skill_proficiencies ?? [];
  const asi = c1.backgroundAsi ?? {};
  const asiTotal = Object.values(asi).reduce((a, b) => a + (b ?? 0), 0);

  function cycleAsi(k: AbilityKey) {
    // 0 → 1 → 2 → 0, keeping the total at or under 3.
    const cur = asi[k] ?? 0;
    const next = cur >= 2 ? 0 : cur + 1;
    const total = asiTotal - cur + next;
    const patch = { ...asi, [k]: next || undefined };
    if (total <= 3) onChange(withChoices(draft, 1, { backgroundAsi: patch }));
  }

  const nothingToChoose = !skillRule?.choose && !sizeOptions && !toolRule?.choose && !flexAsi;

  return (
    <div className="wizard-step">
      <h2 className="wizard-step-heading">Finishing touches</h2>
      <p className="wizard-step-hint">
        {nothingToChoose ? 'Nothing else to pick at level 1 for this combination.' : 'The last few picks your species, background and class ask for.'}
      </p>

      {skillRule?.choose && skillRule.from && (
        <fieldset className="sbp-fieldset">
          <legend className="wizard-label">{klass?.name} skills <span className="wizard-label-hint">— choose {skillRule.choose}</span></legend>
          <div className="tag-grid">
            {skillRule.from.map((s) => {
              const fromBg = bgSkills.includes(s);
              const on = (c1.classSkills ?? []).includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  className={`tag-pill ${on ? 'tag-pill--selected' : ''}`}
                  aria-pressed={on}
                  title={fromBg ? 'Already granted by your background' : undefined}
                  onClick={() => onChange(withChoices(draft, 1, { classSkills: toggle(c1.classSkills ?? [], s, skillRule.choose!) }))}
                >
                  {s}{fromBg ? ' ·bg' : ''}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {sizeOptions && (
        <fieldset className="sbp-fieldset">
          <legend className="wizard-label">Size</legend>
          <div className="tag-grid">
            {sizeOptions.map((s) => (
              <button
                key={s}
                type="button"
                className={`tag-pill ${c1.speciesSize === s ? 'tag-pill--selected' : ''}`}
                aria-pressed={c1.speciesSize === s}
                onClick={() => onChange(withChoices(draft, 1, { speciesSize: s }))}
              >
                {s}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {toolRule?.choose && (
        <fieldset className="sbp-fieldset">
          <legend className="wizard-label">Tools <span className="wizard-label-hint">— choose {toolRule.choose}</span></legend>
          <div className="tag-grid">
            {(toolRule.from ?? []).map((t) => {
              const on = (c1.backgroundTools ?? []).includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  className={`tag-pill ${on ? 'tag-pill--selected' : ''}`}
                  aria-pressed={on}
                  onClick={() => onChange(withChoices(draft, 1, { backgroundTools: toggle(c1.backgroundTools ?? [], t, toolRule.choose!) }))}
                >
                  {t.replace(/_/g, ' ')}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {flexAsi && (
        <fieldset className="sbp-fieldset">
          <legend className="wizard-label">Background increase <span className="wizard-label-hint">— +2/+1 or +1/+1/+1 ({asiTotal}/3)</span></legend>
          <div className="tag-grid">
            {ABILITY_KEYS.filter((k) => (flexAsi.options ?? []).includes(k)).map((k) => (
              <button
                key={k}
                type="button"
                className={`tag-pill ${asi[k] ? 'tag-pill--selected' : ''}`}
                onClick={() => cycleAsi(k)}
              >
                {k}{asi[k] ? ` +${asi[k]}` : ''}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {pendingHere.length > 0 && (
        <p className="wizard-derived-notice">Still to pick: {pendingHere.map((p) => p.label).join(' · ')}</p>
      )}
      {derived.issues.map((msg) => <p key={msg} className="wizard-warning">{msg}</p>)}
    </div>
  );
}

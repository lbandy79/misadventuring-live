/**
 * Pickers for the choices the rules ask a character to make. Shared by the
 * level-1 wizard and the sheet's level-by-level panel so both look and
 * behave the same.
 */

import {
  ABILITY_KEYS,
  type AbilityKey,
  type ArchetypeOption,
  type AsiChoice,
  type Feat,
  type FeatChoice,
  type GrantChoiceRequest,
} from '@mtp/lib';
import { OptionCard } from './OptionCard';

export function toggleIn(list: string[], item: string, max: number): string[] {
  if (list.includes(item)) return list.filter((x) => x !== item);
  return list.length >= max ? list : [...list, item];
}

// ─── Grant-driven picks (skills, expertise, extra origin feat) ───────────────

export function GrantPickPicker({ request, feats, knownSkills, onChange }: {
  request: GrantChoiceRequest;
  feats: Feat[];
  /** Skills the character has from elsewhere, to warn about doubling up. */
  knownSkills: string[];
  onChange: (picks: string[]) => void;
}) {
  const g = request;
  const noun = g.kind === 'grant_skills' ? 'skill' : g.kind === 'grant_expertise' ? 'skill to double' : 'origin feat';
  const known = new Set(knownSkills.filter((s) => !g.chosen.includes(s)));

  return (
    <fieldset className="sbp-fieldset">
      <legend className="wizard-label">
        {g.sourceName} <span className="wizard-label-hint">— choose {g.choose} {g.choose === 1 ? noun : noun.replace(/^skill/, 'skills').replace(/feat$/, 'feats')}</span>
      </legend>
      {g.options.length === 0 && <p className="sbp-muted">Nothing to choose from yet.</p>}
      {g.kind === 'grant_origin_feat' ? (
        <div className="type-grid">
          {g.options.map((id) => {
            const f = feats.find((x) => x.id === id);
            const on = g.chosen.includes(id);
            return (
              <OptionCard
                key={id}
                name={`${on ? '✓ ' : ''}${f?.name ?? id}`}
                detail={f?.text}
                selected={on}
                onSelect={() => onChange(g.choose === 1 ? [id] : toggleIn(g.chosen, id, g.choose))}
                playtest={f?.playtest}
                maturity={f?.maturity}
              />
            );
          })}
        </div>
      ) : (
        <div className="tag-grid">
          {g.options.map((s) => {
            const on = g.chosen.includes(s);
            const dup = g.kind === 'grant_skills' && known.has(s);
            return (
              <button
                key={s}
                type="button"
                className={`tag-pill ${on ? 'tag-pill--active' : ''}`}
                aria-pressed={on}
                title={dup ? 'You already have this skill' : undefined}
                onClick={() => onChange(toggleIn(g.chosen, s, g.choose))}
              >
                {s}{dup ? ' ·have' : ''}
              </button>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}

// ─── Ability score increase or feat ──────────────────────────────────────────

export function AsiOrFeatPicker({ level, choice, feats, onChange }: {
  level: number;
  choice: AsiChoice | FeatChoice | undefined;
  /** Feats this character may take here (prerequisites and repeats already filtered). */
  feats: Feat[];
  onChange: (next: AsiChoice | FeatChoice | undefined) => void;
}) {
  const mode = choice?.type ?? null;
  const increases = choice?.type === 'asi' ? choice.increases : {};
  const total = Object.values(increases).reduce((a, b) => a + (b ?? 0), 0);

  function cycle(k: AbilityKey) {
    // 0 → 1 → 2 → 0, keeping the total at or under 2.
    const cur = increases[k] ?? 0;
    const next = cur >= 2 ? 0 : cur + 1;
    if (total - cur + next > 2) return;
    const merged: Partial<Record<AbilityKey, number>> = { ...increases };
    if (next) merged[k] = next; else delete merged[k];
    onChange({ type: 'asi', increases: merged });
  }

  return (
    <fieldset className="sbp-fieldset">
      <legend className="wizard-label">Level {level} <span className="wizard-label-hint">— ability score increase or feat</span></legend>
      <div className="tag-grid">
        <button type="button" className={`tag-pill ${mode === 'asi' ? 'tag-pill--active' : ''}`} aria-pressed={mode === 'asi'} onClick={() => onChange({ type: 'asi', increases: {} })}>
          Ability increase
        </button>
        <button type="button" className={`tag-pill ${mode === 'feat' ? 'tag-pill--active' : ''}`} aria-pressed={mode === 'feat'} onClick={() => onChange({ type: 'feat', featId: '' })}>
          Feat
        </button>
      </div>
      {mode === 'asi' && (
        <>
          <p className="sbp-muted">+2 to one ability, or +1 to two. ({total}/2)</p>
          <div className="tag-grid">
            {ABILITY_KEYS.map((k) => (
              <button key={k} type="button" className={`tag-pill ${increases[k] ? 'tag-pill--active' : ''}`} onClick={() => cycle(k)}>
                {k}{increases[k] ? ` +${increases[k]}` : ''}
              </button>
            ))}
          </div>
        </>
      )}
      {mode === 'feat' && (
        <div className="type-grid">
          {feats.length === 0 && <p className="sbp-muted">No feats available for this character.</p>}
          {feats.map((f) => {
            const on = choice?.type === 'feat' && choice.featId === f.id;
            return (
              <OptionCard
                key={f.id}
                name={`${on ? '✓ ' : ''}${f.name}`}
                detail={f.text}
                selected={on}
                onSelect={() => onChange({ type: 'feat', featId: f.id })}
                playtest={f.playtest}
                maturity={f.maturity}
                note={f.category === 'species' ? 'Species feat' : undefined}
              />
            );
          })}
        </div>
      )}
    </fieldset>
  );
}

// ─── Archetype ────────────────────────────────────────────────────────────────

export function ArchetypePicker({ label, options, chosenId, onChange }: {
  label: string;
  options: ArchetypeOption[];
  chosenId: string | undefined;
  onChange: (id: string) => void;
}) {
  return (
    <fieldset className="sbp-fieldset">
      <legend className="wizard-label">Choose your {label}</legend>
      <div className="type-grid">
        {options.map((o) => (
          <OptionCard
            key={o.id}
            name={o.name}
            detail={[o.theme, o.lineage].filter((x) => typeof x === 'string').join(' · ')}
            selected={o.id === chosenId}
            onSelect={() => onChange(o.id)}
            playtest={o.playtest}
            maturity={o.maturity}
          />
        ))}
      </div>
    </fieldset>
  );
}

/** Feats a character may take at an ASI level: prerequisites met, not already held unless repeatable. */
export function eligibleFeats(feats: Feat[], speciesId: string, takenIds: string[], keepId?: string): Feat[] {
  return feats.filter((f) => {
    const need = f.prerequisite?.species;
    if (need && need !== speciesId) return false;
    if (f.id === keepId) return true;
    return f.repeatable || !takenIds.includes(f.id);
  });
}

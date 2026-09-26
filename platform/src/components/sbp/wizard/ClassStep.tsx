import { withChoices } from '@mtp/lib';
import type { SbpClass } from '@mtp/lib';
import { OptionCard } from '../OptionCard';
import type { StepProps } from './types';

const primary = (k: SbpClass) => (Array.isArray(k.primary_ability) ? k.primary_ability.join(' / ') : k.primary_ability);

export function ClassStep({ draft, rules, onChange }: StepProps) {
  const klass = rules.classes.classes.find((k) => k.id === draft.classId);
  const background = rules.origins.backgrounds.find((b) => b.id === draft.backgroundId);
  const arch = klass?.archetype;
  const group = arch ? rules.classes.archetypes[arch.choices_ref.replace(/^archetypes\./, '')] : undefined;
  const asksArchetypeNow = !!arch && arch.entry_level === 1 && !!group;
  const chosenArchetype = arch ? draft.choices[String(arch.entry_level)]?.archetypeId : undefined;
  const level1 = klass?.levels.find((L) => L.level === 1) ?? klass?.levels[0];

  function pickClass(id: string) {
    const prevArch = klass?.archetype?.entry_level;
    let next = { ...draft, classId: id };
    // Skills and archetype are class-specific.
    next = withChoices(next, 1, { classSkills: undefined });
    if (prevArch) next = withChoices(next, prevArch, { archetypeId: undefined });
    onChange(next);
  }

  function pickArchetype(id: string) {
    if (!arch) return;
    onChange(withChoices(draft, arch.entry_level, { archetypeId: id }));
  }

  return (
    <div className="wizard-step">
      <h2 className="wizard-step-heading">What do you do?</h2>
      <p className="wizard-step-hint">Pick a class. Some classes choose their specialty right away; others decide at a later level.</p>
      <div className="type-grid">
        {rules.classes.classes.map((k) => (
          <OptionCard
            key={k.id}
            name={k.name}
            detail={`${String(k.hit_die)} hit die · ${primary(k) ?? '—'}`}
            selected={k.id === draft.classId}
            onSelect={() => pickClass(k.id)}
            playtest={k.playtest}
            maturity={k.maturity}
            note={background?.collides_with === k.id ? 'Shares its name with your background.' : undefined}
          />
        ))}
      </div>

      {klass && (
        <div className="sbp-detail">
          {klass.flavor && <p className="sbp-flavor">{klass.flavor}</p>}
          <ul className="sbp-list">
            <li><strong>Saving throws</strong> — {(klass.saving_throws ?? []).join(', ')}</li>
            {klass.spellcasting && (
              <li><strong>Spellcasting</strong> — {klass.spellcasting.ability}; spell list not loaded yet</li>
            )}
            {arch && (
              <li>
                <strong>{arch.label}</strong> — chosen at level {arch.entry_level}
                {arch.first_feature_level !== arch.entry_level ? `, first feature at level ${arch.first_feature_level}` : ''}
              </li>
            )}
          </ul>
          <h3 className="wizard-subheading">Level 1 features</h3>
          <ul className="sbp-list">
            {(level1?.features ?? []).map((fid) => {
              const f = klass.features[fid];
              return f ? <li key={fid}><strong>{f.name}</strong> — {f.text}</li> : null;
            })}
          </ul>
        </div>
      )}

      {asksArchetypeNow && (
        <>
          <h3 className="wizard-subheading">Choose your {arch!.label}</h3>
          <div className="type-grid">
            {group!.options.map((o) => (
              <OptionCard
                key={o.id}
                name={o.name}
                detail={[o.theme, o.lineage].filter(Boolean).join(' · ') as string}
                selected={o.id === chosenArchetype}
                onSelect={() => pickArchetype(o.id)}
                playtest={o.playtest}
                maturity={o.maturity}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

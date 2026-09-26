/**
 * Read-only rendering of a derived character. Used by the wizard's review
 * step and (phase 4) the sheet.
 */

import { ABILITY_KEYS, formatModifier, type DerivedCharacter } from '@mtp/lib';
import { ContentFlagBadges } from './ContentFlags';

export function DerivedSummary({ d, compact = false }: { d: DerivedCharacter; compact?: boolean }) {
  return (
    <div className="sbp-summary">
      <p className="sbp-summary__line">
        Level {d.level} {d.species?.name} {d.class?.name}
        {d.archetype ? ` (${d.archetype.name})` : ''} · {d.background?.name}
        {d.size ? ` · ${d.size}` : ''}
      </p>

      <div className="sbp-stat-row">
        <Stat label="HP" value={d.hitPoints.max} title={d.hitPoints.note} />
        <Stat label="Prof." value={formatModifier(d.proficiencyBonus)} />
        <Stat label="Speed" value={Object.entries(d.speed).map(([m, v]) => `${v}${m === 'walk' ? '' : ` ${m}`}`).join(' / ')} />
        {d.spellcasting && <Stat label="Spell DC" value={d.spellcasting.saveDC} />}
        {d.spellcasting && <Stat label="Spell atk" value={formatModifier(d.spellcasting.attackBonus)} />}
      </div>

      <div className="sbp-abilities sbp-abilities--summary">
        {ABILITY_KEYS.map((k) => {
          const a = d.abilities[k];
          return (
            <div key={k} className="sbp-ability sbp-ability--summary">
              <span className="sbp-ability__key">{k}{d.savingThrows.includes(k) && <span className="sbp-ability__save" title="Saving throw proficiency">●</span>}</span>
              <span className="sbp-ability__score">{a.score}</span>
              <span className="sbp-ability__mod">{formatModifier(a.modifier)}</span>
            </div>
          );
        })}
      </div>

      <dl className="sbp-proficiencies">
        <dt>Skills</dt><dd>{d.skills.join(', ') || '—'}</dd>
        <dt>Tools</dt><dd>{d.tools.map((t) => t.replace(/_/g, ' ')).join(', ') || '—'}</dd>
        <dt>Armor</dt><dd>{d.armor.join(', ') || '—'}</dd>
        <dt>Weapons</dt><dd>{d.weapons.join(', ') || '—'}</dd>
      </dl>

      {d.spellcasting && (
        <p className="sbp-spells">
          <strong>Spellcasting ({d.spellcasting.ability})</strong> — slots {d.spellcasting.slots.filter((n) => n > 0).map((n, i) => `${n}×L${i + 1}`).join(', ') || 'none'}
          {d.spellcasting.cantripsKnown != null ? ` · ${d.spellcasting.cantripsKnown} cantrips` : ''}
          {d.spellcasting.spellsKnown != null ? ` · ${d.spellcasting.spellsKnown} spells ${d.spellcasting.preparesOrKnows ?? 'known'}` : ''}
          <em className="sbp-muted"> · spell list not loaded yet</em>
        </p>
      )}

      {Object.keys(d.levelExtras).length > 0 && (
        <p className="sbp-extras">
          {Object.entries(d.levelExtras).map(([k, v]) => <span key={k}><strong>{k.replace(/_/g, ' ')}</strong> {String(v)} </span>)}
        </p>
      )}

      {!compact && (
        <>
          <h3 className="wizard-subheading">Features</h3>
          <ul className="sbp-features">
            {d.features.map((f) => (
              <li key={f.id} className="sbp-feature">
                <div className="sbp-feature__head">
                  <strong>{f.name}</strong>
                  <span className="sbp-feature__meta">
                    {f.source}{f.level > 1 ? ` · L${f.level}` : ''}
                    {f.uses ? ` · ${f.uses.count ?? '?'}/${f.uses.recharge.replace(/_/g, ' ')}` : ''}
                    {f.formula ? ` · ${f.formula} = ${f.formulaValue ?? '?'}` : ''}
                  </span>
                  <ContentFlagBadges playtest={f.flags.playtest} maturity={f.flags.maturity} />
                </div>
                <p className="sbp-feature__text">{f.text}</p>
              </li>
            ))}
          </ul>
          {d.otherGrants.length > 0 && (
            <ul className="sbp-list sbp-muted">
              {d.otherGrants.map((g, i) => (
                <li key={i}><strong>{g.source}</strong>: {g.key.replace(/_/g, ' ')} — {JSON.stringify(g.value)}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, title }: { label: string; value: string | number; title?: string }) {
  return (
    <div className="sbp-stat" title={title}>
      <span className="sbp-stat__label">{label}</span>
      <span className="sbp-stat__value">{value}</span>
    </div>
  );
}

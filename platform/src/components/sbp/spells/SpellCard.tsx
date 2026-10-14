/**
 * One spell, the way a player reads it: reskin name and flavor for their
 * list, the stat lines, the rules text, and playtest flags on signature
 * spells. Damage typed `strain` shows the character's resolved type.
 */

import {
  formatCastingTime,
  formatComponents,
  formatDuration,
  formatRange,
  reskinFor,
  resolveDamageType,
  spellLevelLabel,
  type SbpSpell,
} from '@mtp/lib';
import { ContentFlagBadges } from '../ContentFlags';
import type { SpellLookup } from './useSpellLookup';

export function spellName(spell: SbpSpell, lookup: SpellLookup): string {
  return reskinFor(spell.id, lookup.listId, lookup.spellsFile)?.name ?? spell.name;
}

export function SpellCard({ spell, lookup }: { spell: SbpSpell; lookup: SpellLookup }) {
  const reskin = reskinFor(spell.id, lookup.listId, lookup.spellsFile);
  const signature = spell.source === 'sbp';
  const strain = spell.damage.filter((d) => d.type === 'strain');

  return (
    <div className="sbp-detail sbp-spell-card">
      <div className="sbp-feature__head">
        <strong>{reskin?.name ?? spell.name}</strong>
        <span className="sbp-feature__meta">
          {spellLevelLabel(spell)}
          {spell.ritual ? ' · ritual' : ''}
          {reskin ? ` · reskin of ${spell.name}` : ''}
        </span>
        {signature && <ContentFlagBadges playtest={spell.playtest} maturity={spell.maturity} />}
      </div>

      {(reskin?.flavor ?? spell.flavor) && <p className="sbp-flavor">{reskin?.flavor ?? spell.flavor}</p>}

      <dl className="sbp-proficiencies">
        <dt>Casting</dt><dd>{formatCastingTime(spell)}</dd>
        <dt>Range</dt><dd>{formatRange(spell)}</dd>
        <dt>Components</dt><dd>{formatComponents(spell)}</dd>
        <dt>Duration</dt><dd>{formatDuration(spell)}</dd>
        {strain.length > 0 && (
          <>
            <dt>Strain</dt>
            <dd>
              {strain.map((d) => `${d.dice} ${resolveDamageType(d, lookup.strainType)}`).join(', ')}
              {!lookup.strainType && <span className="sbp-muted"> (no Strain: fallback type)</span>}
            </dd>
          </>
        )}
      </dl>

      {spell.text.split(/\n\n+/).map((para, i) => <p key={i} className="sbp-feature__text">{para}</p>)}
      {spell.higher_levels && (
        <p className="sbp-feature__text"><strong>Using a higher-level spell slot.</strong> {spell.higher_levels}</p>
      )}
      {spell.cantrip_upgrade && (
        <p className="sbp-feature__text"><strong>Cantrip upgrade.</strong> {spell.cantrip_upgrade}</p>
      )}
      {reskin?.mechanical_changes && reskin.mechanical_changes.length > 0 && (
        <>
          <p className="sbp-feature__text"><strong>Changes for your list:</strong></p>
          <ul className="sbp-list">
            {reskin.mechanical_changes.map((m) => <li key={m}>{m}</li>)}
          </ul>
        </>
      )}
    </div>
  );
}

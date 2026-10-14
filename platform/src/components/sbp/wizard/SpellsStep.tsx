/**
 * Level-1 spells: cantrips, known spells or spellbook pages, and (for a
 * level-1 character that prepares) today's preparation. Higher-level picks
 * live on the sheet, like every other level-gated choice.
 */

import { deriveCharacter } from '@mtp/lib';
import { SpellPicker } from '../spells/SpellPicker';
import { applySpellPick } from '../spells/applySpellPick';
import { useSpellLookup } from '../spells/useSpellLookup';
import type { StepProps } from './types';

export function SpellsStep({ draft, rules, onChange }: StepProps) {
  const derived = deriveCharacter(draft, rules.loaded);
  const sc = derived.spellcasting;
  const lookup = useSpellLookup(rules.loaded, sc?.spellListId, sc?.strainDamageType);
  const requests = (sc?.requests ?? []).filter((r) => r.level === 1 && r.kind !== 'journal_extra');

  return (
    <div className="wizard-step">
      <h2 className="wizard-step-heading">Spells</h2>
      {!sc ? (
        <p className="join-subtitle">This class doesn't cast spells.</p>
      ) : !sc.listLoaded ? (
        <p className="join-subtitle">The spell lists aren't uploaded yet, so spells can be picked later on the sheet.</p>
      ) : (
        <>
          <p className="join-subtitle">
            {sc.spellbook
              ? 'Write your first spells into your spellbook, then choose which to prepare. Tap a spell to read it.'
              : sc.preparesOrKnows === 'prepares'
                ? 'Pick your cantrips and the spells you have prepared today. You can change prepared spells any time on the sheet.'
                : 'Pick the cantrips and spells your character knows. Tap a spell to read it.'}
          </p>
          {derived.spellcasting?.requests.length === 0 && <p className="sbp-muted">Nothing to pick at level 1.</p>}
          {sc.issues.map((msg) => <p key={msg} className="wizard-warning">{msg}</p>)}
          {requests.map((r) => (
            <SpellPicker
              key={`${r.kind}@${r.level}`}
              request={r}
              lookup={lookup}
              onChange={(ids) => onChange(applySpellPick(draft, r, ids))}
            />
          ))}
          {draft.level > 1 && sc.preparesOrKnows === 'prepares' && (
            <p className="sbp-muted">Prepared spells for a level {draft.level} character are set on the sheet.</p>
          )}
        </>
      )}
    </div>
  );
}

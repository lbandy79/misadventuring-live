/**
 * The character's spells as a reader sees them: cantrips, known spells or
 * the spellbook, today's prepared spells, and anything granted outright.
 * Each name opens its spell card.
 */

import type { DerivedCharacter } from '@mtp/lib';
import { SpellCard, spellName } from './SpellCard';
import type { SpellLookup } from './useSpellLookup';

export function SpellBook({ d, lookup }: { d: DerivedCharacter; lookup: SpellLookup }) {
  const sc = d.spellcasting;
  const granted = d.grantedSpells.map((g) => g.id);
  const groups: Array<{ title: string; ids: string[] }> = [];
  if (sc?.listLoaded) {
    groups.push({ title: 'Cantrips', ids: sc.cantrips });
    if (sc.spellbook) {
      groups.push({ title: 'Prepared today', ids: sc.prepared });
      groups.push({ title: 'Spellbook', ids: sc.spellbookSpells });
    } else if (sc.preparesOrKnows === 'prepares') {
      groups.push({ title: 'Prepared today', ids: sc.prepared });
    } else {
      groups.push({ title: 'Spells known', ids: sc.known });
    }
  }
  if (granted.length > 0) groups.push({ title: 'Always known', ids: granted });
  if (groups.length === 0 || lookup.index.size === 0) return null;

  return (
    <section className="sbp-spellbook">
      <h3 className="wizard-subheading">Spells</h3>
      {groups.map((g) => (
        <div key={g.title} className="sbp-spellbook__group">
          <h4 className="sbp-spellbook__title">{g.title} <span className="sbp-muted">({g.ids.length})</span></h4>
          {g.ids.length === 0 ? (
            <p className="sbp-muted">None picked yet.</p>
          ) : (
            <ul className="sbp-spell-list">
              {sortByLevel(g.ids, lookup).map((id) => {
                const spell = lookup.index.get(id);
                if (!spell) return <li key={id} className="sbp-muted">{id} (not in the spell files)</li>;
                return (
                  <li key={id} className="sbp-spell-row">
                    <details>
                      <summary>
                        <strong>{spellName(spell, lookup)}</strong>
                        <span className="sbp-feature__meta">{spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`}</span>
                        <span className="sbp-spell-row__read">read</span>
                      </summary>
                      <SpellCard spell={spell} lookup={lookup} />
                    </details>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ))}
    </section>
  );
}

function sortByLevel(ids: string[], lookup: SpellLookup): string[] {
  return [...ids].sort((a, b) => {
    const sa = lookup.index.get(a);
    const sb = lookup.index.get(b);
    return (sa?.level ?? 99) - (sb?.level ?? 99) || (sa?.name ?? a).localeCompare(sb?.name ?? b);
  });
}

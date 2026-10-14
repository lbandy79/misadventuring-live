/**
 * Pick spells for one SpellPickRequest (cantrips, known spells, spellbook
 * pages, copied spells or today's preparation). Long lists get a search box
 * and a spell-level filter; every spell can be opened to read its card.
 */

import { useMemo, useState } from 'react';
import type { SpellPickRequest } from '@mtp/lib';
import { toggleIn } from '../pickers';
import { SpellCard, spellName } from './SpellCard';
import type { SpellLookup } from './useSpellLookup';

const LEVEL_LABEL = (n: number) => (n === 0 ? 'Cantrip' : `Level ${n}`);
const SEARCH_THRESHOLD = 12;

export function SpellPicker({ request, lookup, onChange }: {
  request: SpellPickRequest;
  lookup: SpellLookup;
  onChange: (ids: string[]) => void;
}) {
  const r = request;
  const [query, setQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<number | null>(null);
  const max = r.choose ?? Infinity;
  const full = r.chosen.length >= max;

  const rows = useMemo(() => {
    const all = Array.from(new Set([...r.chosen, ...r.options]))
      .map((id) => lookup.index.get(id))
      .filter((s): s is NonNullable<typeof s> => !!s)
      .map((s) => ({ spell: s, name: spellName(s, lookup) }));
    return all.sort((a, b) => a.spell.level - b.spell.level || a.name.localeCompare(b.name));
  }, [r.chosen, r.options, lookup]);

  const levels = Array.from(new Set(rows.map((x) => x.spell.level))).sort((a, b) => a - b);
  const q = query.trim().toLowerCase();
  const shown = rows.filter((x) =>
    (levelFilter === null || x.spell.level === levelFilter)
    && (!q || x.name.toLowerCase().includes(q) || x.spell.name.toLowerCase().includes(q)
      || x.spell.tags.some((t) => t.includes(q))));

  const countText = r.choose === null
    ? `${r.chosen.length} added`
    : `${r.chosen.length} of ${r.choose}`;
  const upTo = r.kind === 'cantrips' ? '' : ` · up to level ${r.maxSpellLevel}`;

  return (
    <fieldset className="sbp-fieldset sbp-spell-picker">
      <legend className="wizard-label">
        {r.label} <span className="wizard-label-hint">— {countText}{upTo}</span>
      </legend>
      {r.kind === 'journal_extra' && (
        <p className="sbp-muted">Spells you found and copied in (2 hours and 50 bits per spell level, unless a feature waives it).</p>
      )}

      {r.chosen.length > 0 && (
        <div className="tag-grid">
          {r.chosen.map((id) => {
            const s = lookup.index.get(id);
            return (
              <button key={id} type="button" className="tag-pill tag-pill--active" aria-pressed onClick={() => onChange(r.chosen.filter((x) => x !== id))} title="Remove">
                {s ? spellName(s, lookup) : id} ×
              </button>
            );
          })}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="sbp-muted">Nothing to choose from here{r.kind === 'prepared' ? ' yet: write spells into your spellbook first' : ''}.</p>
      ) : (
        <>
          {rows.length > SEARCH_THRESHOLD && (
            <div className="sbp-spell-picker__filters">
              <input
                className="wizard-input"
                type="search"
                value={query}
                placeholder="Search by name or tag (healing, sound…)"
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search spells"
              />
              {levels.length > 1 && (
                <div className="tag-grid">
                  <button type="button" className={`tag-pill ${levelFilter === null ? 'tag-pill--active' : ''}`} onClick={() => setLevelFilter(null)}>All</button>
                  {levels.map((n) => (
                    <button key={n} type="button" className={`tag-pill ${levelFilter === n ? 'tag-pill--active' : ''}`} onClick={() => setLevelFilter(levelFilter === n ? null : n)}>
                      {LEVEL_LABEL(n)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {full && r.choose !== null && <p className="sbp-muted">That's all {r.choose}. Remove one to swap it.</p>}
          <ul className="sbp-spell-list">
            {shown.map(({ spell, name }) => {
              const on = r.chosen.includes(spell.id);
              return (
                <li key={spell.id} className={`sbp-spell-row${on ? ' is-chosen' : ''}`}>
                  <details>
                    <summary>
                      <button
                        type="button"
                        className={`tag-pill ${on ? 'tag-pill--active' : ''}`}
                        aria-pressed={on}
                        disabled={!on && full}
                        onClick={(e) => { e.preventDefault(); onChange(toggleIn(r.chosen, spell.id, max)); }}
                      >
                        {name}
                      </button>
                      <span className="sbp-feature__meta">
                        {LEVEL_LABEL(spell.level)} · {spell.school}
                        {spell.concentration ? ' · conc.' : ''}
                        {spell.source === 'sbp' ? ' · SBP' : ''}
                      </span>
                      <span className="sbp-spell-row__read">read</span>
                    </summary>
                    <SpellCard spell={spell} lookup={lookup} />
                  </details>
                </li>
              );
            })}
            {shown.length === 0 && <li className="sbp-muted">No spells match.</li>}
          </ul>
        </>
      )}
    </fieldset>
  );
}

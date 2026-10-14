/**
 * Spell lookups across the two spell files.
 *
 * `sbp_spells.json` (signature spells, `spell_lists`, `reskins`) and
 * `sbp_srd_spells.json` (generated SRD 5.2.1 spells) are uploaded as
 * separate rules docs. Everything here takes either file as optional so
 * callers degrade cleanly while one of them isn't uploaded yet.
 *
 * Pure. No Firebase.
 */

import type { SbpSpell, SbpSpellsFile, SbpSrdSpellsFile, SpellDamage, SpellReskin } from './types';

export type SpellIndex = Map<string, SbpSpell>;

/** Every spell from both files, by id. Signature spells win a (disallowed) id clash. */
export function buildSpellIndex(
  spells: SbpSpellsFile | null | undefined,
  srd: SbpSrdSpellsFile | null | undefined,
): SpellIndex {
  const index: SpellIndex = new Map();
  for (const s of srd?.spells ?? []) index.set(s.id, s);
  for (const s of spells?.spells ?? []) index.set(s.id, s);
  return index;
}

/**
 * Ids on a class list: signature spells that name the list in `lists`, then
 * the list's SRD spells. Order is file order; sort for display.
 */
export function spellListIds(listId: string, spells: SbpSpellsFile | null | undefined): string[] {
  if (!spells) return [];
  const signature = spells.spells.filter((s) => s.lists?.includes(listId)).map((s) => s.id);
  const srd = spells.spell_lists[listId]?.srd ?? [];
  return Array.from(new Set([...signature, ...srd]));
}

export function reskinFor(
  spellId: string,
  listId: string | null | undefined,
  spells: SbpSpellsFile | null | undefined,
): SpellReskin | null {
  if (!listId || !spells) return null;
  return spells.reskins.find((r) => r.spell === spellId && r.list === listId) ?? null;
}

/** The name a caster on `listId` sees: the reskin name if there is one. */
export function spellDisplayName(
  spell: SbpSpell,
  listId: string | null | undefined,
  spells: SbpSpellsFile | null | undefined,
): string {
  return reskinFor(spell.id, listId, spells)?.name ?? spell.name;
}

// ─── Display formatting ───────────────────────────────────────────────────────
// SRD spells carry printed text for these fields; signature spells mostly
// don't, so fall back to formatting the structured values.

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`;

export function spellLevelLabel(spell: Pick<SbpSpell, 'level' | 'school'>): string {
  if (spell.level === 0) return `${spell.school} cantrip`;
  const ord = ['', '1st', '2nd', '3rd'][spell.level] ?? `${spell.level}th`;
  return `${ord}-level ${spell.school.toLowerCase()}`;
}

export function formatCastingTime(spell: SbpSpell): string {
  const t = spell.casting_time;
  if (t.text) return t.text;
  const unit = t.unit.replace(/_/g, ' ');
  const base = t.amount === 1 && ['action', 'bonus action', 'reaction'].includes(unit)
    ? cap(unit)
    : plural(t.amount, unit);
  const withTrigger = t.trigger ? `${base}, which you take ${t.trigger}` : base;
  return spell.ritual ? `${withTrigger} or Ritual` : withTrigger;
}

export function formatRange(spell: SbpSpell): string {
  const r = spell.range;
  if (r.text) return r.text;
  const area = spell.area ? ` (${spell.area.feet}-foot ${spell.area.shape})` : '';
  if (r.type === 'self') return `Self${area}`;
  if (r.type === 'touch') return 'Touch';
  if (typeof r.feet === 'number') return `${r.feet} feet${area}`;
  return cap(r.type);
}

export function formatComponents(spell: SbpSpell): string {
  const c = spell.components;
  if (c.text) return c.text;
  const parts = [c.v && 'V', c.s && 'S', c.m && `M (${c.m.text})`].filter(Boolean);
  return parts.join(', ') || 'None';
}

export function formatDuration(spell: SbpSpell): string {
  const d = spell.duration;
  if (d.text) return d.text;
  const base = cap(d.type.replace(/_/g, ' '));
  return spell.concentration ? `Concentration, ${base.toLowerCase()}` : base;
}

/**
 * The damage type a caster actually deals. `strain` resolves to the
 * caster archetype's `resistance_type`, else the entry's fallback.
 */
export function resolveDamageType(damage: SpellDamage, strainType: string | null | undefined): string {
  if (damage.type !== 'strain') return damage.type;
  return strainType ?? damage.fallback ?? 'strain';
}

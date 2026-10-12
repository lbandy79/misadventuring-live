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

/**
 * The damage type a caster actually deals. `strain` resolves to the
 * caster archetype's `resistance_type`, else the entry's fallback.
 */
export function resolveDamageType(damage: SpellDamage, strainType: string | null | undefined): string {
  if (damage.type !== 'strain') return damage.type;
  return strainType ?? damage.fallback ?? 'strain';
}

/**
 * Everything a spell display needs from the rules: the spell index across
 * both spell files, plus the caster's list (for reskin names) and Strain
 * damage type. Built once per rules load.
 */

import { useMemo } from 'react';
import { buildSpellIndex, type LoadedSbpRules, type SbpSpellsFile, type SpellIndex } from '@mtp/lib';

export interface SpellLookup {
  index: SpellIndex;
  spellsFile: SbpSpellsFile | null;
  /** The caster's `spell_list.*`, for reskin names. */
  listId: string | null;
  /** Resolved `strain` damage type, if the character has one. */
  strainType: string | null;
}

export function useSpellLookup(
  loaded: LoadedSbpRules,
  listId: string | null | undefined,
  strainType: string | null | undefined,
): SpellLookup {
  const spellsFile = loaded.spells?.data ?? null;
  const srd = loaded.srd_spells?.data ?? null;
  const index = useMemo(() => buildSpellIndex(spellsFile, srd), [spellsFile, srd]);
  return { index, spellsFile, listId: listId ?? null, strainType: strainType ?? null };
}

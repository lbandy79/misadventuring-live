/**
 * Where each kind of spell pick is stored on the character. Shared by the
 * wizard and the sheet so both write the same shape.
 */

import { withChoices, type SbpCharacter, type SpellPickRequest } from '@mtp/lib';

export function applySpellPick(c: SbpCharacter, request: SpellPickRequest, ids: string[]): SbpCharacter {
  switch (request.kind) {
    case 'cantrips':
      return withChoices(c, request.level, { cantrips: ids });
    case 'spells':
    case 'journal':
      return withChoices(c, request.level, { spells: ids });
    case 'journal_extra':
      return withChoices(c, request.level, { journalExtra: ids });
    case 'prepared':
      return { ...c, prepared: ids };
  }
}

/** Drop every spell pick, e.g. when the class changes and none of them apply. */
export function clearSpellPicks(c: SbpCharacter): SbpCharacter {
  const choices: SbpCharacter['choices'] = {};
  for (const [lvl, ch] of Object.entries(c.choices)) {
    const { cantrips: _c, spells: _s, journalExtra: _j, ...rest } = ch;
    choices[lvl] = rest;
  }
  return { ...c, choices, prepared: undefined };
}

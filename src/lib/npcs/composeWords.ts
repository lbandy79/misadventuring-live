/**
 * Word composition utility for the Mad Libs reveal flow.
 *
 * Slots are ID-keyed, not positional. Repeated word types use distinct IDs
 * ({adjective_1}, {adjective_2}). The `type` field is display metadata only —
 * it never drives template matching.
 *
 * The same word array feeds multiple templates: NPC card reveal, Stinger
 * output, projector display, future recap page summary.
 */

export interface CollectedWord {
  id: string;
  type: string;
  value: string;
  isWriteIn?: boolean;
}

/**
 * Substitutes {id} placeholders in a template string with collected word
 * values. Unknown placeholders are left as-is.
 */
export function composeFromWords(
  template: string,
  words: CollectedWord[],
): string {
  return words.reduce(
    (text, word) =>
      text.replace(new RegExp(`\\{${escapeRegex(word.id)}\\}`, 'g'), word.value),
    template,
  );
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

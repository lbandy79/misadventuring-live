/**
 * Rumor Mill config: `showConfig.rumorMill` in a show's system JSON.
 * Everything a show can tune lives there; these are the fallbacks.
 */

import { MAX_RUMORS_PER_PERSON, RUMOR_MAX_LENGTH } from '@mtp/lib/rumors';

export interface RumorMillCopy {
  phoneTitle: string;
  phoneSubtitle: string;
  leadIn: string;
  placeholder: string;
  submitLabel: string;
  closedNote: string;
  outOfRumors: string;
  pendingLabel: string;
  circulatingLabel: string;
  rejectedLabel: string;
  trueLabel: string;
  falseLabel: string;
  boardTitle: string;
  boardSubtitle: string;
  boardEmpty: string;
}

export interface RumorMillConfig {
  maxPerPerson: number;
  maxLength: number;
  /** Rumors per projector page. More than this and the board turns pages. */
  boardPageSize: number;
  boardPageSeconds: number;
  /** `{name}` is the townie's name; other `{ids}` are npcCreation field ids. */
  bylineTemplate: string;
  copy: RumorMillCopy;
}

/** The raw JSON shape: everything optional. */
export type RawRumorMillConfig = Partial<Omit<RumorMillConfig, 'copy'>> & {
  copy?: Partial<RumorMillCopy>;
};

const DEFAULT_COPY: RumorMillCopy = {
  phoneTitle: 'The Rumor Mill',
  phoneSubtitle: 'Heard something? Pass it on.',
  leadIn: 'heard that…',
  placeholder: 'something is going on in the basement',
  submitLabel: 'Start the rumor.',
  closedNote: 'The mill is quiet right now.',
  outOfRumors: "That's all the gossip you get.",
  pendingLabel: 'Whispered. Waiting to see if it catches on.',
  circulatingLabel: "It's going around.",
  rejectedLabel: 'Nobody bought it.',
  trueLabel: 'True',
  falseLabel: 'Hogwash',
  boardTitle: 'The Rumor Mill',
  boardSubtitle: 'Some of it might even be true.',
  boardEmpty: 'Quiet. Too quiet.',
};

function clamp(value: number | undefined, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** Fill defaults and clamp to what firestore.rules will actually accept. */
export function resolveRumorMillConfig(raw: RawRumorMillConfig): RumorMillConfig {
  return {
    maxPerPerson: clamp(raw.maxPerPerson, 1, MAX_RUMORS_PER_PERSON, MAX_RUMORS_PER_PERSON),
    maxLength: clamp(raw.maxLength, 20, RUMOR_MAX_LENGTH, RUMOR_MAX_LENGTH),
    boardPageSize: clamp(raw.boardPageSize, 1, 12, 8),
    boardPageSeconds: clamp(raw.boardPageSeconds, 5, 120, 14),
    bylineTemplate: raw.bylineTemplate ?? '{name}',
    copy: { ...DEFAULT_COPY, ...raw.copy },
  };
}

/** "Dolores, the very sweaty bingo caller" from the template and a townie. */
export function buildByline(
  template: string,
  name: string,
  fieldValues: Record<string, string>,
): string {
  const filled = template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key === 'name' ? name : (fieldValues[key] ?? ''),
  );
  // Tidy up if a field was missing ("Dolores, the  " → "Dolores").
  return filled.replace(/\s{2,}/g, ' ').replace(/[,\s]+(the)?\s*$/i, '').trim() || name;
}

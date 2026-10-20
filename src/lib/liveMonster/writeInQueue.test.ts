import { describe, expect, it } from 'vitest';
import type { MonsterSlotVote, WriteInState } from './liveMonsterApi';
import {
  buildWriteInGroups,
  nextPendingId,
  pinnedItems,
  previousId,
  readingOrder,
  resolveWriteInState,
  totalPending,
  type SlotPrompt,
} from './writeInQueue';

const SLOTS: SlotPrompt[] = [
  { id: 'appearance', label: 'What does it look like?', revealPrefix: 'It appears as' },
  { id: 'habitat', label: 'Where has it been seen?', revealPrefix: 'It lurks in' },
];

const ts = (ms: number) => ({ toMillis: () => ms }) as unknown as MonsterSlotVote['timestamp'];

function writeIn(id: string, slotId: string, text: string, ms: number | null): MonsterSlotVote {
  return { id, showId: 's', slotId, optionIndex: null, writeIn: text, voterId: id, timestamp: ms === null ? null : ts(ms) };
}

function preset(id: string, slotId: string): MonsterSlotVote {
  return { id, showId: 's', slotId, optionIndex: 0, writeIn: null, voterId: id, timestamp: ts(1) };
}

const state = (text: string, status: WriteInState['status'], pinned = false): WriteInState => ({ text, status, pinned });

describe('resolveWriteInState', () => {
  it('treats a missing state as pending', () => {
    expect(resolveWriteInState('a', 'x', undefined)).toEqual({ status: 'pending', pinned: false, edited: false });
  });

  it('uses the stored state when the text still matches', () => {
    expect(resolveWriteInState('a', 'x', { a: state('x', 'used', true) })).toEqual({ status: 'used', pinned: true, edited: false });
  });

  it('flags an edited write-in as pending again when the voter changed the text', () => {
    expect(resolveWriteInState('a', 'new text', { a: state('old text', 'hidden', true) })).toEqual({ status: 'pending', pinned: false, edited: true });
  });
});

describe('buildWriteInGroups', () => {
  it('groups by slot in config order, newest first, skipping presets, blanks and empty groups', () => {
    const groups = buildWriteInGroups(
      [...SLOTS, { id: 'weakness', label: 'Stop it?', revealPrefix: 'Only:' }],
      {
        habitat: [writeIn('h1', 'habitat', 'Winn Dixie', 100)],
        appearance: [
          writeIn('a1', 'appearance', 'A Tacoma', 100),
          preset('p1', 'appearance'),
          writeIn('a2', 'appearance', '  Gummy worms  ', 300),
          writeIn('blank', 'appearance', '   ', 400),
        ],
        weakness: [preset('p2', 'weakness')],
      },
      undefined,
    );
    expect(groups.map((g) => g.slotId)).toEqual(['appearance', 'habitat']);
    expect(groups[0].items.map((i) => i.id)).toEqual(['a2', 'a1']);
    expect(groups[0].items[0].text).toBe('Gummy worms');
    expect(groups[0].prompt).toBe('What does it look like?');
    expect(groups[0].items[0].revealPrefix).toBe('It appears as');
  });

  it('sorts write-ins with a pending server timestamp as newest', () => {
    const [g] = buildWriteInGroups(SLOTS, {
      appearance: [writeIn('old', 'appearance', 'x', 100), writeIn('fresh', 'appearance', 'y', null)],
    }, undefined);
    expect(g.items.map((i) => i.id)).toEqual(['fresh', 'old']);
  });

  it('counts only pending items', () => {
    const groups = buildWriteInGroups(SLOTS, {
      appearance: [writeIn('a1', 'appearance', 'x', 1), writeIn('a2', 'appearance', 'y', 2), writeIn('a3', 'appearance', 'z', 3)],
    }, { a1: state('x', 'used'), a2: state('y', 'hidden') });
    expect(groups[0].pendingCount).toBe(1);
    expect(totalPending(groups)).toBe(1);
  });
});

describe('reading order and navigation', () => {
  const groups = buildWriteInGroups(SLOTS, {
    appearance: [writeIn('a1', 'appearance', 'one', 1), writeIn('a2', 'appearance', 'two', 2)],
    habitat: [writeIn('h1', 'habitat', 'three', 3), writeIn('h2', 'habitat', 'four', 4)],
  }, {
    a1: state('one', 'used', true),
    h2: state('four', 'hidden', true),
  });

  it('reads group by group, newest first, without hidden items', () => {
    expect(readingOrder(groups).map((i) => i.id)).toEqual(['a2', 'a1', 'h1']);
  });

  it('narrows to one prompt with a slot filter', () => {
    expect(readingOrder(groups, 'habitat').map((i) => i.id)).toEqual(['h1']);
  });

  it('starts at the first pending item when nothing is showing', () => {
    expect(nextPendingId(readingOrder(groups), null)).toBe('a2');
  });

  it('skips used items when advancing', () => {
    expect(nextPendingId(readingOrder(groups), 'a2')).toBe('h1');
  });

  it('wraps around to catch pending items earlier in the order', () => {
    expect(nextPendingId(readingOrder(groups), 'h1')).toBe('a2');
  });

  it('returns null when nothing else is pending', () => {
    const order = readingOrder(groups).map((i) => ({ ...i, status: 'used' as const }));
    expect(nextPendingId(order, 'a2')).toBeNull();
    expect(nextPendingId([], null)).toBeNull();
  });

  it('steps back through any status for re-reading', () => {
    expect(previousId(readingOrder(groups), 'h1')).toBe('a1');
    expect(previousId(readingOrder(groups), 'a2')).toBeNull();
    expect(previousId(readingOrder(groups), 'gone')).toBeNull();
  });

  it('lists pinned items but never hidden ones', () => {
    expect(pinnedItems(groups).map((i) => i.id)).toEqual(['a1']);
  });
});

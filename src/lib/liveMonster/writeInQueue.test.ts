import { describe, expect, it } from 'vitest';
import type { MonsterSlotVote, WriteInState } from './liveMonsterApi';
import {
  buildWriteInGroups,
  canRevealWriteIn,
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

describe('reveal', () => {
  const votes = {
    appearance: [writeIn('a1', 'appearance', 'A Toyota Tacoma', 1), writeIn('a2', 'appearance', 'Gummy worms', 2)],
    habitat: [writeIn('h1', 'habitat', 'Winn Dixie', 3)],
  };

  it('marks the write-in whose text is the slot result as revealed', () => {
    const groups = buildWriteInGroups(SLOTS, votes, undefined, { appearance: 'A Toyota Tacoma', habitat: null });
    const byId = Object.fromEntries(groups.flatMap((g) => g.items).map((i) => [i.id, i.revealed]));
    expect(byId).toEqual({ a1: true, a2: false, h1: false });
  });

  it('marks nothing when the revealed vote was later changed by its voter', () => {
    const groups = buildWriteInGroups(SLOTS, votes, undefined, { appearance: 'Toyota tacoma truck' });
    expect(groups.flatMap((g) => g.items).some((i) => i.revealed)).toBe(false);
  });

  it('keeps the locked result on the group even when no vote matches it (the Ep3 Toyota case)', () => {
    const groups = buildWriteInGroups(SLOTS, votes, undefined, { appearance: 'Toyota tacoma truck' });
    expect(groups.find((g) => g.slotId === 'appearance')?.lockedResult).toBe('Toyota tacoma truck');
    expect(groups.find((g) => g.slotId === 'habitat')?.lockedResult).toBeNull();
  });

  it('keeps a prompt with no write-ins when it has a locked result, and drops it otherwise', () => {
    const presetOnly = { appearance: [preset('p1', 'appearance')] };
    expect(buildWriteInGroups(SLOTS, presetOnly, undefined, {})).toEqual([]);
    const [g] = buildWriteInGroups(SLOTS, presetOnly, undefined, { appearance: 'Living Shadow' });
    expect(g).toMatchObject({ slotId: 'appearance', items: [], pendingCount: 0, lockedResult: 'Living Shadow' });
  });

  it('allows reveal only in the reveal phase, on an unlocked slot, for a visible item', () => {
    const [appearance] = buildWriteInGroups(SLOTS, votes, { a2: state('Gummy worms', 'hidden') });
    const [hidden, visible] = appearance.items; // newest first: a2 then a1
    expect(canRevealWriteIn(visible, 'reveal', {})).toBe(true);
    expect(canRevealWriteIn(visible, 'reveal', { appearance: null })).toBe(true);
    expect(canRevealWriteIn(visible, 'active', {})).toBe(false);
    expect(canRevealWriteIn(visible, 'reveal', { appearance: 'Something else' })).toBe(false);
    expect(canRevealWriteIn(hidden, 'reveal', {})).toBe(false);
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

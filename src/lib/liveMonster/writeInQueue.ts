/**
 * Write-in queue — pure logic behind the GM spotlight (/admin/spotlight).
 *
 * Turns raw slot votes + the session's `writeInStates` into what the GM
 * reads: write-ins grouped by prompt (config slot order), newest first
 * within each group, with triage status resolved.
 *
 * No Firestore here: type-only imports, so it's unit-testable in isolation.
 */

import type { MonsterSlotConfig } from '../../data/liveMonster/types';
import type { MonsterSlotVote, WriteInState, WriteInStatus } from './liveMonsterApi';

export type SlotPrompt = Pick<MonsterSlotConfig, 'id' | 'label' | 'revealPrefix'>;

export interface WriteInItem {
  /** Slot-vote doc id — also the key into session.writeInStates. */
  id: string;
  slotId: string;
  /** Audience-facing question, e.g. "What does it look like?" */
  prompt: string;
  /** Display lead-in, e.g. "It appears as" */
  revealPrefix: string;
  text: string;
  /** null while the server timestamp is still pending — sorts as newest. */
  submittedAtMs: number | null;
  status: WriteInStatus;
  pinned: boolean;
  /** True when the voter changed their text after the GM triaged it. */
  edited: boolean;
  /** True when this text is the slot's locked result (shown on the projector). */
  revealed: boolean;
}

export interface WriteInGroup {
  slotId: string;
  prompt: string;
  revealPrefix: string;
  /** Newest first; includes used and hidden items. */
  items: WriteInItem[];
  pendingCount: number;
  /**
   * The slot's locked result (what the projector shows), straight from
   * session.slotResults. Survives the winning vote being overwritten or
   * deleted, unlike the per-item `revealed` flag.
   */
  lockedResult: string | null;
}

export function resolveWriteInState(
  id: string,
  text: string,
  states: Record<string, WriteInState> | undefined,
): { status: WriteInStatus; pinned: boolean; edited: boolean } {
  const state = states?.[id];
  if (!state) return { status: 'pending', pinned: false, edited: false };
  if (state.text !== text) return { status: 'pending', pinned: false, edited: true };
  return { status: state.status, pinned: !!state.pinned, edited: false };
}

function toMillis(ts: MonsterSlotVote['timestamp']): number | null {
  return ts && typeof ts.toMillis === 'function' ? ts.toMillis() : null;
}

function newestFirst(a: WriteInItem, b: WriteInItem): number {
  const am = a.submittedAtMs ?? Number.POSITIVE_INFINITY;
  const bm = b.submittedAtMs ?? Number.POSITIVE_INFINITY;
  if (am !== bm) return am < bm ? 1 : -1;
  return a.id.localeCompare(b.id);
}

export function buildWriteInGroups(
  slots: SlotPrompt[],
  votesBySlot: Record<string, MonsterSlotVote[]>,
  states: Record<string, WriteInState> | undefined,
  slotResults: Record<string, string | null> | undefined = undefined,
): WriteInGroup[] {
  const groups: WriteInGroup[] = [];
  for (const slot of slots) {
    const locked = slotResults?.[slot.id] ?? null;
    const items: WriteInItem[] = [];
    for (const vote of votesBySlot[slot.id] ?? []) {
      const text = vote.optionIndex === null ? vote.writeIn?.trim() : '';
      if (!text) continue;
      items.push({
        id: vote.id,
        slotId: slot.id,
        prompt: slot.label,
        revealPrefix: slot.revealPrefix,
        text,
        submittedAtMs: toMillis(vote.timestamp),
        ...resolveWriteInState(vote.id, text, states),
        // slotResults keeps its own copy of the text, so a voter who changes
        // their answer after the reveal simply stops matching.
        revealed: locked !== null && locked === text,
      });
    }
    // Keep a prompt with no write-ins if it has a locked result, so the GM
    // still sees what's on the projector for it (e.g. a preset winner).
    if (items.length === 0 && locked === null) continue;
    items.sort(newestFirst);
    groups.push({
      slotId: slot.id,
      prompt: slot.label,
      revealPrefix: slot.revealPrefix,
      items,
      pendingCount: items.filter((i) => i.status === 'pending').length,
      lockedResult: locked,
    });
  }
  return groups;
}

/**
 * The order the GM reads in: group by group, newest first, hidden items
 * removed. `slotFilter` narrows to one prompt.
 */
export function readingOrder(groups: WriteInGroup[], slotFilter: string | null = null): WriteInItem[] {
  return groups
    .filter((g) => slotFilter === null || g.slotId === slotFilter)
    .flatMap((g) => g.items.filter((i) => i.status !== 'hidden'));
}

/**
 * Next pending item after `currentId`, wrapping once so new arrivals in
 * earlier groups aren't missed. Null when nothing else is pending.
 */
export function nextPendingId(order: WriteInItem[], currentId: string | null): string | null {
  if (order.length === 0) return null;
  const start = currentId ? order.findIndex((i) => i.id === currentId) : -1;
  for (let k = 1; k <= order.length; k++) {
    const item = order[(start + k + order.length) % order.length];
    if (item.status === 'pending' && item.id !== currentId) return item.id;
  }
  return null;
}

/** The item before `currentId` in reading order (any status), for re-reading. */
export function previousId(order: WriteInItem[], currentId: string | null): string | null {
  const idx = currentId ? order.findIndex((i) => i.id === currentId) : -1;
  return idx > 0 ? order[idx - 1].id : null;
}

/**
 * Whether the GM may reveal this write-in from the spotlight. Mirrors the
 * /admin panel exactly: only in the `reveal` phase, and only while the
 * item's slot has no locked result yet.
 */
export function canRevealWriteIn(
  item: WriteInItem,
  phase: string | undefined,
  slotResults: Record<string, string | null> | undefined,
): boolean {
  return phase === 'reveal' && (slotResults?.[item.slotId] ?? null) === null && item.status !== 'hidden';
}

export function pinnedItems(groups: WriteInGroup[]): WriteInItem[] {
  return groups.flatMap((g) => g.items.filter((i) => i.pinned && i.status !== 'hidden'));
}

export function totalPending(groups: WriteInGroup[]): number {
  return groups.reduce((n, g) => n + g.pendingCount, 0);
}

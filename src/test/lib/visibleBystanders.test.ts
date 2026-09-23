import { describe, it, expect } from 'vitest';
import { visibleBystanders } from '../../lib/liveMonster/visibleBystanders';
import type { BystanderSubmission } from '../../lib/liveMonster/bystanderSubmissionsApi';
import type { MonsterSession } from '../../lib/liveMonster/liveMonsterApi';

const sub = (id: string, name: string): BystanderSubmission => ({
  id,
  showId: 'test-show',
  voterId: `anon:${id}`,
  name,
  typeId: 'victim',
  submittedAt: null,
});

const session = (states?: Record<string, 'featured' | 'dead'>): MonsterSession => ({
  phase: 'done',
  slotResults: {},
  emojiMode: false,
  updatedAt: null,
  ...(states ? { bystanderStates: states } : {}),
});

/**
 * This gate is what keeps unmoderated audience text off public recap pages.
 * If it regresses, everything submitted gets published — which is exactly
 * what happened before it existed. Treat a failure here as a content
 * incident, not a broken unit test.
 */
describe('visibleBystanders', () => {
  const all = [sub('a', 'Pothole Pete'), sub('b', 'Slipped Through'), sub('c', 'Ghost')];

  it('publishes only what the GM featured', () => {
    const result = visibleBystanders(all, session({ a: 'featured' }));
    expect(result.map((b) => b.name)).toEqual(['Pothole Pete']);
  });

  it('withholds anything the GM never put on screen', () => {
    const result = visibleBystanders(all, session({ a: 'featured' }));
    expect(result.find((b) => b.name === 'Slipped Through')).toBeUndefined();
  });

  it("includes 'dead' bystanders — they were on the projector too", () => {
    const result = visibleBystanders(all, session({ a: 'featured', c: 'dead' }));
    expect(result.map((b) => b.id).sort()).toEqual(['a', 'c']);
  });

  it('preserves the order of the source list', () => {
    const result = visibleBystanders(all, session({ c: 'dead', a: 'featured' }));
    expect(result.map((b) => b.id)).toEqual(['a', 'c']);
  });

  // ── Fail-closed cases: each of these must publish NOTHING ──────────────

  it('publishes nothing when the session is null', () => {
    expect(visibleBystanders(all, null)).toEqual([]);
  });

  it('publishes nothing when the session is undefined', () => {
    expect(visibleBystanders(all, undefined)).toEqual([]);
  });

  it('publishes nothing when bystanderStates is absent', () => {
    expect(visibleBystanders(all, session())).toEqual([]);
  });

  it('publishes nothing when bystanderStates is empty', () => {
    expect(visibleBystanders(all, session({}))).toEqual([]);
  });

  it('ignores state keys that match no submission', () => {
    expect(visibleBystanders(all, session({ nonexistent: 'featured' }))).toEqual([]);
  });

  it('handles an empty submission list', () => {
    expect(visibleBystanders([], session({ a: 'featured' }))).toEqual([]);
  });
});

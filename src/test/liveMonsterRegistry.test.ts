import { describe, expect, it } from 'vitest';
import { getMonsterConfig } from '../data/liveMonster';

// Show-day guard: if this fails, the admin panel shows "No monster config
// registered" once config/platform.currentShowId is flipped to Ep4.
describe('live monster registry', () => {
  it('has Episode Four registered under its Firestore showId', () => {
    const config = getMonsterConfig('monster-of-the-week-2026-10-24');
    expect(config?.showName).toBe('Monster of the Week — Episode Four');
    expect(config?.slots.map((s) => s.id)).toEqual(['appearance', 'habitat', 'behavior', 'weakness']);
    for (const slot of config!.slots) expect(slot.options).toHaveLength(6);
    expect(config!.slots.find((s) => s.id === 'weakness')?.secret).toBe(true);
  });
});

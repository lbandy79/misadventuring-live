import { describe, it, expect } from 'vitest';
import { resolveJoinTarget, type JoinLookups } from '../../lib/shows/joinTarget';
import { shows } from '../../lib/shows/registry';

/**
 * `/join` is the URL printed on the venue QR and baked into the stream
 * overlay, so it has to keep working as `currentShowId` changes show to show.
 */
const lookups: JoinLookups = {
  shows,
  hasMonsterConfig: (id) => id === 'monster-of-the-week-2026-10-24',
  npcEpisodes: {
    'greenoaks-2026-11-28': 'green-oaks',
    'honey-heist-madlibs-2026-05-23': 'mad-libs-honey-heist',
  },
};

describe('resolveJoinTarget', () => {
  it('sends a MotW episode to the live monster page', () => {
    expect(resolveJoinTarget('monster-of-the-week-2026-10-24', lookups)).toBe('/live-monster');
  });

  it('sends an npc-creation episode to its show join page', () => {
    expect(resolveJoinTarget('greenoaks-2026-11-28', lookups)).toBe('/shows/green-oaks/join');
  });

  it('accepts a registry show id directly, using its audienceMode', () => {
    expect(resolveJoinTarget('green-oaks', lookups)).toBe('/shows/green-oaks/join');
    expect(resolveJoinTarget('monster-of-the-week', lookups)).toBe('/live-monster');
  });

  it('falls back to the landing page for unknown or missing ids', () => {
    expect(resolveJoinTarget('idle', lookups)).toBe('/');
    expect(resolveJoinTarget(undefined, lookups)).toBe('/');
  });

  it('falls back for a registered show with no phone experience', () => {
    expect(resolveJoinTarget('betawave-tapes', lookups)).toBe('/');
  });
});

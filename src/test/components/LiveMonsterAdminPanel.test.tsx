/**
 * LiveMonsterAdminPanel — show-night regressions.
 *
 * Firestore is fully mocked: nothing here reads or writes live data.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LiveMonsterAdminPanel from '../../../platform/src/components/admin/LiveMonsterAdminPanel';

const EP3_SHOW_ID = 'monster-of-the-week-2026-09-19';

let currentShowId: string | null = null;
let sessionPhase = 'active';

vi.mock('@mtp/lib/shows', () => ({
  useShow: () => ({ showId: currentShowId }),
}));

const setMonsterPhase = vi.fn(() => Promise.resolve());

vi.mock('@mtp/lib/liveMonster/liveMonsterApi', () => ({
  subscribeToMonsterSession: (_showId: string, onChange: (s: unknown) => void) => {
    onChange({ phase: sessionPhase, slotResults: {}, emojiMode: false, updatedAt: null });
    return () => {};
  },
  subscribeToSlotVotes: () => () => {},
  setMonsterPhase: (...args: unknown[]) => setMonsterPhase(...(args as [])),
  setSlotResult: vi.fn(),
  resetMonsterSession: vi.fn(),
  setBystanderState: vi.fn(),
  tallySlotVotes: (_votes: unknown[], optionCount: number) => ({
    optionCounts: new Array(optionCount).fill(0),
    writeIns: [],
    totalPreset: 0,
    totalWriteIn: 0,
    winnerIndex: 0,
  }),
}));

vi.mock('@mtp/lib/liveMonster/bystanderSubmissionsApi', () => ({
  subscribeToBystanderSubmissions: () => () => {},
}));

beforeEach(() => {
  currentShowId = null;
  sessionPhase = 'active';
  setMonsterPhase.mockClear();
});

describe('LiveMonsterAdminPanel', () => {
  it('survives currentShowId flipping from unregistered to a real show while open', () => {
    currentShowId = 'not-a-registered-show';
    const { rerender } = render(<LiveMonsterAdminPanel />);
    expect(screen.getByText(/No monster config registered/)).toBeInTheDocument();

    currentShowId = EP3_SHOW_ID;
    rerender(<LiveMonsterAdminPanel />);
    expect(screen.getByText(`show: ${EP3_SHOW_ID}`)).toBeInTheDocument();
  });

  it('renders phase controls as real buttons that respond to Space and Enter', async () => {
    currentShowId = EP3_SHOW_ID;
    const user = userEvent.setup();
    render(<LiveMonsterAdminPanel />);

    const active = screen.getByRole('button', { name: '● Active' });
    expect(active.tagName).toBe('BUTTON');
    expect(active).toHaveAttribute('aria-pressed', 'true');

    const reveal = screen.getByRole('button', { name: 'Reveal' });
    expect(reveal).toHaveAttribute('aria-pressed', 'false');

    reveal.focus();
    await user.keyboard(' ');
    expect(setMonsterPhase).toHaveBeenCalledWith(EP3_SHOW_ID, 'reveal');

    setMonsterPhase.mockClear();
    const done = screen.getByRole('button', { name: 'Done' });
    done.focus();
    await user.keyboard('{Enter}');
    expect(setMonsterPhase).toHaveBeenCalledWith(EP3_SHOW_ID, 'done');
  });
});

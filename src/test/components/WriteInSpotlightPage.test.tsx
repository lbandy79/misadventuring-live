/**
 * WriteInSpotlightPage — GM teleprompter behaviour.
 *
 * Firestore is replaced by an in-memory fake that, like the real SDK's
 * latency compensation, notifies listeners synchronously on write.
 * Nothing here reads or writes live data.
 */
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WriteInSpotlightPage from '../../../platform/src/pages/WriteInSpotlightPage';

const SHOW_ID = 'monster-of-the-week-2026-10-24';

type Vote = {
  id: string; showId: string; slotId: string; optionIndex: number | null;
  writeIn: string | null; voterId: string; timestamp: { toMillis: () => number } | null;
};
type State = { text: string; status: 'pending' | 'used' | 'hidden'; pinned: boolean };

let isAdmin = true;
let session: { phase: string; slotResults: Record<string, string | null>; emojiMode: boolean; updatedAt: null; writeInStates: Record<string, State> };
let votes: Record<string, Vote[]>;
let sessionListener: ((s: unknown) => void) | null;
const voteListeners: Record<string, (v: Vote[]) => void> = {};

const wi = (id: string, slotId: string, text: string, ms: number): Vote => ({
  id, showId: SHOW_ID, slotId, optionIndex: null, writeIn: text, voterId: id, timestamp: { toMillis: () => ms },
});

const setWriteInState = vi.fn((_showId: string, id: string, state: State | null) => {
  const next = { ...session.writeInStates };
  if (state === null) delete next[id];
  else next[id] = { text: state.text, status: state.status, pinned: state.pinned };
  session = { ...session, writeInStates: next };
  sessionListener?.(session);
  return Promise.resolve();
});

const setSlotResult = vi.fn((_showId: string, slotId: string, text: string) => {
  session = { ...session, slotResults: { ...session.slotResults, [slotId]: text } };
  sessionListener?.(session);
  return Promise.resolve();
});

vi.mock('@mtp/lib', () => ({
  useAuth: () => ({ user: { email: 'gm@example.com' }, isAdmin, isLoading: false, isAdminLoading: false }),
}));

vi.mock('@mtp/lib/shows', () => ({
  useShow: () => ({ showId: SHOW_ID }),
}));

vi.mock('@mtp/lib/liveMonster/liveMonsterApi', () => ({
  subscribeToMonsterSession: (_showId: string, onChange: (s: unknown) => void) => {
    sessionListener = onChange;
    onChange(session);
    return () => { sessionListener = null; };
  },
  subscribeToSlotVotes: (_showId: string, slotId: string, onChange: (v: Vote[]) => void) => {
    voteListeners[slotId] = onChange;
    onChange(votes[slotId] ?? []);
    return () => { delete voteListeners[slotId]; };
  },
  setWriteInState: (...args: [string, string, State | null]) => setWriteInState(...args),
  setSlotResult: (...args: [string, string, string]) => setSlotResult(...args),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <WriteInSpotlightPage />
    </MemoryRouter>,
  );
}

const card = () => screen.getByRole('region', { name: 'Current write-in' });
const rail = () => screen.getByRole('complementary', { name: 'Write-in queue' });

beforeEach(() => {
  isAdmin = true;
  sessionListener = null;
  setWriteInState.mockClear();
  setSlotResult.mockClear();
  session = { phase: 'active', slotResults: {}, emojiMode: false, updatedAt: null, writeInStates: {} };
  votes = {
    appearance: [
      wi('a1', 'appearance', 'A Toyota Tacoma', 100),
      wi('a2', 'appearance', 'Gummy worms', 200),
      { ...wi('p1', 'appearance', '', 50), optionIndex: 0, writeIn: null },
    ],
    habitat: [wi('h1', 'habitat', 'The Winn Dixie pork aisle', 150)],
  };
});

describe('WriteInSpotlightPage', () => {
  it('keeps non-admins out', () => {
    isAdmin = false;
    renderPage();
    expect(screen.getByRole('heading', { name: 'GM only' })).toBeInTheDocument();
  });

  it('spotlights the newest write-in of the first prompt, with its prompt and lead-in', () => {
    renderPage();
    expect(within(card()).getByText('Gummy worms')).toBeInTheDocument();
    expect(within(card()).getByText('What does it look like?')).toBeInTheDocument();
    expect(within(card()).getByText('It appears as…')).toBeInTheDocument();
    expect(within(rail()).getByText('3 pending')).toBeInTheDocument();
  });

  it('advances group by group with Next, the arrow key, and wraps', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /Next/ }));
    expect(within(card()).getByText('A Toyota Tacoma')).toBeInTheDocument();
    await user.keyboard('{ArrowRight}');
    expect(within(card()).getByText('The Winn Dixie pork aisle')).toBeInTheDocument();
    await user.keyboard('{ArrowRight}');
    expect(within(card()).getByText('Gummy worms')).toBeInTheDocument();
    await user.keyboard('{ArrowLeft}');
    expect(within(card()).getByText('Gummy worms')).toBeInTheDocument(); // nothing before the first
  });

  it('marks used, advances, and keeps the used item dimmed in the rail', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.keyboard('u');
    expect(setWriteInState).toHaveBeenLastCalledWith(SHOW_ID, 'a2', { text: 'Gummy worms', status: 'used', pinned: false });
    expect(within(card()).getByText('A Toyota Tacoma')).toBeInTheDocument();
    expect(within(rail()).getByText('Gummy worms').closest('button')).toHaveClass('wis-item--used');
    expect(within(rail()).getByText('2 pending')).toBeInTheDocument();
  });

  it('needs two presses to hide, then undo restores it', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.keyboard('h');
    expect(setWriteInState).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Tap again to hide/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Tap again to hide/ }));
    expect(setWriteInState).toHaveBeenLastCalledWith(SHOW_ID, 'a2', { text: 'Gummy worms', status: 'hidden', pinned: false });
    expect(within(card()).getByText('A Toyota Tacoma')).toBeInTheDocument();
    expect(within(rail()).queryByText('Gummy worms')).not.toBeInTheDocument();
    expect(within(rail()).getByRole('button', { name: 'Show hidden (1)' })).toBeInTheDocument();

    await user.keyboard('z');
    expect(setWriteInState).toHaveBeenLastCalledWith(SHOW_ID, 'a2', null);
    expect(within(card()).getByText('Gummy worms')).toBeInTheDocument();
  });

  it('does not advance when Space activates a focused button', async () => {
    const user = userEvent.setup();
    renderPage();
    screen.getByRole('button', { name: /☆ Pin/ }).focus();
    await user.keyboard(' ');
    expect(setWriteInState).toHaveBeenLastCalledWith(SHOW_ID, 'a2', { text: 'Gummy worms', status: 'pending', pinned: true });
    expect(within(card()).getByText('Gummy worms')).toBeInTheDocument();
  });

  it('collects pinned write-ins in the tray', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.keyboard('p');
    await user.click(screen.getByRole('button', { name: /Pinned \(1\)/ }));
    const tray = screen.getByRole('dialog', { name: 'Pinned write-ins' });
    expect(within(tray).getByText('Gummy worms')).toBeInTheDocument();
  });

  it('flags a write-in the voter edited after triage and treats it as pending', () => {
    session.writeInStates = { a2: { text: 'Gummy bears', status: 'used', pinned: true } };
    renderPage();
    expect(within(card()).getByText('Gummy worms')).toBeInTheDocument();
    expect(within(card()).getByText('Edited by voter')).toBeInTheDocument();
  });

  describe('reveal', () => {
    it('offers no Reveal button outside the reveal phase', () => {
      renderPage(); // phase: active
      expect(screen.queryByRole('button', { name: /Reveal this/ })).not.toBeInTheDocument();
    });

    it('needs two taps, then locks the slot and tags the write-in as on the projector', async () => {
      session.phase = 'reveal';
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByRole('button', { name: /Reveal this/ }));
      expect(setSlotResult).not.toHaveBeenCalled();

      await user.click(screen.getByRole('button', { name: /Tap again: show on projector/ }));
      expect(setSlotResult).toHaveBeenCalledWith(SHOW_ID, 'appearance', 'Gummy worms');
      expect(within(card()).getByText('On the projector')).toBeInTheDocument();
      expect(within(rail()).getByText('Revealed')).toBeInTheDocument();
      // Slot is now locked: no second reveal for any write-in in it.
      expect(screen.queryByRole('button', { name: /Reveal this/ })).not.toBeInTheDocument();
    });

    it('works from the keyboard with R twice, and disarms when moving on', async () => {
      session.phase = 'reveal';
      const user = userEvent.setup();
      renderPage();

      await user.keyboard('r');
      await user.keyboard('{ArrowRight}'); // moving on disarms
      expect(screen.getByRole('button', { name: /Reveal this/ })).toBeInTheDocument();
      await user.keyboard('r');
      expect(setSlotResult).not.toHaveBeenCalled();
      await user.keyboard('r');
      expect(setSlotResult).toHaveBeenCalledWith(SHOW_ID, 'appearance', 'A Toyota Tacoma');
    });

    it('still offers reveal for other prompts once one slot is locked', async () => {
      session.phase = 'reveal';
      session.slotResults = { appearance: 'Gummy worms' };
      const user = userEvent.setup();
      renderPage();
      expect(screen.queryByRole('button', { name: /Reveal this/ })).not.toBeInTheDocument();
      await user.click(within(rail()).getByText('The Winn Dixie pork aisle'));
      expect(screen.getByRole('button', { name: /Reveal this/ })).toBeInTheDocument();
    });
  });

  it('announces new arrivals without swapping the write-in being read', async () => {
    const user = userEvent.setup();
    renderPage();
    act(() => {
      votes.habitat = [...votes.habitat, wi('h2', 'habitat', 'Under the bleachers', 900)];
      voteListeners.habitat(votes.habitat);
    });
    expect(within(card()).getByText('Gummy worms')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '1 new' }));
    expect(within(card()).getByText('Under the bleachers')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /new$/ })).not.toBeInTheDocument();
  });
});

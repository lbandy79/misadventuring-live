import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NPCReviewPanel from '../../admin/NPCReviewPanel';
import { onSnapshot, updateDoc } from 'firebase/firestore';
import { mockNPC, mockSystemConfig } from '../fixtures/systemConfig';
import type { NPC } from '../../types/npc.types';

// Mock useSystemConfig
vi.mock('../../hooks/useSystemConfig', () => ({
  useSystemConfig: () => ({
    config: mockSystemConfig,
    loading: false,
    error: null,
  }),
  getStatById: (config: any, statId: string) => config.stats.find((s: any) => s.id === statId),
}));

function setupOnSnapshot(npcs: NPC[]) {
  vi.mocked(onSnapshot).mockImplementation((_query: any, callback: any) => {
    callback({
      docs: npcs.map(npc => ({
        id: npc.id,
        data: () => {
          const { id, ...rest } = npc;
          return rest;
        },
      })),
    });
    return vi.fn(); // unsubscribe
  });
}

describe('NPCReviewPanel', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    vi.mocked(updateDoc).mockResolvedValue();
  });

  it('shows empty state when no NPCs', () => {
    setupOnSnapshot([]);
    render(<NPCReviewPanel showId="betawave-last-call-2026-04-18" />);
    expect(screen.getByText('No NPCs submitted yet.')).toBeInTheDocument();
  });

  it('shows NPC count', () => {
    setupOnSnapshot([mockNPC]);
    render(<NPCReviewPanel showId="betawave-last-call-2026-04-18" />);
    expect(screen.getByText('1 total')).toBeInTheDocument();
  });

  it('renders NPC name and occupation', () => {
    setupOnSnapshot([mockNPC]);
    render(<NPCReviewPanel showId="betawave-last-call-2026-04-18" />);
    expect(screen.getByText('Dale Cooper')).toBeInTheDocument();
    expect(screen.getByText('Bartender')).toBeInTheDocument();
  });

  it('shows the secret (GM view)', () => {
    setupOnSnapshot([mockNPC]);
    render(<NPCReviewPanel showId="betawave-last-call-2026-04-18" />);
    expect(screen.getByText(/Sleepwalks into the woods/)).toBeInTheDocument();
  });

  it('shows stat names (not IDs)', () => {
    setupOnSnapshot([mockNPC]);
    render(<NPCReviewPanel showId="betawave-last-call-2026-04-18" />);
    expect(screen.getByText('Charm')).toBeInTheDocument();
    expect(screen.getByText('Brains')).toBeInTheDocument();
  });

  it('toggles flag on click', async () => {
    setupOnSnapshot([mockNPC]);
    render(<NPCReviewPanel showId="betawave-last-call-2026-04-18" />);
    
    const flagBtn = screen.getByTitle('Flag for plot');
    await user.click(flagBtn);

    expect(updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'npc-001' }),
      { gmFlagged: true }
    );
  });

  it('shows filter buttons with counts', () => {
    const flaggedNpc = { ...mockNPC, id: 'npc-002', gmFlagged: true, name: 'Flagged NPC' };
    setupOnSnapshot([mockNPC, flaggedNpc]);
    render(<NPCReviewPanel showId="betawave-last-call-2026-04-18" />);

    expect(screen.getByText('All (2)')).toBeInTheDocument();
    expect(screen.getByText(/Flagged \(1\)/)).toBeInTheDocument();
  });

  it('filters to only flagged NPCs', async () => {
    const flaggedNpc: NPC = { ...mockNPC, id: 'npc-002', gmFlagged: true, name: 'Flagged NPC' };
    setupOnSnapshot([mockNPC, flaggedNpc]);
    render(<NPCReviewPanel showId="betawave-last-call-2026-04-18" />);

    await user.click(screen.getByText(/Flagged \(1\)/));
    
    expect(screen.getByText('Flagged NPC')).toBeInTheDocument();
    expect(screen.queryByText('Dale Cooper')).not.toBeInTheDocument();
  });

  it('opens notes editor on click', async () => {
    setupOnSnapshot([mockNPC]);
    render(<NPCReviewPanel showId="betawave-last-call-2026-04-18" />);

    await user.click(screen.getByText('+ Add notes'));
    expect(screen.getByPlaceholderText('GM notes...')).toBeInTheDocument();
  });

  it('saves notes to Firestore', async () => {
    setupOnSnapshot([mockNPC]);
    render(<NPCReviewPanel showId="betawave-last-call-2026-04-18" />);

    await user.click(screen.getByText('+ Add notes'));
    await user.type(screen.getByPlaceholderText('GM notes...'), 'Plot hook potential');
    await user.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'npc-001' }),
        { gmNotes: 'Plot hook potential' }
      );
    });
  });

  it('cancels notes editing', async () => {
    setupOnSnapshot([mockNPC]);
    render(<NPCReviewPanel showId="betawave-last-call-2026-04-18" />);

    await user.click(screen.getByText('+ Add notes'));
    await user.click(screen.getByText('Cancel'));
    expect(screen.queryByPlaceholderText('GM notes...')).not.toBeInTheDocument();
  });

  it('shows existing notes with edit icon', () => {
    const npcWithNotes: NPC = { ...mockNPC, gmNotes: 'Important NPC' };
    setupOnSnapshot([npcWithNotes]);
    render(<NPCReviewPanel showId="betawave-last-call-2026-04-18" />);
    expect(screen.getByText(/Important NPC/)).toBeInTheDocument();
  });

  it('unsubscribes on unmount', () => {
    const unsubscribe = vi.fn();
    vi.mocked(onSnapshot).mockReturnValue(unsubscribe as any);

    const { unmount } = render(<NPCReviewPanel showId="betawave-last-call-2026-04-18" />);
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});

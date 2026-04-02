import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NPCCreationPage from '../../components/NPCCreator/NPCCreationPage';
import { getDocs, addDoc, updateDoc } from 'firebase/firestore';
import { mockSystemConfig, mockReservation } from '../fixtures/systemConfig';

// Mock useSystemConfig
vi.mock('../../hooks/useSystemConfig', () => ({
  useSystemConfig: () => ({
    config: mockSystemConfig,
    loading: false,
    error: null,
  }),
  getStatById: (config: any, statId: string) => config.stats.find((s: any) => s.id === statId),
  getStatName: (config: any, statId: string) => config.stats.find((s: any) => s.id === statId)?.name ?? statId,
}));

// Mock contentFilter
vi.mock('../../utils/contentFilter', () => ({
  validateContent: vi.fn(() => null),
}));

describe('NPCCreationPage', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    localStorage.clear();
    vi.mocked(getDocs).mockResolvedValue({ empty: true, docs: [] } as any);
    vi.mocked(addDoc).mockResolvedValue({ id: 'new-doc-id' } as any);
    vi.mocked(updateDoc).mockResolvedValue();
  });

  it('renders show branding from system config', () => {
    render(<NPCCreationPage />);
    expect(screen.getByText('The Betawave Tapes')).toBeInTheDocument();
    expect(screen.getByText('The Betawave Tapes: Last Call')).toBeInTheDocument();
  });

  it('shows access code entry as the default view', () => {
    render(<NPCCreationPage />);
    expect(screen.getByText('play the tape.')).toBeInTheDocument();
  });

  it('clicking "reserve your spot" switches to reservation form', async () => {
    render(<NPCCreationPage />);
    await user.click(screen.getByText('reserve your spot'));
    expect(screen.getByLabelText('Your Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('restores reservation from localStorage and goes to creator', () => {
    const stored = { ...mockReservation, npcCreated: false };
    localStorage.setItem(
      `mtp-reservation-${mockSystemConfig.showConfig.showId}`,
      JSON.stringify(stored)
    );

    render(<NPCCreationPage />);
    // Should jump to NPC creator (step 1: Name)
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText(/Step 1/)).toBeInTheDocument();
  });

  it('full flow: code entry → NPC creator → complete', async () => {
    // Mock a successful code lookup
    vi.mocked(getDocs).mockResolvedValueOnce({
      empty: false,
      docs: [{
        id: mockReservation.id,
        data: () => {
          const { id, ...rest } = mockReservation;
          return rest;
        },
      }],
    } as any);

    render(<NPCCreationPage />);

    // Enter access code via six boxes
    const boxes = screen.getAllByRole('textbox').filter(el =>
      (el as HTMLInputElement).getAttribute('aria-label')?.startsWith('Character')
    );
    'ABC123'.split('').forEach((ch, i) => {
      fireEvent.change(boxes[i], { target: { value: ch } });
    });
    await user.click(screen.getByText('ENTER'));

    // Should advance to NPC creator
    await waitFor(() => {
      expect(screen.getByText('Name')).toBeInTheDocument();
    });

    // Fill out the wizard
    fireEvent.change(screen.getByPlaceholderText('Character name'), { target: { value: 'Dale Cooper' } });
    await user.click(screen.getByText('Next →'));

    fireEvent.change(screen.getByPlaceholderText('What they do'), { target: { value: 'Bartender' } });
    await user.click(screen.getByText('Next →'));

    fireEvent.change(screen.getByPlaceholderText('What they look like'), { target: { value: 'Tall with a mullet' } });
    await user.click(screen.getByText('Next →'));

    fireEvent.change(screen.getByPlaceholderText('A hidden truth'), { target: { value: 'Afraid of the dark' } });
    await user.click(screen.getByText('Next →'));

    await user.selectOptions(screen.getByRole('combobox'), 'charm');
    await user.click(screen.getByText('Next →'));

    await user.selectOptions(screen.getByRole('combobox'), 'brawn');
    await user.click(screen.getByText('Review →'));

    // Review
    expect(screen.getByText('Review Your Character')).toBeInTheDocument();
    await user.click(screen.getByText('Submit Character'));

    // Should show complete state
    await waitFor(() => {
      expect(screen.getByText('tape recorded.')).toBeInTheDocument();
    });
  });
});

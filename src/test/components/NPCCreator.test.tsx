import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NPCCreator from '../../components/NPCCreator/NPCCreator';
import { addDoc, updateDoc } from 'firebase/firestore';
import { mockReservation, mockSystemConfig } from '../fixtures/systemConfig';

// Mock useSystemConfig
vi.mock('../../hooks/useSystemConfig', () => ({
  useSystemConfig: () => ({
    config: mockSystemConfig,
    loading: false,
    error: null,
  }),
}));

// Mock contentFilter
vi.mock('../../utils/contentFilter', () => ({
  validateContent: vi.fn(() => null), // no profanity by default
}));

const mockOnComplete = vi.fn();

describe('NPCCreator', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    vi.mocked(addDoc).mockResolvedValue({ id: 'new-npc-id' } as any);
    vi.mocked(updateDoc).mockResolvedValue();
  });

  it('renders the first field (name)', () => {
    render(<NPCCreator reservation={mockReservation} onComplete={mockOnComplete} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Character name')).toBeInTheDocument();
  });

  it('shows step counter', () => {
    render(<NPCCreator reservation={mockReservation} onComplete={mockOnComplete} />);
    expect(screen.getByText(/Step 1 of 6/)).toBeInTheDocument();
  });

  it('shows progress bar', () => {
    const { container } = render(<NPCCreator reservation={mockReservation} onComplete={mockOnComplete} />);
    expect(container.querySelector('.npc-progress')).toBeInTheDocument();
    expect(container.querySelector('.npc-progress-fill')).toBeInTheDocument();
  });

  it('validates required field before advancing', async () => {
    render(<NPCCreator reservation={mockReservation} onComplete={mockOnComplete} />);
    // Click Next without entering a name
    await user.click(screen.getByText('Next →'));
    expect(screen.getByText('Name is required')).toBeInTheDocument();
  });

  it('advances to next step when field is valid', async () => {
    render(<NPCCreator reservation={mockReservation} onComplete={mockOnComplete} />);
    fireEvent.change(screen.getByPlaceholderText('Character name'), { target: { value: 'Dale Cooper' } });
    await user.click(screen.getByText('Next →'));
    // Should now be on step 2 (occupation)
    expect(screen.getByText(/Step 2 of 6/)).toBeInTheDocument();
    expect(screen.getByText('Occupation')).toBeInTheDocument();
  });

  it('shows occupation suggestions from showConfig', async () => {
    render(<NPCCreator reservation={mockReservation} onComplete={mockOnComplete} />);
    // Go to occupation step
    fireEvent.change(screen.getByPlaceholderText('Character name'), { target: { value: 'Dale Cooper' } });
    await user.click(screen.getByText('Next →'));
    
    expect(screen.getByText('Bartender')).toBeInTheDocument();
    expect(screen.getByText('Mechanic')).toBeInTheDocument();
    expect(screen.getByText('Nurse')).toBeInTheDocument();
    expect(screen.getByText('Teacher')).toBeInTheDocument();
  });

  it('clicking occupation suggestion fills the field', async () => {
    render(<NPCCreator reservation={mockReservation} onComplete={mockOnComplete} />);
    fireEvent.change(screen.getByPlaceholderText('Character name'), { target: { value: 'Dale Cooper' } });
    await user.click(screen.getByText('Next →'));

    await user.click(screen.getByText('Bartender'));
    // The suggestion chip should be marked active
    expect(screen.getByText('Bartender')).toHaveClass('active');
  });

  it('back button goes to previous step', async () => {
    render(<NPCCreator reservation={mockReservation} onComplete={mockOnComplete} />);
    fireEvent.change(screen.getByPlaceholderText('Character name'), { target: { value: 'Dale Cooper' } });
    await user.click(screen.getByText('Next →'));
    expect(screen.getByText(/Step 2/)).toBeInTheDocument();

    await user.click(screen.getByText('← Back'));
    expect(screen.getByText(/Step 1/)).toBeInTheDocument();
  });

  it('no back button on first step', () => {
    render(<NPCCreator reservation={mockReservation} onComplete={mockOnComplete} />);
    expect(screen.queryByText('← Back')).not.toBeInTheDocument();
  });

  it('full wizard flow through to review and submit', async () => {
    render(<NPCCreator reservation={mockReservation} onComplete={mockOnComplete} />);

    // Step 1: Name
    fireEvent.change(screen.getByPlaceholderText('Character name'), { target: { value: 'Dale Cooper' } });
    await user.click(screen.getByText('Next →'));

    // Step 2: Occupation
    fireEvent.change(screen.getByPlaceholderText('What they do'), { target: { value: 'Bartender' } });
    await user.click(screen.getByText('Next →'));

    // Step 3: Appearance (textarea)
    fireEvent.change(screen.getByPlaceholderText('What they look like'), { target: { value: 'Tall with a mullet' } });
    await user.click(screen.getByText('Next →'));

    // Step 4: Secret (textarea)
    fireEvent.change(screen.getByPlaceholderText('A hidden truth'), { target: { value: 'Afraid of the dark' } });
    await user.click(screen.getByText('Next →'));

    // Step 5: Best Stat (select)
    const bestSelect = screen.getByRole('combobox');
    await user.selectOptions(bestSelect, 'charm');
    await user.click(screen.getByText('Next →'));

    // Step 6: Worst Stat (select)
    const worstSelect = screen.getByRole('combobox');
    await user.selectOptions(worstSelect, 'brawn');
    await user.click(screen.getByText('Review →'));

    // Review step
    expect(screen.getByText('Review Your Character')).toBeInTheDocument();
    expect(screen.getByText('Dale Cooper')).toBeInTheDocument();
    expect(screen.getByText('Bartender')).toBeInTheDocument();
    expect(screen.getByText('Charm')).toBeInTheDocument();
    expect(screen.getByText('Brawn')).toBeInTheDocument();

    // Submit
    await user.click(screen.getByText('Submit Character'));

    await waitFor(() => {
      expect(addDoc).toHaveBeenCalledOnce();
      expect(mockOnComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'new-npc-id',
          name: 'Dale Cooper',
          occupation: 'Bartender',
          bestStat: 'charm',
          worstStat: 'brawn',
        })
      );
    });
  });

  it('disables bestStat option in worstStat selector', async () => {
    render(<NPCCreator reservation={mockReservation} onComplete={mockOnComplete} />);

    // Navigate to bestStat step
    fireEvent.change(screen.getByPlaceholderText('Character name'), { target: { value: 'Test' } });
    await user.click(screen.getByText('Next →'));
    fireEvent.change(screen.getByPlaceholderText('What they do'), { target: { value: 'Test' } });
    await user.click(screen.getByText('Next →'));
    fireEvent.change(screen.getByPlaceholderText('What they look like'), { target: { value: 'Test' } });
    await user.click(screen.getByText('Next →'));
    fireEvent.change(screen.getByPlaceholderText('A hidden truth'), { target: { value: 'Test' } });
    await user.click(screen.getByText('Next →'));

    // Select "charm" as best stat
    await user.selectOptions(screen.getByRole('combobox'), 'charm');
    await user.click(screen.getByText('Next →'));

    // On worst stat step, "charm" option should be disabled
    const charmOption = screen.getByRole('option', { name: 'Charm' }) as HTMLOptionElement;
    expect(charmOption).toBeDisabled();
  });
});

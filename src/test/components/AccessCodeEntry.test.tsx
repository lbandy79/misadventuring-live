import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AccessCodeEntry from '../../components/Reservation/AccessCodeEntry';
import { getDocs } from 'firebase/firestore';
import { mockReservation } from '../fixtures/systemConfig';

const mockOnAuthenticated = vi.fn();
const mockOnRequestReservation = vi.fn();
const defaultProps = {
  showId: 'betawave-last-call-2026-04-18',
  onAuthenticated: mockOnAuthenticated,
  onRequestReservation: mockOnRequestReservation,
};

/** Get all 6 code box inputs */
function getBoxes() {
  return screen.getAllByRole('textbox').filter(el =>
    (el as HTMLInputElement).getAttribute('aria-label')?.startsWith('Character')
  ) as HTMLInputElement[];
}

/** Fill all 6 boxes with a code string */
function fillCode(code: string) {
  const boxes = getBoxes();
  for (let i = 0; i < code.length && i < boxes.length; i++) {
    fireEvent.change(boxes[i], { target: { value: code[i] } });
  }
}

describe('AccessCodeEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the code entry form with in-fiction copy', () => {
    render(<AccessCodeEntry {...defaultProps} />);
    expect(screen.getByText('play the tape.')).toBeInTheDocument();
    expect(screen.getByText('enter your 6-character access code')).toBeInTheDocument();
  });

  it('renders 6 code boxes', () => {
    render(<AccessCodeEntry {...defaultProps} />);
    expect(getBoxes()).toHaveLength(6);
  });

  it('renders the reserve-your-spot button', () => {
    render(<AccessCodeEntry {...defaultProps} />);
    expect(screen.getByText('reserve your spot')).toBeInTheDocument();
  });

  it('calls onRequestReservation when clicking reserve button', () => {
    render(<AccessCodeEntry {...defaultProps} />);
    fireEvent.click(screen.getByText('reserve your spot'));
    expect(mockOnRequestReservation).toHaveBeenCalledOnce();
  });

  it('uppercases input in boxes', () => {
    render(<AccessCodeEntry {...defaultProps} />);
    const boxes = getBoxes();
    fireEvent.change(boxes[0], { target: { value: 'a' } });
    // The component uppercases — the value is tracked in state, box re-renders
    expect(boxes[0]).toHaveValue('A');
  });

  it('shows error for codes shorter than 6 characters', () => {
    render(<AccessCodeEntry {...defaultProps} />);
    fillCode('ABC');
    // Submit the form
    fireEvent.submit(screen.getByRole('group', { name: 'Access code' }).closest('form')!);
    expect(screen.getByText('Access codes are 6 characters')).toBeInTheDocument();
  });

  it('submit button is disabled when code length is not 6', () => {
    render(<AccessCodeEntry {...defaultProps} />);
    expect(screen.getByText('ENTER')).toBeDisabled();
  });

  it('submit button is enabled when code length is 6', () => {
    render(<AccessCodeEntry {...defaultProps} />);
    fillCode('ABC123');
    expect(screen.getByText('ENTER')).not.toBeDisabled();
  });

  it('calls getDocs and authenticates on valid code', async () => {
    const mockSnapshot = {
      empty: false,
      docs: [{
        id: mockReservation.id,
        data: () => {
          const { id, ...rest } = mockReservation;
          return rest;
        },
      }],
    };
    vi.mocked(getDocs).mockResolvedValueOnce(mockSnapshot as any);

    render(<AccessCodeEntry {...defaultProps} />);
    fillCode('ABC123');
    fireEvent.click(screen.getByText('ENTER'));

    await waitFor(() => {
      expect(mockOnAuthenticated).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'res-001', accessCode: 'ABC123' })
      );
    });
  });

  it('shows error when code is not found', async () => {
    vi.mocked(getDocs).mockResolvedValueOnce({ empty: true, docs: [] } as any);

    render(<AccessCodeEntry {...defaultProps} />);
    fillCode('XXXXXX');
    fireEvent.click(screen.getByText('ENTER'));

    await waitFor(() => {
      expect(screen.getByText('Code not found. Check your code and try again.')).toBeInTheDocument();
    });
  });

  it('shows generic error on firebase failure', async () => {
    vi.mocked(getDocs).mockRejectedValueOnce(new Error('Network error'));

    render(<AccessCodeEntry {...defaultProps} />);
    fillCode('ABC123');
    fireEvent.click(screen.getByText('ENTER'));

    await waitFor(() => {
      expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument();
    });
  });

  it('stores reservation in localStorage on success', async () => {
    const mockSnapshot = {
      empty: false,
      docs: [{
        id: mockReservation.id,
        data: () => {
          const { id, ...rest } = mockReservation;
          return rest;
        },
      }],
    };
    vi.mocked(getDocs).mockResolvedValueOnce(mockSnapshot as any);

    render(<AccessCodeEntry {...defaultProps} />);
    fillCode('ABC123');
    fireEvent.click(screen.getByText('ENTER'));

    await waitFor(() => {
      const stored = localStorage.getItem('mtp-reservation-betawave-last-call-2026-04-18');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!).accessCode).toBe('ABC123');
    });
  });
});

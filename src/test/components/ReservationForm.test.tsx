import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReservationForm from '../../components/Reservation/ReservationForm';
import { getDocs, addDoc } from 'firebase/firestore';

const mockOnCreated = vi.fn();
const mockOnBack = vi.fn();
const defaultProps = {
  showId: 'betawave-last-call-2026-04-18',
  showName: 'The Betawave Tapes: Last Call',
  onReservationCreated: mockOnCreated,
  onBack: mockOnBack,
};

describe('ReservationForm', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    // Default: no existing reservation
    vi.mocked(getDocs).mockResolvedValue({ empty: true, docs: [] } as any);
    vi.mocked(addDoc).mockResolvedValue({ id: 'new-res-id' } as any);
  });

  it('renders name and email fields', () => {
    render(<ReservationForm {...defaultProps} />);
    expect(screen.getByLabelText('Your Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('renders show name', () => {
    render(<ReservationForm {...defaultProps} />);
    expect(screen.getByText('The Betawave Tapes: Last Call')).toBeInTheDocument();
  });

  it('shows back button that calls onBack', async () => {
    render(<ReservationForm {...defaultProps} />);
    await user.click(screen.getByText('← i already have a code'));
    expect(mockOnBack).toHaveBeenCalledOnce();
  });

  it('validates empty name', async () => {
    render(<ReservationForm {...defaultProps} />);
    const emailInput = screen.getByLabelText('Email');
    fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
    await user.click(screen.getByText('get my code'));
    expect(screen.getByText('Please enter your name')).toBeInTheDocument();
  });

  it('validates invalid email', async () => {
    render(<ReservationForm {...defaultProps} />);
    const nameInput = screen.getByLabelText('Your Name');
    const emailInput = screen.getByLabelText('Email');
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    // Use a value that passes HTML5 email validation (has @) but fails the component regex (no dot in domain)
    fireEvent.change(emailInput, { target: { value: 'test@invalid' } });
    await user.click(screen.getByText('get my code'));
    expect(screen.getByText('Please enter a valid email')).toBeInTheDocument();
  });

  it('creates reservation and shows code on successful submit', async () => {
    render(<ReservationForm {...defaultProps} />);
    const nameInput = screen.getByLabelText('Your Name');
    const emailInput = screen.getByLabelText('Email');
    fireEvent.change(nameInput, { target: { value: 'Dale Cooper' } });
    fireEvent.change(emailInput, { target: { value: 'dale@twinpeaks.com' } });
    await user.click(screen.getByText('get my code'));

    await waitFor(() => {
      expect(addDoc).toHaveBeenCalledOnce();
      expect(screen.getByText("you're in.")).toBeInTheDocument();
    });
  });

  it('detects existing reservation and shows their code', async () => {
    const existingReservation = {
      accessCode: 'XYZ789',
      name: 'Dale Cooper',
      email: 'dale@twinpeaks.com',
      showId: 'betawave-last-call-2026-04-18',
      npcCreated: false,
      createdAt: Date.now(),
    };
    vi.mocked(getDocs).mockResolvedValueOnce({
      empty: false,
      docs: [{
        id: 'existing-id',
        data: () => existingReservation,
      }],
    } as any);

    render(<ReservationForm {...defaultProps} />);
    fireEvent.change(screen.getByLabelText('Your Name'), { target: { value: 'Dale Cooper' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'dale@twinpeaks.com' } });
    await user.click(screen.getByText('get my code'));

    // Component shows the code reveal view with existing code
    await waitFor(() => {
      expect(screen.getByText('XYZ789')).toBeInTheDocument();
      expect(addDoc).not.toHaveBeenCalled();
    });
  });

  it('shows error on firebase failure', async () => {
    vi.mocked(getDocs).mockResolvedValueOnce({ empty: true, docs: [] } as any);
    vi.mocked(addDoc).mockRejectedValueOnce(new Error('Firebase error'));

    render(<ReservationForm {...defaultProps} />);
    fireEvent.change(screen.getByLabelText('Your Name'), { target: { value: 'Dale Cooper' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'dale@twinpeaks.com' } });
    await user.click(screen.getByText('get my code'));

    await waitFor(() => {
      expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument();
    });
  });
});

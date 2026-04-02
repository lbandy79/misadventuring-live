import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StatSelector from '../../components/NPCCreator/StatSelector';
import { mockSystemConfig } from '../fixtures/systemConfig';

const { stats } = mockSystemConfig;
const defaultProps = {
  stats,
  value: '',
  onChange: () => {},
  label: 'Best Stat',
  helpText: 'Pick the stat they excel at.',
};

describe('StatSelector', () => {
  it('renders the label', () => {
    render(<StatSelector {...defaultProps} />);
    expect(screen.getByText('Best Stat')).toBeInTheDocument();
  });

  it('renders help text', () => {
    render(<StatSelector {...defaultProps} />);
    expect(screen.getByText('Pick the stat they excel at.')).toBeInTheDocument();
  });

  it('renders a select with all 6 stats plus placeholder', () => {
    render(<StatSelector {...defaultProps} />);
    const select = screen.getByRole('combobox');
    // 6 stats + "Choose a stat..." placeholder
    expect(select.querySelectorAll('option')).toHaveLength(7);
  });

  it('renders stat names as options', () => {
    render(<StatSelector {...defaultProps} />);
    expect(screen.getByText('Brains')).toBeInTheDocument();
    expect(screen.getByText('Charm')).toBeInTheDocument();
    expect(screen.getByText('Grit')).toBeInTheDocument();
  });

  it('disables the disabledStatId option', () => {
    render(<StatSelector {...defaultProps} disabledStatId="brains" />);
    const brainsOption = screen.getByRole('option', { name: 'Brains' }) as HTMLOptionElement;
    expect(brainsOption.disabled).toBe(true);
  });

  it('calls onChange when selecting a stat', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(<StatSelector {...defaultProps} onChange={handleChange} />);
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'charm');
    expect(handleChange).toHaveBeenCalledWith('charm');
  });

  it('shows stat description when a stat is selected', () => {
    render(<StatSelector {...defaultProps} value="charm" />);
    expect(screen.getByText('Social skills.')).toBeInTheDocument();
  });

  it('shows likelyVerbs when a stat is selected', () => {
    render(<StatSelector {...defaultProps} value="charm" />);
    expect(screen.getByText(/persuade, lie/)).toBeInTheDocument();
  });

  it('displays error message when error prop is set', () => {
    render(<StatSelector {...defaultProps} error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });
});

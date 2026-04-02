import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CharacterCard from '../../components/NPCCreator/CharacterCard';
import { mockNPC, mockSystemConfig } from '../fixtures/systemConfig';

// Mock useSystemConfig to return our fixture
vi.mock('../../hooks/useSystemConfig', () => ({
  useSystemConfig: () => ({ config: mockSystemConfig, loading: false, error: null }),
  getStatById: (config: any, statId: string) => config.stats.find((s: any) => s.id === statId),
  getStatName: (config: any, statId: string) => config.stats.find((s: any) => s.id === statId)?.name ?? statId,
}));

describe('CharacterCard', () => {
  it('renders the character name', () => {
    render(<CharacterCard npc={mockNPC} />);
    expect(screen.getByText('Dale Cooper')).toBeInTheDocument();
  });

  it('renders the occupation', () => {
    render(<CharacterCard npc={mockNPC} />);
    expect(screen.getByText('Bartender')).toBeInTheDocument();
  });

  it('renders the appearance', () => {
    render(<CharacterCard npc={mockNPC} />);
    expect(screen.getByText('Tall guy with a mullet and a denim jacket.')).toBeInTheDocument();
  });

  it('does NOT render the secret', () => {
    render(<CharacterCard npc={mockNPC} />);
    expect(screen.queryByText('Sleepwalks into the woods every full moon.')).not.toBeInTheDocument();
  });

  it('shows the series name', () => {
    render(<CharacterCard npc={mockNPC} />);
    expect(screen.getByText('The Betawave Tapes')).toBeInTheDocument();
  });

  it('shows best stat name', () => {
    render(<CharacterCard npc={mockNPC} />);
    // bestStat is "charm" → "Charm"
    expect(screen.getByText('Charm')).toBeInTheDocument();
  });

  it('shows worst stat name', () => {
    render(<CharacterCard npc={mockNPC} />);
    // worstStat is "brains" → "Brains"
    expect(screen.getByText('Brains')).toBeInTheDocument();
  });

  it('shows die labels from statAssignment', () => {
    render(<CharacterCard npc={mockNPC} />);
    // best die is d20, worst is d4
    expect(screen.getByText('d20')).toBeInTheDocument();
    expect(screen.getByText('d4')).toBeInTheDocument();
  });

  it('renders VHS overlay elements', () => {
    const { container } = render(<CharacterCard npc={mockNPC} />);
    expect(container.querySelector('.vhs-scanlines')).toBeInTheDocument();
    expect(container.querySelector('.vhs-noise')).toBeInTheDocument();
  });

  it('shows tape number and show name in footer', () => {
    render(<CharacterCard npc={mockNPC} />);
    expect(screen.getByText(/TAPE #1/)).toBeInTheDocument();
  });

  it('shows era and location in footer', () => {
    render(<CharacterCard npc={mockNPC} />);
    expect(screen.getByText(/1991/)).toBeInTheDocument();
    expect(screen.getByText(/Winter Garden, FL/)).toBeInTheDocument();
  });
});

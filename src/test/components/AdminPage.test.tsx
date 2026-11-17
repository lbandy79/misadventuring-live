/**
 * AdminPage — the tabbed GM panel.
 *
 * Every panel is replaced with a labelled stub: this only checks which
 * panels land on which tab. Nothing here touches Firestore.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminPage from '../../../platform/src/pages/AdminPage';

let currentShowId = 'greenoaks-2026-11-28';
let auth: Record<string, unknown> = {};

vi.mock('@mtp/lib', () => ({
  shows: [
    { id: 'green-oaks', name: 'Green Oaks', systemId: 'green-oaks', audienceMode: 'npc-creation', era: 'upcoming' },
    { id: 'mad-libs-honey-heist', name: 'Honey Heist', systemId: 'honey-heist', audienceMode: 'npc-creation', era: 'past' },
    { id: 'monster-of-the-week', name: 'MotW', systemId: 'monster-of-the-week', audienceMode: 'monster-builder', era: 'upcoming' },
  ],
  useAuth: () => auth,
  useShow: () => ({ showId: currentShowId }),
}));

vi.mock('@mtp/data/liveMonster', () => ({
  getMonsterConfig: (id: string) => (id.startsWith('monster-of-the-week-') ? {} : null),
}));

// vi.mock is hoisted above normal declarations, so the stub factory has to be too.
const { stub } = vi.hoisted(() => ({
  // Trailing space keeps neighbouring stubs readable as separate words.
  stub: (label: string) => ({ default: () => `${label} ` }),
}));
vi.mock('../../../platform/src/components/admin/CastAdminPanel', () => stub('panel:cast'));
vi.mock('../../../platform/src/components/admin/SbpRulesAdminPanel', () => stub('panel:sbp-rules'));
vi.mock('../../../platform/src/components/admin/SbpArtAdminPanel', () => stub('panel:sbp-art'));
vi.mock('../../../platform/src/components/admin/LiveMonsterAdminPanel', () => stub('panel:live-monster'));
vi.mock('../../../platform/src/components/admin/AudienceAdminPanel', () => stub('panel:audience'));
vi.mock('../../../platform/src/components/admin/NpcAdminPanel', () => ({
  default: ({ showName }: { showName: string }) => <div>panel:npc:{showName}</div>,
}));
vi.mock('../../../platform/src/features/rumor-mill', () => ({
  RumorMillAdminPanel: ({ showSlug }: { showSlug: string }) => <div>panel:rumors:{showSlug}</div>,
}));
// Honey Heist uses stingers (keeps the old NPC panel); Green Oaks doesn't
// (gets the Townies panel).
vi.mock('../../../platform/src/features/townies', () => ({
  useTowniesConfig: (systemId: string) => ({
    status: 'ready',
    config: { showId: `${systemId}-episode`, showName: systemId, fields: [], usesStingers: systemId === 'honey-heist' },
  }),
  TowniesAdminPanel: ({ systemId }: { systemId: string }) => <div>panel:townies:{systemId}</div>,
}));

const renderAt = (url = '/admin') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <AdminPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  window.localStorage.clear();
  currentShowId = 'greenoaks-2026-11-28';
  auth = { user: { email: 'gm@example.com', displayName: 'GM' }, isAdmin: true, isLoading: false, isAdminLoading: false, signIn: vi.fn() };
});

describe('AdminPage tabs', () => {
  it('opens on Show night with only the current show\'s controls', () => {
    renderAt();
    expect(screen.getByRole('tab', { name: 'Show night' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('panel:rumors:green-oaks')).toBeInTheDocument();
    expect(screen.getByText('panel:townies:green-oaks')).toBeInTheDocument();
    // Not on this tab: past shows, the email list, cast and Labs uploads.
    expect(screen.queryByText('panel:npc:Honey Heist')).not.toBeInTheDocument();
    expect(screen.queryByText('panel:audience')).not.toBeInTheDocument();
    expect(screen.queryByText('panel:cast')).not.toBeInTheDocument();
    expect(screen.queryByText('panel:sbp-rules')).not.toBeInTheDocument();
  });

  it('puts the Rumor Mill above the townie roster', () => {
    renderAt();
    const rumors = screen.getByText('panel:rumors:green-oaks');
    const roster = screen.getByText('panel:townies:green-oaks');
    expect(rumors.compareDocumentPosition(roster) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('hides the Live Monster panel unless the current show is a MotW episode', () => {
    renderAt();
    expect(screen.queryByText('panel:live-monster')).not.toBeInTheDocument();
    expect(screen.getByText(/shows up here when the current show is a monster of the week/i)).toBeInTheDocument();
  });

  it('shows the Live Monster panel on a MotW night', () => {
    currentShowId = 'monster-of-the-week-2026-10-24';
    renderAt();
    expect(screen.getByText(/panel:live-monster/)).toBeInTheDocument();
  });

  it('Audience tab holds the email list', async () => {
    renderAt();
    await userEvent.click(screen.getByRole('tab', { name: 'Audience' }));
    expect(screen.getByText(/panel:audience/)).toBeInTheDocument();
    expect(screen.queryByText('panel:rumors:green-oaks')).not.toBeInTheDocument();
  });

  it('Team tab holds cast and the SBP uploads', async () => {
    renderAt();
    await userEvent.click(screen.getByRole('tab', { name: 'Team' }));
    expect(screen.getByText(/panel:cast/)).toBeInTheDocument();
    expect(screen.getByText(/panel:sbp-rules/)).toBeInTheDocument();
    expect(screen.getByText(/panel:sbp-art/)).toBeInTheDocument();
  });

  it('Past shows tab holds finished shows only', async () => {
    renderAt();
    await userEvent.click(screen.getByRole('tab', { name: 'Past shows' }));
    expect(screen.getByText('panel:npc:Honey Heist')).toBeInTheDocument();
    expect(screen.queryByText('panel:townies:green-oaks')).not.toBeInTheDocument();
  });

  it('opens the tab named in the URL', () => {
    renderAt('/admin?tab=team');
    expect(screen.getByRole('tab', { name: 'Team' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(/panel:cast/)).toBeInTheDocument();
  });

  it('remembers the last tab used on this device', async () => {
    const first = renderAt();
    await userEvent.click(screen.getByRole('tab', { name: 'Audience' }));
    first.unmount();
    renderAt();
    expect(screen.getByRole('tab', { name: 'Audience' })).toHaveAttribute('aria-selected', 'true');
  });

  it('ignores a junk tab in the URL', () => {
    renderAt('/admin?tab=nonsense');
    expect(screen.getByRole('tab', { name: 'Show night' })).toHaveAttribute('aria-selected', 'true');
  });

  it('moves between tabs with the arrow keys', async () => {
    renderAt();
    screen.getByRole('tab', { name: 'Show night' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Audience' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Audience' })).toHaveFocus();
  });

  it('still shows no panels to someone who is not an admin', () => {
    auth = { ...auth, isAdmin: false };
    renderAt();
    expect(screen.getByText(/not an admin/i)).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });
});

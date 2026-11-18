/**
 * Big screen — GM picker, phone "On the big screen" page, townie card lines.
 *
 * Firestore is fully mocked: nothing here reads or writes live data.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PhoneScreenPage, ScreenPickerPanel } from '../../../platform/src/features/big-screen';
import { townieLines } from '../../../platform/src/components/display/NpcDisplayRow';

const SHOW = 'greenoaks-2026-11-28';

let session = { open: true, trumpSuit: null as string | null, boardOn: false };
let selection: Record<string, unknown> | null = null;
let npcs: Array<Record<string, unknown>> = [];
let rumors: Array<Record<string, unknown>> = [];

const setRumorMill = vi.fn(() => Promise.resolve());
const setWorldSelection = vi.fn(() => Promise.resolve());

vi.mock('@mtp/lib', () => ({
  getShow: (id: string) =>
    id === 'green-oaks' ? { id: 'green-oaks', name: 'Green Oaks', systemId: 'green-oaks', accentColor: '#00698f' } : undefined,
}));
vi.mock('@mtp/lib/rumors', async () => ({
  ...(await vi.importActual<object>('../../lib/rumors/cards')),
  MAX_RUMORS_PER_PERSON: 3,
  RUMOR_MAX_LENGTH: 140,
  DEFAULT_SESSION: { open: false, trumpSuit: null, boardOn: false },
  setRumorMill: (...a: unknown[]) => setRumorMill(...(a as [])),
  subscribeToCirculatingRumors: (_s: string, cb: (r: unknown[]) => void) => { cb(rumors); return () => {}; },
}));
vi.mock('@mtp/lib/npcs/npcApi', () => ({
  setWorldSelection: (...a: unknown[]) => setWorldSelection(...(a as [])),
  subscribeToWorldSelection: (_s: string, cb: (w: unknown) => void) => { cb(selection); return () => {}; },
  subscribeToNpcs: (_s: string, cb: (n: unknown[]) => void) => { cb(npcs); return () => {}; },
  subscribeToDisplayNpcs: (_s: string, cb: (n: unknown[]) => void) => {
    cb(npcs.filter((n) => n.showOnDisplay));
    return () => {};
  },
}));
vi.mock('../../../platform/src/features/rumor-mill', async () => {
  const { resolveRumorMillConfig } = await vi.importActual<typeof import('../../../platform/src/features/rumor-mill/config')>(
    '../../../platform/src/features/rumor-mill/config',
  );
  const { splitByline } = await vi.importActual<{ splitByline: (s: string) => [string, string] }>(
    '../../../platform/src/features/rumor-mill/components/RumorBoard',
  );
  return {
    useRumorMillForSystem: () => ({ showId: SHOW, showName: 'Green Oaks', config: resolveRumorMillConfig({}) }),
    useRumorMillSession: () => session,
    splitByline,
    RumorBoard: () => null,
    VerdictStamp: ({ verdict }: { verdict: string }) => <span>{verdict === 'true' ? 'TRUE' : 'HOGWASH'}</span>,
  };
});

const townie = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  id,
  showId: SHOW,
  displayName: name,
  fieldValues: { adjective: 'very sweaty', occupation: 'bingo caller', reputation: 'talk to the geese' },
  showOnDisplay: true,
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  session = { open: true, trumpSuit: null, boardOn: false };
  selection = null;
  npcs = [];
  rumors = [];
});

describe('townieLines', () => {
  it('reads Green Oaks fields', () => {
    expect(townieLines(townie('a', 'Dolores'))).toEqual({
      name: 'Dolores',
      role: 'very sweaty bingo caller',
      known: 'they talk to the geese',
    });
  });
  it('still reads Honey Heist fields', () => {
    expect(
      townieLines({ id: 'b', displayName: 'Bear', fieldValues: { adjective: 'grumpy', job_title: 'safecracker', tagline: 'hates bees' } }),
    ).toEqual({ name: 'Bear', role: 'grumpy safecracker', known: 'reportedly hates bees' });
  });
});

describe('ScreenPickerPanel', () => {
  const renderPicker = () =>
    render(
      <MemoryRouter>
        <ScreenPickerPanel showSlug="green-oaks" systemId="green-oaks" />
      </MemoryRouter>,
    );

  it('shows which mode is on', () => {
    session.boardOn = true;
    selection = { displayMode: 'cast' };
    renderPicker();
    expect(screen.getByRole('button', { name: 'Both' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Off' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('switching to Both turns on the board and the townies together', async () => {
    renderPicker();
    await userEvent.click(screen.getByRole('button', { name: 'Both' }));
    expect(setRumorMill).toHaveBeenCalledWith(SHOW, { boardOn: true });
    expect(setWorldSelection).toHaveBeenCalledWith(SHOW, { displayMode: 'cast' });
  });

  it('switching Off takes both down', async () => {
    session.boardOn = true;
    selection = { displayMode: 'cast' };
    renderPicker();
    await userEvent.click(screen.getByRole('button', { name: 'Off' }));
    expect(setRumorMill).toHaveBeenCalledWith(SHOW, { boardOn: false });
    expect(setWorldSelection).toHaveBeenCalledWith(SHOW, { displayMode: 'hidden' });
  });

  it('warns before marked townies squish the Both screen', () => {
    session.boardOn = true;
    selection = { displayMode: 'cast' };
    npcs = Array.from({ length: 10 }, (_, i) => townie(`n${i}`, `T${i}`));
    renderPicker();
    expect(screen.getByText(/10 townies marked, but both fits 9/i)).toBeInTheDocument();
    expect(screen.getByText(/unmark 1/i)).toBeInTheDocument();
  });

  it('says so when the switch fails', async () => {
    setRumorMill.mockRejectedValueOnce(new Error('permission-denied'));
    renderPicker();
    await userEvent.click(screen.getByRole('button', { name: 'Rumors' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/didn't switch/i);
  });
});

describe('PhoneScreenPage', () => {
  const renderPhone = () =>
    render(
      <MemoryRouter initialEntries={['/shows/green-oaks/screen']}>
        <Routes>
          <Route path="/shows/:showId/screen" element={<PhoneScreenPage />} />
        </Routes>
      </MemoryRouter>,
    );

  it('says nothing is up when the screen is off', async () => {
    npcs = [townie('a', 'Dolores')];
    renderPhone();
    expect(await screen.findByText(/nothing on the big screen/i)).toBeInTheDocument();
    expect(screen.queryByText('Dolores')).not.toBeInTheDocument();
  });

  it('mirrors Both: marked townies and rumors in circulation, with stamps', async () => {
    session.boardOn = true;
    selection = { displayMode: 'cast' };
    npcs = [townie('a', 'Dolores'), townie('b', 'Unmarked Ulf', { showOnDisplay: false })];
    rumors = [
      { id: 'r1', npcName: 'Gus, the pharmacist', text: 'the geese are organized', status: 'circulating', verdict: 'true' },
      { id: 'r2', npcName: 'Marge', text: 'Tuesday meatloaf is not meatloaf', status: 'circulating' },
    ];
    renderPhone();
    expect(await screen.findByText('Dolores')).toBeInTheDocument();
    expect(screen.queryByText('Unmarked Ulf')).not.toBeInTheDocument();
    expect(screen.getByText('they talk to the geese')).toBeInTheDocument();
    expect(screen.getByText('the geese are organized')).toBeInTheDocument();
    expect(screen.getByText('TRUE')).toBeInTheDocument();
    expect(screen.getByText('Tuesday meatloaf is not meatloaf')).toBeInTheDocument();
  });

  it('shows only rumors when the screen is on Rumors', async () => {
    session.boardOn = true;
    npcs = [townie('a', 'Dolores')];
    rumors = [{ id: 'r1', npcName: 'Gus', text: 'someone is digging at night', status: 'circulating' }];
    renderPhone();
    expect(await screen.findByText('someone is digging at night')).toBeInTheDocument();
    expect(screen.queryByText('Dolores')).not.toBeInTheDocument();
  });

  it('handles an unknown show', () => {
    render(
      <MemoryRouter initialEntries={['/shows/nope/screen']}>
        <Routes>
          <Route path="/shows/:showId/screen" element={<PhoneScreenPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(/doesn't exist/i)).toBeInTheDocument();
  });
});

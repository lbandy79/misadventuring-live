/**
 * TowniesAdminPanel — Green Oaks GM controls for townies.
 *
 * Firestore is fully mocked: nothing here reads or writes live data.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TowniesAdminPanel } from '../../../platform/src/features/townies';
import type { TowniesShowConfig } from '../../../platform/src/features/townies';

const SHOW = 'greenoaks-2026-11-28';

let npcs: Array<Record<string, unknown>> = [];
let selection: Record<string, unknown> | null = null;

const createNpc = vi.fn(() => Promise.resolve({}));
const archiveNpc = vi.fn(() => Promise.resolve());
const deleteNpc = vi.fn(() => Promise.resolve());
const setNpcDisplay = vi.fn(() => Promise.resolve());
const setAllNpcsDisplay = vi.fn(() => Promise.resolve());
const setWorldSelection = vi.fn(() => Promise.resolve());
const listRumorsForNpc = vi.fn(() => Promise.resolve([{ id: 'r1' }, { id: 'r2' }]));
const deleteRumors = vi.fn(() => Promise.resolve());
const withdrawRumorsForNpc = vi.fn(() => Promise.resolve(1));

vi.mock('@mtp/lib/npcs/npcApi', () => ({
  subscribeToNpcs: (_s: string, cb: (n: unknown[]) => void) => { cb(npcs); return () => {}; },
  subscribeToWorldSelection: (_s: string, cb: (w: unknown) => void) => { cb(selection); return () => {}; },
  createNpc: (...a: unknown[]) => createNpc(...(a as [])),
  archiveNpc: (...a: unknown[]) => archiveNpc(...(a as [])),
  deleteNpc: (...a: unknown[]) => deleteNpc(...(a as [])),
  setNpcDisplay: (...a: unknown[]) => setNpcDisplay(...(a as [])),
  setAllNpcsDisplay: (...a: unknown[]) => setAllNpcsDisplay(...(a as [])),
  setWorldSelection: (...a: unknown[]) => setWorldSelection(...(a as [])),
}));
vi.mock('@mtp/lib/rumors', () => ({
  listRumorsForNpc: (...a: unknown[]) => listRumorsForNpc(...(a as [])),
  deleteRumors: (...a: unknown[]) => deleteRumors(...(a as [])),
  withdrawRumorsForNpc: (...a: unknown[]) => withdrawRumorsForNpc(...(a as [])),
}));

let boardOn = false;
vi.mock('../../../platform/src/features/rumor-mill', () => ({
  useRumorMillSession: () => ({ open: true, trumpSuit: null, boardOn }),
}));
// Only the warning and the mode logic are used here; the real files, not
// the whole big-screen feature (which pulls in the projector and phone page).
vi.mock('../../../platform/src/features/big-screen', async () => ({
  ...(await vi.importActual<object>('../../../platform/src/features/big-screen/screenMode')),
  ...(await vi.importActual<object>('../../../platform/src/features/big-screen/components/CrowdingWarning')),
}));

const config: TowniesShowConfig = {
  showId: SHOW,
  showName: 'Green Oaks',
  usesStingers: false,
  namePlaceholder: 'Dolores, Gus…',
  fields: [
    { id: 'adjective', type: 'ADJECTIVE', label: 'Adjective', fieldType: 'personal', options: ['very sweaty', 'deeply Lutheran'] },
    { id: 'occupation', type: 'A JOB', label: 'Job', fieldType: 'personal', options: ['bingo caller', 'mayor'] },
  ],
};

const townie = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  id,
  showId: SHOW,
  displayName: name,
  fieldValues: { adjective: 'very sweaty', occupation: 'bingo caller' },
  deviceToken: 'device-1',
  isActive: true,
  showOnDisplay: false,
  ...extra,
});

const renderPanel = () => render(<TowniesAdminPanel systemId="green-oaks" config={config} />);

beforeEach(() => {
  vi.clearAllMocks();
  npcs = [townie('n1', 'Harry'), townie('n2', 'Dolores', { showOnDisplay: true, deviceToken: 'gm-abc' })];
  selection = null;
  boardOn = false;
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

describe('TowniesAdminPanel', () => {
  it('lists townies with their fields, and has none of the stinger tools', () => {
    renderPanel();
    expect(screen.getByText('Harry')).toBeInTheDocument();
    expect(screen.getAllByText('bingo caller')).toHaveLength(2);
    expect(screen.queryByText(/stinger/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/notebook/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/the world/i)).not.toBeInTheDocument();
  });

  it('marks GM-made townies', () => {
    renderPanel();
    const dolores = screen.getByText('Dolores').closest('li')!;
    expect(within(dolores).getByText(/added by gm/i)).toBeInTheDocument();
  });

  it('leaves the projector switch to the Big screen picker', () => {
    renderPanel();
    expect(screen.queryByRole('button', { name: /on the projector/i })).not.toBeInTheDocument();
    expect(screen.getByText(/big screen picker above/i)).toBeInTheDocument();
  });

  it('warns here too when marked townies outgrow the Both screen', () => {
    boardOn = true;
    selection = { displayMode: 'cast' };
    npcs = Array.from({ length: 11 }, (_, i) => townie(`n${i}`, `T${i}`, { showOnDisplay: true }));
    renderPanel();
    expect(screen.getByText(/11 townies marked, but both fits 9/i)).toBeInTheDocument();
  });

  it('stays quiet with room to spare', () => {
    renderPanel();
    expect(screen.queryByText(/townies marked, but/i)).not.toBeInTheDocument();
  });

  it('marks one townie for the screen', async () => {
    renderPanel();
    const harry = screen.getByText('Harry').closest('li')!;
    await userEvent.click(within(harry).getByRole('button', { name: /mark for screen/i }));
    expect(setNpcDisplay).toHaveBeenCalledWith('n1', true);
  });

  it('hides a townie and pulls their rumors out of the mill', async () => {
    renderPanel();
    const harry = screen.getByText('Harry').closest('li')!;
    await userEvent.click(within(harry).getByRole('button', { name: 'Hide' }));
    expect(withdrawRumorsForNpc).toHaveBeenCalledWith(SHOW, 'n1');
    expect(archiveNpc).toHaveBeenCalledWith('n1');
    expect(await screen.findByRole('status')).toHaveTextContent(/harry is hidden, and 1 rumor left the mill/i);
  });

  it('deletes a townie and their rumors for good', async () => {
    renderPanel();
    const harry = screen.getByText('Harry').closest('li')!;
    await userEvent.click(within(harry).getByRole('button', { name: 'Delete' }));
    expect(deleteRumors).toHaveBeenCalledWith(['r1', 'r2']);
    expect(deleteNpc).toHaveBeenCalledWith('n1');
    expect(await screen.findByRole('status')).toHaveTextContent(/harry is deleted, with 2 rumors/i);
  });

  it('does nothing when the GM cancels the confirm', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderPanel();
    const harry = screen.getByText('Harry').closest('li')!;
    await userEvent.click(within(harry).getByRole('button', { name: 'Delete' }));
    await userEvent.click(within(harry).getByRole('button', { name: 'Hide' }));
    expect(deleteNpc).not.toHaveBeenCalled();
    expect(archiveNpc).not.toHaveBeenCalled();
  });

  it('adds a townie with a picked field and a write-in', async () => {
    renderPanel();
    await userEvent.click(screen.getByRole('button', { name: /add a townie/i }));
    await userEvent.type(screen.getByRole('textbox', { name: /first name/i }), 'Gus');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Adjective' }), 'deeply Lutheran');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Job' }), '__write_in__');
    await userEvent.type(screen.getByRole('textbox', { name: /job, your own/i }), 'crossing guard');
    await userEvent.click(screen.getByRole('button', { name: /add to town/i }));
    expect(createNpc).toHaveBeenCalledWith(
      expect.objectContaining({
        showId: SHOW,
        systemId: 'green-oaks',
        displayName: 'Gus',
        fieldValues: { adjective: 'deeply Lutheran', occupation: 'crossing guard' },
        fieldWriteIns: { occupation: true },
        deviceToken: expect.stringMatching(/^gm-/),
      }),
    );
  });

  it('will not add a townie with a blank field', async () => {
    renderPanel();
    await userEvent.click(screen.getByRole('button', { name: /add a townie/i }));
    await userEvent.type(screen.getByRole('textbox', { name: /first name/i }), 'Gus');
    expect(screen.getByRole('button', { name: /add to town/i })).toBeDisabled();
  });

  it('says so on screen when a write fails', async () => {
    archiveNpc.mockRejectedValueOnce(new Error('permission-denied'));
    renderPanel();
    const harry = screen.getByText('Harry').closest('li')!;
    await userEvent.click(within(harry).getByRole('button', { name: 'Hide' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/didn't save/i);
  });
});

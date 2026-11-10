/**
 * Rumor Mill — phone, GM panel and projector board.
 *
 * Firestore is fully mocked: nothing here reads or writes live data. The
 * security side (who may read a secret draw, three rumors per person) is
 * covered against the emulator in src/test/rules/rumor-mill.rules.test.ts.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  RumorBoard,
  RumorMillAdminPanel,
  RumorMillPhone,
  buildByline,
  buildDemoRumors,
  resolveRumorMillConfig,
} from '../../../platform/src/features/rumor-mill';

const SHOW = 'greenoaks-2026-11-28';

type AnyRumor = Record<string, unknown> & { id: string; status: string; slot: number; text: string };

let session = { open: true, trumpSuit: null as string | null, boardOn: false };
let myRumors: AnyRumor[] = [];
let allRumors: AnyRumor[] = [];
let draws: Record<string, unknown> = {};

const submitRumor = vi.fn(() => Promise.resolve());
const approveRumor = vi.fn(() => Promise.resolve());
const rejectRumor = vi.fn(() => Promise.resolve());
const revealRumor = vi.fn(() => Promise.resolve());
const overrideRumorDraw = vi.fn(() => Promise.resolve());
const withdrawRumor = vi.fn(() => Promise.resolve());
const setRumorMill = vi.fn(() => Promise.resolve());

vi.mock('@mtp/lib', () => ({
  useAuth: () => ({ user: { uid: 'anon-1' } }),
}));

vi.mock('@mtp/lib/rumors', async () => ({
  // The real, pure card helpers; only the Firestore API is faked.
  ...(await vi.importActual<object>('../../lib/rumors/cards')),
  MAX_RUMORS_PER_PERSON: 3,
  RUMOR_MAX_LENGTH: 140,
  DEFAULT_SESSION: { open: false, trumpSuit: null, boardOn: false },
  subscribeToRumorMill: (_id: string, cb: (s: unknown) => void) => { cb(session); return () => {}; },
  subscribeToMyRumors: (_s: string, _u: string, cb: (r: unknown[]) => void) => { cb(myRumors); return () => {}; },
  subscribeToAllRumors: (_s: string, cb: (r: unknown[]) => void) => { cb(allRumors); return () => {}; },
  subscribeToRumorDraws: (_s: string, cb: (d: unknown) => void) => { cb(draws); return () => {}; },
  subscribeToCirculatingRumors: (_s: string, cb: (r: unknown[]) => void) => { cb([]); return () => {}; },
  submitRumor: (...a: unknown[]) => submitRumor(...(a as [])),
  approveRumor: (...a: unknown[]) => approveRumor(...(a as [])),
  rejectRumor: (...a: unknown[]) => rejectRumor(...(a as [])),
  revealRumor: (...a: unknown[]) => revealRumor(...(a as [])),
  overrideRumorDraw: (...a: unknown[]) => overrideRumorDraw(...(a as [])),
  withdrawRumor: (...a: unknown[]) => withdrawRumor(...(a as [])),
  setRumorMill: (...a: unknown[]) => setRumorMill(...(a as [])),
}));

const config = resolveRumorMillConfig({ copy: { closedNote: 'The mill is quiet.' } });

const rumor = (slot: number, extra: Partial<AnyRumor> = {}): AnyRumor => ({
  id: `${SHOW}__anon-1__${slot}`,
  showId: SHOW,
  ownerUid: 'anon-1',
  slot,
  npcId: 'npc-1',
  npcName: 'Dolores, the very sweaty bingo caller',
  text: `rumor number ${slot}`,
  status: 'pending',
  createdAt: null,
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  session = { open: true, trumpSuit: null, boardOn: false };
  myRumors = [];
  allRumors = [];
  draws = {};
});

// ─── Config helpers ───────────────────────────────────────────────────────────

describe('rumor mill config', () => {
  it('builds a byline from the template and the townie', () => {
    expect(
      buildByline('{name}, the {adjective} {occupation}', 'Dolores', {
        adjective: 'very sweaty',
        occupation: 'bingo caller',
      }),
    ).toBe('Dolores, the very sweaty bingo caller');
  });

  it('falls back to the name when fields are missing', () => {
    expect(buildByline('{name}, the {adjective} {occupation}', 'Gus', {})).toBe('Gus');
  });

  it('never lets a show ask for more than the rules allow', () => {
    const c = resolveRumorMillConfig({ maxPerPerson: 10, maxLength: 500 });
    expect(c.maxPerPerson).toBe(3);
    expect(c.maxLength).toBe(140);
  });
});

// ─── Phone ────────────────────────────────────────────────────────────────────

describe('RumorMillPhone', () => {
  const renderPhone = () =>
    render(<RumorMillPhone showId={SHOW} npcId="npc-1" byline="Dolores, the very sweaty bingo caller" config={config} />);

  it('shows only a note when the mill is closed and nothing was sent', () => {
    session.open = false;
    renderPhone();
    expect(screen.getByText('The mill is quiet.')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('sends a trimmed rumor into the first free slot', async () => {
    myRumors = [rumor(0)];
    renderPhone();
    await userEvent.type(screen.getByRole('textbox'), '  the geese are organized  ');
    await userEvent.click(screen.getByRole('button', { name: /start the rumor/i }));
    expect(submitRumor).toHaveBeenCalledWith({
      showId: SHOW,
      slot: 1,
      npcId: 'npc-1',
      npcName: 'Dolores, the very sweaty bingo caller',
      text: 'the geese are organized',
    });
  });

  it('cannot send an empty rumor', () => {
    renderPhone();
    expect(screen.getByRole('button', { name: /start the rumor/i })).toBeDisabled();
  });

  it('stops offering the form after three rumors', () => {
    myRumors = [rumor(0), rumor(1), rumor(2)];
    renderPhone();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText(/all the gossip/i)).toBeInTheDocument();
  });

  it('tells the author where each rumor stands, and stamps a revealed one', () => {
    myRumors = [
      rumor(0),
      rumor(1, { status: 'circulating' }),
      rumor(2, { status: 'circulating', verdict: 'false' }),
    ];
    renderPhone();
    expect(screen.getByText(/waiting to see if it catches on/i)).toBeInTheDocument();
    expect(screen.getByText(/going around/i)).toBeInTheDocument();
    expect(screen.getByText(/hogwash/i)).toBeInTheDocument();
  });

  it('says so when a send fails', async () => {
    submitRumor.mockRejectedValueOnce(new Error('permission-denied'));
    renderPhone();
    await userEvent.type(screen.getByRole('textbox'), 'something');
    await userEvent.click(screen.getByRole('button', { name: /start the rumor/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/didn't go through/i);
  });
});

// ─── GM panel ─────────────────────────────────────────────────────────────────

describe('RumorMillAdminPanel', () => {
  const renderPanel = () =>
    render(
      <MemoryRouter>
        <RumorMillAdminPanel showSlug="green-oaks" systemId="green-oaks" />
      </MemoryRouter>,
    );

  it('renders nothing for a show with no rumor mill', async () => {
    const { container } = render(
      <MemoryRouter>
        <RumorMillAdminPanel showSlug="honey" systemId="honey-heist" />
      </MemoryRouter>,
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(container).toBeEmptyDOMElement();
  });

  it('will not approve until the Trump Suit is set', async () => {
    allRumors = [rumor(0)];
    renderPanel();
    expect(await screen.findByRole('button', { name: /approve \+ draw/i })).toBeDisabled();
    expect(screen.getByText(/pick the trump suit before approving/i)).toBeInTheDocument();
  });

  it('sets the Trump Suit', async () => {
    renderPanel();
    await userEvent.click(await screen.findByRole('button', { name: /hearts/i }));
    expect(setRumorMill).toHaveBeenCalledWith(SHOW, { trumpSuit: 'hearts' });
  });

  it('approves a rumor with the current Trump Suit', async () => {
    session.trumpSuit = 'hearts';
    allRumors = [rumor(0)];
    renderPanel();
    await userEvent.click(await screen.findByRole('button', { name: /approve \+ draw/i }));
    expect(approveRumor).toHaveBeenCalledWith(allRumors[0], 'hearts');
  });

  it('shows the GM the secret card and reveals what it says', async () => {
    session.trumpSuit = 'hearts';
    allRumors = [rumor(0, { status: 'circulating' })];
    draws = { [allRumors[0].id]: { id: allRumors[0].id, showId: SHOW, card: { rank: 'Q', suit: 'hearts' }, isTrue: true, overridden: false } };
    renderPanel();
    expect(await screen.findByText('Q♥')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /reveal: true/i }));
    expect(revealRumor).toHaveBeenCalledWith(allRumors[0].id, 'true');
  });

  it('prompts the GM to pick one when every rumor came up hogwash', async () => {
    session.trumpSuit = 'hearts';
    allRumors = [rumor(0, { status: 'circulating' }), rumor(1, { status: 'circulating' })];
    draws = Object.fromEntries(
      allRumors.map((r) => [r.id, { id: r.id, showId: SHOW, card: { rank: '7', suit: 'clubs' }, isTrue: false, overridden: false }]),
    );
    renderPanel();
    expect(await screen.findByRole('status')).toHaveTextContent(/picks one to be true/i);
    await userEvent.click(screen.getAllByRole('button', { name: /make it true/i })[0]);
    expect(overrideRumorDraw).toHaveBeenCalledWith(allRumors[0].id, true);
  });

  it('says so on screen when a write fails', async () => {
    setRumorMill.mockRejectedValueOnce(new Error('permission-denied'));
    renderPanel();
    await userEvent.click(await screen.findByRole('button', { name: /mill is open/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/didn't save/i);
  });
});

// ─── Projector board ──────────────────────────────────────────────────────────

describe('RumorBoard', () => {
  const renderBoard = (n: number) =>
    render(
      <RumorBoard
        showId={SHOW}
        config={config}
        open
        joinUrl="https://example.com/join"
        demoRumors={buildDemoRumors(n) as never}
      />,
    );

  it('shows at most one page of notes and says how many there are', () => {
    renderBoard(11);
    const list = screen.getByRole('list', { name: /rumors going around/i });
    expect(within(list).getAllByRole('listitem')).toHaveLength(8);
    expect(screen.getByText('11 rumors')).toBeInTheDocument();
  });

  it('sizes the grid by the number of notes on the page', () => {
    renderBoard(5);
    expect(screen.getByRole('list', { name: /rumors going around/i })).toHaveAttribute('data-count', '5');
  });

  it('stamps only rumors that have been revealed', () => {
    renderBoard(3); // samples: first is revealed true, the other two are not
    const items = screen.getAllByRole('listitem');
    expect(within(items[0]).getByText(/true/i)).toBeInTheDocument();
    expect(within(items[1]).queryByText(/true|hogwash/i)).not.toBeInTheDocument();
  });

  it('shows the empty line when nothing is in circulation', () => {
    renderBoard(0);
    expect(screen.getByText(config.copy.boardEmpty)).toBeInTheDocument();
  });
});

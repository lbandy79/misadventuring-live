/**
 * The secret deck for the Rumor Mill. Pure, no Firebase.
 *
 * Green Oaks, "Testing the Rumors": the Narrator secretly draws a card for
 * each Rumor. Trump Suit means the Rumor is true; anything else means it is
 * false (and the Seniors aren't told). If every Rumor comes up false, the
 * Narrator picks one to be true.
 *
 * Each rumor gets its own draw from a full 52-card deck, so the odds are
 * always 1 in 4 and don't depend on what was drawn on stage.
 */

export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
export type Suit = (typeof SUITS)[number];

export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
export type Rank = (typeof RANKS)[number];

export interface Card {
  rank: Rank;
  suit: Suit;
}

export const SUIT_SYMBOL: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

export const SUIT_LABEL: Record<Suit, string> = {
  hearts: 'Hearts',
  diamonds: 'Diamonds',
  clubs: 'Clubs',
  spades: 'Spades',
};

/** Uniform integer in [0, n). Uses crypto when available, with rejection
 *  sampling so no card is favoured. */
function defaultRandomInt(n: number): number {
  const c = globalThis.crypto;
  if (!c?.getRandomValues) return Math.floor(Math.random() * n);
  const limit = Math.floor(256 / n) * n;
  const buf = new Uint8Array(1);
  do {
    c.getRandomValues(buf);
  } while (buf[0] >= limit);
  return buf[0] % n;
}

/** Draw one card from a fresh 52-card deck. `randomInt` is injectable for tests. */
export function drawCard(randomInt: (n: number) => number = defaultRandomInt): Card {
  const i = randomInt(52);
  return { suit: SUITS[Math.floor(i / 13)], rank: RANKS[i % 13] };
}

export function isTrump(card: Card, trumpSuit: Suit): boolean {
  return card.suit === trumpSuit;
}

/** "Q♥" */
export function cardLabel(card: Card): string {
  return `${card.rank}${SUIT_SYMBOL[card.suit]}`;
}

/**
 * The "if all Rumors end up being false, the Narrator picks one" rule:
 * true when there is at least one tested rumor and none of them is true.
 */
export function allHogwash(results: Array<{ isTrue: boolean }>): boolean {
  return results.length > 0 && results.every((r) => !r.isTrue);
}

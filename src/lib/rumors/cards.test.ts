import { describe, expect, it } from 'vitest';
import { allHogwash, cardLabel, drawCard, isTrump, RANKS, SUITS } from './cards';

describe('drawCard', () => {
  it('maps every index 0..51 to a distinct card', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 52; i++) {
      const card = drawCard(() => i);
      expect(SUITS).toContain(card.suit);
      expect(RANKS).toContain(card.rank);
      seen.add(`${card.rank}-${card.suit}`);
    }
    expect(seen.size).toBe(52);
  });

  it('gives each suit exactly 13 of the 52 cards (1 in 4 is the Trump Suit)', () => {
    const hearts = Array.from({ length: 52 }, (_, i) => drawCard(() => i)).filter((c) =>
      isTrump(c, 'hearts'),
    );
    expect(hearts).toHaveLength(13);
  });

  it('draws a real card with the default randomness', () => {
    const card = drawCard();
    expect(SUITS).toContain(card.suit);
    expect(RANKS).toContain(card.rank);
  });
});

describe('isTrump', () => {
  it('is true only for the Trump Suit', () => {
    expect(isTrump({ rank: 'Q', suit: 'hearts' }, 'hearts')).toBe(true);
    expect(isTrump({ rank: 'Q', suit: 'spades' }, 'hearts')).toBe(false);
  });
});

describe('cardLabel', () => {
  it('formats rank and suit symbol', () => {
    expect(cardLabel({ rank: '10', suit: 'clubs' })).toBe('10♣');
  });
});

describe('allHogwash', () => {
  it('is true when every tested rumor is false', () => {
    expect(allHogwash([{ isTrue: false }, { isTrue: false }])).toBe(true);
  });
  it('is false once any rumor is true', () => {
    expect(allHogwash([{ isTrue: false }, { isTrue: true }])).toBe(false);
  });
  it('is false when nothing has been tested yet', () => {
    expect(allHogwash([])).toBe(false);
  });
});

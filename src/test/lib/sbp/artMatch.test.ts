import { describe, it, expect } from 'vitest';
import {
  artKindFromPath,
  isSafeImageDataUrl,
  normalizeArtName,
  scoreArtMatch,
  suggestArtMatches,
  type ArtEntity,
} from '../../../lib/sbp/artMatch';

// Synthetic names — real content names stay out of the public repo.
const entities: ArtEntity[] = [
  { id: 'class.scooper', name: 'Scooper', kind: 'class' },
  { id: 'class.oat_whisperer', name: 'Oat Whisperer', kind: 'class' },
  { id: 'species.frogling', name: 'Frogling', kind: 'species' },
  { id: 'species.toucanite', name: 'Toucanite', kind: 'species' },
  { id: 'species.plainfolk', name: 'Plainfolk', kind: 'species' },
  { id: 'background.dock_hand', name: 'Dock Hand', kind: 'background' },
];
const byId = (id: string) => entities.find((e) => e.id === id)!;

describe('normalizeArtName', () => {
  it('drops extension, namespace and punctuation', () => {
    expect(normalizeArtName('Oat-Whisperer.PNG')).toBe('oat whisperer');
    expect(normalizeArtName('class.oat_whisperer')).toBe('oat whisperer');
    expect(normalizeArtName('species.frogling')).toBe('frogling');
  });
});

describe('scoreArtMatch', () => {
  it('scores exact, plural, typo and unrelated names sensibly', () => {
    expect(scoreArtMatch('Scooper.png', byId('class.scooper'))).toBe(1);
    expect(scoreArtMatch('Scoopers.png', byId('class.scooper'))).toBeGreaterThanOrEqual(0.95);
    expect(scoreArtMatch('Tucanite.png', byId('species.toucanite'))).toBeGreaterThan(0.75);
    expect(scoreArtMatch('Oak Whisperer.png', byId('class.oat_whisperer'))).toBeGreaterThan(0.75);
    expect(scoreArtMatch('Frogling.png', byId('class.scooper'))).toBeLessThan(0.5);
  });
});

describe('suggestArtMatches', () => {
  it('matches plurals, typos and multi-word names; leaves strangers unmatched', () => {
    const files = [
      { name: 'Scoopers.png' },
      { name: 'Oak Whisperer.png' },
      { name: 'Tucanite.png' },
      { name: 'Dock Hand.png' },
      { name: 'Treasure Map.png' },
    ];
    const m = suggestArtMatches(files, entities);
    expect(m.map((x) => x?.entity.id ?? null)).toEqual([
      'class.scooper', 'class.oat_whisperer', 'species.toucanite', 'background.dock_hand', null,
    ]);
  });

  it('never gives one entity to two files; the better match wins', () => {
    const m = suggestArtMatches([{ name: 'Froglings.png' }, { name: 'Frogling.png' }], entities);
    expect(m[1]?.entity.id).toBe('species.frogling');
    expect(m[0]).toBeNull();
  });

  it('respects a folder kind hint', () => {
    const m = suggestArtMatches([{ name: 'Scooper.png', kindHint: 'species' }], entities);
    expect(m[0]).toBeNull();
  });
});

describe('artKindFromPath', () => {
  it('reads the folder name', () => {
    expect(artKindFromPath('Player Packet Art/Classes/X.png')).toBe('class');
    expect(artKindFromPath('Species/X.png')).toBe('species');
    expect(artKindFromPath('Art/Backgrounds/X.png')).toBe('background');
    expect(artKindFromPath('X.png')).toBeUndefined();
  });
});

describe('isSafeImageDataUrl', () => {
  it('accepts only base64 image data URLs', () => {
    expect(isSafeImageDataUrl('data:image/webp;base64,AAAA')).toBe(true);
    expect(isSafeImageDataUrl('data:image/png;base64,AA==')).toBe(true);
    expect(isSafeImageDataUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeImageDataUrl('data:text/html;base64,AAAA')).toBe(false);
    expect(isSafeImageDataUrl('data:image/svg+xml;base64,AAAA')).toBe(false);
    expect(isSafeImageDataUrl(42)).toBe(false);
  });
});

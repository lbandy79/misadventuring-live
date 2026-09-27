/**
 * Suggest which rules entity an art file belongs to, from its file name.
 *
 * Pure, so it tests without a browser. Suggestions only — the admin panel
 * always lets a person override them, because file names drift from the
 * data (plurals, typos, renames). Art is keyed by entity id, never by file
 * name.
 */

export interface ArtEntity {
  id: string;
  name: string;
  kind: 'class' | 'species' | 'background';
}

export interface ArtMatch {
  entity: ArtEntity;
  /** 0..1; 1 is an exact name match. */
  score: number;
}

export const normalizeArtName = (s: string): string =>
  s
    .toLowerCase()
    .replace(/\.(png|jpe?g|webp|gif|avif|heic)$/, '')
    .replace(/^[a-z]+\./, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const singular = (s: string) => s.replace(/(es|s)$/, '');

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

const similarity = (a: string, b: string): number => {
  const max = Math.max(a.length, b.length);
  return max === 0 ? 1 : 1 - levenshtein(a, b) / max;
};

/** Score one file name against one entity (name and id tail both count). */
export function scoreArtMatch(fileName: string, entity: ArtEntity): number {
  const f = normalizeArtName(fileName);
  const candidates = [normalizeArtName(entity.name), normalizeArtName(entity.id).replace(/_/g, ' ')];
  let best = 0;
  for (const c of candidates) {
    if (f === c) return 1;
    if (singular(f) === singular(c)) best = Math.max(best, 0.95);
    const fs = f.replace(/ /g, '');
    const cs = c.replace(/ /g, '');
    // Only a true exact match scores 1, so it always beats a plural or typo.
    best = Math.max(best, similarity(fs, cs) * 0.99, similarity(singular(fs), singular(cs)) * 0.95);
  }
  return best;
}

export const ART_MATCH_THRESHOLD = 0.75;

/**
 * Best entity for each file, one file per entity. Higher-scoring pairs claim
 * first, so two similar files can't both land on the same entity.
 * `kindHint` (e.g. from a folder name) restricts candidates when known.
 */
export function suggestArtMatches(
  files: Array<{ name: string; kindHint?: ArtEntity['kind'] }>,
  entities: ArtEntity[],
  threshold = ART_MATCH_THRESHOLD,
): Array<ArtMatch | null> {
  const pairs: Array<{ file: number; entity: ArtEntity; score: number }> = [];
  files.forEach((f, i) => {
    for (const e of entities) {
      if (f.kindHint && f.kindHint !== e.kind) continue;
      const score = scoreArtMatch(f.name, e);
      if (score >= threshold) pairs.push({ file: i, entity: e, score });
    }
  });
  pairs.sort((a, b) => b.score - a.score);
  const result: Array<ArtMatch | null> = files.map(() => null);
  const taken = new Set<string>();
  for (const p of pairs) {
    if (result[p.file] || taken.has(p.entity.id)) continue;
    result[p.file] = { entity: p.entity, score: p.score };
    taken.add(p.entity.id);
  }
  return result;
}

/** Folder names like "Classes/", "Species/", "Backgrounds/" → a kind hint. */
export function artKindFromPath(path: string): ArtEntity['kind'] | undefined {
  const p = path.toLowerCase();
  if (/(^|\/)class(es)?\//.test(p)) return 'class';
  if (/(^|\/)species\//.test(p)) return 'species';
  if (/(^|\/)backgrounds?\//.test(p)) return 'background';
  return undefined;
}

/** Only render data URLs that are really images. */
export const isSafeImageDataUrl = (s: unknown): s is string =>
  typeof s === 'string' && /^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(s);

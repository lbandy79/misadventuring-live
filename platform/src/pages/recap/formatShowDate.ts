/**
 * Shared date helpers for the recap sticky notes.
 *
 * Both stickies render show dates and both care whether a date has passed,
 * so the parsing lives here rather than being duplicated per component.
 *
 * Dates are parsed as LOCAL calendar days, not UTC. `new Date('2026-10-24')`
 * is midnight UTC, which renders as October 23 for anyone west of Greenwich —
 * splitting the string and building the date part-wise avoids that.
 */

/** Format an ISO `YYYY-MM-DD` as a readable day. Falls back gracefully. */
export function formatShowDate(iso: string | undefined, withYear: boolean): string {
  if (!iso) return 'Date TBA';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' } : {}),
  });
}

/** True once the show day itself is over (local time). */
export function hasHappened(iso?: string): boolean {
  if (!iso) return false;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return false;
  return Date.now() >= new Date(y, m - 1, d + 1).getTime();
}

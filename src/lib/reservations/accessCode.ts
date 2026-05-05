/**
 * Access code generator — 6-character alphanumeric, no ambiguous chars.
 *
 * Extracted from `components/Reservation/ReservationForm.tsx` in Phase 5
 * so both the legacy `/create` flow and the new platform `/reserve` flow
 * mint codes the same way.
 */

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I / O / 0 / 1
export const ACCESS_CODE_LENGTH = 6;

export function generateAccessCode(): string {
  const buf = new Uint8Array(ACCESS_CODE_LENGTH);
  crypto.getRandomValues(buf);
  let code = '';
  for (let i = 0; i < ACCESS_CODE_LENGTH; i++) {
    code += CODE_CHARS[buf[i] % CODE_CHARS.length];
  }
  return code;
}

/** Normalize user-entered codes for case-insensitive lookup. */
export function normalizeAccessCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, ACCESS_CODE_LENGTH);
}

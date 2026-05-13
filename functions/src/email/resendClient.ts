import { Resend } from 'resend';

// Lazy — instantiated on first call so module load never throws during
// Firebase deploy analysis when RESEND_API_KEY isn't in the environment.
let _resend: Resend | null = null;

export function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      throw new Error(
        'RESEND_API_KEY is not set. See functions/.env.example for setup instructions.',
      );
    }
    _resend = new Resend(key);
  }
  return _resend;
}

export const FROM_ADDRESS =
  process.env.RESEND_FROM_ADDRESS ?? 'shows@themisadventuringparty.com';

export const APP_BASE_URL =
  process.env.APP_BASE_URL ?? 'https://themisadventuringparty.com';

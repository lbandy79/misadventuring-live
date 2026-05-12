import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is not set. See functions/.env.example for setup instructions.');
}

export const resend = new Resend(process.env.RESEND_API_KEY);

export const FROM_ADDRESS =
  process.env.RESEND_FROM_ADDRESS ?? 'shows@themisadventuringparty.com';

export const APP_BASE_URL =
  process.env.APP_BASE_URL ?? 'https://themisadventuringparty.com';

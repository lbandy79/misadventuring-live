/**
 * Email utility — sends reservation confirmation emails via EmailJS.
 * 
 * EmailJS free tier: 200 emails/month (plenty for venue-sized shows).
 * No backend needed — sends directly from the browser.
 * 
 * Setup required:
 * 1. Create account at https://www.emailjs.com
 * 2. Add an email service (Gmail, Outlook, etc.)
 * 3. Create a template with variables: {{to_name}}, {{to_email}}, {{access_code}}, {{character_link}}, {{show_name}}
 * 4. Replace the placeholder IDs below with your real ones.
 */

import emailjs from '@emailjs/browser';

// ─── EmailJS Configuration ──────────────────────────────────────────────────
// Loaded from VITE_EMAILJS_* env vars (.env.local). See .env.example.
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

const APP_BASE_URL =
  import.meta.env.VITE_APP_BASE_URL || 'https://play.themisadventuringparty.com';

interface ReservationEmailParams {
  name: string;
  email: string;
  accessCode: string;
  showName: string;
}

/**
 * Send a reservation confirmation email with the access code and a direct link.
 * Fails silently — email is a convenience, not a blocker.
 */
export async function sendReservationEmail({
  name,
  email,
  accessCode,
  showName,
}: ReservationEmailParams): Promise<boolean> {
  try {
    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
      console.warn(
        'EmailJS env vars missing — skipping reservation email. Set VITE_EMAILJS_* in .env.local.'
      );
      return false;
    }
    const characterLink = `${APP_BASE_URL}/create?code=${encodeURIComponent(accessCode)}`;

    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        to_name: name,
        to_email: email,
        access_code: accessCode,
        character_link: characterLink,
        show_name: showName,
      },
      EMAILJS_PUBLIC_KEY,
    );

    return true;
  } catch (err) {
    console.warn('Email send failed (non-blocking):', err);
    return false;
  }
}

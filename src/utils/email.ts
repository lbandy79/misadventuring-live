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
// Replace these with your real EmailJS IDs after setting up your account.
const EMAILJS_SERVICE_ID = 'service_7dhm0kk';
const EMAILJS_TEMPLATE_ID = 'template_jlyros5';
const EMAILJS_PUBLIC_KEY = 'hmo1h14eOymJRvgjw';

const APP_BASE_URL = 'https://play.themisadventuringparty.com';

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

/**
 * Client-side email service — calls Firebase onRequest functions that use Resend.
 *
 * The API key lives server-side in functions/.env (never in the browser bundle).
 * Each exported function maps to a named template in functions/src/email/templates/.
 *
 * Templates available in v1:
 *   character-saved        — sent immediately when an audience member saves their character
 *
 * Stubbed for future builds:
 *   notebook-ready         — sent post-show with the personalized Notebook link
 *   next-show-announcement — broadcast to opted-in audience before the next show
 */

const FUNCTIONS_BASE = 'https://us-central1-misadventuring-live.cloudfunctions.net';

export async function sendCharacterSavedEmail(params: {
  recipient: string;
  characterName: string;
  revealSentence: string;
  magicToken: string;
  accessCode: string;
  showName: string;
}): Promise<void> {
  const { recipient, ...data } = params;
  const resp = await fetch(`${FUNCTIONS_BASE}/sendEmail`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ template: 'character-saved', recipient, data }),
  });
  if (!resp.ok) {
    const payload = await resp.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error(`Email send failed (${resp.status}): ${payload['error'] ?? 'unknown'}`);
  }
}

// Stubs — uncomment and implement when the corresponding templates are built.
// export async function sendNotebookReadyEmail(...) { ... }
// export async function sendNextShowAnnouncementEmail(...) { ... }

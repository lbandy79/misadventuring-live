/**
 * Client-side email service — wraps Firebase callable functions that use Resend.
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

import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../../src/firebase';

type EmailTemplate = 'character-saved' | 'notebook-ready' | 'next-show-announcement';

interface SendEmailInput {
  template: EmailTemplate;
  recipient: string;
  data: Record<string, unknown>;
}

interface SendEmailResult {
  success: boolean;
}

const sendEmailCallable = httpsCallable<SendEmailInput, SendEmailResult>(
  functions,
  'sendEmail',
);

export async function sendCharacterSavedEmail(params: {
  recipient: string;
  characterName: string;
  revealSentence: string;
  magicToken: string;
  accessCode: string;
  showName: string;
}): Promise<void> {
  const { recipient, ...data } = params;
  const result = await sendEmailCallable({
    template: 'character-saved',
    recipient,
    data,
  });
  if (!result.data.success) {
    throw new Error('Email send returned success: false');
  }
}

// Stubs — uncomment and implement when the corresponding templates are built.
// export async function sendNotebookReadyEmail(...) { ... }
// export async function sendNextShowAnnouncementEmail(...) { ... }

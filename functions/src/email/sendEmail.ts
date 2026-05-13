/**
 * sendEmail — Firebase callable function.
 *
 * Dispatches transactional emails via Resend. Each template maps to a render
 * function that returns { subject, html, text }.
 *
 * Called from the client via emailService.ts (platform/src/lib/email/).
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getResend, FROM_ADDRESS } from './resendClient';
import {
  renderCharacterSaved,
  type CharacterSavedData,
  type EmailTemplate,
} from './templates';

interface SendEmailRequest {
  template: EmailTemplate;
  recipient: string;
  data: CharacterSavedData; // union grows as templates are added
}

export const sendEmail = onCall<SendEmailRequest>(
  { region: 'us-central1' },
  async (request) => {
    const { template, recipient, data } = request.data;

    if (!recipient || !recipient.includes('@')) {
      throw new HttpsError('invalid-argument', 'recipient must be a valid email address');
    }

    let rendered: { subject: string; html: string; text: string };

    switch (template) {
      case 'character-saved':
        rendered = renderCharacterSaved(data as CharacterSavedData);
        break;
      case 'notebook-ready':
      case 'next-show-announcement':
        throw new HttpsError('unimplemented', `${template} template is not yet available`);
      default:
        throw new HttpsError('invalid-argument', `unknown template: ${template}`);
    }

    const { error } = await getResend().emails.send({
      from: FROM_ADDRESS,
      to: recipient,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });

    if (error) {
      console.error('Resend send error:', error);
      throw new HttpsError('internal', 'Email send failed. Check function logs.');
    }

    return { success: true };
  },
);

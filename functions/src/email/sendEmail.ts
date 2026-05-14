import { onRequest } from 'firebase-functions/v2/https';
import cors from 'cors';
import { getResend, FROM_ADDRESS } from './resendClient';
import { ALLOWED_ORIGINS } from '../config';
import {
  renderCharacterSaved,
  type CharacterSavedData,
  type EmailTemplate,
} from './templates';

const corsHandler = cors({ origin: ALLOWED_ORIGINS });

interface SendEmailRequest {
  template: EmailTemplate;
  recipient: string;
  data: CharacterSavedData;
}

export const sendEmail = onRequest({ region: 'us-central1' }, (req, res) => {
  corsHandler(req, res, () => {
    (async () => {
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      const { template, recipient, data } = req.body as SendEmailRequest;

      if (!recipient || !recipient.includes('@')) {
        res.status(400).json({ error: 'recipient must be a valid email address' });
        return;
      }

      let rendered: { subject: string; html: string; text: string };

      switch (template) {
        case 'character-saved':
          rendered = renderCharacterSaved(data as CharacterSavedData);
          break;
        case 'notebook-ready':
        case 'next-show-announcement':
          res.status(501).json({ error: `${template} template is not yet available` });
          return;
        default:
          res.status(400).json({ error: `unknown template: ${template as string}` });
          return;
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
        res.status(500).json({ error: 'Email send failed. Check function logs.' });
        return;
      }

      res.json({ success: true });
    })().catch((err: unknown) => {
      console.error('Unhandled error in sendEmail:', err);
      if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
    });
  });
});

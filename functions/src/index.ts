/**
 * MTP Firebase Cloud Functions entry point.
 *
 * Setup checklist (one-time):
 *   1. cd functions && npm install
 *   2. cp .env.example .env  — fill in RESEND_API_KEY and RESEND_FROM_ADDRESS
 *   3. firebase deploy --only functions
 *
 * For production secrets use:
 *   firebase functions:secrets:set RESEND_API_KEY
 */

import * as admin from 'firebase-admin';

admin.initializeApp();

export { sendEmail } from './email/sendEmail';
export { sendNotebookBatch } from './email/sendNotebookBatch';

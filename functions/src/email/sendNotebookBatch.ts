/**
 * sendNotebookBatch — GM-triggered batch email for post-show notebook sends.
 *
 * For v1, this re-sends the character-saved email to every audience member
 * for a given show who has optedInForNotebook: true. When the Notebook page
 * exists, swap in the 'notebook-ready' template.
 *
 * dryRun mode logs the batch without sending. Use on show day to rehearse.
 *
 * Returns: { queued, skipped, errors }
 */

import { onRequest } from 'firebase-functions/v2/https';
import cors from 'cors';
import * as admin from 'firebase-admin';
import { ALLOWED_ORIGINS } from '../config';
import { getResend, FROM_ADDRESS } from './resendClient';
import { renderCharacterSaved } from './templates/characterSaved';

const corsHandler = cors({ origin: ALLOWED_ORIGINS });

interface SendNotebookBatchRequest {
  showId: string;
  dryRun?: boolean;
}

interface AudienceNpcRef {
  showId: string;
  npcId: string;
  savedAt?: string;
  revealSentence?: string;
  characterName?: string;
}

interface AudienceProfile {
  email: string;
  magicToken?: string;
  accessCode?: string;
  npcs: AudienceNpcRef[];
  optedInForNotebook?: boolean;
}

export const sendNotebookBatch = onRequest({ region: 'us-central1' }, (req, res) => {
  corsHandler(req, res, () => {
    (async () => {
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      // Verify Firebase ID token — GM-only endpoint.
      const authHeader = req.headers.authorization ?? '';
      const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (!idToken) {
        res.status(401).json({ error: 'Must be signed in to send batch emails.' });
        return;
      }
      try {
        await admin.auth().verifyIdToken(idToken);
      } catch {
        res.status(401).json({ error: 'Invalid or expired auth token.' });
        return;
      }

      const { showId, dryRun = false } = req.body as SendNotebookBatchRequest;
      if (!showId) {
        res.status(400).json({ error: 'showId is required' });
        return;
      }

      const db = admin.firestore();
      const snapshot = await db
        .collection('audience-profiles')
        .where('optedInForNotebook', '==', true)
        .get();

      const queued: number[] = [];
      const errors: string[] = [];
      let skipped = 0;

      for (const docSnap of snapshot.docs) {
        const profile = docSnap.data() as AudienceProfile;
        const npcRef = profile.npcs?.find((n) => n.showId === showId);

        if (!npcRef) {
          skipped++;
          continue;
        }

        if (!profile.magicToken || !profile.accessCode) {
          skipped++;
          continue;
        }

        const revealSentence = npcRef.revealSentence ?? '';
        const characterName = npcRef.characterName ?? 'Your character';

        if (dryRun) {
          console.log(`[dryRun] Would email ${profile.email} — ${characterName}`);
          queued.push(1);
          continue;
        }

        try {
          const rendered = renderCharacterSaved({
            characterName,
            revealSentence,
            magicToken: profile.magicToken,
            accessCode: profile.accessCode,
            showName: showId,
          });

          const { error } = await getResend().emails.send({
            from: FROM_ADDRESS,
            to: profile.email,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
          });

          if (error) {
            errors.push(`${profile.email}: ${error.message}`);
          } else {
            queued.push(1);
          }
        } catch (err) {
          errors.push(`${profile.email}: ${String(err)}`);
        }
      }

      res.json({ queued: queued.length, skipped, errors });
    })().catch((err: unknown) => {
      console.error('Unhandled error in sendNotebookBatch:', err);
      if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
    });
  });
});

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

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { ALLOWED_ORIGINS } from '../config';
import { getResend, FROM_ADDRESS } from './resendClient';
import { renderCharacterSaved } from './templates/characterSaved';

interface SendNotebookBatchRequest {
  showId: string;
  dryRun?: boolean;
}

interface SendNotebookBatchResult {
  queued: number;
  skipped: number;
  errors: string[];
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

export const sendNotebookBatch = onCall<SendNotebookBatchRequest>(
  { region: 'us-central1', cors: ALLOWED_ORIGINS },
  async (request): Promise<SendNotebookBatchResult> => {
    // GM-only: require Firebase Auth + admin claim (or just auth for v1).
    // Add stricter claim checks when the admin auth system is built out.
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in to send batch emails.');
    }

    const { showId, dryRun = false } = request.data;
    if (!showId) {
      throw new HttpsError('invalid-argument', 'showId is required');
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
        // Profile pre-dates the token/code system — skip gracefully.
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

    return {
      queued: queued.length,
      skipped,
      errors,
    };
  },
);

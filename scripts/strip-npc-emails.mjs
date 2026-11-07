/**
 * scripts/strip-npc-emails.mjs
 *
 * One-off cleanup for Nov 2026 audit step 2. `npcs` is public-read, and a
 * few NPCs created before the hotfix carry an `email` field. Rules can't
 * hide a field, so this removes it from the data.
 *
 * For every NPC with an email:
 *   1. Make sure audience-profiles/{email} exists and lists that NPC
 *      (copies it over if missing, so no address is lost).
 *   2. Delete the `email` field from the NPC.
 *
 * Dry run by default. Prints counts only, never addresses.
 *
 * Needs admin credentials (the Admin SDK bypasses security rules):
 *   1. Firebase console → Project settings → Service accounts →
 *      "Generate new private key". Keep the file OUTSIDE this repo.
 *   2. PowerShell:  $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\path\to\key.json"
 *   3. node scripts/strip-npc-emails.mjs            (dry run)
 *      node scripts/strip-npc-emails.mjs --apply    (writes)
 *   4. Delete the key file and revoke it in the console when done.
 *
 * firebase-admin is resolved from functions/node_modules
 * (run `npm --prefix functions install` first if it's missing).
 */

import { createRequire } from 'node:module';

const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const APPLY = process.argv.includes('--apply');

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to a service-account key first (see header).');
  process.exit(1);
}

initializeApp({ credential: applicationDefault(), projectId: 'misadventuring-live' });
const db = getFirestore();

const npcs = await db.collection('npcs').get();
const withEmail = npcs.docs.filter((d) => typeof d.get('email') === 'string' && d.get('email'));

let profilesCreated = 0;
let profilesLinked = 0;
let alreadyCovered = 0;

for (const npc of withEmail) {
  const email = String(npc.get('email')).trim().toLowerCase();
  const ref = { showId: npc.get('showId'), npcId: npc.id, characterName: npc.get('displayName') ?? '' };
  const profileRef = db.collection('audience-profiles').doc(email);
  const profile = await profileRef.get();

  if (!profile.exists) {
    profilesCreated++;
    if (APPLY) {
      await profileRef.set({
        email,
        npcs: [ref],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  } else if (!(profile.get('npcs') ?? []).some((n) => n?.npcId === npc.id)) {
    profilesLinked++;
    if (APPLY) await profileRef.update({ npcs: FieldValue.arrayUnion(ref) });
  } else {
    alreadyCovered++;
  }

  if (APPLY) await npc.ref.update({ email: FieldValue.delete() });
}

console.log(`${APPLY ? 'APPLIED' : 'DRY RUN'}: ${npcs.size} NPCs, ${withEmail.length} with an email`);
console.log(`  already in audience-profiles: ${alreadyCovered}`);
console.log(`  profile created:              ${profilesCreated}`);
console.log(`  linked to existing profile:   ${profilesLinked}`);
console.log(`  email field ${APPLY ? 'removed from' : 'would be removed from'} ${withEmail.length} NPCs`);
if (!APPLY) console.log('Run again with --apply to write.');
process.exit(0);

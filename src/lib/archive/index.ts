/**
 * `src/lib/archive` — defensive snapshot helpers.
 *
 * Two functions, one philosophy: never lose anything by accident.
 *
 *   `softDeleteDoc(collection, id)`    — copy a doc to `<collection>-archive`,
 *                                        then delete the original. Used to
 *                                        replace `deleteDoc` calls in the
 *                                        admin UI so a misclick is recoverable.
 *
 *   `archiveSingleton(collection, id, showId?)` — copy the current value of a
 *                                        singleton (e.g. `villagers/current`)
 *                                        into `archives/<showId>/<collection>`
 *                                        BEFORE the next reset overwrites it.
 *                                        If showId isn't supplied we fall back
 *                                        to the platform's currently-selected
 *                                        show, then to a timestamp.
 *
 * Restoration is intentionally manual: open the archive doc in the Firestore
 * console and copy fields back. We don't ship a one-click "restore" because
 * a careless restore can clobber an in-progress show.
 */

import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import { db } from '../../firebase';

const tsForId = () =>
  new Date().toISOString().replace(/[:.]/g, '-');

/**
 * Copy a doc into `<collection>-archive/<id>__<timestamp>` then delete it.
 * If the source doc doesn't exist this is a no-op (no error thrown — the
 * caller's intent was "make sure this is gone", which it already is).
 */
export async function softDeleteDoc(
  collectionName: string,
  docId: string,
  database: Firestore = db
): Promise<{ archived: boolean; archiveId: string | null }> {
  const sourceRef = doc(database, collectionName, docId);
  const snap = await getDoc(sourceRef);
  if (!snap.exists()) {
    return { archived: false, archiveId: null };
  }

  const archiveCollection = `${collectionName}-archive`;
  const archiveId = `${docId}__${tsForId()}`;
  const archiveRef = doc(database, archiveCollection, archiveId);

  await setDoc(archiveRef, {
    ...snap.data(),
    __originalId: docId,
    __originalCollection: collectionName,
    __archivedAt: serverTimestamp(),
    __archiveReason: 'soft-delete',
  });

  await deleteDoc(sourceRef);

  return { archived: true, archiveId };
}

/**
 * Snapshot a singleton interaction doc (e.g. `villagers/current`) into
 * `archives/<showId>/<collection>__<timestamp>` before its next reset.
 *
 * Pass `showId` so the snapshot lands in a per-show folder. If you don't
 * have one handy, the snapshot falls back to a `_unscoped` folder.
 *
 * Returns the archive doc ID we wrote, or null if there was nothing to
 * snapshot (singleton didn't exist).
 */
export async function archiveSingleton(
  collectionName: string,
  docId: string,
  showId: string | null = null,
  database: Firestore = db
): Promise<{ archived: boolean; archiveRef: string | null }> {
  const sourceRef = doc(database, collectionName, docId);
  const snap = await getDoc(sourceRef);
  if (!snap.exists()) {
    return { archived: false, archiveRef: null };
  }

  const folder = showId ? `archives/${showId}` : 'archives/_unscoped';
  const archiveDocId = `${collectionName}__${docId}__${tsForId()}`;
  const archiveRef = doc(database, folder, archiveDocId);

  await setDoc(archiveRef, {
    ...snap.data(),
    __originalCollection: collectionName,
    __originalDocId: docId,
    __showId: showId,
    __archivedAt: serverTimestamp(),
    __archiveReason: 'pre-reset-snapshot',
  });

  return { archived: true, archiveRef: `${folder}/${archiveDocId}` };
}

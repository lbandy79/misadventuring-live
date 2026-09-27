/**
 * SBP draft art — Firestore access.
 *
 *   sbp-art/{entityId}       { thumb, meta }  small; every page subscribes
 *   sbp-art-full/{entityId}  { full }         fetched on demand, cached
 *   sbp-art-history/{id}     previous version on replace (append-only)
 *
 * Images are data URLs (WebP), shrunk in the browser before upload. Art is
 * unpublished IP: same cast/admin lock as the rules, never in the repo or
 * the bundle.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../firebase';

const THUMBS = 'sbp-art';
const FULL = 'sbp-art-full';
const HISTORY = 'sbp-art-history';

export type ArtStatus = 'draft' | 'final';

export interface SbpArtMeta {
  entityId: string;
  status: ArtStatus;
  sourceFileName: string;
  uploadedBy: string;
  uploadedByEmail: string;
  uploadedAt: number;
  width: number;
  height: number;
}

export interface SbpArtThumb {
  thumb: string;
  meta: SbpArtMeta;
}

export function subscribeToSbpArtThumbs(
  callback: (thumbs: Record<string, SbpArtThumb>) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, THUMBS),
    (snap) => {
      const out: Record<string, SbpArtThumb> = {};
      snap.docs.forEach((d) => { out[d.id] = d.data() as SbpArtThumb; });
      callback(out);
    },
    (err) => onError?.(err),
  );
}

const fullCache = new Map<string, { uploadedAt: number; full: string | null }>();

/**
 * Full-size image for one entity. Cached per upload, so a replaced image is
 * refetched when the thumb's `uploadedAt` changes.
 */
export async function getSbpArtFull(entityId: string, uploadedAt: number): Promise<string | null> {
  const hit = fullCache.get(entityId);
  if (hit && hit.uploadedAt === uploadedAt) return hit.full;
  const snap = await getDoc(doc(db, FULL, entityId));
  const full = snap.exists() ? ((snap.data() as { full?: string }).full ?? null) : null;
  fullCache.set(entityId, { uploadedAt, full });
  return full;
}

export interface UploadSbpArtArgs {
  entityId: string;
  thumb: string;
  full: string;
  status: ArtStatus;
  sourceFileName: string;
  width: number;
  height: number;
  user: { uid: string; email: string | null };
}

/** Write thumb + full, archiving whatever was there first, in one transaction. */
export async function uploadSbpArt(args: UploadSbpArtArgs): Promise<SbpArtMeta> {
  const meta: SbpArtMeta = {
    entityId: args.entityId,
    status: args.status,
    sourceFileName: args.sourceFileName,
    uploadedBy: args.user.uid,
    uploadedByEmail: args.user.email ?? '',
    uploadedAt: Date.now(),
    width: args.width,
    height: args.height,
  };
  const thumbRef = doc(db, THUMBS, args.entityId);
  const fullRef = doc(db, FULL, args.entityId);

  await runTransaction(db, async (tx) => {
    const [prevThumb, prevFull] = [await tx.get(thumbRef), await tx.get(fullRef)];
    if (prevThumb.exists()) {
      tx.set(doc(collection(db, HISTORY)), {
        entityId: args.entityId,
        replacedAt: meta.uploadedAt,
        replacedBy: args.user.uid,
        previousMeta: (prevThumb.data() as SbpArtThumb).meta,
        previousThumb: (prevThumb.data() as SbpArtThumb).thumb,
        previousFull: prevFull.exists() ? ((prevFull.data() as { full?: string }).full ?? null) : null,
      });
    }
    tx.set(thumbRef, { thumb: args.thumb, meta });
    tx.set(fullRef, { full: args.full });
  });
  fullCache.set(args.entityId, { uploadedAt: meta.uploadedAt, full: args.full });
  return meta;
}

/** Flip draft/final without re-uploading the image. */
export async function setSbpArtStatus(entityId: string, current: SbpArtThumb, status: ArtStatus): Promise<void> {
  await setDoc(doc(db, THUMBS, entityId), { thumb: current.thumb, meta: { ...current.meta, status } });
}

export async function removeSbpArt(entityId: string): Promise<void> {
  await deleteDoc(doc(db, THUMBS, entityId));
  await deleteDoc(doc(db, FULL, entityId));
  fullCache.delete(entityId);
}

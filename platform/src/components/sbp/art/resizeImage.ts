/**
 * Shrink an image file in the browser to a data URL under a size budget.
 * Tries WebP, falls back to JPEG where the browser can't encode WebP.
 * Steps down size/quality until the result fits.
 */

export interface ShrunkImage {
  dataUrl: string;
  width: number;
  height: number;
}

interface Attempt { max: number; quality: number }

export const FULL_ATTEMPTS: Attempt[] = [
  { max: 1024, quality: 0.82 },
  { max: 1024, quality: 0.7 },
  { max: 860, quality: 0.68 },
  { max: 720, quality: 0.62 },
];
/** Chars; Firestore rule caps full images at 750 000. */
export const FULL_BUDGET = 700_000;

export const THUMB_ATTEMPTS: Attempt[] = [
  { max: 360, quality: 0.76 },
  { max: 300, quality: 0.68 },
  { max: 220, quality: 0.6 },
];
/** Chars; Firestore rule caps thumbs at 120 000. */
export const THUMB_BUDGET = 110_000;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function encode(bitmap: ImageBitmap, a: Attempt): Promise<ShrunkImage> {
  const scale = Math.min(1, a.max / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not available');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  let blob = await canvasToBlob(canvas, 'image/webp', a.quality);
  if (!blob || blob.type !== 'image/webp') blob = await canvasToBlob(canvas, 'image/jpeg', a.quality);
  if (!blob) throw new Error('Could not encode the image');
  return { dataUrl: await blobToDataUrl(blob), width, height };
}

export async function shrinkImage(file: File, attempts: Attempt[], budget: number): Promise<ShrunkImage> {
  const bitmap = await createImageBitmap(file);
  try {
    let last: ShrunkImage | null = null;
    for (const a of attempts) {
      last = await encode(bitmap, a);
      if (last.dataUrl.length <= budget) return last;
    }
    throw new Error(`Still too large after shrinking (${Math.round((last?.dataUrl.length ?? 0) / 1000)} KB)`);
  } finally {
    bitmap.close();
  }
}

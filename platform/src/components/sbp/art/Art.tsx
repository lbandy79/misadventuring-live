/**
 * Draft art for classes, species and backgrounds. Every component renders
 * nothing (or its text fallback) when an entity has no art yet.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { getSbpArtFull, isSafeImageDataUrl, useAuth } from '@mtp/lib';
import { useSbpArt } from './artStore';

function useArtEnabled(): boolean {
  const { user, isCast, isAdmin } = useAuth();
  return !!user && (isCast || isAdmin);
}

export function useArtThumb(entityId: string | undefined) {
  const { thumbs, loaded } = useSbpArt(useArtEnabled());
  const art = entityId ? thumbs[entityId] : undefined;
  return {
    src: art && isSafeImageDataUrl(art.thumb) ? art.thumb : undefined,
    meta: art?.meta,
    loaded,
  };
}

const DraftBadge = ({ status }: { status?: string }) =>
  status === 'final' ? null : <span className="sbp-art__badge" title="Draft art — to be replaced by the artist">draft</span>;

/** Small image for cards and lists. */
export function ArtThumb({ entityId, alt, className = '' }: { entityId: string | undefined; alt: string; className?: string }) {
  const { src } = useArtThumb(entityId);
  if (!src) return null;
  return <img src={src} alt={alt} className={`sbp-art__thumb ${className}`} loading="lazy" decoding="async" />;
}

/**
 * Full image for a detail panel. Shows the thumb (blurred) while the full
 * image loads. With no art, renders `fallback` instead.
 */
export function ArtFull({ entityId, alt, fallback }: { entityId: string | undefined; alt: string; fallback?: ReactNode }) {
  const { src: thumb, meta, loaded } = useArtThumb(entityId);
  const [full, setFull] = useState<string | null>(null);

  useEffect(() => {
    setFull(null);
    if (!entityId || !meta) return;
    let live = true;
    getSbpArtFull(entityId, meta.uploadedAt)
      .then((f) => { if (live && isSafeImageDataUrl(f)) setFull(f); })
      .catch((err) => console.warn('sbp art full load failed:', err));
    return () => { live = false; };
  }, [entityId, meta?.uploadedAt]);

  if (!thumb) return loaded ? <>{fallback}</> : null;
  return (
    <figure className="sbp-art__figure">
      <img
        src={full ?? thumb}
        alt={alt}
        className={`sbp-art__full ${full ? '' : 'sbp-art__full--loading'}`}
        decoding="async"
      />
      <DraftBadge status={meta?.status} />
    </figure>
  );
}

/** Art if there is any, otherwise the text in a larger box (e.g. species with no art). */
export function ArtOrText({ entityId, alt, text }: { entityId: string | undefined; alt: string; text?: string }) {
  return (
    <>
      <ArtFull
        entityId={entityId}
        alt={alt}
        fallback={text ? <p className="sbp-flavor sbp-flavor--large">{text}</p> : null}
      />
      {text && <ArtCaption entityId={entityId} text={text} />}
    </>
  );
}

/** Flavor under the image — only when the image is showing (else it's the big box). */
function ArtCaption({ entityId, text }: { entityId: string | undefined; text: string }) {
  const { src } = useArtThumb(entityId);
  return src ? <p className="sbp-flavor">{text}</p> : null;
}

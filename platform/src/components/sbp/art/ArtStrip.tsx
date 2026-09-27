import type { DerivedCharacter } from '@mtp/lib';
import { ArtThumb, useArtThumb } from './Art';

/** Species / class / background art side by side — the sheet's portrait row. */
export function ArtStrip({ d }: { d: DerivedCharacter }) {
  const items = [d.species, d.class, d.background].filter((x): x is NonNullable<typeof x> => !!x);
  return (
    <div className="sbp-art-strip">
      {items.map((it) => <ArtStripItem key={it.id} id={it.id} name={it.name} />)}
    </div>
  );
}

function ArtStripItem({ id, name }: { id: string; name: string }) {
  const { src } = useArtThumb(id);
  if (!src) return null;
  return (
    <figure className="sbp-art-strip__item">
      <ArtThumb entityId={id} alt={name} />
      <figcaption>{name}</figcaption>
    </figure>
  );
}

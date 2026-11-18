/**
 * Townies as a compact column: the left side of the combined Townies +
 * Rumors projector screen. One row per townie: avatar, big name, role and
 * the "they …" line. Sized for TOWNIE_FIT.both rows at 1920×1080.
 */

import { NpcCardAvatar, townieLines, type DisplayableNpc } from '../../../components/display/NpcDisplayRow';

export function TownieColumn({ npcs, title }: { npcs: DisplayableNpc[]; title: string }) {
  return (
    <section className="townie-column" aria-label={title}>
      <h2 className="townie-column__title">{title}</h2>
      {npcs.length === 0 ? (
        <p className="townie-column__empty">Nobody marked yet.</p>
      ) : (
        <ol className="townie-column__list" data-count={Math.min(npcs.length, 12)}>
          {npcs.map((npc) => {
            const lines = townieLines(npc);
            return (
              <li key={npc.id} className="townie-column__item">
                <NpcCardAvatar seed={npc.avatarSeed ?? npc.displayName ?? ''} size={72} />
                <div className="townie-column__text">
                  <p className="townie-column__name">{lines.name}</p>
                  {lines.role && <p className="townie-column__role">{lines.role}</p>}
                  {lines.known && <p className="townie-column__known">{lines.known}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

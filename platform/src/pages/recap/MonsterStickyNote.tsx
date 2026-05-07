/**
 * "The Monster That Wasn't" — empty-state-as-feature.
 *
 * Renders a paper-clipped sticky note acknowledging the monster builder
 * closed before reveal at this show. Brand-coherent way to handle the
 * data being genuinely gone.
 */

interface MonsterStickyNoteProps {
  /** Display only the "lost" treatment for now; structured this way to make
   *  future show variants (recovered monster reveal, in-progress) explicit. */
  status: 'lost';
}

export default function MonsterStickyNote({ status }: MonsterStickyNoteProps) {
  if (status !== 'lost') return null;

  return (
    <aside className="recap-sticky recap-sticky-monster" aria-labelledby="recap-monster-title">
      <div className="recap-sticky-clip" aria-hidden />
      <h2 id="recap-monster-title" className="recap-sticky-heading">
        The Monster That Wasn't
      </h2>
      <p className="recap-sticky-body">
        the monster builder closed before reveal. that one's lost to the betawave.
      </p>
    </aside>
  );
}

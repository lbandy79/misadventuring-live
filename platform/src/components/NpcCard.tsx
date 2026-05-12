/**
 * NpcCard — displays a saved NPC profile.
 *
 * Used on the post-submit screen (audience view) and the GM NPC roster.
 * Expects the showConfig fields list so it can label each fieldValue correctly.
 */

import type { NpcProfile } from '../../../src/lib/npcs/npcApi';

export interface NpcFieldDef {
  id: string;
  label: string;
  fieldType: 'personal' | 'world';
}

interface NpcCardProps {
  npc: NpcProfile;
  fields?: NpcFieldDef[];
  /** Show only personal fields (default: true) */
  personalOnly?: boolean;
  className?: string;
}

export function NpcCard({ npc, fields = [], personalOnly = true, className }: NpcCardProps) {
  const visibleFields = fields.filter(
    (f) => !personalOnly || f.fieldType === 'personal',
  );

  return (
    <div
      className={['npc-card', className].filter(Boolean).join(' ')}
      data-npc-id={npc.id}
    >
      <p className="npc-card__name">{npc.displayName}</p>
      {visibleFields.length > 0 && (
        <dl className="npc-card__fields">
          {visibleFields.map((f) => {
            const value = npc.fieldValues[f.id];
            if (!value) return null;
            return (
              <div key={f.id} className="npc-card__field">
                <dt className="npc-card__field-label">{f.label}</dt>
                <dd className="npc-card__field-value">{value}</dd>
              </div>
            );
          })}
        </dl>
      )}
    </div>
  );
}

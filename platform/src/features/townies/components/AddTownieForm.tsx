/**
 * GM: add a townie by hand (a Narrator character, or seeding the town
 * before doors). Same fields as the audience's join page. Each field is a
 * preset pick or a typed write-in.
 */

import { useId, useState } from 'react';
import { createNpc } from '@mtp/lib/npcs/npcApi';
import type { TownieField, TowniesShowConfig } from '../config';

const WRITE_IN = '__write_in__';

interface Props {
  config: TowniesShowConfig;
  systemId: string;
  onDone: () => void;
}

export function AddTownieForm({ config, systemId, onDone }: Props) {
  const fields = config.fields.filter((f) => f.fieldType === 'personal');
  const [name, setName] = useState('');
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [writeIns, setWriteIns] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formId = useId();

  function valueFor(f: TownieField): string {
    return picks[f.id] === WRITE_IN ? (writeIns[f.id] ?? '').trim() : (picks[f.id] ?? '');
  }

  const complete = name.trim().length > 0 && fields.every((f) => valueFor(f).length > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!complete || saving) return;
    setSaving(true);
    setError(null);
    try {
      const fieldValues: Record<string, string> = {};
      const fieldWriteIns: Record<string, boolean> = {};
      for (const f of fields) {
        fieldValues[f.id] = valueFor(f);
        if (picks[f.id] === WRITE_IN) fieldWriteIns[f.id] = true;
      }
      await createNpc({
        showId: config.showId,
        systemId,
        displayName: name.trim(),
        fieldValues,
        fieldWriteIns,
        // GM-made townies get their own token so they never collide with
        // the GM's phone if they also join as a guest.
        deviceToken: `gm-${crypto.randomUUID()}`,
        asGm: true,
      });
      onDone();
    } catch (err) {
      console.error('add townie failed:', err);
      setError("That townie didn't save. Check your connection and try again.");
      setSaving(false);
    }
  }

  return (
    <form className="townies-add" onSubmit={handleSubmit} aria-labelledby={`${formId}-title`}>
      <h3 id={`${formId}-title`} className="townies-add__title">Add a townie</h3>

      <label className="townies-add__field">
        <span className="townies-add__label">First name</span>
        <input
          className="townies-add__input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          placeholder={config.namePlaceholder ?? 'Dolores'}
          required
        />
      </label>

      {fields.map((f) => (
        <div key={f.id} className="townies-add__field">
          <label className="townies-add__label" htmlFor={`${formId}-${f.id}`}>
            {f.label}
          </label>
          <select
            id={`${formId}-${f.id}`}
            className="townies-add__input"
            value={picks[f.id] ?? ''}
            onChange={(e) => setPicks((p) => ({ ...p, [f.id]: e.target.value }))}
            required
          >
            <option value="" disabled>
              Pick one…
            </option>
            {(f.options ?? []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
            <option value={WRITE_IN}>Write my own…</option>
          </select>
          {picks[f.id] === WRITE_IN && (
            <input
              className="townies-add__input townies-add__input--write-in"
              aria-label={`${f.label}, your own`}
              value={writeIns[f.id] ?? ''}
              onChange={(e) => setWriteIns((w) => ({ ...w, [f.id]: e.target.value }))}
              maxLength={80}
              placeholder={f.writeInPlaceholder ?? `Your own ${f.label.toLowerCase()}…`}
              required
            />
          )}
        </div>
      ))}

      {error && (
        <p className="townies__error" role="alert">
          {error}
        </p>
      )}

      <div className="townies-add__actions">
        <button type="submit" className="btn-primary" disabled={!complete || saving}>
          {saving ? 'Adding…' : 'Add to town'}
        </button>
        <button type="button" className="btn-ghost" onClick={onDone} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}

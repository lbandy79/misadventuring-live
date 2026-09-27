/**
 * SbpArtAdminPanel — draft art for SBP classes, species and backgrounds.
 *
 * Pick images (or a whole folder) → each is shrunk in the browser → the
 * panel suggests which class/species/background it belongs to → fix any
 * wrong guesses → upload. Art is keyed by entity id, never file name.
 * Replacing art archives the old version (sbp-art-history).
 *
 * Art is unpublished IP: it goes straight from this browser to Firestore,
 * behind the same cast/admin lock as the rules. Never the repo or bundle.
 */

import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import {
  artKindFromPath,
  isSafeImageDataUrl,
  removeSbpArt,
  setSbpArtStatus,
  subscribeToAllSbpRules,
  suggestArtMatches,
  uploadSbpArt,
  useAuth,
  type ArtEntity,
  type ArtStatus,
  type LoadedSbpRules,
} from '@mtp/lib';
import { useSbpArt } from '../sbp/art/artStore';
import {
  FULL_ATTEMPTS,
  FULL_BUDGET,
  THUMB_ATTEMPTS,
  THUMB_BUDGET,
  shrinkImage,
  type ShrunkImage,
} from '../sbp/art/resizeImage';
import './SbpRulesAdminPanel.css';

const KIND_LABEL: Record<ArtEntity['kind'], string> = { class: 'Classes', species: 'Species', background: 'Backgrounds' };

interface PendingRow {
  key: string;
  fileName: string;
  path: string;
  state: 'shrinking' | 'ready' | 'error' | 'uploaded';
  error?: string;
  full?: ShrunkImage;
  thumb?: ShrunkImage;
  entityId: string;
  status: ArtStatus;
}

export default function SbpArtAdminPanel() {
  const { user, isAdmin } = useAuth();
  const [rules, setRules] = useState<LoadedSbpRules>({ classes: null, origins: null });
  const { thumbs, loaded } = useSbpArt(isAdmin);
  const [rows, setRows] = useState<PendingRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => subscribeToAllSbpRules(setRules, (err) => console.error('sbp-rules read failed:', err)), []);

  const entities = useMemo<ArtEntity[]>(() => [
    ...(rules.classes?.data.classes ?? []).map((c) => ({ id: c.id, name: c.name, kind: 'class' as const })),
    ...(rules.origins?.data.species ?? []).map((s) => ({ id: s.id, name: s.name, kind: 'species' as const })),
    ...(rules.origins?.data.backgrounds ?? []).map((b) => ({ id: b.id, name: b.name, kind: 'background' as const })),
  ], [rules]);
  const entityById = useMemo(() => new Map(entities.map((e) => [e.id, e])), [entities]);

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])].filter((f) => /^image\/(png|jpe?g|webp)$/.test(f.type));
    e.target.value = '';
    if (!files.length) return;
    setNotice(null);

    const paths = files.map((f) => (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name);
    const matches = suggestArtMatches(files.map((f, i) => ({ name: f.name, kindHint: artKindFromPath(paths[i]) })), entities);
    const fresh: PendingRow[] = files.map((f, i) => ({
      key: `${Date.now()}-${i}-${f.name}`,
      fileName: f.name,
      path: paths[i],
      state: 'shrinking',
      entityId: matches[i]?.entity.id ?? '',
      status: 'draft',
    }));
    setRows(fresh);

    // Shrink one at a time: a folder of 2 MB PNGs decoded at once can exhaust a phone's memory.
    for (let i = 0; i < files.length; i++) {
      try {
        const full = await shrinkImage(files[i], FULL_ATTEMPTS, FULL_BUDGET);
        const thumb = await shrinkImage(files[i], THUMB_ATTEMPTS, THUMB_BUDGET);
        setRows((rs) => rs.map((r) => (r.key === fresh[i].key ? { ...r, state: 'ready', full, thumb } : r)));
      } catch (err) {
        setRows((rs) => rs.map((r) => (r.key === fresh[i].key ? { ...r, state: 'error', error: (err as Error).message } : r)));
      }
    }
  }

  const update = (key: string, patch: Partial<PendingRow>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const targeted = rows.filter((r) => r.entityId && r.state !== 'uploaded');
  const dupIds = new Set(
    targeted.map((r) => r.entityId).filter((id, i, all) => all.indexOf(id) !== i),
  );
  const uploadable = targeted.filter((r) => r.state === 'ready');
  const stillShrinking = rows.some((r) => r.state === 'shrinking');

  async function uploadAll() {
    if (!user || !uploadable.length || dupIds.size) return;
    const replacing = uploadable.filter((r) => thumbs[r.entityId]).length;
    if (!confirm(`Upload ${uploadable.length} image(s)?${replacing ? ` ${replacing} will replace existing art (kept in history).` : ''}`)) return;
    setBusy(true);
    setNotice(null);
    let done = 0;
    for (const r of uploadable) {
      try {
        await uploadSbpArt({
          entityId: r.entityId,
          thumb: r.thumb!.dataUrl,
          full: r.full!.dataUrl,
          status: r.status,
          sourceFileName: r.fileName,
          width: r.full!.width,
          height: r.full!.height,
          user: { uid: user.uid, email: user.email },
        });
        update(r.key, { state: 'uploaded' });
        done += 1;
      } catch (err) {
        console.error('sbp art upload failed:', err);
        update(r.key, { state: 'error', error: (err as Error).message });
      }
    }
    setBusy(false);
    setNotice(`Uploaded ${done} of ${uploadable.length}.`);
  }

  async function toggleStatus(id: string) {
    const current = thumbs[id];
    if (!current) return;
    await setSbpArtStatus(id, current, current.meta.status === 'final' ? 'draft' : 'final').catch((err) =>
      setNotice(`Couldn't change status: ${(err as Error).message}`));
  }

  async function remove(id: string) {
    const name = entityById.get(id)?.name ?? id;
    if (!confirm(`Remove the art for ${name}? (Earlier replaced versions stay in history.)`)) return;
    await removeSbpArt(id).catch((err) => setNotice(`Couldn't remove: ${(err as Error).message}`));
  }

  const kinds: ArtEntity['kind'][] = ['class', 'species', 'background'];
  const withArt = entities.filter((e) => thumbs[e.id]).length;

  return (
    <div className="npc-admin-panel sbp-rules sbp-art-admin">
      <h2 className="npc-admin-panel__heading">SBP Labs — draft art</h2>
      <p className="cast-admin-list__hint">
        Images are shrunk in your browser and stored behind the crew-only lock — never in the repo. Choose the
        {' '}<code>Player Packet Art</code> folder (or individual images); the panel matches each to a class, species or
        background, and you can correct any guess before uploading.
      </p>

      {entities.length === 0 ? (
        <p className="npc-admin-panel__empty">Upload the rules files first — art is attached to their entries.</p>
      ) : (
        <>
          <p className="sbp-rules__counts">{withArt} of {entities.length} entries have art{loaded ? '' : ' (loading…)'}.</p>

          <div className="sbp-rules__upload sbp-art-admin__pickers">
            <label className="btn-primary sbp-rules__pick">
              Choose a folder…
              <input type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={onPick} disabled={busy} {...{ webkitdirectory: '' }} />
            </label>
            <label className="btn-secondary sbp-rules__pick">
              Choose images…
              <input type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={onPick} disabled={busy} />
            </label>
          </div>

          {rows.length > 0 && (
            <div className="sbp-rules__review">
              <ul className="sbp-art-admin__rows">
                {rows.map((r) => (
                  <li key={r.key} className={`sbp-art-admin__row sbp-art-admin__row--${r.state}`}>
                    {r.thumb ? <img src={r.thumb.dataUrl} alt="" className="sbp-art-admin__preview" /> : <span className="sbp-art-admin__preview sbp-art-admin__preview--empty" />}
                    <div className="sbp-art-admin__row-body">
                      <span className="sbp-art-admin__file" title={r.path}>{r.fileName}</span>
                      <span className="sbp-muted">
                        {r.state === 'shrinking' && 'Shrinking…'}
                        {r.state === 'ready' && r.full && `${r.full.width}×${r.full.height} · ${Math.round(r.full.dataUrl.length / 1000)} KB`}
                        {r.state === 'uploaded' && '✓ Uploaded'}
                        {r.state === 'error' && <span className="sbp-danger">{r.error}</span>}
                      </span>
                      {r.state !== 'uploaded' && (
                        <div className="sbp-art-admin__controls">
                          <select
                            className="wizard-input"
                            value={r.entityId}
                            onChange={(e) => update(r.key, { entityId: e.target.value })}
                            disabled={busy}
                            aria-label={`Entry for ${r.fileName}`}
                          >
                            <option value="">— skip this image —</option>
                            {kinds.map((k) => (
                              <optgroup key={k} label={KIND_LABEL[k]}>
                                {entities.filter((e) => e.kind === k).map((e) => (
                                  <option key={e.id} value={e.id}>{e.name}{thumbs[e.id] ? ' (has art)' : ''}</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                          <select className="wizard-input" value={r.status} onChange={(e) => update(r.key, { status: e.target.value as ArtStatus })} disabled={busy} aria-label="Status">
                            <option value="draft">draft</option>
                            <option value="final">final</option>
                          </select>
                        </div>
                      )}
                      {r.entityId && dupIds.has(r.entityId) && r.state !== 'uploaded' && (
                        <span className="sbp-danger">Two images are set to the same entry.</span>
                      )}
                      {r.entityId && thumbs[r.entityId] && r.state === 'ready' && (
                        <span className="sbp-muted">Replaces the current art (kept in history).</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="sbp-rules__actions">
                <button type="button" className="btn-primary" onClick={uploadAll} disabled={busy || stillShrinking || !uploadable.length || dupIds.size > 0}>
                  {busy ? 'Uploading…' : stillShrinking ? 'Preparing…' : `Upload ${uploadable.length} image${uploadable.length === 1 ? '' : 's'}`}
                </button>
                <button type="button" className="sbp-rules__link" onClick={() => setRows([])} disabled={busy}>Clear</button>
              </div>
            </div>
          )}
          {notice && <p className="sbp-rules__notice" role="status">{notice}</p>}

          {kinds.map((k) => (
            <section key={k} className="sbp-art-admin__coverage">
              <h3 className="sbp-rules__card-title">{KIND_LABEL[k]}</h3>
              <ul className="sbp-art-admin__grid">
                {entities.filter((e) => e.kind === k).map((e) => {
                  const art = thumbs[e.id];
                  return (
                    <li key={e.id} className="sbp-art-admin__tile">
                      {art && isSafeImageDataUrl(art.thumb)
                        ? <img src={art.thumb} alt="" />
                        : <span className="sbp-art-admin__none">no art</span>}
                      <span className="sbp-art-admin__tile-name">{e.name}</span>
                      {art && (
                        <span className="sbp-art-admin__tile-actions">
                          <button type="button" className="sbp-rules__link" onClick={() => toggleStatus(e.id)} title="Toggle draft/final">
                            {art.meta.status}
                          </button>
                          <button type="button" className="sbp-rules__link sbp-danger" onClick={() => remove(e.id)}>remove</button>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}

/**
 * SbpRulesAdminPanel — upload Soggy Bottom Pirates rules files to Firestore.
 *
 * The rules files are unpublished IP and never enter the repo or the bundle
 * (docs/sbp/BRIEF.md §3). This panel is how they get into `sbp-rules`:
 * pick a local JSON file → validate → review the diff → upload. The previous
 * version is archived to `sbp-rules-history` in the same transaction.
 *
 * Rebalancing after a playtest is: edit the file, upload. No deploy.
 */

import { useEffect, useState, type ChangeEvent } from 'react';
import {
  useAuth,
  diffRules,
  getSbpRulesHistory,
  restoreSbpRulesFromHistory,
  subscribeToAllSbpRules,
  uploadSbpRules,
  validateRulesFile,
  type LoadedSbpRules,
  type RulesDiff,
  type SbpRulesHistoryRow,
  type SbpRulesKind,
  type SbpRulesMeta,
  type ValidationResult,
} from '@mtp/lib';
import './SbpRulesAdminPanel.css';

/** The kinds that exist today; `spells` joins when that file does. */
type LoadedKind = keyof LoadedSbpRules;
const KINDS: LoadedKind[] = ['classes', 'origins'];

const isLoadedKind = (k: SbpRulesKind | null): k is LoadedKind => k === 'classes' || k === 'origins';

interface Candidate {
  fileName: string;
  data: unknown;
  result: ValidationResult;
  diff: RulesDiff | null;
}

const fmtDate = (ms: number) => new Date(ms).toLocaleString();

export default function SbpRulesAdminPanel() {
  const { user } = useAuth();
  const [loaded, setLoaded] = useState<LoadedSbpRules>({ classes: null, origins: null });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<SbpRulesKind, SbpRulesHistoryRow[]>>({
    classes: [], origins: [], spells: [],
  });
  const [historyOpen, setHistoryOpen] = useState<SbpRulesKind | null>(null);

  useEffect(() => {
    return subscribeToAllSbpRules(setLoaded, (err) => {
      console.error('sbp-rules subscription failed:', err);
      setLoadError('Could not read the rules docs. Check your admin permissions.');
    });
  }, []);

  async function refreshHistory(kind: SbpRulesKind) {
    try {
      const rows = await getSbpRulesHistory(kind);
      setHistory((h) => ({ ...h, [kind]: rows }));
    } catch (err) {
      console.error('sbp-rules-history read failed:', err);
    }
  }

  function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    setCandidate(null);
    setParseError(null);
    setNotice(null);
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      let data: unknown;
      try {
        data = JSON.parse(String(reader.result));
      } catch (err) {
        setParseError(`Not valid JSON: ${(err as Error).message}`);
        return;
      }
      const result = validateRulesFile(data, { classes: loaded.classes?.data ?? null });
      const current = isLoadedKind(result.kind) ? loaded[result.kind]?.data : undefined;
      const diff = result.kind ? diffRules(result.kind, current, data) : null;
      setCandidate({ fileName: file.name, data, result, diff });
    };
    reader.onerror = () => setParseError('Could not read the file.');
    reader.readAsText(file);
  }

  async function onUpload() {
    if (!candidate || !candidate.result.ok || !isLoadedKind(candidate.result.kind) || !user) return;
    const { schemaVersion, counts } = candidate.result;
    const kind = candidate.result.kind;
    const replacing = loaded[kind];
    const msg = replacing
      ? `Replace the current ${kind} doc (uploaded ${fmtDate(replacing.meta.uploadedAt)})? The old version is kept in history.`
      : `Upload ${candidate.fileName} as the first ${kind} doc?`;
    if (!confirm(msg)) return;

    setBusy(true);
    setNotice(null);
    try {
      const meta = await uploadSbpRules({
        kind,
        data: candidate.data,
        schemaVersion: schemaVersion ?? 'unknown',
        counts,
        sourceFileName: candidate.fileName,
        user: { uid: user.uid, email: user.email },
      });
      setNotice(`Uploaded ${kind} at ${fmtDate(meta.uploadedAt)}.`);
      setCandidate(null);
      void refreshHistory(kind);
    } catch (err) {
      console.error('sbp-rules upload failed:', err);
      setNotice(`Upload failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function onRestore(row: SbpRulesHistoryRow) {
    if (!user) return;
    if (!confirm(`Restore the ${row.kind} version from ${fmtDate(row.previous.meta.uploadedAt)}? The current doc is kept in history.`)) return;
    setBusy(true);
    try {
      await restoreSbpRulesFromHistory(row.id, { uid: user.uid, email: user.email });
      setNotice(`Restored ${row.kind} from ${fmtDate(row.previous.meta.uploadedAt)}.`);
      void refreshHistory(row.kind);
    } catch (err) {
      console.error('sbp-rules restore failed:', err);
      setNotice(`Restore failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  function toggleHistory(kind: SbpRulesKind) {
    const next = historyOpen === kind ? null : kind;
    setHistoryOpen(next);
    if (next) void refreshHistory(next);
  }

  return (
    <div className="npc-admin-panel sbp-rules">
      <h2 className="npc-admin-panel__heading">SBP Labs — rules data</h2>
      <p className="cast-admin-list__hint">
        Upload <code>sbp_classes.json</code> and <code>sbp_origins.json</code> here. Files are read in
        your browser and written straight to Firestore; they never touch the repo. Upload classes
        first so origins can be checked against it.
      </p>

      {loadError && <p className="npc-admin-panel__error" role="alert">{loadError}</p>}

      <div className="sbp-rules__current">
        {KINDS.map((kind) => (
          <CurrentDocCard
            key={kind}
            kind={kind}
            meta={loaded[kind]?.meta ?? null}
            historyOpen={historyOpen === kind}
            history={history[kind]}
            busy={busy}
            onToggleHistory={() => toggleHistory(kind)}
            onRestore={onRestore}
          />
        ))}
      </div>

      <div className="sbp-rules__upload">
        <label className="btn-primary sbp-rules__pick">
          Choose a rules file…
          <input type="file" accept=".json,application/json" onChange={onPickFile} disabled={busy} hidden />
        </label>
        {parseError && <p className="npc-admin-panel__error" role="alert">{parseError}</p>}
        {notice && <p className="sbp-rules__notice" role="status">{notice}</p>}
      </div>

      {candidate && (
        <CandidateReview candidate={candidate} busy={busy} onUpload={onUpload} onDiscard={() => setCandidate(null)} />
      )}
    </div>
  );
}

// ─── Current doc ──────────────────────────────────────────────────────────────

function CurrentDocCard({
  kind, meta, history, historyOpen, busy, onToggleHistory, onRestore,
}: {
  kind: LoadedKind;
  meta: SbpRulesMeta | null;
  history: SbpRulesHistoryRow[];
  historyOpen: boolean;
  busy: boolean;
  onToggleHistory: () => void;
  onRestore: (row: SbpRulesHistoryRow) => void;
}) {
  return (
    <div className="sbp-rules__card">
      <h3 className="sbp-rules__card-title">{kind}</h3>
      {meta ? (
        <dl className="sbp-rules__meta">
          <dt>Uploaded</dt><dd>{fmtDate(meta.uploadedAt)}</dd>
          <dt>By</dt><dd>{meta.uploadedByEmail || meta.uploadedBy}</dd>
          <dt>File</dt><dd>{meta.sourceFileName}</dd>
          <dt>Schema</dt><dd>{meta.schemaVersion}</dd>
          <dt>Contents</dt>
          <dd>{Object.entries(meta.counts).map(([k, v]) => `${v} ${k}`).join(' · ')}</dd>
        </dl>
      ) : (
        <p className="npc-admin-panel__empty">Not uploaded yet.</p>
      )}
      <button type="button" className="sbp-rules__link" onClick={onToggleHistory} disabled={busy}>
        {historyOpen ? 'Hide history' : 'History'}
      </button>
      {historyOpen && (
        history.length === 0 ? (
          <p className="npc-admin-panel__empty">No previous versions.</p>
        ) : (
          <ul className="sbp-rules__history">
            {history.map((row) => (
              <li key={row.id}>
                <span>
                  {fmtDate(row.previous.meta.uploadedAt)} · {row.previous.meta.sourceFileName}
                  {' '}<small>(replaced {fmtDate(row.replacedAt)})</small>
                </span>
                <button type="button" className="cast-admin-list__remove" onClick={() => onRestore(row)} disabled={busy}>
                  Restore
                </button>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}

// ─── Candidate review ─────────────────────────────────────────────────────────

function CandidateReview({
  candidate, busy, onUpload, onDiscard,
}: {
  candidate: Candidate;
  busy: boolean;
  onUpload: () => void;
  onDiscard: () => void;
}) {
  const { result, diff, fileName } = candidate;
  const errors = result.issues.filter((i) => i.level === 'error');
  const warnings = result.issues.filter((i) => i.level === 'warning');

  return (
    <div className={`sbp-rules__review ${result.ok ? '' : 'sbp-rules__review--blocked'}`}>
      <h3 className="sbp-rules__card-title">
        {fileName} → <strong>{result.kind ?? 'unrecognised'}</strong>
        {result.schemaVersion && <small> · schema {result.schemaVersion}</small>}
      </h3>

      {Object.keys(result.counts).length > 0 && (
        <p className="sbp-rules__counts">
          {Object.entries(result.counts).map(([k, v]) => `${v} ${k}`).join(' · ')}
        </p>
      )}

      {errors.length > 0 && (
        <IssueList title={`${errors.length} error${errors.length === 1 ? '' : 's'} — upload blocked`} issues={errors} kind="error" />
      )}
      {warnings.length > 0 && (
        <IssueList title={`${warnings.length} warning${warnings.length === 1 ? '' : 's'}`} issues={warnings} kind="warning" />
      )}

      {diff && result.ok && <DiffSummary diff={diff} />}

      <div className="sbp-rules__actions">
        <button type="button" className="btn-primary" onClick={onUpload} disabled={!result.ok || busy}>
          {busy ? 'Uploading…' : `Upload ${result.kind ?? ''}`}
        </button>
        <button type="button" className="sbp-rules__link" onClick={onDiscard} disabled={busy}>
          Discard
        </button>
      </div>
    </div>
  );
}

function IssueList({ title, issues, kind }: {
  title: string;
  issues: ValidationResult['issues'];
  kind: 'error' | 'warning';
}) {
  return (
    <details className={`sbp-rules__issues sbp-rules__issues--${kind}`} open={kind === 'error'}>
      <summary>{title}</summary>
      <ul>
        {issues.map((i, n) => (
          <li key={n}><code>{i.path || '(file)'}</code> {i.message}</li>
        ))}
      </ul>
    </details>
  );
}

function DiffSummary({ diff }: { diff: RulesDiff }) {
  const total = diff.added.length + diff.removed.length + diff.changed.length;
  if (total === 0) {
    return <p className="sbp-rules__counts">No changes versus the current doc ({diff.unchanged} entries identical).</p>;
  }
  return (
    <details className="sbp-rules__diff">
      <summary>
        {diff.added.length} added · {diff.changed.length} changed · {diff.removed.length} removed · {diff.unchanged} unchanged
      </summary>
      {(['added', 'changed', 'removed'] as const).map((k) => diff[k].length > 0 && (
        <div key={k}>
          <h4>{k}</h4>
          <ul className={`sbp-rules__diff-list sbp-rules__diff-list--${k}`}>
            {diff[k].map((id) => <li key={id}><code>{id}</code></li>)}
          </ul>
        </div>
      ))}
    </details>
  );
}

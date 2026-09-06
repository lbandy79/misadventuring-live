/**
 * AudienceAdminPanel — the list of everyone who has given us their email.
 *
 * Reads `audience-profiles`, which is admin-read-only in firestore.rules,
 * so this only works for a signed-in admin.
 *
 * Two ways an address gets here:
 *   'character' — they saved a character at a show (has a magic link)
 *   'footer'    — they used the notify-me form on the site (no magic link,
 *                 so `sendNotebookBatch` skips them — see the note below)
 */

import { useCallback, useEffect, useState } from 'react';
import {
  listAudienceProfiles,
  audienceRowsToCsv,
  type AudienceProfileRow,
} from '../../../../src/lib/audience/audienceApi';

type Filter = 'all' | 'character' | 'footer';

function fmtDate(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function AudienceAdminPanel() {
  const [rows, setRows] = useState<AudienceProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listAudienceProfiles()
      .then((list) => {
        setRows(list);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load audience profiles:', err);
        setError(
          "Couldn't load the audience list. This needs an admin session — " +
            'check that your email is on config/admins.emails.',
        );
        setLoading(false);
      });
  }, []);

  useEffect(load, [load]);

  const shown = rows.filter((r) => filter === 'all' || r.source === filter);
  const fromCharacters = rows.filter((r) => r.source === 'character').length;
  const fromFooter = rows.filter((r) => r.source === 'footer').length;

  function copyEmails() {
    const text = shown.map((r) => r.email).join(', ');
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      (err) => console.error('Clipboard write failed:', err),
    );
  }

  function downloadCsv() {
    const blob = new Blob([audienceRowsToCsv(shown)], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mtp-audience-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="npc-admin-panel">
      <h2 className="npc-admin-panel__heading">Audience emails</h2>

      {loading && <p className="aud-note">Loading the list…</p>}
      {error && <p className="aud-error">{error}</p>}

      {!loading && !error && (
        <>
          <div className="aud-stats">
            <span className="aud-stat">
              <strong>{rows.length}</strong> total
            </span>
            <span className="aud-stat">
              <strong>{fromCharacters}</strong> saved a character
            </span>
            <span className="aud-stat">
              <strong>{fromFooter}</strong> from the site form
            </span>
          </div>

          <nav className="admin-tabs" role="tablist">
            {(
              [
                ['all', `All (${rows.length})`],
                ['character', `Characters (${fromCharacters})`],
                ['footer', `Site form (${fromFooter})`],
              ] as Array<[Filter, string]>
            ).map(([key, label]) => (
              <button
                key={key}
                role="tab"
                className={`admin-tab ${filter === key ? 'admin-tab--active' : ''}`}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="aud-actions">
            <button className="btn-secondary" onClick={copyEmails} disabled={!shown.length}>
              {copied ? 'Copied ✓' : `Copy ${shown.length} address${shown.length === 1 ? '' : 'es'}`}
            </button>
            <button className="btn-secondary" onClick={downloadCsv} disabled={!shown.length}>
              Download CSV
            </button>
            <button className="btn-secondary" onClick={load}>
              Refresh
            </button>
          </div>

          {fromFooter > 0 && (
            <p className="aud-note aud-note--warn">
              Heads up: the {fromFooter} site-form signup{fromFooter === 1 ? '' : 's'}{' '}
              can&apos;t be emailed by <code>sendNotebookBatch</code> — it only sends to
              people who saved a character for the show being sent. Export and send to
              these separately until a broadcast path exists.
            </p>
          )}

          {shown.length === 0 ? (
            <p className="aud-note">No addresses in this view yet.</p>
          ) : (
            <div className="aud-table-wrap">
              <table className="aud-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Source</th>
                    <th>Characters</th>
                    <th>Shows</th>
                    <th>Link</th>
                    <th>Added</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => (
                    <tr key={r.email}>
                      <td className="aud-email">{r.email}</td>
                      <td>
                        <span className={`aud-badge aud-badge--${r.source}`}>
                          {r.source === 'character' ? 'character' : 'site form'}
                        </span>
                      </td>
                      <td>{r.npcCount || '—'}</td>
                      <td className="aud-shows">{r.shows.join(', ') || '—'}</td>
                      <td>{r.hasMagicLink ? '🔗' : '—'}</td>
                      <td>{fmtDate(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

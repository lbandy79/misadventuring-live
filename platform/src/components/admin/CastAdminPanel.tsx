/**
 * CastAdminPanel — GM controls for cast members and their hunter sheets.
 *
 * Two tabs:
 *   Cast List   — add/remove player emails from config/cast allowlist
 *   Hunters     — read-only view of all saved hunter sheets
 */

import { useEffect, useState } from 'react';
import {
  initCastDoc,
  getCastEmails,
  setCastEmails,
  subscribeToAllHunterSheets,
  type HunterSheet,
} from '../../../../src/lib/hunters/hunterApi';

type Tab = 'cast' | 'hunters';

export default function CastAdminPanel() {
  const [tab, setTab] = useState<Tab>('cast');

  return (
    <div className="npc-admin-panel">
      <h2 className="npc-admin-panel__heading">The Party</h2>
      <nav className="admin-tabs" role="tablist">
        <button
          role="tab"
          className={`admin-tab ${tab === 'cast' ? 'admin-tab--active' : ''}`}
          onClick={() => setTab('cast')}
        >
          Cast list
        </button>
        <button
          role="tab"
          className={`admin-tab ${tab === 'hunters' ? 'admin-tab--active' : ''}`}
          onClick={() => setTab('hunters')}
        >
          Hunters
        </button>
      </nav>

      {tab === 'cast' && <CastListTab />}
      {tab === 'hunters' && <HuntersTab />}
    </div>
  );
}

// ─── Cast List Tab ────────────────────────────────────────────────────────────

function CastListTab() {
  const [emails, setEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initCastDoc()
      .then(() => getCastEmails())
      .then((list) => {
        setEmails(list);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load cast list:', err);
        setLoading(false);
      });
  }, []);

  async function addEmail() {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed || emails.includes(trimmed)) {
      setNewEmail('');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const next = [...emails, trimmed];
      await setCastEmails(next);
      setEmails(next);
      setNewEmail('');
    } catch (err) {
      console.error('Failed to add cast member:', err);
      setError('Couldn\'t save. Check your admin permissions.');
    } finally {
      setSaving(false);
    }
  }

  async function removeEmail(email: string) {
    setError(null);
    setSaving(true);
    try {
      const next = emails.filter((e) => e !== email);
      await setCastEmails(next);
      setEmails(next);
    } catch (err) {
      console.error('Failed to remove cast member:', err);
      setError('Couldn\'t save. Check your admin permissions.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="npc-admin-panel__empty">Loading cast list…</p>;
  }

  return (
    <div className="cast-admin-list">
      <p className="cast-admin-list__hint">
        Add each player's Google email. They'll see character creation when they sign in.
      </p>

      {emails.length === 0 ? (
        <p className="npc-admin-panel__empty">No cast members yet.</p>
      ) : (
        <ul className="cast-admin-list__emails">
          {emails.map((email) => (
            <li key={email} className="cast-admin-list__row">
              <span className="cast-admin-list__email">{email}</span>
              <button
                type="button"
                className="cast-admin-list__remove"
                onClick={() => removeEmail(email)}
                disabled={saving}
                aria-label={`Remove ${email}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="cast-admin-list__add">
        <input
          type="email"
          className="cast-admin-list__input"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addEmail()}
          placeholder="player@gmail.com"
          maxLength={120}
          disabled={saving}
        />
        <button
          type="button"
          className="btn-primary cast-admin-list__add-btn"
          onClick={addEmail}
          disabled={!newEmail.trim() || saving}
        >
          {saving ? '…' : 'Add'}
        </button>
      </div>

      {error && <p className="npc-admin-panel__error" role="alert">{error}</p>}
    </div>
  );
}

// ─── Hunters Tab ──────────────────────────────────────────────────────────────

function HuntersTab() {
  const [sheets, setSheets] = useState<HunterSheet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToAllHunterSheets((all) => {
      setSheets(all);
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) {
    return <p className="npc-admin-panel__empty">Loading hunter sheets…</p>;
  }

  if (sheets.length === 0) {
    return (
      <p className="npc-admin-panel__empty">
        No hunter sheets yet. Cast members create them at{' '}
        <code>/shows/monster-of-the-week/create-hunter</code>.
      </p>
    );
  }

  // Group by cast member
  const byMember = sheets.reduce<Record<string, HunterSheet[]>>((acc, s) => {
    const key = s.castMemberName || s.castMemberEmail;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  return (
    <div className="hunters-admin-list">
      {Object.entries(byMember).map(([member, memberSheets]) => (
        <div key={member} className="hunters-admin-member">
          <h3 className="hunters-admin-member__name">{member}</h3>
          <ul className="hunters-admin-member__sheets">
            {memberSheets.map((sheet) => (
              <li key={sheet.id} className="hunters-admin-member__sheet">
                <strong>{sheet.hunterName}</strong>
                {' — '}
                <span className="hunters-admin-member__playbook">{sheet.playbookName}</span>
                <span className="hunters-admin-member__show"> ({sheet.showId})</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

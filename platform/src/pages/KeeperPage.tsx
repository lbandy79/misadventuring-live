/**
 * KeeperPage — /keeper
 *
 * GM's world-building compendium for Monster of the Week.
 * Admin-gated. Shows all created threats grouped by category.
 * Entry point to the four creation wizards.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@mtp/lib';
import {
  subscribeToKeeperThreats,
  deleteKeeperThreat,
  type KeeperThreat,
  type ThreatCategory,
} from '../../../src/lib/threats/threatApi';

const CATEGORIES: { id: ThreatCategory; label: string; plural: string; newPath: string; icon: string }[] = [
  { id: 'monster',   label: 'Monster',   plural: 'Monsters',   newPath: '/keeper/monsters/new',    icon: '👁' },
  { id: 'minion',    label: 'Minion',    plural: 'Minions',    newPath: '/keeper/minions/new',     icon: '🩸' },
  { id: 'bystander', label: 'Bystander', plural: 'Bystanders', newPath: '/keeper/bystanders/new',  icon: '👤' },
  { id: 'location',  label: 'Location',  plural: 'Locations',  newPath: '/keeper/locations/new',   icon: '📍' },
];

export default function KeeperPage() {
  const { isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const [threats, setThreats] = useState<KeeperThreat[]>([]);
  const [activeTab, setActiveTab] = useState<ThreatCategory>('monster');
  const [loadingThreats, setLoadingThreats] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    const unsub = subscribeToKeeperThreats((all) => {
      setThreats(all);
      setLoadingThreats(false);
    });
    return unsub;
  }, [isAdmin]);

  if (isLoading) return <div className="page-card"><p className="typewriter-label">Loading…</p></div>;
  if (!isAdmin) {
    return (
      <section className="page-card">
        <p className="typewriter-label">Keeper access only.</p>
        <Link to="/" className="btn-secondary" style={{ marginTop: '1rem', display: 'inline-block' }}>Back to home</Link>
      </section>
    );
  }

  const tabThreats = threats.filter((t) => t.category === activeTab);
  const activeCategory = CATEGORIES.find((c) => c.id === activeTab)!;

  async function handleDelete(threat: KeeperThreat) {
    if (!confirm(`Delete "${threat.name}"? This can't be undone.`)) return;
    setDeletingId(threat.id);
    try {
      await deleteKeeperThreat(threat.id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="page-card keeper-page">
      <header className="keeper-header">
        <h1 className="keeper-title">Keeper's Compendium</h1>
        <p className="keeper-subtitle typewriter-label">Monster of the Week — World Building</p>
      </header>

      {/* Category tabs */}
      <nav className="keeper-tabs" aria-label="Threat categories">
        {CATEGORIES.map((cat) => {
          const count = threats.filter((t) => t.category === cat.id).length;
          return (
            <button
              key={cat.id}
              className={`keeper-tab${activeTab === cat.id ? ' keeper-tab--active' : ''}`}
              onClick={() => setActiveTab(cat.id)}
            >
              <span className="keeper-tab-icon">{cat.icon}</span>
              <span className="keeper-tab-label">{cat.plural}</span>
              {count > 0 && <span className="keeper-tab-count">{count}</span>}
            </button>
          );
        })}
      </nav>

      {/* Tab content */}
      <div className="keeper-tab-content">
        <div className="keeper-tab-actions">
          <button
            className="btn-primary"
            onClick={() => navigate(activeCategory.newPath)}
          >
            + New {activeCategory.label}
          </button>
        </div>

        {loadingThreats ? (
          <p className="typewriter-label keeper-loading">Loading…</p>
        ) : tabThreats.length === 0 ? (
          <div className="keeper-empty">
            <p>No {activeCategory.plural.toLowerCase()} yet.</p>
            <p className="keeper-empty-hint typewriter-label">
              Create your first {activeCategory.label.toLowerCase()} to get started.
            </p>
          </div>
        ) : (
          <ul className="keeper-threat-list">
            {tabThreats.map((threat) => (
              <li key={threat.id} className="keeper-threat-card">
                <Link to={`/keeper/${threat.category}s/${threat.id}`} className="keeper-threat-link">
                  <span className="keeper-threat-name">{threat.name}</span>
                  <span className="keeper-threat-type typewriter-label">{threat.typeId}</span>
                  <span className="keeper-threat-motivation">{threat.motivation}</span>
                </Link>
                <div className="keeper-threat-actions">
                  <button
                    className="btn-ghost keeper-threat-edit"
                    onClick={() => navigate(`/keeper/${threat.category}s/${threat.id}/edit`)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn-ghost keeper-threat-delete"
                    onClick={() => handleDelete(threat)}
                    disabled={deletingId === threat.id}
                  >
                    {deletingId === threat.id ? '…' : 'Delete'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

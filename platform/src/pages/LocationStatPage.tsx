/**
 * LocationStatPage — /keeper/locations/:id
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@mtp/lib';
import { getKeeperThreat, deleteKeeperThreat, type KeeperThreat } from '../../../src/lib/threats/threatApi';

export default function LocationStatPage() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [threat, setThreat] = useState<KeeperThreat | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    getKeeperThreat(id).then((t) => { setThreat(t); setLoading(false); });
  }, [id]);

  if (authLoading || loading) return <div className="page-card"><p className="typewriter-label">Loading…</p></div>;
  if (!isAdmin) return <div className="page-card"><p className="typewriter-label">Keeper access only.</p></div>;
  if (!threat) return <div className="page-card"><p className="typewriter-label">Not found.</p><Link to="/keeper">← Compendium</Link></div>;

  async function handleDelete() {
    if (!confirm(`Delete "${threat!.name}"?`)) return;
    setDeleting(true);
    await deleteKeeperThreat(threat!.id);
    navigate('/keeper');
  }

  return (
    <>
      <div className="stat-screen-actions no-print">
        <Link to="/keeper" className="btn-ghost typewriter-label">← Compendium</Link>
        <div className="stat-screen-right">
          <button className="btn-secondary" onClick={() => window.print()}>Print</button>
          <Link to={`/keeper/locations/${threat.id}/edit`} className="btn-secondary">Edit</Link>
          <button className="btn-ghost stat-delete-btn" onClick={handleDelete} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete'}</button>
        </div>
      </div>

      <article className="stat-block monster-stat-block">
        <header className="stat-block-header">
          <div className="stat-block-title-row">
            <h1 className="stat-block-name">{threat.name}</h1>
            <span className="stat-block-category typewriter-label">Location</span>
          </div>
          <div className="stat-block-type-row">
            <span className="stat-type-badge typewriter-label">{threat.typeId}</span>
            <span className="stat-motivation">{threat.motivation}</span>
          </div>
        </header>

        <section className="stat-section">
          <h2 className="stat-section-label">Description</h2>
          <p className="stat-description">{threat.description}</p>
        </section>

        {threat.standardMoves && threat.standardMoves.length > 0 && (
          <section className="stat-section">
            <h2 className="stat-section-label">Keeper Moves</h2>
            <ul className="stat-list">{threat.standardMoves.map((m, i) => <li key={i}>{m}</li>)}</ul>
          </section>
        )}

        {threat.customMoves && threat.customMoves.length > 0 && (
          <section className="stat-section">
            <h2 className="stat-section-label">Custom Moves</h2>
            <ul className="stat-custom-move-list">
              {threat.customMoves.map((m, i) => (
                <li key={i} className="stat-custom-move-item">
                  <span className="stat-custom-move-trigger">When {m.trigger}:</span>
                  <span className="stat-custom-move-effect">{m.effect}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="stat-block-footer typewriter-label">
          Monster of the Week — Keeper's Compendium
          {threat.createdAt && <span className="stat-block-date"> · {new Date(threat.createdAt).toLocaleDateString()}</span>}
        </footer>
      </article>
      <style>{`@media print { .no-print { display: none !important; } .platform-header, .platform-footer { display: none !important; } .stat-block { box-shadow: none !important; } }`}</style>
    </>
  );
}

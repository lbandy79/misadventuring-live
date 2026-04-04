/**
 * NPCReviewPanel — GM Dashboard for Reviewing Submitted NPCs
 * 
 * Lists all NPC submissions for the current show. GM can:
 * - View name, occupation, appearance, secret, best/worst stats
 * - Add free-text notes per NPC
 * - Flag/star NPCs for plot integration
 * - See stat likelyVerbs on tap/hover
 * - Sort/filter by flagged status
 */

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useSystemConfig, getStatById } from '../hooks/useSystemConfig';
import type { NPC } from '../types/npc.types';
import type { Reservation } from '../types/reservation.types';
import './NPCReviewPanel.css';

interface NPCReviewPanelProps {
  showId: string;
}

export default function NPCReviewPanel({ showId }: NPCReviewPanelProps) {
  const { config } = useSystemConfig();
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [filter, setFilter] = useState<'all' | 'flagged'>('all');
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');
  const [expandedStat, setExpandedStat] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reservations, setReservations] = useState<Record<string, Reservation>>({});

  // Subscribe to NPCs for this show
  useEffect(() => {
    const q = query(
      collection(db, 'npcs'),
      where('showId', '==', showId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const npcList = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as NPC));
      // Sort: flagged first, then by creation time
      npcList.sort((a, b) => {
        if (a.gmFlagged !== b.gmFlagged) return a.gmFlagged ? -1 : 1;
        return b.createdAt - a.createdAt;
      });
      setNpcs(npcList);

      // Fetch reservations for any new NPCs we haven't looked up yet
      const newResIds = npcList
        .map(n => n.reservationId)
        .filter(id => id && !reservations[id]);
      if (newResIds.length > 0) {
        const uniqueIds = [...new Set(newResIds)];
        Promise.all(
          uniqueIds.map(async (resId) => {
            const snap = await getDocs(query(
              collection(db, 'reservations'),
              where('__name__', '==', resId)
            ));
            if (!snap.empty) {
              return { id: snap.docs[0].id, ...snap.docs[0].data() } as Reservation;
            }
            return null;
          })
        ).then((results) => {
          const newMap: Record<string, Reservation> = {};
          results.forEach(r => { if (r) newMap[r.id] = r; });
          setReservations(prev => ({ ...prev, ...newMap }));
        });
      }
    });

    return () => unsubscribe();
  }, [showId]);

  const toggleFlag = async (npcId: string, currentFlag: boolean) => {
    await updateDoc(doc(db, 'npcs', npcId), { gmFlagged: !currentFlag });
  };

  const saveNotes = async (npcId: string) => {
    await updateDoc(doc(db, 'npcs', npcId), { gmNotes: notesText });
    setEditingNotes(null);
  };

  const deleteNpc = async (npcId: string) => {
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'npcs', npcId));
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  const clearAllNpcs = async () => {
    setDeleting(true);
    try {
      const q = query(collection(db, 'npcs'), where('showId', '==', showId));
      const snapshot = await getDocs(q);
      const deletes = snapshot.docs.map(d => deleteDoc(doc(db, 'npcs', d.id)));
      await Promise.all(deletes);
    } finally {
      setDeleting(false);
      setConfirmClearAll(false);
    }
  };

  const filteredNpcs = filter === 'flagged' ? npcs.filter(n => n.gmFlagged) : npcs;

  const getStatDisplay = (statId: string) => {
    if (!config) return statId;
    const stat = getStatById(config, statId);
    return stat?.name ?? statId;
  };

  const getStatVerbs = (statId: string): string[] => {
    if (!config) return [];
    const stat = getStatById(config, statId);
    return stat?.likelyVerbs ?? [];
  };

  return (
    <div className="npc-review-panel">
      <div className="npc-review-header">
        <h3>NPC Submissions</h3>
        <div className="npc-header-actions">
          <span className="npc-count">{npcs.length} total</span>
          {npcs.length > 0 && !confirmClearAll && (
            <button
              className="clear-all-btn"
              onClick={() => setConfirmClearAll(true)}
              disabled={deleting}
            >
              🗑 Clear All
            </button>
          )}
          {confirmClearAll && (
            <div className="confirm-inline">
              <span className="confirm-text">Delete all {npcs.length} NPCs?</span>
              <button className="confirm-yes" onClick={clearAllNpcs} disabled={deleting}>
                {deleting ? '...' : 'Yes, delete all'}
              </button>
              <button className="confirm-no" onClick={() => setConfirmClearAll(false)} disabled={deleting}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="npc-review-filters">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({npcs.length})
        </button>
        <button
          className={`filter-btn ${filter === 'flagged' ? 'active' : ''}`}
          onClick={() => setFilter('flagged')}
        >
          ⭐ Flagged ({npcs.filter(n => n.gmFlagged).length})
        </button>
      </div>

      <div className="npc-review-list">
        {filteredNpcs.length === 0 && (
          <p className="npc-empty">
            {filter === 'flagged' ? 'No flagged NPCs yet.' : 'No NPCs submitted yet.'}
          </p>
        )}

        {filteredNpcs.map((npc) => (
          <div key={npc.id} className={`npc-review-card ${npc.gmFlagged ? 'flagged' : ''}`}>
            {/* Header: name + flag + delete */}
            <div className="npc-card-header">
              <div>
                <span className="npc-card-name">{npc.name}</span>
                <span className="npc-card-occupation">{npc.occupation}</span>
              </div>
              <div className="npc-card-header-actions">
                {confirmDeleteId === npc.id ? (
                  <div className="confirm-inline">
                    <span className="confirm-text">Delete?</span>
                    <button className="confirm-yes" onClick={() => deleteNpc(npc.id)} disabled={deleting}>
                      {deleting ? '...' : 'Yes'}
                    </button>
                    <button className="confirm-no" onClick={() => setConfirmDeleteId(null)} disabled={deleting}>
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    className="delete-npc-btn"
                    onClick={() => setConfirmDeleteId(npc.id)}
                    title="Delete this NPC"
                  >
                    🗑 Delete
                  </button>
                )}
                <button
                  className={`flag-btn ${npc.gmFlagged ? 'active' : ''}`}
                  onClick={() => toggleFlag(npc.id, npc.gmFlagged)}
                  title={npc.gmFlagged ? 'Remove flag' : 'Flag for plot'}
                >
                  {npc.gmFlagged ? '⭐' : '☆'}
                </button>
              </div>
            </div>

            {/* Creator info */}
            {reservations[npc.reservationId] && (
              <div className="npc-card-creator">
                <span className="creator-name">{reservations[npc.reservationId].name}</span>
                <span className="creator-email">{reservations[npc.reservationId].email}</span>
              </div>
            )}

            {/* Appearance */}
            <p className="npc-card-appearance">{npc.appearance}</p>

            {/* Secret (GM only) */}
            <div className="npc-card-secret">
              <span className="secret-label">Secret:</span> {npc.secret}
            </div>

            {/* Stats */}
            <div className="npc-card-stats">
              <div
                className="stat-badge best"
                onClick={() => setExpandedStat(expandedStat === `${npc.id}-best` ? null : `${npc.id}-best`)}
              >
                <span className="stat-badge-label">Best:</span> {getStatDisplay(npc.bestStat)}
                {expandedStat === `${npc.id}-best` && (
                  <div className="stat-verbs-popup">
                    {getStatVerbs(npc.bestStat).join(', ')}
                  </div>
                )}
              </div>
              <div
                className="stat-badge worst"
                onClick={() => setExpandedStat(expandedStat === `${npc.id}-worst` ? null : `${npc.id}-worst`)}
              >
                <span className="stat-badge-label">Worst:</span> {getStatDisplay(npc.worstStat)}
                {expandedStat === `${npc.id}-worst` && (
                  <div className="stat-verbs-popup">
                    {getStatVerbs(npc.worstStat).join(', ')}
                  </div>
                )}
              </div>
            </div>

            {/* GM Notes */}
            <div className="npc-card-notes">
              {editingNotes === npc.id ? (
                <div className="notes-edit">
                  <textarea
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    placeholder="GM notes..."
                    rows={2}
                  />
                  <div className="notes-actions">
                    <button onClick={() => saveNotes(npc.id)}>Save</button>
                    <button onClick={() => setEditingNotes(null)} className="cancel">Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  className="notes-toggle"
                  onClick={() => {
                    setEditingNotes(npc.id);
                    setNotesText(npc.gmNotes);
                  }}
                >
                  {npc.gmNotes ? `📝 ${npc.gmNotes}` : '+ Add notes'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

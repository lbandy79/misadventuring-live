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
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, getDocs, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useSystemConfig, getStatById } from '../hooks/useSystemConfig';
import type { NPC } from '../types/npc.types';
import type { Reservation } from '../types/reservation.types';
import NpcAvatar from '../components/npc/NpcAvatar';
import './NPCReviewPanel.css';

interface SpotlightNpc {
  id: string;
  name: string;
  occupation: string;
  appearance: string;
}

interface NPCReviewPanelProps {
  showId: string;
}

export default function NPCReviewPanel({ showId }: NPCReviewPanelProps) {
  const { config } = useSystemConfig();
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [filter, setFilter] = useState<'all' | 'flagged'>('all');
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');
  const [expandedNpc, setExpandedNpc] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reservations, setReservations] = useState<Record<string, Reservation>>({});
  const [spotlightIds, setSpotlightIds] = useState<Set<string>>(new Set());
  const [dragId, setDragId] = useState<string | null>(null);
  const [npcOrder, setNpcOrder] = useState<string[]>([]);

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

  // Order NPCs: use custom order if set, else default
  const orderedNpcs = npcOrder.length > 0
    ? npcOrder.map(id => filteredNpcs.find(n => n.id === id)).filter(Boolean) as NPC[]
    : filteredNpcs;
  // Append any NPCs not yet in custom order (newly submitted)
  const orderedIds = new Set(orderedNpcs.map(n => n.id));
  const unordered = filteredNpcs.filter(n => !orderedIds.has(n.id));
  const displayNpcs = [...orderedNpcs, ...unordered];

  // Listen to spotlight state from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'config', 'active-interaction'), (snap) => {
      if (snap.exists() && snap.data().type === 'npc-spotlight') {
        const npcsOnDisplay: SpotlightNpc[] = snap.data().spotlightNpcs || [];
        setSpotlightIds(new Set(npcsOnDisplay.map(n => n.id)));
      } else {
        setSpotlightIds(new Set());
      }
    });
    return () => unsubscribe();
  }, []);

  // Toggle spotlight for a single NPC (add/remove from the set)
  const toggleSpotlight = async (npc: NPC) => {
    // Optimistic UI update — toggle immediately
    const wasSpotlit = spotlightIds.has(npc.id);
    setSpotlightIds(prev => {
      const next = new Set(prev);
      if (next.has(npc.id)) next.delete(npc.id);
      else next.add(npc.id);
      return next;
    });

    try {
      const interactionRef = doc(db, 'config', 'active-interaction');
      const snap = await getDoc(interactionRef);
      let current: SpotlightNpc[] = [];

      if (snap.exists() && snap.data().type === 'npc-spotlight') {
        current = snap.data().spotlightNpcs || [];
      }

      const exists = current.some(s => s.id === npc.id);
      let updated: SpotlightNpc[];

      if (exists) {
        updated = current.filter(s => s.id !== npc.id);
      } else {
        updated = [...current, {
          id: npc.id,
          name: npc.name,
          occupation: npc.occupation,
          appearance: npc.appearance,
        }];
      }

      if (updated.length === 0) {
        await setDoc(interactionRef, { type: 'none' });
      } else {
        await setDoc(interactionRef, {
          type: 'npc-spotlight',
          spotlightNpcs: updated,
        });
      }
    } catch (err) {
      console.error('Spotlight toggle failed:', err);
      // Revert optimistic update
      setSpotlightIds(prev => {
        const reverted = new Set(prev);
        if (wasSpotlit) reverted.add(npc.id);
        else reverted.delete(npc.id);
        return reverted;
      });
    }
  };

  // Drag and drop handlers
  const handleDragStart = (id: string) => {
    setDragId(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragId || dragId === targetId) return;

    const currentOrder = displayNpcs.map(n => n.id);
    const fromIdx = currentOrder.indexOf(dragId);
    const toIdx = currentOrder.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    const reordered = [...currentOrder];
    reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, dragId);
    setNpcOrder(reordered);
  };

  const handleDragEnd = () => {
    setDragId(null);
  };

  const getStatDisplay = (statId: string) => {
    if (!config) return statId;
    const stat = getStatById(config, statId);
    return stat?.name ?? statId;
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

      {/* On-Display preview strip */}
      {spotlightIds.size > 0 && (
        <div className="on-display-strip">
          <span className="on-display-label">📺 ON DISPLAY</span>
          <div className="on-display-npcs">
            {displayNpcs.filter(n => spotlightIds.has(n.id)).map(n => (
              <div key={n.id} className="on-display-chip">
                <NpcAvatar name={n.name} size={24} />
                <span>{n.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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

      <div className="npc-review-grid">
        {displayNpcs.length === 0 && (
          <p className="npc-empty">
            {filter === 'flagged' ? 'No flagged NPCs yet.' : 'No NPCs submitted yet.'}
          </p>
        )}

        {displayNpcs.map((npc) => {
          const isSpotlit = spotlightIds.has(npc.id);
          const isExpanded = expandedNpc === npc.id;
          const isDragging = dragId === npc.id;

          return (
            <div
              key={npc.id}
              className={`npc-grid-card ${npc.gmFlagged ? 'flagged' : ''} ${isSpotlit ? 'spotlit' : ''} ${isDragging ? 'dragging' : ''}`}
              draggable
              onDragStart={() => handleDragStart(npc.id)}
              onDragOver={(e) => handleDragOver(e, npc.id)}
              onDragEnd={handleDragEnd}
            >
              {/* Compact card top: avatar + name + quick actions */}
              <div className="npc-grid-top" onClick={() => setExpandedNpc(isExpanded ? null : npc.id)}>
                <NpcAvatar name={npc.name} size={48} />
                <div className="npc-grid-identity">
                  <span className="npc-card-name">{npc.name}</span>
                  <span className="npc-card-occupation">{npc.occupation}</span>
                </div>
              </div>

              {/* Quick action bar */}
              <div className="npc-grid-actions">
                <button
                  className={`spotlight-toggle ${isSpotlit ? 'active' : ''}`}
                  onClick={() => toggleSpotlight(npc)}
                  title={isSpotlit ? 'Remove from display' : 'Show on display'}
                >
                  📺 {isSpotlit ? 'On Air' : 'Spotlight'}
                </button>
                <button
                  className={`flag-btn ${npc.gmFlagged ? 'active' : ''}`}
                  onClick={() => toggleFlag(npc.id, npc.gmFlagged)}
                  title={npc.gmFlagged ? 'Remove flag' : 'Flag for plot'}
                >
                  {npc.gmFlagged ? '⭐' : '☆'}
                </button>
              </div>

              {/* Inline snippets — always visible */}
              <p className="npc-card-snippet">{npc.appearance}</p>
              {npc.secret && (
                <p className="npc-card-snippet npc-card-snippet--secret">
                  <span className="secret-label">🤫</span> {npc.secret}
                </p>
              )}

              {/* Hover detail popover — all NPC data at a glance */}
              <div className="npc-hover-detail">
                <div className="npc-hover-header">
                  <NpcAvatar name={npc.name} size={64} />
                  <div>
                    <strong className="npc-card-name">{npc.name}</strong>
                    <span className="npc-card-occupation">{npc.occupation}</span>
                  </div>
                </div>

                {reservations[npc.reservationId] && (
                  <div className="npc-card-creator">
                    <span className="creator-name">{reservations[npc.reservationId].name}</span>
                    <span className="creator-email">{reservations[npc.reservationId].email}</span>
                  </div>
                )}

                <p className="npc-card-appearance">{npc.appearance}</p>

                {npc.secret && (
                  <div className="npc-card-secret">
                    <span className="secret-label">Secret:</span> {npc.secret}
                  </div>
                )}

                <div className="npc-card-stats">
                  <div className="stat-badge best">
                    <span className="stat-badge-label">Best:</span> {getStatDisplay(npc.bestStat)}
                  </div>
                  <div className="stat-badge worst">
                    <span className="stat-badge-label">Worst:</span> {getStatDisplay(npc.worstStat)}
                  </div>
                </div>

                {npc.gmNotes && (
                  <p className="npc-hover-notes">📝 {npc.gmNotes}</p>
                )}
              </div>

              {/* Click-expand for interactive: notes editor + delete */}
              {isExpanded && (
                <div className="npc-grid-detail">
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

                  {/* Delete */}
                  <div className="npc-grid-delete">
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
                      <button className="delete-npc-btn" onClick={() => setConfirmDeleteId(npc.id)}>
                        🗑 Delete
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

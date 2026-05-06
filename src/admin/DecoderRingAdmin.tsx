/**
 * DecoderRingAdmin — GM controls for the Well of Lines
 *
 * Drop this into AdminPanel.tsx as a new card section.
 * Pattern: matches MonsterBuilder admin card exactly.
 *
 * GM WORKFLOW:
 *   1. Select 3–4 year options (checkboxes from character list)
 *   2. Launch year vote → audience phones show year choices
 *   3. Close year vote → winning year calculated
 *   4. Reveal character (auto if 1 char at that year, pick if multiple)
 *   5. Launch role vote → audience phones show ship roles
 *   6. Close role vote → winning role assigned
 *   7. Character added to crew roster
 *   8. "Next Spin" or "End" → repeat or finish
 *
 * FIREBASE DOCS:
 *   - decoder-ring/current     → DecoderRingState
 *   - config/active-interaction → { type: 'decoder-ring', status, sessionId, spinNumber }
 *
 * COPILOT NOTES:
 *   - Model after the monster-builder admin section in AdminPanel.tsx (lines ~180-350)
 *   - Use setDoc/updateDoc from firebase/firestore
 *   - Listen with onSnapshot on decoder-ring/current
 *   - Year options come from DECODER_RING_CHARACTERS grouped by year
 *   - For Sunday: pre-curate 3-4 years per spin (hardcode or pick in UI)
 */

import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useShow } from '../lib/shows';
import { archiveSingleton } from '../lib/archive';
import {
  DECODER_RING_CHARACTERS,
  getCharacterByYear,
  getUniqueYears,
  SHIP_ROLES,
} from '../data/decoderRingCharacters';
import {
  createInitialDecoderRingState,
  calculateWinningYear,
  calculateWinningRole,
  calculateWinningCharacter,
} from '../types/decoderRing.types';
import type { DecoderRingState, DecoderRingYearOption } from '../types/decoderRing.types';
import { PLAYER_IDS, PLAYER_NAMES } from '../types/player.types';
import type { PlayerID, PlayersDoc } from '../types/player.types';

// ─── Year presets for quick launch (curate per episode) ────────────────
const YEAR_PRESETS: Record<string, number[]> = {
  'Golden Age Mix':    [1984, 1988, 1989, 1991],
  'Fan Favorites':     [1985, 1989, 1999, 2020],
  'Deep Cuts':         [1972, 1990, 1995, 2022],
  'Modern vs Classic': [1983, 1989, 2021, 2025],
};

export default function DecoderRingAdmin() {
  const { showId: activeShowId } = useShow();
  const [state, setState] = useState<DecoderRingState | null>(null);
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [playerAssignments, setPlayerAssignments] = useState<PlayersDoc>({ ben: null, libbe: null, patrick: null, josh: null });

  // ─── Firebase listener ─────────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'decoder-ring', 'current'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as DecoderRingState;
        if (!Array.isArray(data.crew)) data.crew = [];
        setState(data);
      } else setState(null);
    });
    return () => unsub();
  }, []);

  // ─── Listen to player assignments ──────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'players', 'assignments'), (snap) => {
      if (snap.exists()) setPlayerAssignments(snap.data() as PlayersDoc);
    });
    return () => unsub();
  }, []);

  // ─── Launch decoder ring session ───────────────────────────────────
  const launchDecoderRing = async () => {
    // Snapshot the previous decoder-ring state before we overwrite it.
    await archiveSingleton('decoder-ring', 'current', activeShowId);

    const sessionId = `decoder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const initial = createInitialDecoderRingState(sessionId);

    await setDoc(doc(db, 'decoder-ring', 'current'), initial);
    await setDoc(doc(db, 'config', 'active-interaction'), {
      type: 'decoder-ring',
      status: 'idle',
      sessionId,
      spinNumber: 1,
    });
  };

  // ─── Start year vote with selected years ───────────────────────────
  const startYearVote = async () => {
    if (selectedYears.length < 2 || !state) return;

    const yearOptions: DecoderRingYearOption[] = selectedYears.map(year => {
      const chars = getCharacterByYear(year);
      const primary = chars[0];
      return {
        year,
        characterIds: chars.map(c => c.id),
        thumbnail: primary?.image || '',
        label: `${year} — ${primary?.sourceIP || 'Unknown'}`,
      };
    });

    const yearVotes: Record<number, number> = {};
    selectedYears.forEach(y => { yearVotes[y] = 0; });

    await updateDoc(doc(db, 'decoder-ring', 'current'), {
      status: 'voting-year',
      yearOptions,
      yearVotes,
      winningYear: null,
      revealedCharacterId: null,
      winningRole: null,
      roleVotes: { helmsman: 0, engineer: 0, gunner: 0, lookout: 0, cook: 0, diplomat: 0 },
    });
    await updateDoc(doc(db, 'config', 'active-interaction'), {
      status: 'voting-year',
    });
  };

  // ─── Close year vote & calculate winner ────────────────────────────
  const closeYearVote = async () => {
    if (!state) return;
    const winner = calculateWinningYear(state.yearVotes);
    if (!winner) return;

    const chars = getCharacterByYear(winner).filter(c => !c.isNPC);

    if (chars.length === 1) {
      // Single character — auto-reveal, skip to revealing-character
      await updateDoc(doc(db, 'decoder-ring', 'current'), {
        status: 'revealing-character',
        winningYear: winner,
        revealedCharacterId: chars[0].id,
        characterVotes: {},
      });
      await updateDoc(doc(db, 'config', 'active-interaction'), {
        status: 'revealing-character',
      });
    } else {
      // Multiple characters — open character vote
      const charVotes: Record<string, number> = {};
      chars.forEach(c => { charVotes[c.id] = 0; });

      await updateDoc(doc(db, 'decoder-ring', 'current'), {
        status: 'voting-character',
        winningYear: winner,
        characterVotes: charVotes,
        revealedCharacterId: null,
      });
      await updateDoc(doc(db, 'config', 'active-interaction'), {
        status: 'voting-character',
      });
    }
  };

  // ─── Close character vote & reveal winner ────────────────────────
  const closeCharacterVote = async () => {
    if (!state) return;
    const winnerId = calculateWinningCharacter(state.characterVotes);
    if (!winnerId) return;

    await updateDoc(doc(db, 'decoder-ring', 'current'), {
      status: 'revealing-character',
      revealedCharacterId: winnerId,
    });
    await updateDoc(doc(db, 'config', 'active-interaction'), {
      status: 'revealing-character',
    });
  };

  // ─── Start ship role vote ──────────────────────────────────────────
  const startRoleVote = async () => {
    await updateDoc(doc(db, 'decoder-ring', 'current'), {
      status: 'voting-role',
      roleVotes: { helmsman: 0, engineer: 0, gunner: 0, lookout: 0, cook: 0, diplomat: 0 },
      winningRole: null,
    });
    await updateDoc(doc(db, 'config', 'active-interaction'), {
      status: 'voting-role',
    });
  };

  // ─── Close role vote & assign ──────────────────────────────────────
  const closeRoleVote = async () => {
    if (!state || !state.revealedCharacterId) return;
    const winner = calculateWinningRole(state.roleVotes);
    const char = DECODER_RING_CHARACTERS.find(c => c.id === state.revealedCharacterId);
    if (!char || !winner) return;

    const newMember = {
      characterId: char.id,
      characterName: char.name,
      role: winner,
      year: char.year,
      image: char.image,
      flicker: char.flicker,
      recruitedAt: Date.now(),
    };

    await updateDoc(doc(db, 'decoder-ring', 'current'), {
      status: 'complete',
      winningRole: winner,
      crew: [...state.crew, newMember],
    });
    await updateDoc(doc(db, 'config', 'active-interaction'), {
      status: 'complete',
    });
  };

  // ─── Next spin ─────────────────────────────────────────────────────
  const nextSpin = async () => {
    if (!state) return;
    const next = state.spinNumber + 1;

    await updateDoc(doc(db, 'decoder-ring', 'current'), {
      status: 'idle',
      spinNumber: next,
      yearOptions: [],
      yearVotes: {},
      characterVotes: {},
      winningYear: null,
      revealedCharacterId: null,
      roleVotes: { helmsman: 0, engineer: 0, gunner: 0, lookout: 0, cook: 0, diplomat: 0 },
      winningRole: null,
    });
    await updateDoc(doc(db, 'config', 'active-interaction'), {
      status: 'idle',
      spinNumber: next,
    });
    setSelectedYears([]);
  };

  // ─── End session ───────────────────────────────────────────────────
  const endSession = async () => {
    await setDoc(doc(db, 'config', 'active-interaction'), { type: 'none' });
  };

  // ─── Full reset — nuke everything ──────────────────────────────────
  const resetEverything = async () => {
    if (!confirm('Reset decoder ring completely? This wipes all crew, votes, and session data.')) return;
    // Snapshot first so the wipe is recoverable.
    await archiveSingleton('decoder-ring', 'current', activeShowId);
    await deleteDoc(doc(db, 'decoder-ring', 'current'));
    await setDoc(doc(db, 'config', 'active-interaction'), { type: 'none' });
    setState(null);
  };

  // ─── Assign character to player ────────────────────────────────────
  const assignCharacter = async (playerId: PlayerID, characterId: string) => {
    await setDoc(doc(db, 'players', 'assignments'), {
      ...playerAssignments,
      [playerId]: { characterId, assignedAt: Date.now() },
    });
  };

  const unassignCharacter = async (playerId: PlayerID) => {
    await setDoc(doc(db, 'players', 'assignments'), {
      ...playerAssignments,
      [playerId]: null,
    });
  };

  // ─── Derived state ─────────────────────────────────────────────────
  const winningYearChars = state?.winningYear ? getCharacterByYear(state.winningYear) : [];
  const revealedChar = state?.revealedCharacterId
    ? DECODER_RING_CHARACTERS.find(c => c.id === state.revealedCharacterId)
    : null;

  // ─── RENDER ────────────────────────────────────────────────────────
  // TODO: Build JSX following the monster-builder-card pattern in AdminPanel.tsx
  // Key sections:
  //   1. Status display (spin #, current phase, crew count)
  //   2. Year selection (preset buttons + individual year checkboxes)
  //   3. Phase-appropriate action buttons (launch vote / close / reveal / next)
  //   4. Crew roster showing recruited members
  //   5. Role vote live counts (when in voting-role phase)

  return (
    <section className="admin-card config-card decoder-ring-card">
      <h2>🔮 Decoder Ring — Well of Lines</h2>
      <p className="card-hint">
        Audience picks a year → character emerges → they assign a ship role.
        {state ? ` Spin ${state.spinNumber}/5 • Crew: ${state.crew?.length ?? 0}` : ''}
      </p>

      {/* ── Phase: No active session ── */}
      {!state && (
        <button onClick={launchDecoderRing} className="btn-primary launch-btn">
          🔮 Open the Well of Lines
        </button>
      )}

      {/* ── Phase: Idle (between spins) ── */}
      {state?.status === 'idle' && (
        <>
          {/* Year presets */}
          <div style={{ marginBottom: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', color: '#888' }}>Quick Presets:</label>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
              {Object.entries(YEAR_PRESETS).map(([name, years]) => (
                <button
                  key={name}
                  onClick={() => setSelectedYears(years.slice(0, 4))}
                  className="btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Year picker — show as scrollable grid */}
          <div style={{ maxHeight: '150px', overflowY: 'auto', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
              {getUniqueYears().map(year => {
                const chars = getCharacterByYear(year);
                const selected = selectedYears.includes(year);
                return (
                  <button
                    key={year}
                    onClick={() => setSelectedYears(prev =>
                      prev.includes(year)
                        ? prev.filter(y => y !== year)
                        : prev.length < 4 ? [...prev, year] : prev
                    )}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.7rem',
                      borderRadius: '4px',
                      border: selected ? '2px solid #E8872A' : '1px solid #333',
                      background: selected ? 'rgba(232,135,42,0.2)' : '#0a0a0f',
                      color: selected ? '#E8872A' : '#888',
                      cursor: 'pointer',
                    }}
                  >
                    {year} ({chars.length})
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={startYearVote}
            className="btn-primary launch-btn"
            disabled={selectedYears.length < 2}
          >
            🗳️ Start Year Vote ({selectedYears.length} selected)
          </button>
        </>
      )}

      {/* ── Phase: Year voting open ── */}
      {state?.status === 'voting-year' && (
        <div className="monster-builder-status">
          <h4 style={{ color: '#E8872A', fontSize: '0.8rem' }}>Year Vote Open</h4>
          <div className="counts-grid">
            {state.yearOptions.map(opt => (
              <div key={opt.year} className="count-item">
                <span className="count-part">{opt.label}</span>
                <span className="count-leader">{state.yearVotes[opt.year] || 0}</span>
              </div>
            ))}
          </div>
          <button onClick={closeYearVote} className="btn-warning" style={{ marginTop: '0.5rem' }}>
            🛑 Close Year Vote
          </button>
        </div>
      )}

      {/* ── Phase: Character vote (multiple chars at winning year) ── */}
      {state?.status === 'voting-character' && (
        <div className="monster-builder-status">
          <h4 style={{ color: '#E8872A', fontSize: '0.8rem' }}>
            Year {state.winningYear} won! Audience choosing a character:
          </h4>
          <div className="counts-grid">
            {winningYearChars.filter(c => !c.isNPC).map(c => (
              <div key={c.id} className="count-item">
                <span className="count-part">{c.name} — {c.sourceIP}</span>
                <span className="count-leader">{state.characterVotes[c.id] || 0}</span>
              </div>
            ))}
          </div>
          <button onClick={closeCharacterVote} className="btn-warning" style={{ marginTop: '0.5rem' }}>
            🛑 Close Character Vote
          </button>
        </div>
      )}

      {/* ── Phase: Character reveal ── */}
      {state?.status === 'revealing-character' && (
        <div className="monster-builder-status">
          <h4 style={{ color: '#E8872A', fontSize: '0.8rem' }}>
            Year {state.winningYear} — {revealedChar?.name} revealed!
          </h4>
          <button onClick={startRoleVote} className="btn-epic" style={{ marginTop: '0.5rem' }}>
            🚢 Open Ship Role Vote
          </button>
        </div>
      )}

      {/* ── Phase: Role voting open ── */}
      {state?.status === 'voting-role' && revealedChar && (
        <div className="monster-builder-status">
          <h4 style={{ color: '#E8872A', fontSize: '0.8rem' }}>
            Assigning {revealedChar.name} — Role Vote Open
          </h4>
          <div className="counts-grid">
            {SHIP_ROLES.map(role => (
              <div key={role.id} className="count-item">
                <span className="count-part">{role.emoji} {role.label}</span>
                <span className="count-leader">{state.roleVotes[role.id] || 0}</span>
              </div>
            ))}
          </div>
          <button onClick={closeRoleVote} className="btn-warning" style={{ marginTop: '0.5rem' }}>
            🛑 Close Role Vote
          </button>
        </div>
      )}

      {/* ── Phase: Spin complete ── */}
      {state?.status === 'complete' && (
        <div className="monster-builder-status">
          <h4 style={{ color: '#2ecc71', fontSize: '0.8rem' }}>
            ✅ {revealedChar?.name} → {SHIP_ROLES.find(r => r.id === state.winningRole)?.label}
          </h4>
          <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.5rem' }}>
            {state.spinNumber < 5 && (
              <button onClick={nextSpin} className="btn-primary">
                ▶️ Next Spin ({state.spinNumber + 1}/5)
              </button>
            )}
            <button onClick={endSession} className="btn-secondary">
              ✖️ End Session
            </button>
          </div>
        </div>
      )}

      {/* ── Reset button (always visible during active session) ── */}
      {state && (
        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.35rem' }}>
          <button onClick={resetEverything} className="btn-danger" style={{ flex: 1, fontSize: '0.75rem' }}>
            🗑️ Reset Everything
          </button>
        </div>
      )}

      {/* ── Crew roster (always visible when we have crew) ── */}
      {state && state.crew.length > 0 && (
        <div style={{ marginTop: '0.5rem', padding: '0.35rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
          <h4 style={{ fontSize: '0.7rem', color: '#888', marginBottom: '0.25rem' }}>
            Crew ({state.crew.length}):
          </h4>
          {state.crew.map(m => (
            <div key={m.characterId} style={{ fontSize: '0.7rem', color: '#eee', marginBottom: '0.15rem' }}>
              {SHIP_ROLES.find(r => r.id === m.role)?.emoji} <strong>{m.characterName}</strong> — {SHIP_ROLES.find(r => r.id === m.role)?.label}
            </div>
          ))}
        </div>
      )}

      {/* ── Player assignments (always visible when crew exists) ── */}
      {state && state.crew.length > 0 && (
        <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(107,47,160,0.1)', border: '1px solid rgba(196,168,224,0.2)', borderRadius: '6px' }}>
          <h4 style={{ fontSize: '0.75rem', color: '#C4A8E0', marginBottom: '0.35rem' }}>
            🎮 Player Assignments
          </h4>
          {PLAYER_IDS.map(pid => {
            const current = playerAssignments[pid];
            const assignedChar = current
              ? DECODER_RING_CHARACTERS.find(c => c.id === current.characterId)
              : null;
            // Characters already assigned to other players
            const takenIds = PLAYER_IDS
              .filter(p => p !== pid && playerAssignments[p])
              .map(p => playerAssignments[p]!.characterId);
            const availableCrew = state.crew.filter(m => !takenIds.includes(m.characterId));

            return (
              <div key={pid} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.3rem', fontSize: '0.75rem' }}>
                <span style={{ minWidth: '55px', fontWeight: 700, color: '#E8872A' }}>{PLAYER_NAMES[pid]}</span>
                {assignedChar ? (
                  <>
                    <span style={{ color: '#eee', flex: 1 }}>{assignedChar.name}</span>
                    <button
                      onClick={() => unassignCharacter(pid)}
                      className="btn-danger"
                      style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}
                    >
                      ✗
                    </button>
                  </>
                ) : (
                  <select
                    onChange={(e) => { if (e.target.value) assignCharacter(pid, e.target.value); }}
                    value=""
                    style={{ flex: 1, fontSize: '0.7rem', padding: '0.2rem', background: '#0a0a0f', color: '#eee', border: '1px solid #333', borderRadius: '4px' }}
                  >
                    <option value="">— assign —</option>
                    {availableCrew.map(m => (
                      <option key={m.characterId} value={m.characterId}>
                        {m.characterName} ({SHIP_ROLES.find(r => r.id === m.role)?.label})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

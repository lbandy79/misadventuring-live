/**
 * PlayerView — Dedicated player phone page at /player/:playerId
 *
 * Hybrid view:
 *   - Active audience interaction → shows standard voting/participation UI
 *   - Idle + character assigned → shows CharacterSheet stat block
 *   - Idle + no character → "Waiting for GM..."
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { isValidPlayerId, PLAYER_NAMES } from '../types/player.types';
import type { PlayerID, PlayerAssignment } from '../types/player.types';

// Audience interaction components (same as AudienceView)
import EncounterVote from './EncounterVote';
import Madlibs from './Madlibs';
import NpcNaming from './NpcNaming';
import GroupRoll from './GroupRoll';
import MonsterVote from './MonsterVote';
import MonsterBuilder from './MonsterBuilder';
import VillagerSubmission from './VillagerSubmission';
import DecoderRingVote from './DecoderRingVote';
import ShipCombatVote from './ShipCombatVote';
import CharacterSheet from './CharacterSheet';
import { ThemeLogo } from '../themes';
import './AudienceView.css'; // Reuse audience styles

interface ActiveInteraction {
  type: 'none' | 'vote' | 'madlibs' | 'npc-naming' | 'group-roll' | 'monster-vote' | 'villager-submit' | 'monster-builder' | 'decoder-ring' | 'ship-combat';
  question?: string;
  options?: Array<{ id: string; label: string; emoji: string }>;
  isOpen?: boolean;
  timer?: number;
  startedAt?: number;
  sessionId?: string;
  status?: string;
}

export default function PlayerView() {
  const { playerId } = useParams<{ playerId: string }>();

  // Validate player ID
  if (!playerId || !isValidPlayerId(playerId)) {
    return <Navigate to="/" replace />;
  }

  return <ValidatedPlayerView playerId={playerId} />;
}

function ValidatedPlayerView({ playerId }: { playerId: PlayerID }) {
  const [activeInteraction, setActiveInteraction] = useState<ActiveInteraction | null>(null);
  const [assignment, setAssignment] = useState<PlayerAssignment | null>(null);
  const [assignedRole, setAssignedRole] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [showConnectedToast, setShowConnectedToast] = useState(false);
  const hasConnected = useRef(false);

  const playerName = PLAYER_NAMES[playerId];

  // Listen to active interaction
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'config', 'active-interaction'),
      (snapshot) => {
        if (snapshot.exists()) {
          setActiveInteraction(snapshot.data() as ActiveInteraction);
        } else {
          setActiveInteraction({ type: 'none' });
        }
        setIsLoading(false);

        if (!hasConnected.current) {
          hasConnected.current = true;
          setShowConnectedToast(true);
          setTimeout(() => setShowConnectedToast(false), 2000);
        }
      }
    );
    return () => unsub();
  }, []);

  // Listen to player assignments
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'players', 'assignments'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const myAssignment = data[playerId] || null;
          setAssignment(myAssignment);
        } else {
          setAssignment(null);
        }
      }
    );
    return () => unsub();
  }, [playerId]);

  // Listen to decoder ring crew to find assigned role
  useEffect(() => {
    if (!assignment) { setAssignedRole(undefined); return; }

    const unsub = onSnapshot(
      doc(db, 'decoder-ring', 'current'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const member = (data.crew || []).find(
            (m: { characterId: string }) => m.characterId === assignment.characterId
          );
          setAssignedRole(member?.role);
        }
      }
    );
    return () => unsub();
  }, [assignment]);

  if (isLoading) {
    return (
      <div className="audience-container">
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Connecting, {playerName}...</p>
        </div>
      </div>
    );
  }

  const isInteractionActive = activeInteraction && activeInteraction.type !== 'none';

  return (
    <div className="audience-container">
      {/* Connected toast */}
      <AnimatePresence>
        {showConnectedToast && (
          <motion.div
            className="connected-toast"
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            ⚔️ Welcome, {playerName}!
          </motion.div>
        )}
      </AnimatePresence>

      <header className="show-header">
        <h1>{playerName}'s Sheet</h1>
        <p className="tagline">The Misadventuring Party</p>
      </header>

      <main className="interaction-area">
        {/* ─── Active interaction: show audience participation UI ─── */}
        {isInteractionActive && (
          <>
            {activeInteraction.type === 'vote' && (
              <EncounterVote config={activeInteraction} />
            )}
            {activeInteraction.type === 'madlibs' && <Madlibs />}
            {activeInteraction.type === 'npc-naming' && <NpcNaming />}
            {activeInteraction.type === 'group-roll' && <GroupRoll />}
            {activeInteraction.type === 'monster-vote' && activeInteraction.status !== 'revealing' && (
              <MonsterVote config={activeInteraction as any} />
            )}
            {activeInteraction.type === 'monster-vote' && activeInteraction.status === 'revealing' && (
              <div className="reveal-waiting">
                <ThemeLogo size={120} className="reveal-logo" />
                <h2>🐲 The Beast Awakens...</h2>
                <p>Watch the main screen!</p>
              </div>
            )}
            {activeInteraction.type === 'monster-builder' && (
              <MonsterBuilder sessionId={activeInteraction.sessionId} />
            )}
            {activeInteraction.type === 'villager-submit' && <VillagerSubmission />}
            {activeInteraction.type === 'decoder-ring' && <DecoderRingVote />}
            {activeInteraction.type === 'ship-combat' && <ShipCombatVote />}
          </>
        )}

        {/* ─── Idle: show character sheet or waiting state ─── */}
        {!isInteractionActive && assignment && (
          <CharacterSheet characterId={assignment.characterId} assignedRole={assignedRole} />
        )}

        {!isInteractionActive && !assignment && (
          <div className="waiting-state">
            <ThemeLogo size={140} className="waiting-logo" />
            <h2>Awaiting Assignment</h2>
            <p>The GM will assign your character soon, {playerName}.</p>
            <p className="tagline">Watch the main screen for the Well of Lines!</p>
          </div>
        )}
      </main>
    </div>
  );
}

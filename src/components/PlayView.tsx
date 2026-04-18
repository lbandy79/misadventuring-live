/**
 * PlayView — Personalized Player Experience
 *
 * Route: /play/:npcId
 * Shows the player's NPC card at the top with the live show feed below.
 * When their NPC is spotlighted by the GM, the card glows.
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import NpcAvatar from './npc/NpcAvatar';
import EncounterVote from './EncounterVote';
import Madlibs from './Madlibs';
import NpcNaming from './NpcNaming';
import GroupRoll from './GroupRoll';
import MonsterVote from './MonsterVote';
import MonsterBuilder from './MonsterBuilder';
import VillagerSubmission from './VillagerSubmission';
import DecoderRingVote from './DecoderRingVote';
import ShipCombatVote from './ShipCombatVote';
import { TMPWarning } from './icons/TMPIcons';
import { ThemeLogo } from '../themes';
import type { NPC } from '../types/npc.types';
import './PlayView.css';

interface ActiveInteraction {
  type: string;
  question?: string;
  options?: Array<{ id: string; label: string; emoji: string }>;
  isOpen?: boolean;
  timer?: number;
  startedAt?: number;
  currentPart?: string;
  partIndex?: number;
  sessionId?: string;
  status?: string;
  spotlightNpcs?: Array<{ id: string; name: string }>;
}

export default function PlayView() {
  const { npcId } = useParams<{ npcId: string }>();
  const navigate = useNavigate();
  const [npc, setNpc] = useState<NPC | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeInteraction, setActiveInteraction] = useState<ActiveInteraction>({ type: 'none' });
  const [isSpotlit, setIsSpotlit] = useState(false);
  const [showSpotlitBanner, setShowSpotlitBanner] = useState(false);
  const prevSpotlitRef = useRef(false);
  const bannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch NPC data
  useEffect(() => {
    if (!npcId) { setNotFound(true); setLoading(false); return; }

    const fetchNpc = async () => {
      try {
        const snap = await getDoc(doc(db, 'npcs', npcId));
        if (snap.exists()) {
          setNpc({ id: snap.id, ...snap.data() } as NPC);
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchNpc();
  }, [npcId]);

  // Subscribe to active interaction
  useEffect(() => {
    if (!npcId) return;

    const unsubscribe = onSnapshot(doc(db, 'config', 'active-interaction'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as ActiveInteraction;
        setActiveInteraction(data);

        // Check if this NPC is spotlighted (new array format + legacy single-NPC fallback)
        const spotlit = data.type === 'npc-spotlight' && (
          data.spotlightNpcs?.some(s => s.id === npcId) ||
          (data as any).npcId === npcId
        );
        setIsSpotlit(!!spotlit);

        // Show banner briefly when first spotlit
        if (spotlit && !prevSpotlitRef.current) {
          setShowSpotlitBanner(true);
          if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
          bannerTimeoutRef.current = setTimeout(() => setShowSpotlitBanner(false), 4000);
        }
        prevSpotlitRef.current = !!spotlit;
      } else {
        setActiveInteraction({ type: 'none' });
        setIsSpotlit(false);
        prevSpotlitRef.current = false;
      }
    });
    return () => {
      unsubscribe();
      if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
    };
  }, [npcId]);

  if (loading) {
    return (
      <div className="play-container">
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Loading your character...</p>
        </div>
      </div>
    );
  }

  if (notFound || !npc) {
    return (
      <div className="play-container">
        <div className="play-not-found">
          <TMPWarning size={64} />
          <h2>Character Not Found</h2>
          <p>This NPC doesn't exist or was removed.</p>
          <button className="play-create-btn" onClick={() => navigate('/create')}>
            Create Your Character
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="play-container">
      {/* Spotlit banner */}
      <AnimatePresence>
        {showSpotlitBanner && (
          <motion.div
            className="spotlit-banner"
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
          >
            ✨ You're on the big screen! ✨
          </motion.div>
        )}
      </AnimatePresence>

      {/* NPC Header Card — always visible */}
      <div className={`play-npc-card ${isSpotlit ? 'play-npc-card--spotlit' : ''}`}>
        <NpcAvatar name={npc.name} size={56} />
        <div className="play-npc-info">
          <span className="play-npc-name">{npc.name}</span>
          <span className="play-npc-occupation">{npc.occupation}</span>
        </div>
        {isSpotlit && <span className="play-onair-badge">📺 LIVE</span>}
        <button
          className="play-edit-btn"
          onClick={() => navigate('/create')}
          title="Edit character"
        >
          ✏️
        </button>
      </div>

      {/* Live Show Feed */}
      <main className="play-feed">
        <AnimatePresence mode="wait">
          {activeInteraction.type === 'vote' && (
            <motion.div key="vote" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <EncounterVote config={activeInteraction as any} />
            </motion.div>
          )}

          {activeInteraction.type === 'madlibs' && (
            <motion.div key="madlibs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Madlibs />
            </motion.div>
          )}

          {activeInteraction.type === 'npc-naming' && (
            <motion.div key="npc-naming" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <NpcNaming />
            </motion.div>
          )}

          {activeInteraction.type === 'group-roll' && (
            <motion.div key="group-roll" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <GroupRoll />
            </motion.div>
          )}

          {activeInteraction.type === 'monster-vote' && activeInteraction.status !== 'revealing' && (
            <motion.div key="monster-vote" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <MonsterVote config={activeInteraction as any} />
            </motion.div>
          )}

          {activeInteraction.type === 'monster-vote' && activeInteraction.status === 'revealing' && (
            <motion.div key="monster-reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="play-idle">
                <ThemeLogo size={100} className="play-idle-logo" />
                <h2>🐲 The Beast Awakens...</h2>
                <p>Watch the main screen!</p>
              </div>
            </motion.div>
          )}

          {activeInteraction.type === 'monster-builder' && (
            <motion.div key="monster-builder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <MonsterBuilder sessionId={activeInteraction.sessionId} />
            </motion.div>
          )}

          {activeInteraction.type === 'villager-submit' && (
            <motion.div key="villager" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <VillagerSubmission />
            </motion.div>
          )}

          {activeInteraction.type === 'decoder-ring' && (
            <motion.div key="decoder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <DecoderRingVote />
            </motion.div>
          )}

          {activeInteraction.type === 'ship-combat' && (
            <motion.div key="ship-combat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ShipCombatVote />
            </motion.div>
          )}

          {activeInteraction.type === 'npc-spotlight' && (
            <motion.div key="spotlight-msg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="play-idle">
                <ThemeLogo size={100} className="play-idle-logo" />
                <h2>{isSpotlit ? '✨ That\'s you up there!' : '🎭 Introductions...'}</h2>
                <p>{isSpotlit ? 'Your character is on the big screen right now!' : 'Characters are being introduced. Watch the main screen!'}</p>
              </div>
            </motion.div>
          )}

          {(activeInteraction.type === 'none' || !activeInteraction.type) && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="play-idle">
                <ThemeLogo size={120} className="play-idle-logo" />
                <h2>The Adventure Continues...</h2>
                <p>Stand by for your moment to influence the story!</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

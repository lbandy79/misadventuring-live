import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import EncounterVote from './EncounterVote';
import Madlibs from './Madlibs';
import NpcNaming from './NpcNaming';
import GroupRoll from './GroupRoll';
import MonsterVote from './MonsterVote';
import MonsterBuilder from './MonsterBuilder';
import VillagerSubmission from './VillagerSubmission';
import { TMPWarning, TMPCheck } from './icons/TMPIcons';
import { ThemeLogo } from '../themes';
import './AudienceView.css';

interface ActiveInteraction {
  type: 'none' | 'vote' | 'madlibs' | 'npc-naming' | 'group-roll' | 'monster-vote' | 'villager-submit' | 'monster-builder';
  question?: string;
  options?: Array<{ id: string; label: string; emoji: string }>;
  isOpen?: boolean;
  timer?: number;
  startedAt?: number;
  currentPart?: string;
  partIndex?: number;
  sessionId?: string;
  status?: string;
}

export default function AudienceView() {
  const [activeInteraction, setActiveInteraction] = useState<ActiveInteraction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showConnectedToast, setShowConnectedToast] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const hasShownOnboarding = useRef(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    // Track online/offline status
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOffline(!navigator.onLine);

    try {
      unsubscribe = onSnapshot(
        doc(db, 'config', 'active-interaction'),
        (snapshot) => {
          if (snapshot.exists()) {
            setActiveInteraction(snapshot.data() as ActiveInteraction);
          } else {
            setActiveInteraction({ type: 'none' });
          }
          setIsLoading(false);
          setConnectionError(false);
          
          // First successful connection - show onboarding then connected toast
          if (!hasShownOnboarding.current) {
            hasShownOnboarding.current = true;
            setShowOnboarding(true);
            // Onboarding lasts 1.5s, then show connected toast
            setTimeout(() => {
              setShowOnboarding(false);
              setIsConnected(true);
              setShowConnectedToast(true);
              // Auto-hide toast after 2s
              setTimeout(() => setShowConnectedToast(false), 2000);
            }, 1500);
          }
        },
        (error) => {
          console.error('Firebase connection error:', error);
          setConnectionError(true);
          setIsLoading(false);
        }
      );
    } catch (error) {
      console.error('Firebase setup error:', error);
      setConnectionError(true);
      setIsLoading(false);
    }

    return () => {
      unsubscribe && unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="audience-container">
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Connecting to the adventure...</p>
        </div>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="audience-container">
        <div className="error-state">
          <TMPWarning size={64} className="error-icon" />
          <h2>Connection Lost</h2>
          <p>Having trouble reaching the server. Check your connection and refresh.</p>
          <button onClick={() => window.location.reload()} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Portal Opening onboarding sequence (1.5s)
  if (showOnboarding) {
    return (
      <div className="audience-container">
        <motion.div 
          className="onboarding-portal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <ThemeLogo size={160} className="onboarding-logo" />
          </motion.div>
          <motion.p
            className="onboarding-text"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            You've joined the adventure
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="audience-container">
      {/* Offline indicator bar */}
      <AnimatePresence>
        {isOffline && (
          <motion.div 
            className="offline-bar"
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
          >
            ⚠️ You're offline
          </motion.div>
        )}
      </AnimatePresence>

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
            <TMPCheck size={18} /> Connected!
          </motion.div>
        )}
      </AnimatePresence>

      <header className="show-header">
        <h1>The Misadventuring Party</h1>
        <p className="tagline">Live Audience Interaction</p>
      </header>

      <main className="interaction-area">
        {activeInteraction?.type === 'vote' && (
          <EncounterVote config={activeInteraction} />
        )}

        {activeInteraction?.type === 'none' && (
          <div className="waiting-state">
            <ThemeLogo size={180} className="waiting-logo" />
            <h2>The Adventure Continues...</h2>
            <p>Stand by for your moment to influence the story!</p>
          </div>
        )}

        {activeInteraction?.type === 'madlibs' && <Madlibs />}
        {activeInteraction?.type === 'npc-naming' && <NpcNaming />}
        {activeInteraction?.type === 'group-roll' && <GroupRoll />}
        
        {/* Beast of Ridgefall Components - Sequential Voting */}
        {activeInteraction?.type === 'monster-vote' && activeInteraction.status !== 'revealing' && (
          <MonsterVote config={activeInteraction as any} />
        )}
        {activeInteraction?.type === 'monster-vote' && activeInteraction.status === 'revealing' && (
          <div className="reveal-waiting">
            <ThemeLogo size={120} className="reveal-logo" />
            <h2>🐲 The Beast Awakens...</h2>
            <p>Watch the main screen!</p>
          </div>
        )}

        {/* Monster Builder - All Parts At Once (Lucky Straws) */}
        {activeInteraction?.type === 'monster-builder' && (
          <MonsterBuilder sessionId={activeInteraction.sessionId} />
        )}

        {activeInteraction?.type === 'villager-submit' && <VillagerSubmission />}
      </main>
    </div>
  );
}

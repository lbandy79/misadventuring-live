import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import EncounterVote from './EncounterVote';
import Madlibs from './Madlibs';
import NpcNaming from './NpcNaming';
import GroupRoll from './GroupRoll';
import { TMPWarning } from './icons/TMPIcons';
import { TMPLogo } from './icons/TMPLogo';
import './AudienceView.css';

interface ActiveInteraction {
  type: 'none' | 'vote' | 'madlibs' | 'npc-naming' | 'group-roll';
  question?: string;
  options?: Array<{ id: string; label: string; emoji: string }>;
  isOpen?: boolean;
  timer?: number;
  startedAt?: number;
}

export default function AudienceView() {
  const [activeInteraction, setActiveInteraction] = useState<ActiveInteraction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

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

    return () => unsubscribe && unsubscribe();
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

  return (
    <div className="audience-container">
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
            <TMPLogo size={180} className="waiting-logo" />
            <h2>The Adventure Continues...</h2>
            <p>Stand by for your moment to influence the story!</p>
          </div>
        )}

        {activeInteraction?.type === 'madlibs' && <Madlibs />}
        {activeInteraction?.type === 'npc-naming' && <NpcNaming />}
        {activeInteraction?.type === 'group-roll' && <GroupRoll />}
      </main>
    </div>
  );
}

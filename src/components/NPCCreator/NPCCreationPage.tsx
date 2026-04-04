/**
 * NPCCreationPage — Full Audience Flow
 * 
 * Orchestrates: Access Code Entry → NPC Creator Wizard → Character Card
 * This is the pre-show experience: audience members create their NPC
 * before arriving at the venue.
 * 
 * After NPC creation, users can edit or start over from the completion screen.
 * No localStorage caching — users authenticate via access code or email link each time.
 */

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { useSystemConfig } from '../../hooks/useSystemConfig';
import AccessCodeEntry from '../Reservation/AccessCodeEntry';
import ReservationForm from '../Reservation/ReservationForm';
import NPCCreator from './NPCCreator';
import CharacterCard from './CharacterCard';
import type { Reservation } from '../../types/reservation.types';
import type { NPC } from '../../types/npc.types';
import '../Reservation/Reservation.css';
import './NPCCreator.css';

type FlowStep = 'code-entry' | 'reservation' | 'npc-creator' | 'complete';

/** Read ?code= URL param (from email link) */
function getCodeFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('code');
}

export default function NPCCreationPage() {
  const { config, loading } = useSystemConfig();
  const [step, setStep] = useState<FlowStep>('code-entry');
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [completedNpc, setCompletedNpc] = useState<NPC | null>(null);
  const [npcLoading, setNpcLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [confirmStartOver, setConfirmStartOver] = useState(false);
  const [startOverLoading, setStartOverLoading] = useState(false);

  const showId = config?.showConfig?.showId ?? '';
  const showName = config?.showConfig?.showName ?? 'Live Show';

  /** Fetch the NPC linked to a reservation from Firestore */
  const fetchNpc = async (resId: string): Promise<NPC | null> => {
    const q = query(
      collection(db, 'npcs'),
      where('reservationId', '==', resId),
      where('showId', '==', showId)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return { id: snap.docs[0].id, ...snap.docs[0].data() } as NPC;
    }
    return null;
  };

  /** Resolve a reservation + NPC and route to the correct step */
  const resolveAndRoute = async (res: Reservation) => {
    setReservation(res);

    if (res.npcCreated) {
      setNpcLoading(true);
      const npc = await fetchNpc(res.id);
      if (npc) {
        setCompletedNpc(npc);
        setStep('complete');
      } else {
        // NPC was deleted (e.g. by GM) — reset reservation and let them create again
        try {
          await updateDoc(doc(db, 'reservations', res.id), { npcCreated: false });
        } catch { /* best-effort */ }
        setReservation({ ...res, npcCreated: false });
        setStep('npc-creator');
      }
      setNpcLoading(false);
    } else {
      setStep('npc-creator');
    }
  };

  // On mount: check URL ?code= param (from email link) — only way to auto-authenticate
  useEffect(() => {
    if (!showId) return;

    const urlCode = getCodeFromUrl();
    if (!urlCode) return;

    setInitializing(true);
    const init = async () => {
      const q = query(
        collection(db, 'reservations'),
        where('accessCode', '==', urlCode.toUpperCase()),
        where('showId', '==', showId)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const res = { id: snap.docs[0].id, ...snap.docs[0].data() } as Reservation;
        await resolveAndRoute(res);
      }
      setInitializing(false);
    };

    init();
  }, [showId]);

  /** Handle "Edit Character" — go back to the wizard with pre-filled data */
  const handleEditCharacter = () => {
    setStep('npc-creator');
  };

  /** Handle "Start Over" — delete NPC, reset reservation, return to wizard */
  const handleStartOver = async () => {
    if (!reservation || !completedNpc) return;
    setStartOverLoading(true);

    try {
      // Delete the existing NPC document
      await deleteDoc(doc(db, 'npcs', completedNpc.id));

      // Reset reservation npcCreated flag
      await updateDoc(doc(db, 'reservations', reservation.id), {
        npcCreated: false,
      });

      // Update local state
      setReservation({ ...reservation, npcCreated: false });
      setCompletedNpc(null);
      setConfirmStartOver(false);
      setStep('npc-creator');
    } catch (err) {
      console.error('Error starting over:', err);
    } finally {
      setStartOverLoading(false);
    }
  };

  if (loading || initializing) {
    return (
      <div className="npc-page">
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="npc-page">
        <p>Could not load show configuration.</p>
      </div>
    );
  }

  return (
    <div className="npc-page">
      <header className="npc-page-header">
        <h1 className="npc-page-title">{config.showConfig.seriesName}</h1>
        <p className="npc-page-subtitle">{config.showConfig.showName}</p>
      </header>

      <AnimatePresence mode="wait">
        {step === 'code-entry' && (
          <motion.div key="code" exit={{ opacity: 0, x: -30 }}>
            <AccessCodeEntry
              showId={showId}
              onAuthenticated={async (res) => {
                await resolveAndRoute(res);
              }}
              onRequestReservation={() => setStep('reservation')}
            />
          </motion.div>
        )}

        {step === 'reservation' && (
          <motion.div key="reserve" exit={{ opacity: 0, x: -30 }}>
            <ReservationForm
              showId={showId}
              showName={showName}
              onReservationCreated={async (res) => {
                await resolveAndRoute(res);
              }}
              onBack={() => setStep('code-entry')}
            />
          </motion.div>
        )}

        {step === 'npc-creator' && reservation && (
          <motion.div
            key="creator"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
          >
            <NPCCreator
              reservation={reservation}
              existingNpc={completedNpc}
              onComplete={(npc) => {
                setCompletedNpc(npc);
                setStep('complete');
                setReservation({ ...reservation, npcCreated: true });
              }}
            />
          </motion.div>
        )}

        {step === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="npc-complete"
          >
            <h2 className="npc-complete-title">tape recorded.</h2>
            {npcLoading && (
              <div className="loading-state">
                <div className="loading-spinner" />
                <p>Loading your character...</p>
              </div>
            )}
            {!npcLoading && completedNpc && (
              <>
                <p className="npc-complete-text">
                  screenshot your character card and share it.
                </p>
                <CharacterCard npc={completedNpc} />

                <div className="npc-complete-actions">
                  <button
                    className="npc-edit-btn"
                    onClick={handleEditCharacter}
                  >
                    ✏️ Edit Character
                  </button>
                  {!confirmStartOver ? (
                    <button
                      className="npc-startover-btn"
                      onClick={() => setConfirmStartOver(true)}
                    >
                      Start Over
                    </button>
                  ) : (
                    <div className="npc-confirm-startover">
                      <p>Delete this character and create a new one?</p>
                      <div className="npc-confirm-actions">
                        <button
                          className="npc-confirm-yes"
                          onClick={handleStartOver}
                          disabled={startOverLoading}
                        >
                          {startOverLoading ? 'Deleting...' : 'Yes, start over'}
                        </button>
                        <button
                          className="npc-confirm-no"
                          onClick={() => setConfirmStartOver(false)}
                          disabled={startOverLoading}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
            {!npcLoading && !completedNpc && (
              <p className="npc-complete-text">
                your character has been submitted. see you at the show.
              </p>
            )}
            <p className="npc-complete-hint">
              see you at {config.showConfig.setting.coreLocation}.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="npc-page-footer">
        <img src="/images/tmp-logo-email.png" alt="The Betawave Tapes" className="npc-footer-logo" />
        <p>{config.showConfig.setting.era} &middot; {config.showConfig.setting.coreLocation}</p>
      </footer>
    </div>
  );
}

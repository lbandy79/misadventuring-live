/**
 * NPCCreationPage — Full Audience Flow
 * 
 * Orchestrates: Access Code Entry → NPC Creator Wizard → Character Card
 * This is the pre-show experience: audience members create their NPC
 * before arriving at the venue.
 */

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
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

export default function NPCCreationPage() {
  const { config, loading } = useSystemConfig();
  const [step, setStep] = useState<FlowStep>('code-entry');
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [completedNpc, setCompletedNpc] = useState<NPC | null>(null);

  const showId = config?.showConfig?.showId ?? '';
  const showName = config?.showConfig?.showName ?? 'Live Show';

  // Check for existing reservation in localStorage
  useEffect(() => {
    if (!showId) return;
    const stored = localStorage.getItem(`mtp-reservation-${showId}`);
    if (stored) {
      try {
        const res = JSON.parse(stored) as Reservation;
        setReservation(res);
        if (res.npcCreated) {
          // They already created their NPC — load it from Firestore and show the card
          setStep('complete');
          const q = query(
            collection(db, 'npcs'),
            where('reservationId', '==', res.id),
            where('showId', '==', showId)
          );
          getDocs(q).then((snap) => {
            if (!snap.empty) {
              setCompletedNpc(snap.docs[0].data() as NPC);
            }
          });
        } else {
          setStep('npc-creator');
        }
      } catch {
        // Corrupted data — ignore
      }
    }
  }, [showId]);

  if (loading) {
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
              onAuthenticated={(res) => {
                setReservation(res);
                setStep(res.npcCreated ? 'complete' : 'npc-creator');
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
              onReservationCreated={(res) => {
                setReservation(res);
                setStep('npc-creator');
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
              onComplete={(npc) => {
                setCompletedNpc(npc);
                setStep('complete');
                // Update stored reservation
                localStorage.setItem(
                  `mtp-reservation-${showId}`,
                  JSON.stringify({ ...reservation, npcCreated: true })
                );
              }}
            />
          </motion.div>
        )}

        {step === 'complete' && completedNpc && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="npc-complete"
          >
            <h2 className="npc-complete-title">tape recorded.</h2>
            <p className="npc-complete-text">
              screenshot your character card and share it.
            </p>
            <CharacterCard npc={completedNpc} />
            <p className="npc-complete-hint">
              see you at {config.showConfig.setting.coreLocation}.
            </p>
          </motion.div>
        )}

        {step === 'complete' && !completedNpc && (
          <motion.div
            key="already-done"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="npc-complete"
          >
            <h2 className="npc-complete-title">tape recorded.</h2>
            <p className="npc-complete-text">
              your character has been submitted. see you at the show.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="npc-page-footer">
        <p>{config.showConfig.setting.era} &middot; {config.showConfig.setting.coreLocation}</p>
      </footer>
    </div>
  );
}

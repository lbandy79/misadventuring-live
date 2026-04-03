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

  const showId = config?.showConfig?.showId ?? '';
  const showName = config?.showConfig?.showName ?? 'Live Show';

  // Check for existing reservation in localStorage, then check URL ?code= param
  useEffect(() => {
    if (!showId) return;

    // Helper to fetch NPC for a completed reservation
    const fetchNpc = (resId: string) => {
      setNpcLoading(true);
      const q = query(
        collection(db, 'npcs'),
        where('reservationId', '==', resId),
        where('showId', '==', showId)
      );
      getDocs(q).then((snap) => {
        if (!snap.empty) {
          setCompletedNpc(snap.docs[0].data() as NPC);
        }
      }).finally(() => setNpcLoading(false));
    };

    // 1. Check URL ?code= param first (from email link) — takes priority
    const urlCode = getCodeFromUrl();
    if (urlCode) {
      setNpcLoading(true);
      const q = query(
        collection(db, 'reservations'),
        where('accessCode', '==', urlCode.toUpperCase()),
        where('showId', '==', showId)
      );
      getDocs(q).then((snap) => {
        if (!snap.empty) {
          const res = { id: snap.docs[0].id, ...snap.docs[0].data() } as Reservation;
          setReservation(res);
          localStorage.setItem(`mtp-reservation-${showId}`, JSON.stringify(res));

          if (res.npcCreated) {
            setStep('complete');
            fetchNpc(res.id);
          } else {
            setStep('npc-creator');
            setNpcLoading(false);
          }

          // Clean the URL param so it doesn't persist on refresh
          window.history.replaceState({}, '', window.location.pathname);
        } else {
          setNpcLoading(false);
        }
      });
      return;
    }

    // 2. Check localStorage
    const stored = localStorage.getItem(`mtp-reservation-${showId}`);
    if (stored) {
      try {
        const res = JSON.parse(stored) as Reservation;
        setReservation(res);
        if (res.npcCreated) {
          setStep('complete');
          fetchNpc(res.id);
        } else {
          setStep('npc-creator');
        }
        return;
      } catch {
        // Corrupted data — fall through to code entry
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

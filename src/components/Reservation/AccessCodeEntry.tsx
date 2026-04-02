/**
 * AccessCodeEntry — "Play the Tape"
 * 
 * Six individual character boxes that glow as you type.
 * In-fiction framing: you're not logging in, you're unlocking a tape.
 */

import { useState, useRef, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { db } from '../../firebase';
import type { Reservation } from '../../types/reservation.types';

interface AccessCodeEntryProps {
  showId: string;
  onAuthenticated: (reservation: Reservation) => void;
  onRequestReservation: () => void;
}

const CODE_LENGTH = 6;

export default function AccessCodeEntry({ showId, onAuthenticated, onRequestReservation }: AccessCodeEntryProps) {
  const [chars, setChars] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const code = chars.join('');

  const focusBox = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(CODE_LENGTH - 1, index));
    inputRefs.current[clamped]?.focus();
  }, []);

  const handleBoxChange = useCallback((index: number, value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleaned) return;

    setError('');
    setChars(prev => {
      const next = [...prev];
      next[index] = cleaned[0];
      return next;
    });

    // Auto-advance to next box
    if (index < CODE_LENGTH - 1) {
      focusBox(index + 1);
    }
  }, [focusBox]);

  const handleBoxKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      setChars(prev => {
        const next = [...prev];
        if (next[index]) {
          // Clear current box
          next[index] = '';
        } else if (index > 0) {
          // Move to previous box and clear it
          next[index - 1] = '';
          focusBox(index - 1);
        }
        return next;
      });
    } else if (e.key === 'ArrowLeft' && index > 0) {
      focusBox(index - 1);
    } else if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      focusBox(index + 1);
    }
  }, [focusBox]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
    if (!pasted) return;

    setError('');
    setChars(prev => {
      const next = [...prev];
      for (let i = 0; i < pasted.length; i++) {
        next[i] = pasted[i];
      }
      return next;
    });
    focusBox(Math.min(pasted.length, CODE_LENGTH - 1));
  }, [focusBox]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== CODE_LENGTH) {
      setError('Access codes are 6 characters');
      return;
    }

    setIsChecking(true);
    setError('');

    try {
      const q = query(
        collection(db, 'reservations'),
        where('accessCode', '==', trimmed),
        where('showId', '==', showId)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError('Code not found. Check your code and try again.');
        setIsChecking(false);
        return;
      }

      const reservationDoc = snapshot.docs[0];
      const reservation = { id: reservationDoc.id, ...reservationDoc.data() } as Reservation;
      
      localStorage.setItem(`mtp-reservation-${showId}`, JSON.stringify(reservation));
      onAuthenticated(reservation);
    } catch (err) {
      console.error('Error checking access code:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <motion.div
      className="reservation-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Hidden input for screen readers */}
      <label htmlFor="code-sr" className="sr-only">Access code</label>
      <input
        id="code-sr"
        className="sr-only"
        type="text"
        value={code}
        readOnly
        tabIndex={-1}
        aria-hidden="true"
      />

      <h2 className="reservation-title">play the tape.</h2>
      <p className="reservation-subtitle">
        enter your 6-character access code
      </p>

      <form onSubmit={handleSubmit} className="code-form">
        <div className="code-boxes" role="group" aria-label="Access code">
          {chars.map((char, i) => (
            <input
              key={i}
              ref={el => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="text"
              className={`code-box ${char ? 'filled' : ''}`}
              value={char}
              onChange={(e) => handleBoxChange(i, e.target.value)}
              onKeyDown={(e) => handleBoxKeyDown(i, e)}
              onPaste={i === 0 ? handlePaste : undefined}
              maxLength={2}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              disabled={isChecking}
              aria-label={`Character ${i + 1}`}
            />
          ))}
        </div>

        {error && (
          <motion.p
            className="code-error"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.p>
        )}

        <button
          type="submit"
          className="code-submit-btn"
          disabled={code.length !== CODE_LENGTH || isChecking}
        >
          {isChecking ? 'Checking...' : 'ENTER'}
        </button>
      </form>

      <div className="reservation-divider">
        <span>or</span>
      </div>

      <button
        className="reserve-link-btn"
        onClick={onRequestReservation}
      >
        reserve your spot
      </button>
    </motion.div>
  );
}

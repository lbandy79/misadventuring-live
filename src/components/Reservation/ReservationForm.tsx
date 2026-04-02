/**
 * ReservationForm — Create a new reservation
 * 
 * Name + email → generates 6-char alphanumeric access code → stores in Firestore.
 * Lightweight, no payment. Code displayed on screen after submission.
 */

import { useState } from 'react';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { db } from '../../firebase';
import type { Reservation } from '../../types/reservation.types';

interface ReservationFormProps {
  showId: string;
  showName: string;
  onReservationCreated: (reservation: Reservation) => void;
  onBack: () => void;
}

/** Generate a 6-character alphanumeric code (no ambiguous chars) */
function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1
  let code = '';
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  for (let i = 0; i < 6; i++) {
    code += chars[array[i] % chars.length];
  }
  return code;
}

export default function ReservationForm({ showId, showName, onReservationCreated, onBack }: ReservationFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdCode, setCreatedCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || trimmedName.length < 2) {
      setError('Please enter your name');
      return;
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Check for existing reservation with same email + show
      const existing = query(
        collection(db, 'reservations'),
        where('email', '==', trimmedEmail),
        where('showId', '==', showId)
      );
      const existingSnap = await getDocs(existing);
      if (!existingSnap.empty) {
        const existingRes = existingSnap.docs[0].data() as Reservation;
        setCreatedCode(existingRes.accessCode);
        setError('You already have a reservation! Your code is shown below.');
        setIsSubmitting(false);
        return;
      }

      const accessCode = generateAccessCode();

      const reservationData = {
        name: trimmedName,
        email: trimmedEmail,
        accessCode,
        createdAt: Date.now(),
        npcCreated: false,
        showId,
      };

      const docRef = await addDoc(collection(db, 'reservations'), reservationData);
      const reservation: Reservation = { id: docRef.id, ...reservationData };

      setCreatedCode(accessCode);

      // Brief delay so they can see their code before proceeding
      setTimeout(() => {
        onReservationCreated(reservation);
      }, 3000);
    } catch (err) {
      console.error('Error creating reservation:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show the code after creation
  if (createdCode) {
    return (
      <motion.div
        className="reservation-container"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="code-reveal">
          <h2 className="reservation-title">you're in.</h2>
          <p className="reservation-subtitle">your access code:</p>
          <div className="code-display">{createdCode}</div>
          <p className="code-hint">save this code — you'll need it to create your character.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="reservation-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div>
        <h2 className="reservation-title">reserve your spot.</h2>
        <p className="reservation-subtitle">{showName}</p>

        <form onSubmit={handleSubmit} className="reservation-form">
          <div className="form-field">
            <label htmlFor="res-name">Your Name</label>
            <input
              id="res-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First and last name"
              maxLength={60}
              disabled={isSubmitting}
            />
          </div>

          <div className="form-field">
            <label htmlFor="res-email">Email</label>
            <input
              id="res-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              maxLength={120}
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <motion.p
              className="code-error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            className="code-submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'reserving...' : 'get my code'}
          </button>
        </form>

        <button className="back-link-btn" onClick={onBack}>
          ← i already have a code
        </button>
      </div>
    </motion.div>
  );
}

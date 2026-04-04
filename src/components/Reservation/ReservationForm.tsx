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
import { sendReservationEmail } from '../../utils/email';
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
  const [createdReservation, setCreatedReservation] = useState<Reservation | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(createdCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text manually
    }
  };

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
        const existingDoc = existingSnap.docs[0];
        const existingRes = { id: existingDoc.id, ...existingDoc.data() } as Reservation;
        setCreatedCode(existingRes.accessCode);
        setCreatedReservation(existingRes);
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
      setCreatedReservation(reservation);

      // Send confirmation email (non-blocking — don't fail the flow if email fails)
      sendReservationEmail({
        name: trimmedName,
        email: trimmedEmail,
        accessCode,
        showName,
      }).then((sent) => setEmailSent(sent));
    } catch (err) {
      console.error('Error creating reservation:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show the code after creation — persistent, with Copy + Continue
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

          {emailSent && (
            <p className="code-email-sent">✓ we sent this to your email</p>
          )}

          <div className="code-actions">
            <button className="code-copy-btn" onClick={handleCopyCode}>
              {copied ? '✓ copied' : '📋 copy code'}
            </button>
          </div>

          <p className="code-hint">save this code — you'll need it to view or update your character.</p>

          <button
            className="code-submit-btn code-continue-btn"
            onClick={() => {
              if (createdReservation) {
                onReservationCreated(createdReservation);
              }
            }}
          >
            continue to create your character →
          </button>
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

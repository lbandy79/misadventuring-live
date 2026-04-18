import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import NpcAvatar from '../npc/NpcAvatar';
import './NpcArrivalToast.css';

interface ArrivalNpc {
  id: string;
  name: string;
  occupation: string;
}

interface NpcArrivalToastProps {
  showId?: string;
}

export default function NpcArrivalToast({ showId }: NpcArrivalToastProps) {
  const [queue, setQueue] = useState<ArrivalNpc[]>([]);
  const [visible, setVisible] = useState<ArrivalNpc | null>(null);
  const sessionStartRef = useRef(Date.now());
  const seenIdsRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscribe to NPCs and detect new arrivals
  useEffect(() => {
    const q = showId
      ? query(collection(db, 'npcs'), where('showId', '==', showId), orderBy('createdAt', 'desc'))
      : query(collection(db, 'npcs'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newArrivals: ArrivalNpc[] = [];
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const id = change.doc.id;
          // Only show arrivals after the display session started
          if (data.createdAt > sessionStartRef.current && !seenIdsRef.current.has(id)) {
            seenIdsRef.current.add(id);
            newArrivals.push({ id, name: data.name, occupation: data.occupation });
          }
        }
      });
      if (newArrivals.length > 0) {
        setQueue(prev => [...prev, ...newArrivals]);
      }
    });

    return () => unsubscribe();
  }, [showId]);

  // Process queue — show one at a time, staggered
  const showNext = useCallback(() => {
    setQueue(prev => {
      if (prev.length === 0) {
        setVisible(null);
        return prev;
      }
      const [next, ...rest] = prev;
      setVisible(next);
      // Auto-dismiss after 5 seconds, then show next
      timerRef.current = setTimeout(() => {
        setVisible(null);
        // Small gap before next toast
        setTimeout(() => showNext(), 600);
      }, 5000);
      return rest;
    });
  }, []);

  useEffect(() => {
    if (queue.length > 0 && !visible) {
      showNext();
    }
  }, [queue, visible, showNext]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="npc-arrival-container">
      <AnimatePresence>
        {visible && (
          <motion.div
            key={visible.id}
            className="npc-arrival-toast"
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          >
            <NpcAvatar name={visible.name} size={48} />
            <div className="arrival-info">
              <span className="arrival-label">Just arrived at the party</span>
              <span className="arrival-name">{visible.name}</span>
              <span className="arrival-occupation">{visible.occupation}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

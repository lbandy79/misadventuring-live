/**
 * VillagerDisplay - Display submitted villagers on stream
 * 
 * Carousel/grid view showing submitted NPCs with hoard item indicators.
 * Used in DisplayView for stream overlay.
 * Only shows approved villagers (hidden ones are filtered out).
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useTheme } from '../themes/ThemeProvider';
import { playSound, initAudio } from '../utils/sounds';
import { TMPStar } from './icons/TMPIcons';
import type { Villager, VillagerSubmissionState } from '../types/villager.types';
import { getItemById } from '../types/villager.types';
import './VillagerDisplay.css';

interface VillagerDisplayProps {
  /** Display mode: 'carousel' rotates, 'grid' shows all */
  mode?: 'carousel' | 'grid';
  /** For carousel: seconds per villager */
  rotationInterval?: number;
  /** Only show featured villagers */
  featuredOnly?: boolean;
}

export default function VillagerDisplay({ 
  mode = 'carousel',
  rotationInterval = 5,
  featuredOnly = false 
}: VillagerDisplayProps) {
  const { theme } = useTheme();
  const [submissions, setSubmissions] = useState<Villager[]>([]);
  const [featuredIds, setFeaturedIds] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [newArrival, setNewArrival] = useState<Villager | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const prevCountRef = useRef<number>(0);

  // Listen to villager submissions
  useEffect(() => {
    initAudio();
    
    const unsubscribe = onSnapshot(
      doc(db, 'villagers', 'current'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as VillagerSubmissionState;
          const allSubmissions = data.submissions || [];
          
          // Filter to only approved villagers for display
          const approvedSubmissions = allSubmissions.filter(v => v.status !== 'hidden');
          
          // Check for new arrival (play sound and show animation)
          if (approvedSubmissions.length > prevCountRef.current && prevCountRef.current > 0) {
            // New villager arrived!
            const newestVillager = approvedSubmissions[approvedSubmissions.length - 1];
            setNewArrival(newestVillager);
            playSound('vote');
            
            // Clear new arrival animation after 3 seconds
            setTimeout(() => setNewArrival(null), 3000);
          }
          prevCountRef.current = approvedSubmissions.length;
          
          setSubmissions(approvedSubmissions);
          setFeaturedIds(data.featuredIds || []);
        }
      }
    );
    return () => unsubscribe();
  }, []);

  // Filter villagers if needed
  const displayVillagers = featuredOnly 
    ? submissions.filter(v => featuredIds.includes(v.submittedBy || ''))
    : submissions;

  // Carousel rotation
  useEffect(() => {
    if (mode !== 'carousel' || displayVillagers.length <= 1) return;

    intervalRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % displayVillagers.length);
    }, rotationInterval * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [mode, rotationInterval, displayVillagers.length]);

  // Reset index when villagers change
  useEffect(() => {
    if (currentIndex >= displayVillagers.length) {
      setCurrentIndex(0);
    }
  }, [displayVillagers.length, currentIndex]);

  if (displayVillagers.length === 0) {
    return (
      <div className={`villager-display villager-display--${theme.id}`}>
        <div className="villager-empty">
          <span className="empty-emoji">🏘️</span>
          <p>Waiting for villagers...</p>
          <span className="submission-count">0 villagers submitted</span>
        </div>
      </div>
    );
  }

  // Grid mode - show all
  if (mode === 'grid') {
    return (
      <div className={`villager-display villager-display--grid villager-display--${theme.id}`}>
        <div className="villager-header">
          <h2>🏘️ The Villagers of Ridgefall</h2>
          <span className="villager-count">{displayVillagers.length} souls</span>
        </div>
        <div className="villager-grid">
          {displayVillagers.map((villager, index) => (
            <VillagerCard 
              key={`${villager.submittedBy}-${villager.submittedAt}`}
              villager={villager}
              index={index}
              isFeatured={featuredIds.includes(villager.submittedBy || '')}
            />
          ))}
        </div>
      </div>
    );
  }

  // Carousel mode - one at a time
  const currentVillager = displayVillagers[currentIndex];
  
  return (
    <div className={`villager-display villager-display--carousel villager-display--${theme.id}`}>
      <div className="villager-header">
        <h2>🏘️ Meet the Villagers</h2>
        <span className="villager-count">
          {currentIndex + 1} of {displayVillagers.length}
        </span>
      </div>
      
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 100, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -100, scale: 0.9 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        >
          <VillagerCard 
            villager={currentVillager}
            index={currentIndex}
            isFeatured={featuredIds.includes(currentVillager.submittedBy || '')}
            isLarge
          />
        </motion.div>
      </AnimatePresence>

      {/* Progress dots */}
      <div className="carousel-dots">
        {displayVillagers.map((_, idx) => (
          <button
            key={idx}
            className={`dot ${idx === currentIndex ? 'active' : ''}`}
            onClick={() => setCurrentIndex(idx)}
            aria-label={`Go to villager ${idx + 1}`}
          />
        ))}
      </div>

      {/* New Arrival Notification */}
      <AnimatePresence>
        {newArrival && (
          <motion.div
            className="new-arrival-toast"
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <span className="arrival-emoji">🏠</span>
            <span className="arrival-text">
              <strong>{newArrival.name}</strong> has arrived!
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Individual villager card
interface VillagerCardProps {
  villager: Villager;
  index: number;
  isFeatured?: boolean;
  isLarge?: boolean;
}

function VillagerCard({ villager, index, isFeatured, isLarge }: VillagerCardProps) {
  const item = getItemById(villager.item);
  
  return (
    <div className={`villager-card ${isFeatured ? 'featured' : ''} ${isLarge ? 'large' : ''}`}>
      {isFeatured && (
        <div className="featured-badge">
          <TMPStar size={16} /> Featured
        </div>
      )}
      
      <div className="villager-card-header">
        <span className="villager-number">#{index + 1}</span>
        <h3 className="villager-card-name">{villager.name}</h3>
      </div>
      
      <div className="villager-card-info">
        <span className="villager-species-bg">
          {villager.species} {villager.background}
        </span>
      </div>
      
      {villager.quirk && (
        <p className="villager-card-quirk">"{villager.quirk}"</p>
      )}
      
      <div className={`villager-card-item ${villager.isHoardItem ? 'hoard' : ''}`}>
        <span className="item-emoji">{item?.emoji || '📦'}</span>
        <span className="item-name">{villager.itemName}</span>
        {villager.isHoardItem && (
          <span className="hoard-tag">
            <TMPStar size={12} /> Hoard
          </span>
        )}
      </div>
    </div>
  );
}

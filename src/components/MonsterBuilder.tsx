/**
 * MonsterBuilder - Audience component for building creatures
 * 
 * Users select ALL 4 body parts at once and submit their complete creature.
 * This is for Lucky Straws Feb 15 show.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { playSound, initAudio } from '../utils/sounds';
import { TMPCheck } from './icons/TMPIcons';
import {
  MONSTER_BUILDER_CONFIG,
  getOrCreateUserId,
  getPartEmoji,
  type MonsterBuilderCategory,
  type MonsterBuilderState,
  type MonsterBuilderSubmission,
} from '../types/monsterBuilder.types';
import './MonsterBuilder.css';

interface MonsterBuilderProps {
  sessionId?: string;
}

export default function MonsterBuilder({ sessionId }: MonsterBuilderProps) {
  const [selections, setSelections] = useState<Record<MonsterBuilderCategory, string | null>>({
    head: null,
    torso: null,
    arms: null,
    legs: null,
  });
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [status, setStatus] = useState<MonsterBuilderState['status']>('building');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const userId = getOrCreateUserId();
  const storageKey = sessionId ? `monster-builder-${sessionId}` : 'monster-builder-current';

  // Listen for state updates
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'monster-builder', 'current'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as MonsterBuilderState;
          setStatus(data.status);
          setSubmissionCount(Object.keys(data.submissions || {}).length);
          
          // Check if user already submitted
          if (data.submissions?.[userId]) {
            setHasSubmitted(true);
            const sub = data.submissions[userId];
            setSelections({
              head: sub.head,
              torso: sub.torso,
              arms: sub.arms,
              legs: sub.legs,
            });
          }
        }
      },
      (error) => {
        console.error('MonsterBuilder listener error:', error);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  // Check localStorage for existing submission
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSelections(parsed);
        setHasSubmitted(true);
      } catch (e) {
        // Invalid saved data
      }
    }
  }, [storageKey]);

  // Handle part selection
  const selectPart = useCallback((category: MonsterBuilderCategory, optionId: string) => {
    if (status !== 'building') return;
    
    initAudio();
    playSound('vote');
    
    setSelections(prev => ({
      ...prev,
      [category]: prev[category] === optionId ? null : optionId, // Toggle if same
    }));
  }, [status]);

  // Check if all parts selected
  const isComplete = selections.head && selections.torso && selections.arms && selections.legs;

  // Submit creature
  const submitCreature = useCallback(async () => {
    if (!isComplete || isSubmitting) return;
    
    setIsSubmitting(true);
    initAudio();

    try {
      const submission: MonsterBuilderSubmission = {
        odId: userId,
        head: selections.head!,
        torso: selections.torso!,
        arms: selections.arms!,
        legs: selections.legs!,
        submittedAt: Date.now(),
      };

      // Get current state
      const docRef = doc(db, 'monster-builder', 'current');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const currentData = docSnap.data() as MonsterBuilderState;
        
        // Update counts - decrement old if resubmitting
        const oldSub = currentData.submissions?.[userId];
        const newCounts = { ...currentData.results.counts };
        
        if (oldSub) {
          // Decrement old votes
          if (newCounts.head[oldSub.head]) newCounts.head[oldSub.head]--;
          if (newCounts.torso[oldSub.torso]) newCounts.torso[oldSub.torso]--;
          if (newCounts.arms[oldSub.arms]) newCounts.arms[oldSub.arms]--;
          if (newCounts.legs[oldSub.legs]) newCounts.legs[oldSub.legs]--;
        }
        
        // Increment new votes
        newCounts.head[submission.head] = (newCounts.head[submission.head] || 0) + 1;
        newCounts.torso[submission.torso] = (newCounts.torso[submission.torso] || 0) + 1;
        newCounts.arms[submission.arms] = (newCounts.arms[submission.arms] || 0) + 1;
        newCounts.legs[submission.legs] = (newCounts.legs[submission.legs] || 0) + 1;

        await setDoc(docRef, {
          ...currentData,
          submissions: {
            ...currentData.submissions,
            [userId]: submission,
          },
          results: {
            ...currentData.results,
            counts: newCounts,
          },
        });
      }

      // Save to localStorage
      localStorage.setItem(storageKey, JSON.stringify(selections));
      
      playSound('victory');
      setHasSubmitted(true);
    } catch (error) {
      console.error('Failed to submit creature:', error);
      playSound('error');
      alert('Failed to submit - please try again!');
    } finally {
      setIsSubmitting(false);
    }
  }, [isComplete, isSubmitting, selections, userId, storageKey]);

  // Reset to change creature
  const changeCreature = useCallback(() => {
    setHasSubmitted(false);
  }, []);

  // Spawn fly-away particle
  const spawnFlyAway = (emoji: string) => {
    const particle = document.createElement('div');
    particle.textContent = emoji;
    particle.style.cssText = `
      position: fixed;
      font-size: 3rem;
      z-index: 10000;
      pointer-events: none;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    `;
    particle.classList.add('vote-fly-away');
    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 700);
  };

  // Get creature preview
  const creaturePreview = isComplete ? (
    `${getPartEmoji('head', selections.head!)}${getPartEmoji('torso', selections.torso!)}${getPartEmoji('arms', selections.arms!)}${getPartEmoji('legs', selections.legs!)}`
  ) : null;

  // If revealing, show waiting screen
  if (status === 'revealing' || status === 'complete') {
    return (
      <div className="monster-builder-container" ref={containerRef}>
        <div className="builder-reveal-waiting">
          <h2>🐲 The Beast Awakens...</h2>
          <p>Watch the main screen!</p>
          {creaturePreview && (
            <div className="your-creature-preview">
              <span className="preview-label">Your creation:</span>
              <span className="preview-emojis">{creaturePreview}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // If closed, show submitted screen
  if (status === 'closed') {
    return (
      <div className="monster-builder-container" ref={containerRef}>
        <div className="builder-closed">
          <h2>⏰ Submissions Closed</h2>
          <p>The beast is being assembled...</p>
          {creaturePreview && (
            <div className="your-creature-preview">
              <span className="preview-label">Your creation:</span>
              <span className="preview-emojis">{creaturePreview}</span>
            </div>
          )}
          <p className="submission-count">{submissionCount} creatures submitted</p>
        </div>
      </div>
    );
  }

  // Submitted confirmation view
  if (hasSubmitted && isComplete) {
    return (
      <div className="monster-builder-container" ref={containerRef}>
        <motion.div 
          className="builder-submitted"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <div className="submitted-header">
            <TMPCheck size={32} />
            <h2>CREATURE SUBMITTED</h2>
          </div>
          
          <div className="creature-display">
            <span className="creature-emojis">{creaturePreview}</span>
          </div>
          
          <p className="waiting-message">Waiting for the hunt...</p>
          
          <motion.button
            className="change-btn"
            onClick={changeCreature}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            CHANGE MY CREATURE
          </motion.button>
          
          <p className="submission-count">{submissionCount} adventurers have submitted</p>
        </motion.div>
      </div>
    );
  }

  // Main builder view
  return (
    <div className="monster-builder-container" ref={containerRef}>
      <h2 className="builder-title">BUILD THE BEAST</h2>
      
      <div className="builder-parts">
        {MONSTER_BUILDER_CONFIG.map(part => (
          <div key={part.category} className="part-section">
            <h3 className="part-label">{part.label}</h3>
            <div className="part-options">
              {part.options.map(option => (
                <motion.button
                  key={option.id}
                  className={`part-option ${selections[part.category] === option.id ? 'selected' : ''}`}
                  onClick={() => {
                    selectPart(part.category, option.id);
                    spawnFlyAway(option.emoji);
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <span className="option-emoji">{option.emoji}</span>
                  {selections[part.category] === option.id && (
                    <motion.span 
                      className="selected-indicator"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >
                      ✓
                    </motion.span>
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Creature Preview */}
      <AnimatePresence>
        {isComplete && (
          <motion.div 
            className="creature-preview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <span className="preview-label">Your creation:</span>
            <span className="preview-emojis">{creaturePreview}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit Button */}
      <motion.button
        className={`submit-btn ${isComplete ? 'ready' : 'disabled'}`}
        onClick={submitCreature}
        whileHover={isComplete && !isSubmitting ? { scale: 1.05 } : {}}
        whileTap={isComplete && !isSubmitting ? { scale: 0.95 } : {}}
        style={{ pointerEvents: (!isComplete || isSubmitting) ? 'none' : 'auto', opacity: (!isComplete || isSubmitting) ? 0.5 : 1 }}
      >
        {isSubmitting ? 'SUBMITTING...' : 'SUBMIT CREATURE'}
      </motion.button>

      {!isComplete && (
        <p className="hint-text">Select one option from each category</p>
      )}
    </div>
  );
}

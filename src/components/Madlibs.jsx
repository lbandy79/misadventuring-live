import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import './Madlibs.css';

/**
 * MADLIBS D&D
 * 
 * Flow:
 * 1. GM creates a template: "The [ADJECTIVE] wizard casts [SPELL] at the [CREATURE]"
 * 2. Audience members each submit ONE word for the current blank
 * 3. Random selection (or voting) picks the winner for each blank
 * 4. Final reveal shows the completed sentence with dramatic flair
 * 
 * Firebase structure:
 * madlibs/current {
 *   template: "The [ADJECTIVE] wizard casts [SPELL]",
 *   blanks: ["ADJECTIVE", "SPELL"],
 *   currentBlankIndex: 0,
 *   submissions: { "ADJECTIVE": ["brave", "smelly", "drunk"], "SPELL": [] },
 *   winners: { "ADJECTIVE": "smelly", "SPELL": null },
 *   status: "collecting" | "revealing" | "complete" | "idle"
 * }
 */

export default function Madlibs({ isAdmin = false }) {
  const [madlibData, setMadlibData] = useState(null);
  const [submission, setSubmission] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [userId] = useState(() => localStorage.getItem('userId') || Math.random().toString(36).substr(2, 9));

  useEffect(() => {
    localStorage.setItem('audience-id', userId);
    
    const unsubscribe = onSnapshot(doc(db, 'madlibs', 'current'), (snapshot) => {
      if (snapshot.exists()) {
        setMadlibData(snapshot.data());
        // Reset submission state when blank changes
        setHasSubmitted(false);
        setSubmission('');
      } else {
        setMadlibData(null);
      }
    });

    return () => unsubscribe();
  }, [userId]);

  const submitWord = async () => {
    if (!submission.trim() || !madlibData) return;
    
    const currentBlank = madlibData.blanks[madlibData.currentBlankIndex];
    
    try {
      await updateDoc(doc(db, 'madlibs', 'current'), {
        [`submissions.${currentBlank}`]: arrayUnion({
          word: submission.trim(),
          userId,
          timestamp: Date.now()
        })
      });
      setHasSubmitted(true);
    } catch (error) {
      console.error('Failed to submit word:', error);
    }
  };

  // Idle state - no active madlib
  if (!madlibData || madlibData.status === 'idle') {
    return (
      <div className="madlibs-container idle">
        <div className="waiting-icon">📝</div>
        <h2>Madlibs D&D</h2>
        <p>Waiting for the GM to start a madlib...</p>
      </div>
    );
  }

  const currentBlank = madlibData.blanks[madlibData.currentBlankIndex];
  const currentSubmissions = madlibData.submissions?.[currentBlank] || [];

  // Collecting submissions
  if (madlibData.status === 'collecting') {
    return (
      <div className="madlibs-container collecting">
        <h2>Fill in the blank!</h2>
        
        <div className="template-preview">
          {renderTemplate(madlibData.template, madlibData.winners, currentBlank)}
        </div>

        <div className="current-blank">
          <span className="blank-type">{currentBlank}</span>
          <span className="blank-hint">({getHintForType(currentBlank)})</span>
        </div>

        {!hasSubmitted ? (
          <div className="submission-form">
            <input
              type="text"
              value={submission}
              onChange={(e) => setSubmission(e.target.value)}
              placeholder={`Enter a ${currentBlank.toLowerCase()}...`}
              maxLength={30}
              onKeyPress={(e) => e.key === 'Enter' && submitWord()}
            />
            <button onClick={submitWord} disabled={!submission.trim()}>
              Submit
            </button>
          </div>
        ) : (
          <div className="submitted-message">
            <span>✓</span> Word submitted! Waiting for others...
          </div>
        )}

        <div className="submission-count">
          {currentSubmissions.length} words submitted
        </div>
      </div>
    );
  }

  // Revealing winner for current blank
  if (madlibData.status === 'revealing') {
    return (
      <div className="madlibs-container revealing">
        <h2>And the word is...</h2>
        <motion.div 
          className="winner-reveal"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", duration: 0.8 }}
        >
          {madlibData.winners[currentBlank]}
        </motion.div>
      </div>
    );
  }

  // Complete - show final result
  if (madlibData.status === 'complete') {
    return (
      <div className="madlibs-container complete">
        <h2>The Story</h2>
        <motion.div 
          className="final-story"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {renderFinalStory(madlibData.template, madlibData.winners)}
        </motion.div>
      </div>
    );
  }

  return null;
}

// Helper: Render template with filled/unfilled blanks
function renderTemplate(template, winners, currentBlank) {
  const parts = template.split(/(\[[A-Z_]+\])/g);
  
  return parts.map((part, i) => {
    const match = part.match(/\[([A-Z_]+)\]/);
    if (match) {
      const blankType = match[1];
      const winner = winners?.[blankType];
      const isCurrent = blankType === currentBlank;
      
      return (
        <span 
          key={i} 
          className={`blank ${winner ? 'filled' : ''} ${isCurrent ? 'current' : ''}`}
        >
          {winner || `[${blankType}]`}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// Helper: Render final completed story
function renderFinalStory(template, winners) {
  let result = template;
  Object.entries(winners).forEach(([blank, word]) => {
    result = result.replace(`[${blank}]`, word);
  });
  return result;
}

// Helper: Get hint text for blank types
function getHintForType(type) {
  const hints = {
    'ADJECTIVE': 'describes something',
    'NOUN': 'person, place, or thing',
    'VERB': 'action word',
    'ADVERB': 'describes an action',
    'CREATURE': 'monster or beast',
    'SPELL': 'magical ability',
    'WEAPON': 'something to fight with',
    'PLACE': 'location or setting',
    'NAME': 'character name',
    'EMOTION': 'feeling or mood',
    'BODY_PART': 'part of the body',
    'NUMBER': 'any number',
    'COLOR': 'a color',
    'FOOD': 'something to eat'
  };
  return hints[type] || 'fill in the blank';
}

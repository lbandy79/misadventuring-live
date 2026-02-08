/**
 * VillagerSubmission - Audience submits NPCs with items
 * 
 * Form for creating villagers that may have "hoard items" affecting the story.
 * Stores submissions in Firebase for GM display.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { doc, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { playSound, initAudio } from '../utils/sounds';
import { validateContent } from '../utils/contentFilter';
import { TMPCheck, TMPStar } from './icons/TMPIcons';
import type { 
  Villager, 
  VillagerSpecies, 
  VillagerBackground,
  VillagerPronouns,
  VillagerSubmissionState 
} from '../types/villager.types';
import { 
  VILLAGER_ITEMS, 
  SPECIES_OPTIONS, 
  BACKGROUND_OPTIONS,
  PRONOUNS_OPTIONS,
  getItemById 
} from '../types/villager.types';
import './VillagerSubmission.css';

// Generate anonymous user ID for tracking submissions
function getOrCreateUserId(): string {
  const key = 'mtp-user-id';
  let userId = localStorage.getItem(key);
  if (!userId) {
    userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(key, userId);
  }
  return userId;
}

export default function VillagerSubmission() {
  const [status, setStatus] = useState<VillagerSubmissionState['status']>('collecting');
  const [sessionId, setSessionId] = useState<string>('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [allSubmissions, setAllSubmissions] = useState<Villager[]>([]);
  
  // Form state
  const [name, setName] = useState('');
  const [pronouns, setPronouns] = useState<VillagerPronouns | ''>('');
  const [species, setSpecies] = useState<VillagerSpecies | ''>('');
  const [background, setBackground] = useState<VillagerBackground | ''>('');
  const [quirk, setQuirk] = useState('');
  const [itemId, setItemId] = useState('');
  
  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submittedVillager, setSubmittedVillager] = useState<Villager | null>(null);

  // Listen to submission state
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'villagers', 'current'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as VillagerSubmissionState;
          setStatus(data.status);
          setSessionId(data.sessionId);
          setAllSubmissions(data.submissions || []);
          
          // Check if this user already submitted this session
          const userId = getOrCreateUserId();
          const storageKey = `villager-submitted-${data.sessionId}`;
          if (localStorage.getItem(storageKey)) {
            setHasSubmitted(true);
            // Try to find their submission
            const userSubmission = data.submissions?.find(
              s => s.submittedBy === userId
            );
            if (userSubmission) {
              setSubmittedVillager(userSubmission);
            }
          }
        }
      },
      (error) => {
        console.error('Villager submission listener error:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    } else if (name.trim().length > 30) {
      newErrors.name = 'Name must be 30 characters or less';
    } else {
      // Check for profanity in name
      const nameError = validateContent(name.trim(), 'name');
      if (nameError) newErrors.name = nameError;
    }
    
    if (!pronouns) {
      newErrors.pronouns = 'Please select pronouns';
    }
    
    if (!species) {
      newErrors.species = 'Please select a species';
    }
    
    if (!background) {
      newErrors.background = 'Please select an occupation';
    }
    
    if (!itemId) {
      newErrors.item = 'Please select an item';
    }
    
    if (quirk.length > 50) {
      newErrors.quirk = 'Quirk must be 50 characters or less';
    } else if (quirk.trim()) {
      // Check for profanity in quirk
      const quirkError = validateContent(quirk.trim(), 'quirk');
      if (quirkError) newErrors.quirk = quirkError;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, pronouns, species, background, itemId, quirk]);

  // Submit villager (new or edit)
  const handleSubmit = async () => {
    if (!validateForm() || status !== 'collecting') return;
    // For new submissions, check if already submitted (unless editing)
    if (hasSubmitted && !isEditing) return;
    
    // After validation, we know these are not empty
    if (!pronouns || !species || !background || !itemId) return;
    
    initAudio();
    setIsSubmitting(true);

    try {
      const userId = getOrCreateUserId();
      const item = getItemById(itemId);
      
      const villager: Villager = {
        name: name.trim(),
        pronouns: pronouns as VillagerPronouns,
        species: species as VillagerSpecies,
        background: background as VillagerBackground,
        quirk: quirk.trim(),
        item: itemId,
        itemName: item?.name || 'Unknown Item',
        isHoardItem: item?.isHoardItem || false,
        submittedAt: Date.now(),
        submittedBy: userId,
        status: 'approved', // Auto-approve (profanity filter already ran)
      };

      const docRef = doc(db, 'villagers', 'current');
      
      if (isEditing) {
        // Replace existing submission - filter out old one and add new
        const updatedSubmissions = allSubmissions.filter(
          s => s.submittedBy !== userId
        );
        updatedSubmissions.push(villager);
        
        await updateDoc(docRef, {
          submissions: updatedSubmissions
        });
      } else {
        // New submission - just append
        await updateDoc(docRef, {
          submissions: arrayUnion(villager)
        });
      }

      // Mark as submitted
      localStorage.setItem(`villager-submitted-${sessionId}`, 'true');
      setHasSubmitted(true);
      setIsEditing(false);
      setSubmittedVillager(villager);
      playSound('vote');
    } catch (error) {
      console.error('Villager submission failed:', error);
      playSound('error');
      alert('Submission failed - please try again!');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Enable editing mode and pre-populate form
  const handleChangeMyMind = () => {
    if (submittedVillager) {
      setName(submittedVillager.name);
      setPronouns(submittedVillager.pronouns);
      setSpecies(submittedVillager.species);
      setBackground(submittedVillager.background);
      setQuirk(submittedVillager.quirk);
      setItemId(submittedVillager.item);
    }
    setIsEditing(true);
  };

  // Get item emoji for display
  const selectedItem = getItemById(itemId);

  // If submissions are closed
  if (status === 'closed' || status === 'displaying') {
    return (
      <div className="villager-container">
        <div className="villager-closed">
          <h2>🏘️ Village is Complete!</h2>
          <p>The villagers of Ridgefall have gathered.</p>
          {submittedVillager && (
            <div className="your-villager-card">
              <h3>Your Villager</h3>
              <p className="villager-name">{submittedVillager.name}</p>
              <p className="villager-pronouns">
                {PRONOUNS_OPTIONS.find(p => p.id === submittedVillager.pronouns)?.label || submittedVillager.pronouns}
              </p>
              <p className="villager-details">
                {submittedVillager.species} {submittedVillager.background}
              </p>
              {submittedVillager.quirk && (
                <p className="villager-quirk">"{submittedVillager.quirk}"</p>
              )}
              <p className="villager-item">
                {selectedItem?.emoji} {submittedVillager.itemName}
                {submittedVillager.isHoardItem && (
                  <span className="hoard-badge">
                    <TMPStar size={14} /> Special
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // If already submitted (and not editing)
  if (hasSubmitted && submittedVillager && !isEditing) {
    return (
      <div className="villager-container">
        <div className="villager-submitted">
          <motion.div 
            className="success-check"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <TMPCheck size={48} />
          </motion.div>
          <h2>Villager Created!</h2>
          <div className="your-villager-card">
            <p className="villager-name">{submittedVillager.name}</p>
            <p className="villager-pronouns">
              {PRONOUNS_OPTIONS.find(p => p.id === submittedVillager.pronouns)?.label || submittedVillager.pronouns}
            </p>
            <p className="villager-details">
              {submittedVillager.species} {submittedVillager.background}
            </p>
            {submittedVillager.quirk && (
              <p className="villager-quirk">"{submittedVillager.quirk}"</p>
            )}
            <p className="villager-item">
              {getItemById(submittedVillager.item)?.emoji} {submittedVillager.itemName}
              {submittedVillager.isHoardItem && (
                <span className="hoard-badge">
                  <TMPStar size={14} /> Hoard Item
                </span>
              )}
            </p>
          </div>
          <p className="thank-you">Thank you! Watch for your villager in the story.</p>
          
          {/* Change My Mind Button */}
          <button
            type="button"
            className="change-mind-btn"
            onClick={handleChangeMyMind}
          >
            🔄 Change My Mind
          </button>
        </div>
      </div>
    );
  }

  // Submission form (also used for editing)
  return (
    <div className="villager-container">
      <h2 className="villager-title">
        {isEditing ? '✏️ Edit Your Villager' : '🏘️ Create a Villager'}
      </h2>
      <p className="villager-subtitle">
        {isEditing 
          ? 'Make your changes below and submit again.'
          : 'Give life to a resident of Ridgefall! They may appear in the story.'
        }
      </p>

      <form 
        className="villager-form"
        onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
      >
        {/* Name */}
        <div className={`form-group ${errors.name ? 'has-error' : ''}`}>
          <label htmlFor="villager-name">Name</label>
          <input
            id="villager-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Barnaby Thornwick"
            maxLength={30}
            autoComplete="off"
          />
          {errors.name && <span className="error-msg">{errors.name}</span>}
        </div>

        {/* Pronouns */}
        <div className="form-group">
          <label htmlFor="villager-pronouns">Pronouns</label>
          <select
            id="villager-pronouns"
            value={pronouns}
            onChange={(e) => setPronouns(e.target.value as VillagerPronouns)}
            className={errors.pronouns ? 'error' : ''}
          >
            <option value="" disabled>Select pronouns...</option>
            {PRONOUNS_OPTIONS.map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
          {errors.pronouns && <span className="error-text">{errors.pronouns}</span>}
        </div>

        {/* Species */}
        <div className="form-group">
          <label htmlFor="villager-species">Species</label>
          <select
            id="villager-species"
            value={species}
            onChange={(e) => setSpecies(e.target.value as VillagerSpecies)}
            className={errors.species ? 'error' : ''}
          >
            <option value="" disabled>Select species...</option>
            {SPECIES_OPTIONS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {errors.species && <span className="error-text">{errors.species}</span>}
        </div>

        {/* Background */}
        <div className="form-group">
          <label htmlFor="villager-background">Occupation</label>
          <select
            id="villager-background"
            value={background}
            onChange={(e) => setBackground(e.target.value as VillagerBackground)}
            className={errors.background ? 'error' : ''}
          >
            <option value="" disabled>Select occupation...</option>
            {BACKGROUND_OPTIONS.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          {errors.background && <span className="error-text">{errors.background}</span>}
        </div>

        {/* Quirk (optional) */}
        <div className={`form-group ${errors.quirk ? 'has-error' : ''}`}>
          <label htmlFor="villager-quirk">
            Quirk <span className="optional">(optional)</span>
          </label>
          <input
            id="villager-quirk"
            type="text"
            value={quirk}
            onChange={(e) => setQuirk(e.target.value)}
            placeholder="e.g., Always hums nervously"
            maxLength={50}
            autoComplete="off"
          />
          {errors.quirk && <span className="error-msg">{errors.quirk}</span>}
          <span className="char-count">{quirk.length}/50</span>
        </div>

        {/* Item */}
        <div className="form-group">
          <label htmlFor="villager-item">
            Possession
            {selectedItem?.isHoardItem && (
              <span className="hoard-indicator">
                <TMPStar size={12} /> Hoard Item!
              </span>
            )}
          </label>
          <select
            id="villager-item"
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            className={`${selectedItem?.isHoardItem ? 'hoard-item-selected' : ''} ${errors.item ? 'error' : ''}`}
          >
            <option value="" disabled>Select an item...</option>
            {VILLAGER_ITEMS.map(item => (
              <option key={item.id} value={item.id}>
                {item.emoji} {item.name} {item.isHoardItem ? '⭐' : ''}
              </option>
            ))}
          </select>
          {errors.item && <span className="error-text">{errors.item}</span>}
          {selectedItem?.description && (
            <span className="item-description">{selectedItem.description}</span>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="submit-btn"
          disabled={isSubmitting}
        >
          {isSubmitting 
            ? (isEditing ? 'Updating...' : 'Creating...') 
            : (isEditing ? '✨ Update Villager' : '✨ Create Villager')
          }
        </button>

        {/* Cancel Edit Button */}
        {isEditing && (
          <button
            type="button"
            className="cancel-btn"
            onClick={() => setIsEditing(false)}
          >
            Cancel
          </button>
        )}
      </form>
    </div>
  );
}

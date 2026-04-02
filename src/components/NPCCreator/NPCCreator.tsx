/**
 * NPCCreator — System-Driven Multi-Step Wizard
 * 
 * Reads form fields from npcCreator.fields[] in the system JSON.
 * Step-by-step wizard optimized for phone screens.
 * Stores completed NPCs in Firestore `npcs` collection.
 */

import { useState, useCallback } from 'react';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { useSystemConfig } from '../../hooks/useSystemConfig';
import { validateContent } from '../../utils/contentFilter';
import StatSelector from './StatSelector';
import type { NPC } from '../../types/npc.types';
import type { Reservation } from '../../types/reservation.types';
import type { NpcFormField } from '../../types/system.types';
import './NPCCreator.css';

interface NPCCreatorProps {
  reservation: Reservation;
  onComplete: (npc: NPC) => void;
}

const stepVariants = {
  enter: { opacity: 0, x: 50 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
};

export default function NPCCreator({ reservation, onComplete }: NPCCreatorProps) {
  const { config } = useSystemConfig();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReview, setIsReview] = useState(false);

  if (!config) return null;

  const { fields } = config.npcCreator;
  const { stats, showConfig } = config;
  const totalSteps = fields.length;

  const currentField = fields[currentStep];

  // Get occupation suggestions from showConfig overrides
  const occupationSuggestions = showConfig.npcCreatorOverrides?.occupationSuggestions ?? [];
  // Override the secret field help text from showConfig
  const getHelpText = (field: NpcFormField): string => {
    if (field.id === 'secret' && showConfig.npcCreatorOverrides?.secretPrompt) {
      return showConfig.npcCreatorOverrides.secretPrompt;
    }
    return field.helpText ?? '';
  };

  // Validate a single field
  const validateField = useCallback((field: NpcFormField, value: string): string | null => {
    if (field.required && !value.trim()) {
      return `${field.label} is required`;
    }
    if (field.maxLength && value.length > field.maxLength) {
      return `${field.label} must be ${field.maxLength} characters or less`;
    }
    // Cross-field validation
    if (field.validation?.startsWith('mustDifferFrom:')) {
      const otherFieldId = field.validation.split(':')[1];
      if (value && value === formData[otherFieldId]) {
        return 'Must be different from your best stat';
      }
    }
    // Profanity check on text fields
    if ((field.type === 'text' || field.type === 'textarea') && value.trim()) {
      const profanityError = validateContent(value.trim(), field.label.toLowerCase());
      if (profanityError) return profanityError;
    }
    return null;
  }, [formData]);

  // Validate current step before advancing
  const validateCurrentStep = (): boolean => {
    if (!currentField) return true;
    const value = formData[currentField.id] ?? '';
    const error = validateField(currentField, value);
    if (error) {
      setErrors(prev => ({ ...prev, [currentField.id]: error }));
      return false;
    }
    setErrors(prev => {
      const next = { ...prev };
      delete next[currentField.id];
      return next;
    });
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setIsReview(true);
    }
  };

  const handleBack = () => {
    if (isReview) {
      setIsReview(false);
    } else if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleFieldChange = (fieldId: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    // Clear error on change
    if (errors[fieldId]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const handleSubmit = async () => {
    // Validate all fields
    let hasErrors = false;
    const newErrors: Record<string, string> = {};
    for (const field of fields) {
      const value = formData[field.id] ?? '';
      const error = validateField(field, value);
      if (error) {
        newErrors[field.id] = error;
        hasErrors = true;
      }
    }
    if (hasErrors) {
      setErrors(newErrors);
      setIsReview(false);
      // Go to first field with error
      const firstErrorIdx = fields.findIndex(f => newErrors[f.id]);
      if (firstErrorIdx >= 0) setCurrentStep(firstErrorIdx);
      return;
    }

    setIsSubmitting(true);

    try {
      const npcData = {
        reservationId: reservation.id,
        showId: showConfig.showId,
        systemId: config.system.id,
        name: formData.name ?? '',
        occupation: formData.occupation ?? '',
        appearance: formData.appearance ?? '',
        secret: formData.secret ?? '',
        bestStat: formData.bestStat ?? '',
        worstStat: formData.worstStat ?? '',
        createdAt: Date.now(),
        gmNotes: '',
        gmFlagged: false,
      };

      const docRef = await addDoc(collection(db, 'npcs'), npcData);
      const npc: NPC = { id: docRef.id, ...npcData };

      // Mark reservation as NPC created
      try {
        await updateDoc(doc(db, 'reservations', reservation.id), {
          npcCreated: true,
        });
      } catch {
        // Non-blocking — reservation update is best-effort
      }

      onComplete(npc);
    } catch (err) {
      console.error('Error submitting NPC:', err);
      setErrors({ _submit: 'Something went wrong. Please try again.' });
      setIsSubmitting(false);
    }
  };

  // Render the current field based on its type
  const renderField = (field: NpcFormField) => {
    const value = formData[field.id] ?? '';
    const error = errors[field.id];
    const helpText = getHelpText(field);

    // Stat selector fields
    if (field.type === 'select' && field.optionsFrom === 'stats') {
      const disabledStatId = field.id === 'worstStat' ? formData.bestStat : 
                             field.id === 'bestStat' ? formData.worstStat : undefined;
      return (
        <StatSelector
          stats={stats}
          value={value}
          onChange={(v) => handleFieldChange(field.id, v)}
          label={field.label}
          helpText={helpText}
          disabledStatId={disabledStatId}
          error={error}
        />
      );
    }

    // Text area
    if (field.type === 'textarea') {
      return (
        <div className="npc-field">
          <label className="npc-label">{field.label}</label>
          {helpText && <p className="npc-help">{helpText}</p>}
          <textarea
            className={`npc-textarea ${error ? 'npc-input-error' : ''}`}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
            rows={3}
          />
          {field.maxLength && (
            <span className="npc-char-count">{value.length}/{field.maxLength}</span>
          )}
          {error && <p className="npc-error">{error}</p>}
        </div>
      );
    }

    // Text input (default)
    return (
      <div className="npc-field">
        <label className="npc-label">{field.label}</label>
        {helpText && <p className="npc-help">{helpText}</p>}
        <input
          type="text"
          className={`npc-input ${error ? 'npc-input-error' : ''}`}
          value={value}
          onChange={(e) => handleFieldChange(field.id, e.target.value)}
          placeholder={field.placeholder}
          maxLength={field.maxLength ?? 60}
        />
        {/* Show occupation suggestions */}
        {field.id === 'occupation' && occupationSuggestions.length > 0 && (
          <div className="occupation-suggestions">
            {occupationSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className={`suggestion-chip ${value === suggestion ? 'active' : ''}`}
                onClick={() => handleFieldChange(field.id, suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
        {error && <p className="npc-error">{error}</p>}
      </div>
    );
  };

  // Review step
  if (isReview) {
    return (
      <motion.div
        className="npc-creator"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="npc-review">
          <h2 className="npc-step-title">Review Your Character</h2>

          {fields.map((field) => {
            const value = formData[field.id] ?? '';
            const displayValue = field.optionsFrom === 'stats'
              ? stats.find(s => s.id === value)?.name ?? value
              : value;

            return (
              <div key={field.id} className="review-row">
                <span className="review-label">{field.label}</span>
                <span className="review-value">{displayValue || '—'}</span>
              </div>
            );
          })}

          {errors._submit && <p className="npc-error">{errors._submit}</p>}

          <div className="npc-nav">
            <button className="npc-back-btn" onClick={handleBack} disabled={isSubmitting}>
              ← Edit
            </button>
            <button
              className="npc-submit-btn"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Character'}
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Wizard step
  return (
    <div className="npc-creator">
      {/* Progress indicator */}
      <div className="npc-progress">
        <div
          className="npc-progress-fill"
          style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
        />
      </div>
      <p className="npc-step-counter">
        Step {currentStep + 1} of {totalSteps}
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentField.id}
          variants={stepVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.25 }}
          className="npc-step"
        >
          {renderField(currentField)}
        </motion.div>
      </AnimatePresence>

      <div className="npc-nav">
        {currentStep > 0 && (
          <button className="npc-back-btn" onClick={handleBack}>
            ← Back
          </button>
        )}
        <button className="npc-next-btn" onClick={handleNext}>
          {currentStep < totalSteps - 1 ? 'Next →' : 'Review →'}
        </button>
      </div>
    </div>
  );
}

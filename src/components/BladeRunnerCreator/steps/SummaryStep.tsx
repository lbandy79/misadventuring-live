import { useMemo, useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../../../firebase';
import type { BladeRunnerCharacter, BladeRunnerSystemConfig } from '../../../types/bladeRunner.types';

type JumpTarget =
  | 'nature'
  | 'archetype'
  | 'years'
  | 'attributes'
  | 'skills'
  | 'specialties'
  | 'keyMemory'
  | 'keyRelationship'
  | 'finishing';

interface SummaryStepProps {
  character: BladeRunnerCharacter | null;
  config: BladeRunnerSystemConfig;
  onJumpToStep: (step: JumpTarget) => void;
}

type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

export default function SummaryStep({ character, config, onJumpToStep }: SummaryStepProps) {
  const navigate = useNavigate();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState('');

  const lookups = useMemo(() => {
    return {
      attributeNames: Object.fromEntries(config.attributes.map((a) => [a.id, a.name])) as Record<string, string>,
      natureNames: Object.fromEntries(config.nature.options.map((n) => [n.id, n.name])) as Record<string, string>,
      archetypeNames: Object.fromEntries(config.archetypes.map((a) => [a.id, a.name])) as Record<string, string>,
      yearsNames: Object.fromEntries(config.yearsOnForce.map((y) => [y.id, y.name])) as Record<string, string>,
      specialtyNames: Object.fromEntries(config.specialties.map((s) => [s.id, s.name])) as Record<string, string>,
    };
  }, [config]);

  if (!character) {
    return (
      <section className="br-step">
        <h2>Summary</h2>
        <p>Complete all required fields to build your character sheet.</p>
      </section>
    );
  }

  const exportJson = async () => {
    const payload = JSON.stringify(character, null, 2);
    try {
      await navigator.clipboard.writeText(payload);
    } catch {
      // Clipboard can fail in restricted contexts.
    }

    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${character.name || 'blade-runner-character'}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const saveToCampaign = async () => {
    if (saveStatus === 'saving') return;
    setSaveStatus('saving');
    setSaveError('');
    try {
      const docRef = await addDoc(collection(db, 'blade-runner-characters'), {
        ...character,
        systemId: 'blade-runner-rpg',
        showId: null,
        createdAt: Date.now(),
        gmFlagged: false,
        gmNotes: '',
      });
      setSaveStatus('success');
      navigate(`/blade-runner/play/${docRef.id}`);
    } catch (err) {
      console.error('Failed to save Blade Runner character', err);
      setSaveStatus('error');
      setSaveError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const natureName = lookups.natureNames[character.natureId] ?? character.natureId;
  const archetypeName = lookups.archetypeNames[character.archetypeId] ?? character.archetypeId;
  const yearsName = lookups.yearsNames[character.yearsOnForceId] ?? character.yearsOnForceId;

  return (
    <section className="br-step">
      <header>
        <h2>Summary</h2>
        <p>Review your complete character sheet and save it.</p>
      </header>

      <div className="br-summary-box">
        <h3>{character.name || 'Unnamed Detective'}</h3>
        {character.playerName ? <p><strong>Player:</strong> {character.playerName}</p> : null}
        <p>{character.appearance || 'No appearance entered yet.'}</p>
        <p><strong>Nature:</strong> {natureName}</p>
        <p><strong>Archetype:</strong> {archetypeName}</p>
        <p><strong>Years:</strong> {yearsName}</p>
      </div>

      <div className="br-sub-card">
        <div className="br-row br-space-between">
          <h3>Attributes</h3>
          <button type="button" className="br-link-btn" onClick={() => onJumpToStep('attributes')}>Edit</button>
        </div>
        <ul>
          {Object.entries(character.attributes).map(([id, level]) => (
            <li key={id}>{lookups.attributeNames[id] ?? id}: {level}</li>
          ))}
          <li>Health: {character.health}</li>
          <li>Resolve: {character.resolve}</li>
        </ul>
      </div>

      <div className="br-sub-card">
        <div className="br-row br-space-between">
          <h3>Skills</h3>
          <button type="button" className="br-link-btn" onClick={() => onJumpToStep('skills')}>Edit</button>
        </div>
        <ul>
          {config.skills.map((skill) => (
            <li key={skill.id}>{skill.name}: {character.skills[skill.id]}</li>
          ))}
        </ul>
      </div>

      <div className="br-sub-card">
        <div className="br-row br-space-between">
          <h3>Specialties</h3>
          <button type="button" className="br-link-btn" onClick={() => onJumpToStep('specialties')}>Edit</button>
        </div>
        {character.specialties.length === 0 ? (
          <p>None selected.</p>
        ) : (
          <ul>
            {character.specialties.map((specialtyId, index) => (
              <li key={`${specialtyId}-${index}`}>{lookups.specialtyNames[specialtyId] ?? specialtyId}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="br-sub-card">
        <h3>Key Memory</h3>
        <p>{character.keyMemory.summary}</p>
      </div>

      <div className="br-sub-card">
        <h3>Key Relationship</h3>
        <p>{character.keyRelationship.summary}</p>
      </div>

      <div className="br-sub-card">
        <h3>Signature Item</h3>
        <p>{character.signatureItem}</p>
        <h3>Home</h3>
        <p>{character.home}</p>
      </div>

      <div className="br-sub-card">
        <h3>Gear</h3>
        <ul>
          {character.gear.map((item) => (
            <li key={item.id}><strong>{item.name}:</strong> {item.description}</li>
          ))}
        </ul>
      </div>

      <div className="br-row">
        <button
          type="button"
          className="br-primary"
          onClick={saveToCampaign}
          disabled={saveStatus === 'saving'}
        >
          {saveStatus === 'saving' ? 'Saving...' : 'Save to Campaign'}
        </button>
        <button type="button" onClick={exportJson} disabled={saveStatus === 'saving'}>
          Download JSON
        </button>
      </div>
      {saveStatus === 'error' ? (
        <p className="br-error" role="alert">Save failed: {saveError || 'please try again.'}</p>
      ) : null}
      {saveStatus === 'success' ? (
        <p className="br-help" role="status">Saved! Taking you to your sheet...</p>
      ) : null}
    </section>
  );
}


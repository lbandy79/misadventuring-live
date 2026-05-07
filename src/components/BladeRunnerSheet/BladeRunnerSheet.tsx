import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useSystemConfig } from '../../hooks/useSystemConfig';
import { isBladeRunnerConfig, type BladeRunnerCharacter, type BladeRunnerSystemConfig } from '../../types/bladeRunner.types';
import HowToPlayPanel from '../BladeRunnerCreator/components/HowToPlayPanel';
import '../BladeRunnerCreator/BladeRunnerCreator.css';
import './BladeRunnerSheet.css';

export default function BladeRunnerSheet() {
  const { id } = useParams<{ id: string }>();
  const { config, loading: configLoading, error: configError } = useSystemConfig();

  const [character, setCharacter] = useState<BladeRunnerCharacter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) {
        setError('No character id in URL.');
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'blade-runner-characters', id));
        if (cancelled) return;
        if (!snap.exists()) {
          setError('Character not found.');
        } else {
          setCharacter(snap.data() as BladeRunnerCharacter);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load Blade Runner character', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading || configLoading) {
    return (
      <div className="br-creator-wrap">
        <div className="br-creator-card"><p>Loading character…</p></div>
      </div>
    );
  }

  if (configError || !isBladeRunnerConfig(config)) {
    return (
      <div className="br-creator-wrap">
        <div className="br-creator-card"><p>Could not load Blade Runner system.</p></div>
      </div>
    );
  }

  if (error || !character) {
    return (
      <div className="br-creator-wrap">
        <div className="br-creator-card">
          <h1>Not Found</h1>
          <p>{error || 'This character could not be loaded.'}</p>
          <Link to="/blade-runner/create" className="br-primary br-link-btn">Create a new character</Link>
        </div>
      </div>
    );
  }

  return <BladeRunnerSheetView character={character} config={config} />;
}

function BladeRunnerSheetView({
  character,
  config,
}: {
  character: BladeRunnerCharacter;
  config: BladeRunnerSystemConfig;
}) {
  const [showHelp, setShowHelp] = useState(false);

  const lookups = useMemo(
    () => ({
      attributeNames: Object.fromEntries(config.attributes.map((a) => [a.id, a.name])) as Record<string, string>,
      natureNames: Object.fromEntries(config.nature.options.map((n) => [n.id, n.name])) as Record<string, string>,
      archetypeNames: Object.fromEntries(config.archetypes.map((a) => [a.id, a.name])) as Record<string, string>,
      yearsNames: Object.fromEntries(config.yearsOnForce.map((y) => [y.id, y.name])) as Record<string, string>,
      specialties: Object.fromEntries(config.specialties.map((s) => [s.id, s])),
      skills: config.skills,
      dieByLevel: Object.fromEntries(config.attributeLevels.map((l) => [l.level, l.dieType])) as Record<string, string>,
    }),
    [config]
  );

  const skillsByAttribute = useMemo(() => {
    const grouped = new Map<string, typeof config.skills>();
    config.attributes.forEach((attr) => grouped.set(attr.id, []));
    config.skills.forEach((skill) => {
      const bucket = grouped.get(skill.attribute) ?? [];
      bucket.push(skill);
      grouped.set(skill.attribute, bucket);
    });
    return grouped;
  }, [config]);

  return (
    <div className="br-creator-wrap">
      <div className="br-creator-card br-sheet">
        <nav className="br-sheet-nav">
          <Link to="/blade-runner/roster" className="br-sheet-back">← Roster</Link>
        </nav>
        <header className="br-sheet-header">
          <h1>{character.name || 'Unnamed Detective'}</h1>
          {character.playerName ? (
            <p className="br-sheet-player">Played by {character.playerName}</p>
          ) : null}
          <p className="br-sheet-subtitle">
            {lookups.natureNames[character.natureId] ?? character.natureId} ·{' '}
            {lookups.archetypeNames[character.archetypeId] ?? character.archetypeId} ·{' '}
            {lookups.yearsNames[character.yearsOnForceId] ?? character.yearsOnForceId}
          </p>
          {character.appearance ? <p className="br-sheet-appearance">{character.appearance}</p> : null}
        </header>

        <div className="br-sheet-stats">
          <div className="br-sheet-stat">
            <span className="br-sheet-stat-label">Health</span>
            <span className="br-sheet-stat-value">{character.health}</span>
          </div>
          <div className="br-sheet-stat">
            <span className="br-sheet-stat-label">Resolve</span>
            <span className="br-sheet-stat-value">{character.resolve}</span>
          </div>
        </div>

        <section className="br-sub-card">
          <h2>Attributes</h2>
          <ul className="br-sheet-grid">
            {config.attributes.map((attr) => {
              const level = character.attributes[attr.id];
              return (
                <li key={attr.id}>
                  <strong>{attr.name}</strong>
                  <span>
                    {level} ({lookups.dieByLevel[level]})
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="br-sub-card">
          <h2>Skills</h2>
          {config.attributes.map((attr) => {
            const attrSkills = skillsByAttribute.get(attr.id) ?? [];
            if (attrSkills.length === 0) return null;
            return (
              <div key={attr.id} className="br-sheet-skill-group">
                <h3>{attr.name}</h3>
                <ul className="br-sheet-grid">
                  {attrSkills.map((skill) => {
                    const level = character.skills[skill.id] ?? 'D';
                    return (
                      <li key={skill.id}>
                        <strong>{skill.name}</strong>
                        <span>
                          {level} ({lookups.dieByLevel[level]})
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </section>

        <section className="br-sub-card">
          <h2>Specialties</h2>
          {character.specialties.length === 0 ? (
            <p>None.</p>
          ) : (
            <ul>
              {character.specialties.map((specialtyId, index) => {
                const specialty = lookups.specialties[specialtyId];
                return (
                  <li key={`${specialtyId}-${index}`}>
                    <strong>{specialty?.name ?? specialtyId}:</strong>{' '}
                    {specialty?.description ?? ''}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="br-sub-card">
          <h2>Key Memory</h2>
          <p>{character.keyMemory.summary}</p>
        </section>

        <section className="br-sub-card">
          <h2>Key Relationship</h2>
          <p>{character.keyRelationship.summary}</p>
        </section>

        <section className="br-sub-card">
          <h2>Signature Item</h2>
          <p>{character.signatureItem}</p>
          <h2>Home</h2>
          <p>{character.home}</p>
        </section>

        <section className="br-sub-card">
          <h2>Standard Gear</h2>
          <ul>
            {character.gear.map((item) => (
              <li key={item.id}>
                <strong>{item.name}:</strong> {item.description}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <HowToPlayPanel config={config} open={showHelp} onToggle={() => setShowHelp((v) => !v)} />
    </div>
  );
}

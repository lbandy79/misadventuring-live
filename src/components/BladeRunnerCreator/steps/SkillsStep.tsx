import StatPicker from '../components/StatPicker';
import type { AttributeLevel, BladeRunnerSkill } from '../../../types/bladeRunner.types';
import type { BladeRunnerArchetype } from '../hooks/useCharacterCreation';

interface SkillsStepProps {
  skills: BladeRunnerSkill[];
  values: Record<string, AttributeLevel>;
  onChange: (id: string, level: AttributeLevel) => void;
  selectedArchetype: BladeRunnerArchetype | null;
  budget: number;
  spent: number;
}

export default function SkillsStep({ skills, values, onChange, selectedArchetype, budget, spent }: SkillsStepProps) {
  const keySkills = new Set(selectedArchetype?.keySkills ?? []);

  return (
    <section className="br-step">
      <header>
        <h2>Skills</h2>
        <p>All skills start at D. Spend your budget. Max level is A.</p>
      </header>

      <div className="br-budget-row">
        <strong>Budget: {spent}/{budget}</strong>
      </div>

      <div className="br-list">
        {skills.map((skill) => (
          <div key={skill.id} className={`br-list-item ${keySkills.has(skill.id) ? 'key' : ''}`}>
            <div>
              <h3>
                {skill.name}
                {keySkills.has(skill.id) ? <span className="br-inline-badge">Recommended</span> : null}
              </h3>
              <p>{skill.description}</p>
            </div>
            <StatPicker value={values[skill.id]} onChange={(level) => onChange(skill.id, level)} />
          </div>
        ))}
      </div>
    </section>
  );
}

import type { MotWPlaybook } from '../../../types/motw.types';
import MotWOptionCard from '../components/MotWOptionCard';

interface PlaybookStepProps {
  playbooks: MotWPlaybook[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function PlaybookStep({ playbooks, selectedId, onSelect }: PlaybookStepProps) {
  const selected = playbooks.find((p) => p.id === selectedId) ?? null;

  return (
    <section className="motw-step">
      <header className="motw-step-header">
        <div className="motw-eyebrow">Step 1</div>
        <h2>Choose Your Playbook</h2>
        <p className="motw-step-subtitle">
          Your playbook is your character archetype — it defines your special moves, gear, and role in the hunt.
        </p>
      </header>

      <div className="motw-playbook-grid">
        {playbooks.map((pb) => {
          const mandatoryCount = pb.moves.filter((m) => m.mandatory).length;
          const optionalCount = pb.moves.filter((m) => !m.mandatory).length;
          const movesSummary = mandatoryCount > 0
            ? `${mandatoryCount} mandatory + pick ${pb.moveCount} of ${optionalCount}`
            : `Pick ${pb.moveCount} of ${optionalCount} moves`;

          return (
            <MotWOptionCard
              key={pb.id}
              title={pb.name}
              subtitle={pb.concept}
              description={pb.examples.length > 0 ? `e.g. ${pb.examples.join(', ')}` : undefined}
              selected={selectedId === pb.id}
              onClick={() => onSelect(pb.id)}
              footer={
                <div className="motw-pb-meta">
                  <span>{movesSummary}</span>
                  {pb.luckSpecial ? <span className="motw-luck-tag">Luck special</span> : null}
                </div>
              }
            />
          );
        })}
      </div>

      {selected ? (
        <div className="motw-selection-detail">
          <h3>{selected.name}</h3>
          <p>{selected.concept}</p>
          {selected.examples.length > 0 && (
            <p className="motw-examples">
              <strong>Think:</strong> {selected.examples.join(', ')}
            </p>
          )}
          {selected.luckSpecial && (
            <p className="motw-luck-note">
              <strong>Luck:</strong> {selected.luckSpecial}
            </p>
          )}
          {selected.advancedImprovement && (
            <p className="motw-adv-note">
              <strong>Advanced improvement:</strong> {selected.advancedImprovement}
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}

import DiceRollButton from '../components/DiceRollButton';
import type { BladeRunnerArchetype } from '../hooks/useCharacterCreation';
import type { RollTableOption } from '../../../types/bladeRunner.types';

interface FinishingTouchesStepProps {
  name: string;
  playerName: string;
  appearance: string;
  signatureItem: string;
  home: string;
  standardGear: Array<{ id: string; name: string; description: string }>;
  signatureOptions: RollTableOption[];
  homeOptions: RollTableOption[];
  signatureDie: string;
  homeDie: string;
  selectedArchetype: BladeRunnerArchetype | null;
  onChange: (field: 'name' | 'playerName' | 'appearance' | 'signatureItem' | 'home', value: string) => void;
  onRollSignature: (rolled: number) => void;
  onRollHome: (rolled: number) => void;
}

export default function FinishingTouchesStep({
  name,
  playerName,
  appearance,
  signatureItem,
  home,
  standardGear,
  signatureOptions,
  homeOptions,
  signatureDie,
  homeDie,
  selectedArchetype,
  onChange,
  onRollSignature,
  onRollHome,
}: FinishingTouchesStepProps) {
  return (
    <section className="br-step">
      <header>
        <h2>Finishing Touches</h2>
        <p>Round out your detective with flavor details and standard issue gear.</p>
      </header>

      <div className="br-sub-card">
        <h3>Your Name (Player)</h3>
        <p className="br-help">So the GM knows who&apos;s playing this character.</p>
        <input
          value={playerName}
          onChange={(event) => onChange('playerName', event.target.value)}
          placeholder="Your name"
          maxLength={60}
          autoComplete="name"
        />
      </div>

      <div className="br-sub-card">
        <h3>Character Name</h3>
        <input value={name} onChange={(event) => onChange('name', event.target.value)} placeholder="Character name" maxLength={80} />
        {selectedArchetype?.suggestedNames?.length ? (
          <div className="br-chip-row">
            {selectedArchetype.suggestedNames.map((suggestion) => (
              <button type="button" key={suggestion} className="br-chip" onClick={() => onChange('name', suggestion)}>{suggestion}</button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="br-sub-card">
        <h3>Appearance</h3>
        <textarea value={appearance} onChange={(event) => onChange('appearance', event.target.value)} placeholder="Describe your look" rows={3} maxLength={240} />
        {selectedArchetype?.suggestedAppearances?.length ? (
          <div className="br-chip-row">
            {selectedArchetype.suggestedAppearances.map((suggestion) => (
              <button type="button" key={suggestion} className="br-chip" onClick={() => onChange('appearance', suggestion)}>{suggestion}</button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="br-sub-card">
        <h3>Signature Item</h3>
        <div className="br-row">
          <DiceRollButton dieType={signatureDie.toLowerCase()} label="Roll Item" onResult={onRollSignature} />
        </div>
        <select value={signatureItem} onChange={(event) => onChange('signatureItem', event.target.value)}>
          <option value="">Choose...</option>
          {signatureOptions.map((option) => (
            <option key={option.text} value={option.text}>{option.text}</option>
          ))}
        </select>
      </div>

      <div className="br-sub-card">
        <h3>Home</h3>
        <div className="br-row">
          <DiceRollButton dieType={homeDie.toLowerCase()} label="Roll Home" onResult={onRollHome} />
        </div>
        <select value={home} onChange={(event) => onChange('home', event.target.value)}>
          <option value="">Choose...</option>
          {homeOptions.map((option) => (
            <option key={option.text} value={option.text}>{option.text}</option>
          ))}
        </select>
      </div>

      <div className="br-sub-card">
        <h3>Standard Gear</h3>
        <ul>
          {standardGear.map((item) => (
            <li key={item.id}><strong>{item.name}:</strong> {item.description}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

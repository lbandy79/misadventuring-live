/**
 * CharacterSheet — Mobile-optimized D&D stat card for player phones
 *
 * Renders full stat block from ip_isle_stat_blocks.json when available,
 * or a simpler fallback card from decoderRingCharacters.ts data.
 */

import { useState, useEffect } from 'react';
import { getCharacterById, getFlickerClass, SHIP_ROLES } from '../data/decoderRingCharacters';
import type { StatBlock, StatBlockFile } from '../types/player.types';
import './CharacterSheet.css';

interface CharacterSheetProps {
  characterId: string;
  assignedRole?: string; // The ship role assigned by audience vote
}

// Ability score → modifier
function abilityMod(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

// Cache the fetched stat blocks so we don't re-fetch on every render
let statBlockCache: StatBlock[] | null = null;

async function loadStatBlocks(): Promise<StatBlock[]> {
  if (statBlockCache) return statBlockCache;
  try {
    const resp = await fetch('/Ip%20Isle%20Starter%20Files/ip_isle_stat_blocks.json');
    const data: StatBlockFile = await resp.json();
    statBlockCache = data.characters;
    return statBlockCache;
  } catch {
    return [];
  }
}

export default function CharacterSheet({ characterId, assignedRole }: CharacterSheetProps) {
  const [statBlock, setStatBlock] = useState<StatBlock | null>(null);
  const [loading, setLoading] = useState(true);

  const charData = getCharacterById(characterId);

  useEffect(() => {
    loadStatBlocks().then(blocks => {
      const found = blocks.find(b => b.id === characterId);
      setStatBlock(found || null);
      setLoading(false);
    });
  }, [characterId]);

  if (loading) {
    return (
      <div className="char-sheet loading">
        <div className="loading-spinner" />
        <p>Loading stat block...</p>
      </div>
    );
  }

  // Determine the role label
  const roleObj = assignedRole
    ? SHIP_ROLES.find(r => r.id === assignedRole)
    : null;

  // ─── Full stat block available ─────────────────────────────────────
  if (statBlock) {
    const flickerClass = charData ? getFlickerClass(charData.flicker) : '';

    return (
      <div className={`char-sheet ${flickerClass}`}>
        {/* Header */}
        <div className="sheet-header">
          {charData && (
            <img
              src={`/images/ip-isle/${charData.image}`}
              alt={statBlock.name}
              className="sheet-portrait"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <div className="sheet-title">
            <h1 className="sheet-name">{statBlock.name}</h1>
            <p className="sheet-source">{statBlock.source} ({statBlock.year})</p>
            {roleObj && (
              <span className="sheet-role-badge">{roleObj.emoji} {roleObj.label}</span>
            )}
          </div>
        </div>

        {/* Combat Bar */}
        <div className="combat-bar">
          <div className="combat-stat">
            <span className="combat-label">HP</span>
            <span className="combat-value hp">{statBlock.hp}</span>
          </div>
          <div className="combat-stat">
            <span className="combat-label">AC</span>
            <span className="combat-value ac">{statBlock.ac}</span>
          </div>
          <div className="combat-stat">
            <span className="combat-label">Speed</span>
            <span className="combat-value speed">{statBlock.speed}</span>
          </div>
        </div>

        {/* Ability Scores */}
        <div className="ability-grid">
          {Object.entries(statBlock.abilities).map(([key, val]) => (
            <div key={key} className="ability-cell">
              <span className="ability-name">{key.toUpperCase()}</span>
              <span className="ability-score">{val}</span>
              <span className="ability-mod">{abilityMod(val)}</span>
            </div>
          ))}
        </div>

        {/* Attack */}
        <div className="sheet-section">
          <h3 className="section-title">Attack</h3>
          <div className="attack-block">
            <span className="attack-name">{statBlock.attack.name}</span>
            <span className="attack-detail">{statBlock.attack.toHit} | {statBlock.attack.damage}</span>
            <span className="attack-range">{statBlock.attack.range}</span>
          </div>
        </div>

        {/* Skills */}
        <div className="sheet-section">
          <h3 className="section-title">Skills</h3>
          <div className="skills-list">
            {Object.entries(statBlock.skills).map(([skill, bonus]) => (
              <span key={skill} className="skill-chip">
                {skill.replace(/_/g, ' ')} {bonus}
              </span>
            ))}
          </div>
        </div>

        {/* Specials */}
        <div className="sheet-section">
          <h3 className="section-title">Special Abilities</h3>
          <ul className="specials-list">
            {statBlock.specials.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>

        {/* Flicker */}
        {statBlock.flicker.effect !== 'None.' && (
          <div className="sheet-section flicker-section">
            <h3 className="section-title">⚡ Flicker ({statBlock.flicker.rating})</h3>
            <p>{statBlock.flicker.effect}</p>
          </div>
        )}

        {/* Personality */}
        <div className="sheet-section personality-section">
          <h3 className="section-title">Personality</h3>
          <p className="personality-text">"{statBlock.personality}"</p>
        </div>
      </div>
    );
  }

  // ─── Fallback: no stat block in JSON, use decoderRingCharacters data ──
  if (charData) {
    return (
      <div className={`char-sheet fallback ${getFlickerClass(charData.flicker)}`}>
        <div className="sheet-header">
          <img
            src={`/images/ip-isle/${charData.image}`}
            alt={charData.name}
            className="sheet-portrait"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="sheet-title">
            <h1 className="sheet-name">{charData.name}</h1>
            <p className="sheet-source">{charData.sourceIP} — {charData.sourceCereal} ({charData.year})</p>
            {roleObj && (
              <span className="sheet-role-badge">{roleObj.emoji} {roleObj.label}</span>
            )}
          </div>
        </div>

        <div className="sheet-section">
          <p className="fallback-liner">"{charData.oneLiner}"</p>
        </div>

        <div className="sheet-section">
          <h3 className="section-title">Concept</h3>
          <p>{charData.concept}</p>
        </div>

        <div className="sheet-section">
          <h3 className="section-title">Best Role</h3>
          <p>
            {SHIP_ROLES.find(r => r.id === charData.bestRole)?.emoji}{' '}
            {SHIP_ROLES.find(r => r.id === charData.bestRole)?.label}
          </p>
        </div>

        <div className="sheet-section">
          <h3 className="section-title">Nostalgia Hook</h3>
          <p>{charData.nostalgiaHook}</p>
        </div>

        <p className="fallback-note">Full stat block not available — ask the GM!</p>
      </div>
    );
  }

  // Nothing found at all
  return (
    <div className="char-sheet error">
      <p>Character "{characterId}" not found.</p>
    </div>
  );
}

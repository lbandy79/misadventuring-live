import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useShow } from '../lib/shows';
import { getMonsterConfig } from '../data/liveMonster';
import type { MonsterBuilderConfig } from '../data/liveMonster';
import {
  subscribeToMonsterSession,
  subscribeToTypeVotes,
  subscribeToSlotVotes,
  tallyTypeVotes,
  tallySlotVotes,
  parseSlotIndex,
  type MonsterSession,
  type MonsterTypeVote,
  type MonsterSlotVote,
} from '../lib/liveMonster/liveMonsterApi';
import './LiveMonsterDisplayPage.css';

const AUDIENCE_URL = `${window.location.origin}/live-monster`;

export default function LiveMonsterDisplayPage() {
  const { showId, show } = useShow();
  const config: MonsterBuilderConfig | null = showId ? getMonsterConfig(showId) : null;

  const [session, setSession] = useState<MonsterSession | null>(null);
  const [typeVotes, setTypeVotes] = useState<MonsterTypeVote[]>([]);
  const [slotVotes, setSlotVotes] = useState<MonsterSlotVote[]>([]);

  useEffect(() => {
    if (!showId) return;
    return subscribeToMonsterSession(showId, setSession);
  }, [showId]);

  useEffect(() => {
    if (!showId) return;
    return subscribeToTypeVotes(showId, setTypeVotes);
  }, [showId]);

  const phase = session?.phase ?? 'idle';
  const slotIndex = parseSlotIndex(phase);
  const currentSlot = config?.slots[slotIndex] ?? null;

  useEffect(() => {
    if (!showId || !currentSlot) {
      setSlotVotes([]);
      return;
    }
    return subscribeToSlotVotes(showId, currentSlot.id, setSlotVotes);
  }, [showId, currentSlot]);

  if (!config) {
    return <IdleScreen showName={show?.name ?? 'The Misadventuring Party'} />;
  }

  const slotResults = session?.slotResults ?? {};
  const lockedTypeId = session?.lockedTypeId ?? null;
  const lockedType = lockedTypeId ? config.monsterTypes.find((t) => t.id === lockedTypeId) : null;

  const typeTally = tallyTypeVotes(typeVotes, config.monsterTypes.map((t) => t.id));
  const totalTypeVotes = typeVotes.length;

  const slotTally = currentSlot ? tallySlotVotes(slotVotes, currentSlot.options.length) : null;
  const slotTotal = slotTally ? slotTally.totalPreset + slotTally.totalWriteIn : 0;

  const currentSlotLocked = currentSlot ? slotResults[currentSlot.id] != null : false;

  // ── Idle ──
  if (phase === 'idle') {
    return <IdleScreen showName={config.showName} />;
  }

  // ── Type vote ──
  if (phase === 'type-vote') {
    if (lockedType) {
      return (
        <div className="lmd-full">
          <div className="lmd-type-winner">
            <div className="lmd-type-emoji-lg">{lockedType.emoji}</div>
            <h2 className="lmd-type-name-lg">{lockedType.name}</h2>
            <p className="lmd-type-teaser-lg">{lockedType.teaser}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="lmd-full">
        <p className="lmd-prompt">What kind of monster is it?</p>
        <div className="lmd-type-bars">
          {typeTally.map(({ optionId, count }) => {
            const t = config.monsterTypes.find((x) => x.id === optionId);
            if (!t) return null;
            const pct = totalTypeVotes > 0 ? (count / totalTypeVotes) * 100 : 0;
            return (
              <div key={optionId} className="lmd-type-bar-row">
                <span className="lmd-bar-label">{t.emoji} {t.name}</span>
                <div className="lmd-bar-track">
                  <div className="lmd-bar-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        {totalTypeVotes > 0 && (
          <p className="lmd-vote-count">{totalTypeVotes} vote{totalTypeVotes !== 1 ? 's' : ''}</p>
        )}
      </div>
    );
  }

  // ── Slot phases ──
  if (phase.startsWith('slot-') && currentSlot) {
    if (currentSlotLocked) {
      return (
        <div className="lmd-full lmd-slot-reveal">
          <p className="lmd-reveal-prefix">{currentSlot.revealPrefix}</p>
          <div className="lmd-flip-card">
            <p className="lmd-flip-text">{slotResults[currentSlot.id]}</p>
          </div>
          <p className="lmd-slot-num">
            Slot {slotIndex + 1} of {config.slots.length}
          </p>
        </div>
      );
    }

    return (
      <div className="lmd-full">
        <p className="lmd-slot-label">
          Slot {slotIndex + 1} of {config.slots.length}
        </p>
        <p className="lmd-prompt">{currentSlot.label}</p>
        <div className="lmd-slot-bars">
          {currentSlot.options.map((option, i) => {
            const count = slotTally?.optionCounts[i] ?? 0;
            const pct = slotTotal > 0 ? (count / slotTotal) * 100 : 0;
            return (
              <div key={i} className="lmd-slot-bar-row">
                <span className="lmd-bar-label lmd-bar-label--option">{option}</span>
                <div className="lmd-bar-track">
                  <div className="lmd-bar-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
          {(slotTally?.totalWriteIn ?? 0) > 0 && (
            <div className="lmd-slot-bar-row lmd-writein-agg">
              <span className="lmd-bar-label">✍️ Write-ins</span>
              <span className="lmd-writein-count">{slotTally!.totalWriteIn}</span>
            </div>
          )}
        </div>
        {slotTotal > 0 && (
          <p className="lmd-vote-count">{slotTotal} response{slotTotal !== 1 ? 's' : ''}</p>
        )}
      </div>
    );
  }

  // ── Full reveal ──
  if (phase === 'reveal') {
    const paragraph = buildParagraph(config.revealTemplate, slotResults);
    return (
      <div className="lmd-full lmd-reveal-full">
        {lockedType && (
          <div className="lmd-reveal-type">
            <span className="lmd-reveal-type-emoji">{lockedType.emoji}</span>
            <span className="lmd-reveal-type-name">{lockedType.name}</span>
          </div>
        )}
        <div className="lmd-reveal-slots">
          {config.slots.map((slot, i) => {
            const result = slotResults[slot.id];
            if (!result) return null;
            return (
              <div
                key={slot.id}
                className="lmd-reveal-slot-card"
                style={{ animationDelay: `${i * 0.5}s` }}
              >
                <span className="lmd-reveal-slot-prefix">{slot.revealPrefix}</span>
                <span className="lmd-reveal-slot-value">{result}</span>
              </div>
            );
          })}
        </div>
        {paragraph && (
          <p
            className="lmd-reveal-paragraph"
            style={{ animationDelay: `${config.slots.length * 0.5 + 0.4}s` }}
          >
            {paragraph}
          </p>
        )}
      </div>
    );
  }

  return <IdleScreen showName={config.showName} />;
}

function IdleScreen({ showName }: { showName: string }) {
  return (
    <div className="lmd-full lmd-idle">
      <h1 className="lmd-idle-title">{showName}</h1>
      <p className="lmd-idle-sub">Join the monster building — scan to participate</p>
      <div className="lmd-qr-wrap">
        <QRCodeSVG value={AUDIENCE_URL} size={200} bgColor="#0d0d14" fgColor="#cc4444" />
      </div>
      <p className="lmd-idle-url">{AUDIENCE_URL}</p>
    </div>
  );
}

function buildParagraph(template: string, slotResults: Record<string, string | null>): string {
  return template.replace(/\{([^}]+)\}/g, (_, key) => slotResults[key] ?? `[${key}]`);
}

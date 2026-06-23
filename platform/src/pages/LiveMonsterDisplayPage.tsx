import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useShow } from '@mtp/lib/shows';
import { getMonsterConfig } from '@mtp/data/liveMonster';
import type { MonsterBuilderConfig } from '@mtp/data/liveMonster';
import { BYSTANDER_TYPES } from '@mtp/data/liveMonster/bystanderTypes';
import {
  subscribeToMonsterSession,
  type MonsterSession,
} from '@mtp/lib/liveMonster/liveMonsterApi';
import {
  subscribeToBystanderSubmissions,
  type BystanderSubmission,
} from '@mtp/lib/liveMonster/bystanderSubmissionsApi';
import './LiveMonsterDisplayPage.css';

const AUDIENCE_URL = `${window.location.origin}/live-monster`;

// ─── Compact monster strip (used during bystander phases) ────────────────────

function MonsterStrip({
  config,
  slotResults,
}: {
  config: MonsterBuilderConfig;
  slotResults: Record<string, string | null | undefined>;
}) {
  return (
    <div className="lmd-monster-strip">
      <p className="lmd-strip-label">The Monster</p>
      {config.slots.map((slot) => {
        const result = slotResults[slot.id];
        return (
          <div key={slot.id} className={`lmd-strip-row ${result ? 'locked' : 'pending'}`}>
            <span className="lmd-strip-prefix">{slot.revealPrefix}</span>
            {result
              ? <span className="lmd-strip-value">{result}</span>
              : <span className="lmd-strip-pending">···</span>
            }
          </div>
        );
      })}
    </div>
  );
}

// ─── Full slot stack (used during active / reveal phases) ────────────────────

function SlotStack({
  config,
  slotResults,
}: {
  config: MonsterBuilderConfig;
  slotResults: Record<string, string | null | undefined>;
}) {
  return (
    <div className="lmd-slot-stack">
      {config.slots.map((slot) => {
        const result = slotResults[slot.id];
        const locked = result != null;
        return (
          <div key={slot.id} className={`lmd-stack-card ${locked ? 'locked' : 'pending'}`}>
            <span className="lmd-stack-prefix">{slot.revealPrefix}</span>
            {locked ? (
              <span key={result} className="lmd-stack-value">{result}</span>
            ) : (
              <span className="lmd-stack-pending">···</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Featured bystander card ──────────────────────────────────────────────────

function BystanderCard({ sub }: { sub: BystanderSubmission }) {
  const typeInfo = BYSTANDER_TYPES[sub.typeId as keyof typeof BYSTANDER_TYPES];
  const moveLine = sub.movePreset
    ? sub.movePreset
    : `When ${sub.customTrigger}, they ${sub.customEffect}`;

  return (
    <div className="lmd-bystander-card">
      <p className="lmd-bystander-card-label">Also tonight</p>
      <p className="lmd-bystander-card-name">{sub.name}</p>
      {typeInfo && (
        <p className="lmd-bystander-card-type">
          {typeInfo.label} — {typeInfo.tagline}
        </p>
      )}
      <p className="lmd-bystander-card-move">{moveLine}</p>
    </div>
  );
}

// ─── Corner QR ───────────────────────────────────────────────────────────────

function CornerQR() {
  return (
    <div className="lmd-corner-qr">
      <QRCodeSVG value={AUDIENCE_URL} size={80} bgColor="#0d0d14" fgColor="#cc4444" />
      <p className="lmd-corner-qr-url">{AUDIENCE_URL}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LiveMonsterDisplayPage() {
  const { showId, show } = useShow();
  const config: MonsterBuilderConfig | null = showId ? getMonsterConfig(showId) : null;

  const [session, setSession] = useState<MonsterSession | null>(null);
  const [bystanderSubmissions, setBystanderSubmissions] = useState<BystanderSubmission[]>([]);

  useEffect(() => {
    if (!showId) return;
    return subscribeToMonsterSession(showId, setSession);
  }, [showId]);

  const phase = session?.phase ?? 'idle';
  const bystanderPhaseActive = phase === 'bystander-name' || phase === 'bystander-move' || phase === 'done';

  useEffect(() => {
    if (!showId || !bystanderPhaseActive) { setBystanderSubmissions([]); return; }
    return subscribeToBystanderSubmissions(showId, setBystanderSubmissions);
  }, [showId, bystanderPhaseActive]);

  if (!config) return <IdleScreen showName={show?.name ?? 'The Misadventuring Party'} />;

  const slotResults = session?.slotResults ?? {};
  const featuredId = session?.featuredBystanderId ?? null;
  const featuredBystander = featuredId
    ? bystanderSubmissions.find(s => s.id === featuredId) ?? null
    : null;

  // ── Idle ──────────────────────────────────────────────────────────────────
  if (phase === 'idle') return <IdleScreen showName={config.showName} />;

  // ── Active (all slots open for voting) ───────────────────────────────────
  if (phase === 'active') {
    return (
      <div className="lmd-full lmd-layout-split">
        <div className="lmd-split-left">
          <p className="lmd-slot-label">The Monster</p>
          <SlotStack config={config} slotResults={slotResults} />
        </div>
        <div className="lmd-split-right lmd-split-right--qr">
          <p className="lmd-qr-label">Scan to vote</p>
          <div className="lmd-qr-wrap">
            <QRCodeSVG value={AUDIENCE_URL} size={180} bgColor="#0d0d14" fgColor="#cc4444" />
          </div>
          <p className="lmd-idle-url">{AUDIENCE_URL}</p>
        </div>
      </div>
    );
  }

  // ── Monster reveal ────────────────────────────────────────────────────────
  if (phase === 'reveal') {
    return (
      <div className="lmd-full lmd-reveal-screen">
        <p className="lmd-reveal-label">The Monster</p>
        <SlotStack config={config} slotResults={slotResults} />
        <CornerQR />
      </div>
    );
  }

  // ── Bystander phases (name / move) + done ─────────────────────────────────
  if (phase === 'bystander-name' || phase === 'bystander-move' || phase === 'done') {
    return (
      <div className="lmd-full lmd-bystander-stage">
        {/* Left: compact monster summary */}
        <MonsterStrip config={config} slotResults={slotResults} />

        {/* Right: featured bystander or open-for-submissions state */}
        <div className="lmd-bystander-stage-right">
          {featuredBystander ? (
            <BystanderCard sub={featuredBystander} />
          ) : (
            <div className="lmd-bystander-waiting">
              <p className="lmd-bystander-waiting-label">
                {phase === 'done' ? 'Session complete.' : 'Bystander incoming…'}
              </p>
            </div>
          )}
        </div>

        <CornerQR />
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

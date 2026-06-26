import { useState, useEffect, type SyntheticEvent } from 'react';
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
      {config.slots.filter(slot => !slot.secret).map((slot) => {
        const result = slotResults[slot.id];
        const winningOption = result ? slot.options.find(o => o.text === result) : undefined;
        return (
          <div key={slot.id} className={`lmd-strip-row ${result ? 'locked' : 'pending'}`}>
            <span className="lmd-strip-prefix">{slot.revealPrefix}</span>
            {result
              ? (
                <span className="lmd-strip-value">
                  {winningOption?.emoji && <span className="lmd-strip-emoji" aria-hidden="true">{winningOption.emoji}</span>}
                  {result}
                </span>
              )
              : <span className="lmd-strip-pending">···</span>
            }
          </div>
        );
      })}
    </div>
  );
}

// ─── Slot icon ────────────────────────────────────────────────────────────────

function gameIconUrl(slug: string) {
  return `https://game-icons.net/icons/cc4444/transparent/1x1/${slug}.svg`;
}

function fluentEmojiUrl(name: string) {
  const file = name.toLowerCase().replace(/\s+/g, '_');
  return `https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/${encodeURIComponent(name)}/3D/${file}_3d.png`;
}

function SlotIcon({
  gameIcon,
  fluentEmoji,
  prefer = 'gameIcon',
  size = 72,
}: {
  gameIcon?: string;
  fluentEmoji?: string;
  prefer?: 'gameIcon' | 'fluentEmoji';
  size?: number;
}) {
  const primary   = prefer === 'gameIcon' ? gameIcon    : fluentEmoji;
  const secondary = prefer === 'gameIcon' ? fluentEmoji : gameIcon;
  const primaryUrl   = primary   ? (prefer === 'gameIcon' ? gameIconUrl(primary)   : fluentEmojiUrl(primary))   : null;
  const secondaryUrl = secondary ? (prefer === 'gameIcon' ? fluentEmojiUrl(secondary) : gameIconUrl(secondary)) : null;

  if (!primaryUrl && !secondaryUrl) return null;

  const handleError = (e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (secondaryUrl && img.src !== secondaryUrl) {
      img.src = secondaryUrl;
    } else {
      img.style.display = 'none';
    }
  };

  return (
    <img
      src={primaryUrl ?? secondaryUrl!}
      alt=""
      className="lmd-slot-icon"
      style={{ width: size, height: size }}
      onError={handleError}
    />
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
      {config.slots.filter(slot => !slot.secret).map((slot) => {
        const result = slotResults[slot.id];
        const locked = result != null;
        const winningOption = locked ? slot.options.find(o => o.text === result) : undefined;
        const hasIcon = !!(winningOption?.emoji);
        return (
          <div key={slot.id} className={`lmd-stack-card ${locked ? 'locked' : 'pending'} ${hasIcon ? 'with-icon' : ''}`}>
            {locked && hasIcon && (
              <span className="lmd-slot-emoji" aria-hidden="true">{winningOption!.emoji}</span>
            )}
            <div className="lmd-stack-card-text">
              <span className="lmd-stack-prefix">{slot.revealPrefix}</span>
              {locked ? (
                <span key={result} className="lmd-stack-value">{result}</span>
              ) : (
                <span className="lmd-stack-pending">···</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Bystander avatar (shared between living and grave cards) ─────────────────

function BystanderAvatar({
  name,
  typeEmoji,
  className = 'lmd-bystander-avatar',
  wrapClass = 'lmd-bystander-avatar-wrap',
}: {
  name: string;
  typeEmoji?: string;
  className?: string;
  wrapClass?: string;
}) {
  const [failed, setFailed] = useState(false);
  const trimmed = name.trim();
  const url = `https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodeURIComponent(trimmed)}`;

  return (
    <div className={wrapClass}>
      {!failed && trimmed ? (
        <img
          className={className}
          src={url}
          alt=""
          onError={() => setFailed(true)}
          loading="lazy"
        />
      ) : (
        <div className={`${className} ${className}--fallback`} aria-hidden="true">
          {trimmed.charAt(0).toUpperCase() || '?'}
        </div>
      )}
      {typeEmoji && (
        <span className="lmd-bystander-type-badge" aria-hidden="true">{typeEmoji}</span>
      )}
    </div>
  );
}

// ─── Featured bystander card (living row) ─────────────────────────────────────

function BystanderCard({ sub }: { sub: BystanderSubmission }) {
  const typeInfo = BYSTANDER_TYPES[sub.typeId as keyof typeof BYSTANDER_TYPES];
  const moveLine = sub.movePreset
    ? sub.movePreset
    : `When ${sub.customTrigger}, they ${sub.customEffect}`;

  return (
    <div className="lmd-bystander-card">
      <BystanderAvatar name={sub.name} typeEmoji={typeInfo?.emoji} />
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

// ─── Grave card (graveyard row) ───────────────────────────────────────────────

const GRAVE_X_IMGS = [
  '/assets/themes/monster-of-the-week/first_x.png',
  '/assets/themes/monster-of-the-week/second_x.png',
];

function BystanderGraveCard({ sub, index }: { sub: BystanderSubmission; index: number }) {
  const [failed, setFailed] = useState(false);
  const trimmed = sub.name.trim();
  const avatarUrl = `https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodeURIComponent(trimmed)}`;
  const xSrc = GRAVE_X_IMGS[index % 2];

  return (
    <div className="lmd-bystander-grave-card">
      <div className="lmd-bystander-grave-avatar-wrap">
        {!failed && trimmed ? (
          <img
            className="lmd-bystander-grave-avatar"
            src={avatarUrl}
            alt=""
            onError={() => setFailed(true)}
            loading="lazy"
          />
        ) : (
          <div className="lmd-bystander-grave-avatar lmd-bystander-grave-avatar--fallback" aria-hidden="true">
            {trimmed.charAt(0).toUpperCase() || '?'}
          </div>
        )}
        <img src={xSrc} alt="" className="lmd-bystander-grave-x" aria-hidden="true" />
      </div>
      <p className="lmd-bystander-grave-name">{sub.name}</p>
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

// ─── Corner Logo ──────────────────────────────────────────────────────────────

function CornerLogo() {
  return (
    <div className="lmd-corner-logo">
      <img src="/assets/themes/monster-of-the-week/MotW logo.png" alt="The Misadventuring Party" className="lmd-corner-logo-img" />
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
  const bystanderPhaseActive = phase === 'bystander-name' || phase === 'bystander-move';

  useEffect(() => {
    if (!showId || !bystanderPhaseActive) { setBystanderSubmissions([]); return; }
    return subscribeToBystanderSubmissions(showId, setBystanderSubmissions);
  }, [showId, bystanderPhaseActive]);

  if (!config) return <IdleScreen showName={show?.name ?? 'The Misadventuring Party'} />;

  const slotResults = session?.slotResults ?? {};
  const bystanderStates = session?.bystanderStates ?? {};

  const featuredBystanders = bystanderSubmissions.filter(s => bystanderStates[s.id] === 'featured');
  const deadBystanders     = bystanderSubmissions.filter(s => bystanderStates[s.id] === 'dead');

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
        <CornerLogo />
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
        <CornerLogo />
      </div>
    );
  }

  // ── Bystander phases (name / move) ────────────────────────────────────────
  if (phase === 'bystander-name' || phase === 'bystander-move') {
    return (
      <div className="lmd-full lmd-bystander-stage">
        <MonsterStrip config={config} slotResults={slotResults} />

        <div className="lmd-bystander-stage-right">
          {/* Living row — featured bystanders, or waiting placeholder */}
          {featuredBystanders.length > 0 ? (
            <div
              className="lmd-bystander-living-row"
              data-count={featuredBystanders.length}
            >
              {featuredBystanders.map(sub => (
                <BystanderCard key={sub.id} sub={sub} />
              ))}
            </div>
          ) : (
            <div className="lmd-bystander-waiting">
              <p className="lmd-bystander-waiting-label">Bystander incoming…</p>
            </div>
          )}

          {/* Graveyard row — dead bystanders with red X */}
          {deadBystanders.length > 0 && (
            <div className="lmd-bystander-graveyard-row">
              {deadBystanders.map((sub, i) => (
                <BystanderGraveCard key={sub.id} sub={sub} index={i} />
              ))}
            </div>
          )}
        </div>

        <CornerQR />
        <CornerLogo />
      </div>
    );
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <div className="lmd-full lmd-done-simple">
        <img
          src="/assets/themes/monster-of-the-week/MotW logo.png"
          alt="The Misadventuring Party"
          className="lmd-done-logo"
        />
        <div className="lmd-qr-wrap">
          <QRCodeSVG value={AUDIENCE_URL} size={160} bgColor="#0d0d14" fgColor="#cc4444" />
        </div>
        <p className="lmd-idle-url">{AUDIENCE_URL}</p>
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
      <CornerLogo />
    </div>
  );
}

/**
 * LandingPage — Phase 5, post-pivot.
 *
 * No reservation system. Content-first: last recap + next show scan CTA,
 * friction-free How It Works, featured shows linking to recap pages.
 * Hero "now / next" pointers are hardcoded constants — 30-second edit
 * each season.
 */

import { Link } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { useShow, getShowEra, type Show } from '@mtp/lib';
import { recapConfigs } from './recap/recapConfig';
import { Doodle } from '../components/Doodle';

function accentStyleFor(show: Show): CSSProperties | undefined {
  if (!show.accentColor) return undefined;
  return {
    ['--accent' as any]: show.accentColor,
    ...(show.accentInk ? { ['--accent-ink' as any]: show.accentInk } : {}),
  } as CSSProperties;
}

/** Returns the canonical recap href for a show, or null if no recap exists. */
function recapHrefFor(show: Show): string | null {
  if (show.recap?.kind === 'external') return show.recap.url;
  if (show.recap?.kind === 'firestore') return `/shows/${show.recap.recapId}/recap`;
  // Fall back to scanning recapConfigs for a matching seriesName
  const entry = Object.values(recapConfigs).find(
    (c) => c.showId === show.id || c.seriesName === show.name,
  );
  if (entry) return `/shows/${entry.showId}/recap`;
  return null;
}

const LATEST_RECAP = {
  showName: 'Monster of the Week — Episode Two',
  href: 'https://www.youtube.com/watch?v=UwHhy-TuFss&t=12s',
};

/**
 * Studio productions — recorded at the MTP studio, hosted on YouTube.
 * One feature for now; when studio sessions become regular this becomes
 * a list. Swapping this object swaps the face of the page.
 */
const STUDIO_FEATURE = {
  title: 'The Vesper Job',
  format: 'A magepunk train heist, played in real time.',
  runtime: '65 min',
  youtubeId: 'Gdr4PCF-0-s',
  href: 'https://www.youtube.com/watch?v=Gdr4PCF-0-s',
  blurb:
    'Our first full studio production: one train, one crew, and a plan that '
    + 'comes apart on schedule. No rules knowledge required — just watch the '
    + 'party fail beautifully.',
};

const SOCIAL_LINKS: Array<{
  name: string;
  handle: string;
  href: string;
  icon: 'instagram' | 'youtube' | 'facebook' | 'tiktok';
}> = [
  {
    name: 'Instagram',
    handle: '@themisadventuringparty',
    href: 'https://www.instagram.com/themisadventuringparty',
    icon: 'instagram',
  },
  {
    name: 'YouTube',
    handle: '@TheMisadventuringParty',
    href: 'https://www.youtube.com/@TheMisadventuringParty',
    icon: 'youtube',
  },
  {
    name: 'TikTok',
    handle: '@themisadventuringparty',
    href: 'https://www.tiktok.com/@themisadventuringparty',
    icon: 'tiktok',
  },
  {
    name: 'Facebook',
    handle: 'The Misadventuring Party',
    href: 'https://www.facebook.com/profile.php?id=100094097430762',
    icon: 'facebook',
  },
];

/** Hand-drawn-style outline icons — kept as strokes so they read like doodles. */
function SocialIcon({ icon }: { icon: (typeof SOCIAL_LINKS)[number]['icon'] }) {
  const strokeProps = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (icon) {
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="5" {...strokeProps} />
          <circle cx="12" cy="12" r="4" {...strokeProps} />
          <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'youtube':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="2.5" y="5.5" width="19" height="13" rx="3.5" {...strokeProps} />
          <path d="M10 9.2 15 12l-5 2.8z" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14 4v10.5a3.8 3.8 0 1 1-3.8-3.8" {...strokeProps} />
          <path d="M14 4c.4 2.6 2.4 4.6 5 5" {...strokeProps} />
        </svg>
      );
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M13.5 21V9.5c0-2.2 1.3-3.5 3.5-3.5h1.5" {...strokeProps} />
          <path d="M10.5 12.5h6" {...strokeProps} />
        </svg>
      );
  }
}
const NEXT_SHOW = {
  showName: 'Monster of the Week',
  tagline: 'The case isn\'t closed.',
  dateLabel: 'September 19',
  href: '/shows/monster-of-the-week',
};

export default function LandingPage() {
  const { allShows } = useShow();
  const upcomingShows = allShows.filter((s) => {
    const era = getShowEra(s);
    return era === 'upcoming' || era === 'live';
  });
  const pastShows = allShows
    .filter((s) => getShowEra(s) === 'past')
    .slice(0, 3);

  return (
    <>
      <section className="hero">
        <Doodle name="nat20_dice" top="8px" right="2%" rotation={18} opacity={0.35} width="110px" />
        <Doodle name="diamonds" bottom="32px" left="1%" rotation={-12} opacity={0.3} width="80px" />
        <p className="hero-eyebrow">
          <span className="rec-badge" aria-hidden="true">REC</span>
          <span>Live tabletop comedy</span>
        </p>
        <h1 className="hero-title">
          The crowd writes the story.
          <br />
          We just roll <span className="scribble-underline">the dice.</span>
        </h1>

        <div className="hero-now-next">
          <p className="hero-now-next-line">
            <strong>Last show:</strong> {LATEST_RECAP.showName}.{' '}
            <a href={LATEST_RECAP.href} className="hero-inline-cta" target="_blank" rel="noopener noreferrer">
              Watch the recap →
            </a>
          </p>
          <p className="hero-now-next-line">
            <strong>Coming {NEXT_SHOW.dateLabel}:</strong> {NEXT_SHOW.showName}.{' '}
            {NEXT_SHOW.tagline && <>{NEXT_SHOW.tagline}{' '}</>}
            <Link to={NEXT_SHOW.href} className="hero-inline-cta">
              See what's coming →
            </Link>
          </p>
        </div>

        <p className="hero-lede">
          The Misadventuring Party runs interactive RPG performances where the
          audience names the villagers, builds the monster, and votes on every
          poor decision. You don't have to know the rules — you just have to
          show up and yell.
        </p>
        <div className="hero-cta-row">
          <Link to="/shows" className="btn-primary btn-lg">
            Browse shows
          </Link>
        </div>
      </section>

      <section className="studio-feature" aria-labelledby="studio-feature-title">
        <div className="studio-feature-card paper-card tape-strip tilt-l">
          <a
            className="studio-thumb"
            href={STUDIO_FEATURE.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Watch ${STUDIO_FEATURE.title} on YouTube`}
          >
            <img
              src={`https://i.ytimg.com/vi/${STUDIO_FEATURE.youtubeId}/maxresdefault.jpg`}
              alt={`${STUDIO_FEATURE.title} title card`}
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.dataset.fallback) {
                  img.dataset.fallback = '1';
                  img.src = `https://i.ytimg.com/vi/${STUDIO_FEATURE.youtubeId}/hqdefault.jpg`;
                }
              }}
            />
            <span className="studio-play" aria-hidden="true" />
          </a>
          <p className="studio-caption typewriter-label">
            Recorded at the MTP studio · {STUDIO_FEATURE.runtime}
          </p>
        </div>
        <div className="studio-feature-copy">
          <p className="studio-eyebrow typewriter-label">From the studio</p>
          <h2 id="studio-feature-title" className="studio-title">{STUDIO_FEATURE.title}</h2>
          <p className="studio-format">{STUDIO_FEATURE.format}</p>
          <p className="studio-blurb">{STUDIO_FEATURE.blurb}</p>
          <a
            href={STUDIO_FEATURE.href}
            className="hero-inline-cta"
            target="_blank"
            rel="noopener noreferrer"
          >
            Watch the full show →
          </a>
        </div>
      </section>

      <section className="how-it-works">
        <h2>How it works</h2>
        <ol className="steps">
          <li>
            <span className="step-num">1</span>
            <div>
              <h3>Show up.</h3>
              <p>No ticket, no code, no app. Lucky Straws, Winter Garden, FL. Walk in.</p>
            </div>
          </li>
          <li>
            <span className="step-num">2</span>
            <div>
              <h3>Scan the QR.</h3>
              <p>Your phone is the companion. Scan the QR at the door and join the show in thirty seconds.</p>
            </div>
          </li>
          <li>
            <span className="step-num">3</span>
            <div>
              <h3>Steer the chaos.</h3>
              <p>Build a character, vote on encounters, name the beasts. Your terrible ideas become canon in real time.</p>
            </div>
          </li>
        </ol>
      </section>

      {upcomingShows.length > 0 && (
        <section>
          <h2 className="section-title">Next show</h2>
          <div className="show-grid">
            {upcomingShows.map((s) => {
              const dateLabel = s.nextDate
                ? new Date(s.nextDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
                : null;
              return (
                <Link key={s.id} to={`/shows/${s.id}`} className="show-card" style={accentStyleFor(s)}>
                  <div className="show-card-head">
                    <span className="name">{s.name}</span>
                    {dateLabel && <span className="status">{dateLabel}</span>}
                  </div>
                  {s.description && <p className="desc">{s.description}</p>}
                  <span className="show-card-cta">Come play →</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="section-title">Past shows</h2>
        {pastShows.length === 0 ? (
          <p className="section-empty">New shows announced soon.</p>
        ) : (
          <div className="show-grid">
            {pastShows.map((s) => {
              const recap = recapHrefFor(s);
              const isExternal = s.recap?.kind === 'external';
              const href = recap ?? `/shows/${s.id}`;

              return isExternal && recap ? (
                <a
                  key={s.id}
                  href={recap}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="show-card"
                  style={accentStyleFor(s)}
                >
                  <div className="show-card-head">
                    <span className="name">{s.name}</span>
                    <span className="status">past</span>
                  </div>
                  {s.description && <p className="desc">{s.description}</p>}
                  <span className="show-card-cta">Watch the recap →</span>
                </a>
              ) : (
                <Link key={s.id} to={href} className="show-card" style={accentStyleFor(s)}>
                  <div className="show-card-head">
                    <span className="name">{s.name}</span>
                    <span className="status">past</span>
                  </div>
                  {s.description && <p className="desc">{s.description}</p>}
                  <span className="show-card-cta">Watch the recap →</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="follow-party">
        <h2 className="section-title">Follow the party</h2>
        <p className="follow-party-lede">
          The next show date drops here first — plus clips, recaps, and
          behind-the-screen chaos.
        </p>
        <div className="social-row">
          {SOCIAL_LINKS.map((s) => (
            <a
              key={s.name}
              href={s.href}
              className="social-sticker"
              target="_blank"
              rel="noopener noreferrer"
            >
              <SocialIcon icon={s.icon} />
              <span className="social-sticker-text">
                <span className="social-name">{s.name}</span>
                <span className="social-handle">{s.handle}</span>
              </span>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}

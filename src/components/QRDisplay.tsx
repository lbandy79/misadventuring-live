/**
 * QRDisplay — Full-screen QR code for projector/TV display.
 * Shows QR code linking to the create page, styled for the Betawave Tapes theme.
 * Route: /qr
 */

import { QRCodeSVG } from 'qrcode.react';
import { useSystemConfig } from '../hooks/useSystemConfig';

const CREATE_URL = 'https://play.themisadventuringparty.com/create';
const FALLBACK_URL = 'https://misadventuring-live.vercel.app/create';

export default function QRDisplay() {
  const { config } = useSystemConfig();
  const seriesName = config?.showConfig?.seriesName ?? 'THE BETAWAVE TAPES';
  const showName = config?.showConfig?.showName ?? '';

  // Use fallback URL if custom domain has issues
  const url = CREATE_URL;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a12',
      padding: '2rem',
      textAlign: 'center',
      fontFamily: "'VT323', 'Courier New', monospace",
    }}>
      {/* Series title */}
      <h1 style={{
        fontSize: 'clamp(1.8rem, 4vw, 3rem)',
        color: '#ff2d95',
        margin: '0 0 0.25rem',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        textShadow: '0 0 20px rgba(255, 45, 149, 0.5)',
      }}>
        {seriesName}
      </h1>

      {showName && (
        <p style={{
          fontSize: 'clamp(1rem, 2vw, 1.4rem)',
          color: 'rgba(255,255,255,0.6)',
          margin: '0 0 2rem',
          fontFamily: "'Share Tech Mono', monospace",
        }}>
          {showName}
        </p>
      )}

      {/* QR Code */}
      <div style={{
        background: '#ffffff',
        padding: 'clamp(16px, 3vw, 32px)',
        borderRadius: '16px',
        boxShadow: '0 0 40px rgba(255, 45, 149, 0.3), 0 0 80px rgba(0, 255, 213, 0.15)',
        marginBottom: '2rem',
      }}>
        <QRCodeSVG
          value={url}
          size={Math.min(400, typeof window !== 'undefined' ? window.innerWidth * 0.6 : 400)}
          level="M"
          includeMargin={false}
        />
      </div>

      {/* CTA */}
      <h2 style={{
        fontSize: 'clamp(1.4rem, 3vw, 2.2rem)',
        color: '#00ffd5',
        margin: '0 0 0.5rem',
        textShadow: '0 0 15px rgba(0, 255, 213, 0.5)',
        letterSpacing: '0.05em',
      }}>
        create your character
      </h2>

      <p style={{
        fontSize: 'clamp(0.9rem, 1.5vw, 1.1rem)',
        color: 'rgba(255,255,255,0.4)',
        margin: '0',
        fontFamily: "'Share Tech Mono', monospace",
        letterSpacing: '0.1em',
      }}>
        scan to join the show
      </p>

      {/* URL display for manual entry */}
      <p style={{
        fontSize: 'clamp(0.7rem, 1.2vw, 0.9rem)',
        color: 'rgba(255, 45, 149, 0.6)',
        margin: '1.5rem 0 0',
        fontFamily: "'Share Tech Mono', monospace",
        letterSpacing: '0.05em',
      }}>
        play.themisadventuringparty.com/create
      </p>
    </div>
  );
}

import React from "react";
import QRCode from "./QRCode";
import { useTheme } from "../themes/ThemeProvider";
import { TMPLogo } from "./icons/TMPLogo";
import "./IdleDisplay.css";

interface IdleDisplayProps {
  url?: string;
  themeKey?: string;
  logo?: React.ReactNode;
  mainText?: string;
  subText?: string;
}

interface ThemeTextConfig {
  main: string;
  sub: string;
  urlLabel?: string;
}

const themeText: Record<string, ThemeTextConfig> = {
  "soggy-bottom-pirates": {
    main: "JOIN THE CREW",
    sub: "Waiting for the next adventure...",
    urlLabel: "SCAN YER CODE",
  },
  "neon-nightmares": {
    main: "TUNE IN",
    sub: "Awaiting signal...",
    urlLabel: "SCAN TO CONNECT",
  },
  "tmp-base": {
    main: "SCAN TO JOIN",
    sub: "Waiting for the next adventure...",
    urlLabel: "JOIN THE PARTY",
  },
};

const IdleDisplay: React.FC<IdleDisplayProps> = ({
  url = "https://play.themisadventuringparty.com",
  themeKey,
  logo = <TMPLogo size={120} />,
  mainText,
  subText,
}) => {
  const themeCtx = useTheme();
  const key = themeKey || themeCtx?.themeId || "tmp-base";
  const text = themeText[key] || themeText["tmp-base"];

  return (
    <div className={`idle-display idle-${key}`}>
      {/* Theme decorative overlay */}
      <div className="idle-overlay" />
      
      {/* Logo section */}
      <div className="idle-logo">{logo}</div>
      
      {/* Main CTA text */}
      <div className="idle-main-text">{mainText || text.main}</div>
      
      {/* QR Code container with theme styling */}
      <div className="idle-qr-container">
        <div className="idle-qr">
          <QRCode value={url} size={220} />
        </div>
        {text.urlLabel && (
          <div className="idle-url-label">{text.urlLabel}</div>
        )}
      </div>
      
      {/* Subtext */}
      {(subText || text.sub) && (
        <div className="idle-sub-text">{subText || text.sub}</div>
      )}
      
      {/* URL display for clarity */}
      <div className="idle-url">play.themisadventuringparty.com</div>
    </div>
  );
};

export default IdleDisplay;

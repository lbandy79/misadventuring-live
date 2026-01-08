// QR code component using qrcode.react
import React from "react";
import { QRCodeSVG } from "qrcode.react";

interface QRCodeProps {
  value: string;
  size?: number;
  bgColor?: string;
  fgColor?: string;
}

const QRCode: React.FC<QRCodeProps> = ({ 
  value, 
  size = 192,
  bgColor = "#ffffff",
  fgColor = "#000000"
}) => (
  <QRCodeSVG 
    value={value} 
    size={size}
    bgColor={bgColor}
    fgColor={fgColor}
    level="M"
  />
);

export default QRCode;

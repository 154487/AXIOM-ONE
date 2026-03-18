interface AxiomLogoProps {
  size?: number;
}

export function AxiomLogoMark({ size = 40 }: AxiomLogoProps) {
  // cream/off-white stroke color matching the original
  const stroke = "#E2D9CC";
  const sw = size * 0.088; // stroke width proportional

  // Coordinates proportional to viewBox 40x40
  // N: left-bar | diagonal ↘ | center-bar
  // X: left-diagonal ↘ | right-diagonal ↙  (share center with N)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background */}
      <rect width="40" height="40" rx="7" fill="#0D1B2A" />

      {/* N — left vertical */}
      <line x1="7" y1="31" x2="7" y2="9" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />

      {/* N — diagonal ↘ */}
      <line x1="7" y1="9" x2="20" y2="31" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />

      {/* N/X — shared center vertical */}
      <line x1="20" y1="9" x2="20" y2="31" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />

      {/* X — diagonal ↘ (top-center → bottom-right) */}
      <line x1="20" y1="9" x2="33" y2="31" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />

      {/* X — diagonal ↙ (top-right → bottom-center) */}
      <line x1="33" y1="9" x2="20" y2="31" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
    </svg>
  );
}

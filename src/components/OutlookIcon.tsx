interface Props {
  size?: number;
  className?: string;
}

// The actual Outlook app icon look (blue rounded-square badge, envelope
// flap, white "O" ring), not a line-art mail icon - always its own brand
// color regardless of surrounding button state.
export function OutlookIcon({ size = 14, className }: Props) {
  return (
    <svg viewBox="0 0 36 36" width={size} height={size} className={className}>
      <rect width="36" height="36" rx="8" fill="#0A2767" />
      <path d="M20 18v13.5a1 1 0 0 0 1 1h9.5a1 1 0 0 0 1-1V18Z" fill="#0364B8" />
      <path d="M20 6.5v11.5h11.5V7.5a1 1 0 0 0-1-1Z" fill="#28A8EA" />
      <path d="M20 18h11.5L20 26.5Z" fill="#0078D4" />
      <rect x="3" y="10.5" width="17" height="15" rx="1.6" fill="#0A2767" />
      <circle cx="11.5" cy="18" r="5.2" fill="none" stroke="#fff" strokeWidth="2.4" />
    </svg>
  );
}

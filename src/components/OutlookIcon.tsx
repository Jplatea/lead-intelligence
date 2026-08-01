interface Props {
  size?: number;
  className?: string;
}

// A monochrome (currentColor) take on the Outlook mark - the "O" ring
// overlapping an envelope, simplified to a single-color silhouette so it
// behaves exactly like WhatsAppIcon (turns white on the active tab, keeps
// its own tint otherwise) instead of Outlook's real two-tone blue/white logo.
export function OutlookIcon({ size = 14, className }: Props) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none">
      <path
        d="M13 3.5h7a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1h-7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20.7 6.2 13.5 11a1 1 0 0 1-1 0L5.3 6.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="2" y="7" width="9.5" height="11" rx="1.6" fill="currentColor" opacity="0.15" />
      <circle cx="6.75" cy="12.5" r="3.35" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

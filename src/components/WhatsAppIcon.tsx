interface Props {
  size?: number;
  className?: string;
}

// The actual WhatsApp app icon look (green rounded-square badge + white
// phone-in-bubble glyph), not a monochrome line icon - always its own
// brand color regardless of surrounding button state.
export function WhatsAppIcon({ size = 14, className }: Props) {
  return (
    <svg viewBox="0 0 36 36" width={size} height={size} className={className}>
      <rect width="36" height="36" rx="8" fill="#25D366" />
      <path
        fill="#fff"
        d="M18.02 8c-5.54 0-10.02 4.48-10.02 10 0 1.77.47 3.44 1.28 4.88L8 28l5.27-1.24A9.96 9.96 0 0 0 18.02 28c5.53 0 10.02-4.48 10.02-10S23.55 8 18.02 8Zm5.87 14.2c-.25.7-1.43 1.34-1.98 1.4-.5.06-1.02.13-3.4-.71-2.87-1.02-4.7-3.9-4.85-4.08-.14-.18-1.15-1.53-1.15-2.92 0-1.4.73-2.08 1-2.36.24-.26.53-.32.71-.32h.5c.16 0 .38-.03.58.44.25.6.83 2.06.9 2.2.07.15.12.32.02.51-.1.19-.15.31-.3.47-.15.17-.31.38-.44.51-.15.15-.3.31-.13.6.17.29.75 1.24 1.62 2 1.11.99 2.05 1.3 2.34 1.44.29.15.46.13.63-.05.17-.18.72-.83.92-1.12.19-.28.38-.24.63-.14.26.09 1.63.77 1.9.91.29.15.48.22.55.34.07.13.07.72-.18 1.42Z"
      />
    </svg>
  );
}

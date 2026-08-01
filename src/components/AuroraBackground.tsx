interface Props {
  colors: string[];
}

const ANIMATIONS = [
  "cloud-drift-a 22s ease-in-out infinite",
  "cloud-drift-b 27s ease-in-out infinite reverse",
  "cloud-drift-c 19s ease-in-out infinite",
];

const POSITIONS: React.CSSProperties[] = [
  { top: "-15%", left: "-15%" },
  { top: "-10%", right: "-15%" },
  { bottom: "-20%", left: "20%" },
];

// "Mi fondo" - the user's own name for this soft blurred-blob aurora
// background (first built for the clients/mailing matches card, mint/
// purple). Reused wherever a card needs it, with whatever colors that
// specific card calls for. The parent must be `relative overflow-hidden`
// - this renders as an absolutely positioned layer behind the card's real
// content.
export function AuroraBackground({ colors }: Props) {
  return (
    <div className="absolute inset-0 bg-[#f9f3ec] overflow-hidden pointer-events-none">
      {colors.slice(0, 3).map((color, i) => (
        <div
          key={i}
          className="login-cloud"
          style={{
            background: color,
            width: 380,
            height: 380,
            opacity: 0.28,
            mixBlendMode: "multiply",
            animation: ANIMATIONS[i % ANIMATIONS.length],
            ...POSITIONS[i % POSITIONS.length],
          }}
        />
      ))}
    </div>
  );
}

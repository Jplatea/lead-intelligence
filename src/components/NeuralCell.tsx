import { useEffect, useMemo, useRef, useState } from "react";

interface Props {
  size?: number;
  opacity?: number;
  animated?: boolean;
  className?: string;
}

// Gradient sweep matching the reference mark: teal -> blue -> violet -> pink -> orange.
const COLORS = ["#2dd4bf", "#38bdf8", "#818cf8", "#c084fc", "#f472b6", "#fb923c"];
const LINE_COUNT = 7;
const POINT_COUNT = 7;

interface LineState {
  phase: number;
  freq: number;
  amp: number;
  targetPhase: number;
  targetFreq: number;
  targetAmp: number;
}

function randRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function makeLine(): LineState {
  return {
    phase: randRange(0, Math.PI * 2),
    freq: randRange(1.1, 2.2),
    amp: randRange(16, 34),
    targetPhase: randRange(0, Math.PI * 2),
    targetFreq: randRange(1.1, 2.2),
    targetAmp: randRange(16, 34),
  };
}

function buildPath(line: LineState, lineIndex: number): string {
  const pts = Array.from({ length: POINT_COUNT }, (_, p) => {
    const t = p / (POINT_COUNT - 1);
    const x = t * 180 + 10;
    const taper = 1 - Math.abs(t - 0.5) * 0.5;
    const y = 100 + Math.sin(p * line.freq + line.phase + lineIndex * 0.5) * line.amp * taper;
    return { x, y };
  });

  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let p = 0; p < pts.length - 1; p++) {
    const cur = pts[p];
    const next = pts[p + 1];
    const midX = (cur.x + next.x) / 2;
    const midY = (cur.y + next.y) / 2;
    d += ` Q ${cur.x.toFixed(1)} ${cur.y.toFixed(1)} ${midX.toFixed(1)} ${midY.toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  d += ` T ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
  return d;
}

// Brand mark: a small cluster of flowing, color-swept ribbon lines that
// drift and reshape organically (random-walk targets, eased toward each
// frame) rather than looping a fixed animation — "que se mueva de forma
// random cambiando de forma".
export function NeuralCell({ size = 32, opacity = 1, animated = false, className }: Props) {
  const uid = useMemo(() => Math.random().toString(36).slice(2), []);
  const linesRef = useRef<LineState[]>(Array.from({ length: LINE_COUNT }, makeLine));
  const [, forceRender] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastRetarget = useRef(0);

  useEffect(() => {
    if (!animated) return;
    const step = (now: number) => {
      if (now - lastRetarget.current > 2200) {
        lastRetarget.current = now;
        linesRef.current.forEach((l) => {
          l.targetPhase = randRange(0, Math.PI * 2);
          l.targetFreq = randRange(1.0, 2.4);
          l.targetAmp = randRange(14, 36);
        });
      }
      linesRef.current.forEach((l) => {
        l.phase += (l.targetPhase - l.phase) * 0.012 + 0.012;
        l.freq += (l.targetFreq - l.freq) * 0.01;
        l.amp += (l.targetAmp - l.amp) * 0.01;
      });
      forceRender((v) => (v + 1) % 1_000_000);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [animated]);

  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className={className} style={{ opacity, overflow: "visible" }}>
      <defs>
        <filter id={`wave-glow-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.3" />
        </filter>
      </defs>
      <g filter={`url(#wave-glow-${uid})`}>
        {linesRef.current.map((line, i) => (
          <path
            key={i}
            d={buildPath(line, i)}
            fill="none"
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={1.6}
            strokeLinecap="round"
            opacity={0.88}
          />
        ))}
      </g>
    </svg>
  );
}

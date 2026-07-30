import { useMemo } from "react";

interface Props {
  size?: number;
  opacity?: number;
  animated?: boolean;
  className?: string;
}

interface Point {
  x: number;
  y: number;
}

function ring(count: number, radius: number, cx: number, cy: number, phase = 0): Point[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = phase + (i / count) * Math.PI * 2;
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius * 0.85 };
  });
}

// The "célula" motif: a small sphere-like web of connected, glowing nodes
// (matching the reference imagery) reused as both the brand mark and a
// large low-opacity page watermark.
export function NeuralCell({ size = 32, opacity = 1, animated = false, className }: Props) {
  const { nodes, edges } = useMemo(() => {
    const cx = 100;
    const cy = 100;
    const center: Point = { x: cx, y: cy };
    const inner = ring(6, 42, cx, cy, 0.3);
    const outer = ring(10, 82, cx, cy, 0.1);
    const allNodes = [center, ...inner, ...outer];

    const allEdges: [number, number][] = [];
    inner.forEach((_, i) => allEdges.push([0, i + 1]));
    inner.forEach((_, i) => allEdges.push([i + 1, 1 + ((i + 1) % inner.length)]));
    outer.forEach((_, i) => {
      const nearestInner = 1 + (i % inner.length);
      allEdges.push([1 + inner.length + i, nearestInner]);
    });
    outer.forEach((_, i) =>
      allEdges.push([1 + inner.length + i, 1 + inner.length + ((i + 1) % outer.length)])
    );

    return { nodes: allNodes, edges: allEdges };
  }, []);

  const uid = useMemo(() => Math.random().toString(36).slice(2), []);

  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className={className} style={{ opacity, overflow: "visible" }}>
      <defs>
        <filter id={`cell-glow-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#cell-glow-${uid})`}>
        <g stroke="#2dd4bf" strokeWidth={1.1} opacity={0.7}>
          {edges.map(([a, b], i) => (
            <line
              key={i}
              x1={nodes[a].x}
              y1={nodes[a].y}
              x2={nodes[b].x}
              y2={nodes[b].y}
              className={animated ? "line-flow" : undefined}
            />
          ))}
        </g>
        <g>
          {nodes.map((n, i) => (
            <circle
              key={i}
              cx={n.x}
              cy={n.y}
              r={i === 0 ? 6 : 3.6}
              fill={i % 3 === 0 ? "#c4b5fd" : "#5eead4"}
              className={animated ? "packet-glow" : undefined}
              style={animated ? { animationDelay: `${(i % 5) * 0.2}s` } : undefined}
            />
          ))}
        </g>
      </g>
    </svg>
  );
}

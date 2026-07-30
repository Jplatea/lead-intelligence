import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import type { MapMouseEvent } from "@vis.gl/react-google-maps";
import { Minus, Plus, RotateCcw, X } from "lucide-react";
import type { Company } from "../types";
import { REPS, STATUS_CONFIG, ALARM_CONFIG } from "../data/config";
import { buildConnectors } from "../data/connectors";
import { MAP_STYLE, IBERIA_CENTER, IBERIA_DEFAULT_ZOOM, IBERIA_BOUNDS } from "../lib/mapStyle";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

interface Props {
  companies: Company[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPlaceNew: (lat: number, lng: number) => void;
  highlight: { ids: Set<string>; color: string } | null;
  reviewIds?: Set<string>;
}

interface HoverState {
  company: Company;
  x: number;
  y: number;
}

interface LinkGeometry {
  nodeX: number;
  nodeY: number;
  items: { key: string; x: number; y: number }[];
}

type Positions = Record<string, { x: number; y: number }>;

interface Cluster {
  key: string;
  x: number;
  y: number;
  lat: number;
  lng: number;
  members: Company[];
}

// Simple greedy screen-space clustering (mirrors what Google's own
// MarkerClusterer does): any points within CLUSTER_RADIUS_PX of each other at
// the current zoom collapse into one bubble showing the count; zooming in
// spreads their pixel positions apart until they naturally fall back out.
const CLUSTER_RADIUS_PX = 32;
// Past this zoom, stop collapsing points into count-bubbles altogether —
// otherwise clients that are only a few dozen meters apart (e.g. neighboring
// units in the same building) could stay merged forever, since screen-pixel
// distance at a fixed max zoom never actually reaches 0 for them but can
// still be under CLUSTER_RADIUS_PX indefinitely.
const STOP_CLUSTERING_ZOOM = 19;
// If, even past that zoom, two or more points still land on (almost) the
// exact same pixel — true near-duplicate coordinates — fan them out in a
// small ring so every one of them stays individually visible and clickable.
const FAN_OUT_RADIUS_PX = 15;

function clusterCompanies(companies: Company[], positions: Positions, zoom: number): Cluster[] {
  const withPos = companies.filter((c) => positions[c.id]);

  if (zoom >= STOP_CLUSTERING_ZOOM) {
    return fanOutCoincident(withPos, positions);
  }

  const used = new Set<string>();
  const clusters: Cluster[] = [];

  for (const c of withPos) {
    if (used.has(c.id)) continue;
    const base = positions[c.id];
    const group = [c];
    used.add(c.id);

    for (const other of withPos) {
      if (used.has(other.id)) continue;
      const p = positions[other.id];
      const dx = p.x - base.x;
      const dy = p.y - base.y;
      if (Math.sqrt(dx * dx + dy * dy) <= CLUSTER_RADIUS_PX) {
        group.push(other);
        used.add(other.id);
      }
    }

    const n = group.length;
    clusters.push({
      key: group
        .map((g) => g.id)
        .sort()
        .join("|"),
      x: group.reduce((s, g) => s + positions[g.id].x, 0) / n,
      y: group.reduce((s, g) => s + positions[g.id].y, 0) / n,
      lat: group.reduce((s, g) => s + g.lat, 0) / n,
      lng: group.reduce((s, g) => s + g.lng, 0) / n,
      members: group,
    });
  }

  return clusters;
}

function fanOutCoincident(companies: Company[], positions: Positions): Cluster[] {
  const buckets: Record<string, Company[]> = {};
  for (const c of companies) {
    const p = positions[c.id];
    const key = `${Math.round(p.x / 6)}:${Math.round(p.y / 6)}`;
    (buckets[key] ??= []).push(c);
  }

  const clusters: Cluster[] = [];
  for (const group of Object.values(buckets)) {
    const base = positions[group[0].id];
    group.forEach((c, i) => {
      const x = group.length === 1 ? base.x : base.x + Math.cos((i / group.length) * Math.PI * 2) * FAN_OUT_RADIUS_PX;
      const y = group.length === 1 ? base.y : base.y + Math.sin((i / group.length) * Math.PI * 2) * FAN_OUT_RADIUS_PX;
      clusters.push({ key: c.id, x, y, lat: c.lat, lng: c.lng, members: [c] });
    });
  }
  return clusters;
}

function clusterRadius(count: number) {
  if (count >= 25) return 20;
  if (count >= 10) return 17;
  return 14;
}

// Invisible OverlayView whose only job is exposing the map's live pixel
// projection so our own HTML/SVG nodes can be positioned over the map and
// stay in sync through pans, zooms, and resizes.
function PositionSync({
  points,
  onPositions,
  onMapReady,
}: {
  points: { id: string; lat: number; lng: number }[];
  onPositions: (p: Positions) => void;
  onMapReady: (map: google.maps.Map) => void;
}) {
  const map = useMap();
  const overlayRef = useRef<google.maps.OverlayView | null>(null);
  const pointsRef = useRef(points);
  pointsRef.current = points;

  const compute = useCallback(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const projection = overlay.getProjection();
    if (!projection) return;
    const next: Positions = {};
    for (const p of pointsRef.current) {
      const px = projection.fromLatLngToContainerPixel(new google.maps.LatLng(p.lat, p.lng));
      if (px) next[p.id] = { x: px.x, y: px.y };
    }
    onPositions(next);
  }, [onPositions]);

  useEffect(() => {
    if (!map) return;
    onMapReady(map);
    const overlay = new google.maps.OverlayView();
    overlay.onAdd = () => {};
    overlay.onRemove = () => {};
    overlay.draw = () => compute();
    overlay.setMap(map);
    overlayRef.current = overlay;
    return () => {
      overlay.setMap(null);
      overlayRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useEffect(() => {
    compute();
  }, [points, compute]);

  return null;
}

function pathBetween(a: { x: number; y: number }, b: { x: number; y: number }) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2 - 16;
  return `M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}`;
}

export function IberiaMap({ companies, selectedId, onSelect, onPlaceNew, highlight, reviewIds }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const connectorRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [hover, setHover] = useState<HoverState | null>(null);
  const [placing, setPlacing] = useState(false);
  const [connectorItems, setConnectorItems] = useState<{ key: string; x: number; y: number }[]>([]);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [positions, setPositions] = useState<Positions>({});
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [mapZoom, setMapZoom] = useState(IBERIA_DEFAULT_ZOOM);

  // Markers should grow as the map is zoomed in, same as everything else on
  // the map, instead of staying a fixed screen size.
  const zoomScale = Math.min(3.2, Math.max(0.7, 1 + (mapZoom - IBERIA_DEFAULT_ZOOM) * 0.18));

  useEffect(() => {
    if (!mapInstance) return;
    setMapZoom(mapInstance.getZoom() ?? IBERIA_DEFAULT_ZOOM);
    const listener = mapInstance.addListener("zoom_changed", () => {
      setMapZoom(mapInstance.getZoom() ?? IBERIA_DEFAULT_ZOOM);
    });
    return () => listener.remove();
  }, [mapInstance]);

  // Smoothly animates the camera to a target center+zoom instead of jumping
  // instantly (moveCamera itself has no built-in transition). Eases out
  // (fast start, slow finish) via requestAnimationFrame, calling moveCamera
  // every frame so center+zoom always move together atomically — preserving
  // the earlier fix where setting them sequentially could trip the map's
  // `restriction` bounds at wide zoom levels.
  const cameraAnimationRef = useRef<number | null>(null);
  // Tracks where an in-flight animation is ultimately headed (not the map's
  // current, still-mid-transition zoom/center). Rapid repeated clicks — e.g.
  // mashing the zoom button — read from these instead of the live map state,
  // so each click stacks an extra +1 from the *intended* destination rather
  // than from a barely-progressed interrupted animation, which otherwise
  // made zoom nearly stall under quick repeated clicks.
  const targetZoomRef = useRef<number | null>(null);
  const targetCenterRef = useRef<{ lat: number; lng: number } | null>(null);

  const animateCamera = useCallback(
    (targetCenter: { lat: number; lng: number }, targetZoom: number, duration = 550) => {
      const map = mapInstance;
      if (!map) return;
      if (cameraAnimationRef.current !== null) cancelAnimationFrame(cameraAnimationRef.current);

      const startCenter = map.getCenter();
      const startLat = startCenter?.lat() ?? targetCenter.lat;
      const startLng = startCenter?.lng() ?? targetCenter.lng;
      const startZoom = map.getZoom() ?? targetZoom;
      const startTime = performance.now();

      targetZoomRef.current = targetZoom;
      targetCenterRef.current = targetCenter;

      const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

      const step = (now: number) => {
        const t = Math.min(1, (now - startTime) / duration);
        const eased = easeOutCubic(t);
        map.moveCamera({
          center: {
            lat: startLat + (targetCenter.lat - startLat) * eased,
            lng: startLng + (targetCenter.lng - startLng) * eased,
          },
          zoom: startZoom + (targetZoom - startZoom) * eased,
        });
        if (t < 1) {
          cameraAnimationRef.current = requestAnimationFrame(step);
        } else {
          cameraAnimationRef.current = null;
          targetZoomRef.current = null;
          targetCenterRef.current = null;
        }
      };
      cameraAnimationRef.current = requestAnimationFrame(step);
    },
    [mapInstance]
  );

  const selectedCompany = companies.find((c) => c.id === selectedId) ?? null;
  const connectors = useMemo(
    () => (selectedCompany ? buildConnectors(selectedCompany) : []),
    [selectedCompany]
  );

  const points = useMemo(
    () => companies.map((c) => ({ id: c.id, lat: c.lat, lng: c.lng })),
    [companies]
  );

  const clusters = useMemo(
    () => clusterCompanies(companies, positions, mapZoom),
    [companies, positions, mapZoom]
  );
  // Maps every company id to its cluster — including single-member ones, so
  // a company that's only visually fanned-out (not grouped into a count
  // bubble) still resolves to its actual on-screen position below.
  const clusterOf = useMemo(() => {
    const map: Record<string, Cluster> = {};
    for (const cl of clusters) for (const m of cl.members) map[m.id] = cl;
    return map;
  }, [clusters]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const update = () => setContainerSize({ w: container.clientWidth, h: container.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // The connector cards are CSS-positioned (not tied to the map), so their
  // on-screen spots only need remeasuring when the card list itself changes.
  useLayoutEffect(() => {
    if (!selectedCompany || !containerRef.current) {
      setConnectorItems([]);
      return;
    }
    const containerRect = containerRef.current.getBoundingClientRect();
    const items = connectors
      .map((item) => {
        const el = connectorRefs.current[item.key];
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { key: item.key, x: r.right - containerRect.left, y: r.top + r.height / 2 - containerRect.top };
      })
      .filter((v): v is { key: string; x: number; y: number } => v !== null);
    setConnectorItems(items);
  }, [selectedCompany, connectors]);

  // The node side, in contrast, must track every pan/zoom tick. Deriving it
  // straight from `positions`/`clusterOf` (rather than re-measuring the DOM
  // node's getBoundingClientRect on a delay) keeps it exactly in sync with
  // what's rendered, with no risk of a stale-frame lag during zoom.
  const nodeAnchor = useMemo(() => {
    if (!selectedCompany) return null;
    const cluster = clusterOf[selectedCompany.id];
    if (cluster) return { x: cluster.x, y: cluster.y };
    return positions[selectedCompany.id] ?? null;
  }, [selectedCompany, positions, clusterOf]);

  const linkGeometry: LinkGeometry | null =
    nodeAnchor && connectorItems.length > 0
      ? { nodeX: nodeAnchor.x, nodeY: nodeAnchor.y, items: connectorItems }
      : null;

  const handleMapClick = (e: MapMouseEvent) => {
    if (!placing || !e.detail.latLng) return;
    setPlacing(false);
    onPlaceNew(e.detail.latLng.lat, e.detail.latLng.lng);
  };

  // Read the in-flight animation's destination when one is running, so
  // repeated clicks stack correctly instead of each restarting from a
  // barely-progressed interrupted animation (see animateCamera above).
  const currentZoomTarget = () => targetZoomRef.current ?? mapInstance?.getZoom() ?? IBERIA_DEFAULT_ZOOM;
  const currentCenter = () => {
    if (targetCenterRef.current) return targetCenterRef.current;
    const c = mapInstance?.getCenter();
    return c ? { lat: c.lat(), lng: c.lng() } : IBERIA_CENTER;
  };

  const expandCluster = (cluster: Cluster) => {
    if (!mapInstance) return;
    const targetZoom = Math.min(currentZoomTarget() + 3, 20);
    animateCamera({ lat: cluster.lat, lng: cluster.lng }, targetZoom, 650);
  };

  const zoomIn = () => {
    if (!mapInstance) return;
    animateCamera(currentCenter(), Math.min(currentZoomTarget() + 1, 20), 400);
  };
  const zoomOut = () => {
    if (!mapInstance) return;
    animateCamera(currentCenter(), Math.max(currentZoomTarget() - 1, 5), 400);
  };
  const resetView = () => animateCamera(IBERIA_CENTER, IBERIA_DEFAULT_ZOOM, 650);

  const byId = Object.fromEntries(companies.map((c) => [c.id, c]));
  const connections: { id: string; from: Company; to: Company }[] = [];
  for (const c of companies) {
    for (const targetId of c.connectedTo ?? []) {
      const target = byId[targetId];
      if (target) connections.push({ id: `${c.id}-${targetId}`, from: c, to: target });
    }
  }

  const handleEnter = (e: ReactMouseEvent<SVGGElement>, company: Company) => {
    const containerRect = containerRef.current?.getBoundingClientRect();
    const rect = e.currentTarget.getBoundingClientRect();
    if (!containerRect) return;
    setHover({
      company,
      x: rect.left + rect.width / 2 - containerRect.left,
      y: rect.top + rect.height / 2 - containerRect.top,
    });
  };

  if (!API_KEY) {
    return (
      <div className="relative w-full h-full min-h-[420px] rounded-3xl glass overflow-hidden flex items-center justify-center">
        <p className="text-sm text-neutral-500 max-w-xs text-center">
          Falta la clave de Google Maps. Añade <code>VITE_GOOGLE_MAPS_API_KEY</code> en el archivo{" "}
          <code>.env</code> del proyecto.
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[420px] rounded-3xl glass overflow-hidden">
      <div className="absolute top-4 left-5 z-10 text-xs text-neutral-500">Península Ibérica</div>
      <div className="absolute top-4 right-5 z-10">
        <button
          onClick={() => setPlacing((v) => !v)}
          title="Añadir cliente manualmente"
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-[0_6px_16px_rgba(33,31,29,0.3)] hover:shadow-[0_8px_20px_rgba(33,31,29,0.4)] hover:scale-105 ${
            placing ? "bg-neutral-900 text-white" : "bg-surface text-neutral-700"
          }`}
        >
          {placing ? <X size={15} /> : <Plus size={15} />}
        </button>
      </div>

      {placing && (
        <div className="absolute top-12 right-5 z-10 glass rounded-xl px-3 py-1.5 text-[11px] text-neutral-600 animate-fade-in-up">
          Haz clic en el mapa para situar el nuevo cliente
        </div>
      )}

      <APIProvider apiKey={API_KEY}>
        <Map
          className="w-full h-full"
          style={{ cursor: placing ? "crosshair" : undefined }}
          defaultCenter={IBERIA_CENTER}
          defaultZoom={IBERIA_DEFAULT_ZOOM}
          minZoom={5}
          maxZoom={20}
          restriction={{ latLngBounds: IBERIA_BOUNDS, strictBounds: false }}
          styles={MAP_STYLE}
          disableDefaultUI
          clickableIcons={false}
          gestureHandling="greedy"
          onClick={handleMapClick}
        >
          <PositionSync points={points} onPositions={setPositions} onMapReady={setMapInstance} />
        </Map>
      </APIProvider>

      {containerSize.w > 0 && (
        <svg
          className="absolute inset-0 z-10 pointer-events-none"
          width="100%"
          height="100%"
          viewBox={`0 0 ${containerSize.w} ${containerSize.h}`}
        >
          <defs>
            <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.8" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="connGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a8dfcf" />
              <stop offset="100%" stopColor="#9dc0e8" />
            </linearGradient>
          </defs>

          {connections.map(({ id, from, to }) => {
            const a = positions[from.id];
            const b = positions[to.id];
            if (!a || !b) return null;
            return (
              <path
                key={id}
                d={pathBetween(a, b)}
                fill="none"
                stroke="url(#connGrad)"
                strokeWidth="1"
                className="line-flow"
                opacity="0.55"
              />
            );
          })}

          {clusters.map((cluster) => {
            if (cluster.members.length === 1) {
              const c = cluster.members[0];
              const pos = { x: cluster.x, y: cluster.y };
              const isSelected = c.id === selectedId;
              const isHovered = hover?.company.id === c.id;
              const isHighlighted = highlight?.ids.has(c.id) ?? false;
              const needsReviewArrow = reviewIds?.has(c.id) ?? false;
              const color = REPS[c.assignedRep].color;

              return (
                <g
                  key={c.id}
                  style={{ pointerEvents: "auto", cursor: "pointer" }}
                  onClick={() => onSelect(c.id)}
                  onMouseEnter={(e) => handleEnter(e, c)}
                  onMouseLeave={() => setHover((h) => (h?.company.id === c.id ? null : h))}
                >
                  <g transform={`translate(${pos.x}, ${pos.y})`}>
                    <circle r={13 * zoomScale} fill="transparent" />
                    {isHighlighted && (
                      <circle
                        r={15 * zoomScale}
                        fill="none"
                        stroke={highlight!.color}
                        strokeWidth={2 * zoomScale}
                        className="highlight-ring-blink"
                      />
                    )}
                    {needsReviewArrow && (
                      <g transform={`translate(0, ${-20 * zoomScale})`}>
                        <path
                          d={`M0,${-2 * zoomScale} L${6 * zoomScale},${-11 * zoomScale} L${-6 * zoomScale},${-11 * zoomScale} Z`}
                          fill="#b9503a"
                          className="review-arrow"
                        />
                      </g>
                    )}
                    <g
                      style={{
                        transform: isHovered ? "scale(1.7)" : "scale(1)",
                        transformBox: "fill-box",
                        transformOrigin: "center",
                        transition: "transform 180ms ease-out",
                      }}
                    >
                      {isSelected && !isHovered && (
                        <circle r={10 * zoomScale} fill="none" stroke={color} strokeWidth={1.5 * zoomScale} className="soft-pulse" />
                      )}
                      {isHovered && (
                        <>
                          <circle r={8.5 * zoomScale} fill="none" stroke={color} strokeWidth={1.75 * zoomScale} className="radar-ping" />
                          <circle
                            r={8.5 * zoomScale}
                            fill="none"
                            stroke={color}
                            strokeWidth={1.75 * zoomScale}
                            className="radar-ping"
                            style={{ animationDelay: "0.37s" }}
                          />
                          <circle
                            r={8.5 * zoomScale}
                            fill="none"
                            stroke={color}
                            strokeWidth={1.75 * zoomScale}
                            className="radar-ping"
                            style={{ animationDelay: "0.74s" }}
                          />
                          <g className="radar-sweep">
                            <line x1="0" y1="0" x2="0" y2={-11.5 * zoomScale} stroke={color} strokeWidth={1.25 * zoomScale} opacity="0.85" strokeLinecap="round" />
                          </g>
                        </>
                      )}
                      <circle r={13 * zoomScale} fill="url(#nodeGlow)" style={{ color, opacity: isHovered ? 0.9 : 0 }} />
                      <circle
                        r={(isSelected ? 7 : 5.5) * zoomScale}
                        fill={color}
                        stroke={isSelected || isHovered ? "#211f1d" : "rgba(33,31,29,0.35)"}
                        strokeWidth={(isSelected || isHovered ? 1.5 : 1) * zoomScale}
                      />
                    </g>
                  </g>
                </g>
              );
            }

            const count = cluster.members.length;
            const r = clusterRadius(count) * zoomScale;
            const isSelectedCluster = cluster.members.some((m) => m.id === selectedId);
            const highlightedInCluster = highlight ? cluster.members.some((m) => highlight.ids.has(m.id)) : false;
            const clusterNeedsReviewArrow = reviewIds ? cluster.members.some((m) => reviewIds.has(m.id)) : false;

            // One ring segment per distinct comercial among the cluster's
            // clients — solid if just one, split evenly in half/thirds if two
            // or three, in canonical José/Fran/Víctor order.
            const ringColors = Object.values(REPS)
              .filter((rep) => cluster.members.some((m) => m.assignedRep === rep.id))
              .map((rep) => rep.color);
            const ringGap = 3.5 * zoomScale;
            const ringStroke = 3 * zoomScale;
            const ringRadius = r + ringGap;
            const ringCircumference = 2 * Math.PI * ringRadius;
            const segLen = ringCircumference / ringColors.length;
            const outerRadius = ringRadius + ringStroke / 2 + 2 * zoomScale;

            return (
              <g
                key={cluster.key}
                style={{ pointerEvents: "auto", cursor: "pointer" }}
                onClick={() => expandCluster(cluster)}
              >
                <title>{`${count} clientes — haz clic para ampliar`}</title>
                <g transform={`translate(${cluster.x}, ${cluster.y})`}>
                  {isSelectedCluster && (
                    <circle r={outerRadius + 2.5 * zoomScale} fill="none" stroke="#211f1d" strokeWidth="1.5" className="soft-pulse" />
                  )}
                  {highlightedInCluster && (
                    <circle r={outerRadius + 4.5 * zoomScale} fill="none" stroke={highlight!.color} strokeWidth="2.5" className="highlight-ring-blink" />
                  )}
                  {clusterNeedsReviewArrow && (
                    <g transform={`translate(0, ${-(outerRadius + 12 * zoomScale)})`}>
                      <path
                        d={`M0,${-2 * zoomScale} L${6 * zoomScale},${-11 * zoomScale} L${-6 * zoomScale},${-11 * zoomScale} Z`}
                        fill="#b9503a"
                        className="review-arrow"
                      />
                    </g>
                  )}
                  {ringColors.map((color, i) => (
                    <circle
                      key={i}
                      r={ringRadius}
                      fill="none"
                      stroke={color}
                      strokeWidth={ringStroke}
                      strokeDasharray={`${segLen} ${ringCircumference - segLen}`}
                      transform={`rotate(${i * (360 / ringColors.length) - 90})`}
                    />
                  ))}
                  <circle
                    r={r}
                    fill="#211f1d"
                    style={{ filter: "drop-shadow(0 2px 4px rgba(33,31,29,0.35))" }}
                    stroke="#f9f3ec"
                    strokeWidth="2"
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#f9f3ec"
                    style={{ fontSize: r * 0.62, fontWeight: 700, fontFamily: "inherit" }}
                  >
                    {count}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      )}

      <div className="absolute bottom-4 right-5 z-10 flex flex-col gap-1">
        <button
          onClick={zoomIn}
          title="Acercar"
          className="w-6 h-6 rounded-full bg-black/8 text-neutral-600 hover:bg-black/15 flex items-center justify-center"
        >
          <Plus size={13} />
        </button>
        <button
          onClick={zoomOut}
          title="Alejar"
          className="w-6 h-6 rounded-full bg-black/8 text-neutral-600 hover:bg-black/15 flex items-center justify-center"
        >
          <Minus size={13} />
        </button>
        <button
          onClick={resetView}
          title="Restablecer vista"
          className="w-6 h-6 rounded-full bg-black/8 text-neutral-600 hover:bg-black/15 flex items-center justify-center"
        >
          <RotateCcw size={11} />
        </button>
      </div>

      {linkGeometry && (
        <svg
          className="absolute inset-0 z-10 pointer-events-none"
          width="100%"
          height="100%"
          viewBox={`0 0 ${containerSize.w} ${containerSize.h}`}
        >
          <defs>
            <filter id="connectorGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="3" />
            </filter>
          </defs>
          {linkGeometry.items.map((p) => {
            const item = connectors.find((c) => c.key === p.key);
            const color = item?.color ?? "#2a9678";
            const dx = (linkGeometry.nodeX - p.x) * 0.5;
            const d = `M${p.x},${p.y} C ${p.x + dx},${p.y} ${linkGeometry.nodeX - dx},${linkGeometry.nodeY} ${linkGeometry.nodeX},${linkGeometry.nodeY}`;
            return (
              <g key={p.key}>
                <path d={d} stroke={color} strokeWidth="4" fill="none" opacity="0.35" filter="url(#connectorGlow)" />
                <path d={d} stroke={color} strokeWidth="1.25" fill="none" className="line-flow" opacity="0.75" />
                <circle r="3" fill={color} className="packet-glow">
                  <animateMotion dur="2.6s" repeatCount="indefinite" path={d} />
                </circle>
              </g>
            );
          })}
        </svg>
      )}

      {selectedCompany && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-52 max-h-[88%] overflow-y-auto space-y-1.5">
          <p className="text-[10px] uppercase tracking-wide text-neutral-400 mb-1 px-1 truncate">
            {selectedCompany.name}
          </p>
          {connectors.map((item) => (
            <div
              key={item.key}
              ref={(el) => {
                connectorRefs.current[item.key] = el;
              }}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-2xl bg-surface border border-black/8 shadow-[0_6px_16px_rgba(33,31,29,0.1)]"
            >
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-black/70"
                style={{ background: item.color }}
              >
                {item.icon}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-neutral-800 truncate">{item.label}</p>
                <p className="text-[10px] text-neutral-500 truncate">{item.preview}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {hover && (
        <div
          className="absolute z-30 pointer-events-none animate-fade-in-up"
          style={{ left: hover.x, top: hover.y, transform: "translate(-50%, -100%) translateY(-14px)" }}
        >
          <div className="glass rounded-2xl px-3.5 py-3 w-52 shadow-[0_12px_32px_rgba(33,31,29,0.22)]">
            <p className="text-[10px] uppercase tracking-wide" style={{ color: ALARM_CONFIG[hover.company.alarm].textHex }}>
              {hover.company.type}
            </p>
            <p className="text-sm font-semibold text-neutral-900 leading-tight">{hover.company.name}</p>
            <p className="text-xs text-neutral-400 mb-2">{hover.company.city}</p>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_CONFIG[hover.company.status].className}`}>
                {STATUS_CONFIG[hover.company.status].label}
              </span>
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold text-black/70 shrink-0"
                style={{ background: REPS[hover.company.assignedRep].color }}
              >
                {REPS[hover.company.assignedRep].name[0]}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-3 left-24 z-10 flex items-center gap-3 text-[11px] text-neutral-600 bg-surface px-3 py-1.5 rounded-full shadow-[0_4px_14px_rgba(33,31,29,0.22)]">
        {Object.values(REPS).map((rep) => (
          <span key={rep.id} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: rep.color }} />
            {rep.name}
          </span>
        ))}
      </div>
    </div>
  );
}

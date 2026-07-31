import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Check,
  Copy,
  Download,
  Image as ImageIcon,
  Mail,
  Plus,
  RotateCcw,
  Send,
  Trash2,
  Type,
  Video,
  X,
} from "lucide-react";
import type { MailingContact } from "../types";
import {
  buildEmlFile,
  buildMarketingEmailHtml,
  TEXT_FONT_OPTIONS,
  type BlockType,
  type MailingBlock as Block,
  type TextAlign,
} from "../lib/mailingTemplate";

interface Props {
  contacts: MailingContact[];
}

const MIN_SIZE = 60;
const SNAP_DISTANCE = 6;
// Matches the 600px card width used when actually building the email in
// mailingTemplate.ts, so what's arranged here maps 1:1 onto the export.
const CANVAS_WIDTH = 600;

// Finds the first candidate edge (left/center/right or top/center/bottom of
// the block being dragged) that lands within SNAP_DISTANCE of another
// block's matching edge, so the two can be reported as aligned.
function findSnap(candidates: number[], targets: number[], threshold: number): { candidate: number; value: number } | null {
  for (const c of candidates) {
    for (const t of targets) {
      if (Math.abs(c - t) <= threshold) return { candidate: c, value: t };
    }
  }
  return null;
}

function newBlock(type: BlockType, index: number): Block {
  return {
    id: `${type}-${Date.now()}-${index}`,
    type,
    x: 24 + index * 18,
    y: 24 + index * 18,
    width: 180,
    height: 180,
    content: "",
    ...(type === "text" ? { fontFamily: "system", textAlign: "left" as const } : {}),
  };
}

// The starting layout the canvas loads with — the classic "hero + two-
// column promo banner + alternating image/text category rows" structure
// common to product-marketing email templates: a real starting point to
// click into and replace, rather than a blank canvas. Placeholders and
// generic copy only — no imagery/text copied from any specific template.
function buildDefaultTemplate(): Block[] {
  const centered = { fontFamily: "system" as const, textAlign: "center" as const };
  const left = { fontFamily: "system" as const, textAlign: "left" as const };
  return [
    { id: "tpl-hero-img", type: "image", x: 0, y: 0, width: 500, height: 170, content: "" },
    {
      id: "tpl-hero-title",
      type: "text",
      x: 0,
      y: 180,
      width: 500,
      height: 50,
      content: "Novedades destacadas",
      ...centered,
    },
    {
      id: "tpl-promo-left",
      type: "text",
      x: 0,
      y: 240,
      width: 240,
      height: 110,
      content: "Oferta del mes\n\nHasta 20% de descuento",
      ...left,
    },
    {
      id: "tpl-promo-right",
      type: "text",
      x: 250,
      y: 240,
      width: 250,
      height: 110,
      content: "Condiciones especiales para pedidos de este mes. Consulta con tu comercial antes de fin de mes.",
      ...left,
    },
    { id: "tpl-cat1-img", type: "image", x: 0, y: 360, width: 240, height: 150, content: "" },
    {
      id: "tpl-cat1-text",
      type: "text",
      x: 250,
      y: 360,
      width: 250,
      height: 150,
      content: "Domótica\n\nBreve descripción de la categoría y por qué encaja en el proyecto.\n\nVer más",
      ...left,
    },
    {
      id: "tpl-cat2-text",
      type: "text",
      x: 0,
      y: 520,
      width: 250,
      height: 150,
      content: "Audio\n\nBreve descripción de la categoría y por qué encaja en el proyecto.\n\nVer más",
      ...left,
    },
    { id: "tpl-cat2-img", type: "image", x: 260, y: 520, width: 240, height: 150, content: "" },
    { id: "tpl-cat3-img", type: "image", x: 0, y: 680, width: 240, height: 150, content: "" },
    {
      id: "tpl-cat3-text",
      type: "text",
      x: 250,
      y: 680,
      width: 250,
      height: 150,
      content: "Iluminación\n\nBreve descripción de la categoría y por qué encaja en el proyecto.\n\nVer más",
      ...left,
    },
  ];
}

const TEMPLATE_STORAGE_KEY = "lead-intelligence:mailing-template";

// The canvas is meant to be a base template that keeps getting refined over
// time, not something that resets every visit — so it persists to
// localStorage the same way companies/mailingContacts do, and only falls
// back to the built-in starter layout the very first time there's nothing
// saved yet.
function loadTemplate(): Block[] {
  try {
    const raw = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to the default template
  }
  return buildDefaultTemplate();
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface BlockStyle {
  type: BlockType;
  label: string;
  icon: typeof ImageIcon;
  border: string;
  bg: string;
  fill: string;
  text: string;
}

// Each block type keeps the same color as its "add" button — the block
// header/border/fill reuse these instead of a separate palette, so the
// canvas visually maps back to the buttons that created it, and every
// block reads as "belonging" to its type's color at a glance.
const ADD_BUTTONS: BlockStyle[] = [
  {
    type: "text",
    label: "Texto",
    icon: Type,
    border: "border-[#a79bcb]",
    bg: "bg-[#a79bcb]/25",
    fill: "bg-[#a79bcb]/10",
    text: "text-[#6a56a0]",
  },
  {
    type: "image",
    label: "Imagen",
    icon: ImageIcon,
    border: "border-[#a8dfcf]",
    bg: "bg-[#a8dfcf]/30",
    fill: "bg-[#a8dfcf]/12",
    text: "text-[#2a9678]",
  },
  {
    type: "video",
    label: "Vídeo",
    icon: Video,
    border: "border-[#f0c39a]",
    bg: "bg-[#f0c39a]/35",
    fill: "bg-[#f0c39a]/15",
    text: "text-[#a3672c]",
  },
];

function blockStyle(type: BlockType): BlockStyle {
  return ADD_BUTTONS.find((b) => b.type === type)!;
}

export function MailingPage({ contacts }: Props) {
  const [blocks, setBlocks] = useState<Block[]>(loadTemplate);
  const [urlDrafts, setUrlDrafts] = useState<Record<string, string>>({});
  const [exportOpen, setExportOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [guides, setGuides] = useState<{ vertical: number[]; horizontal: number[] }>({ vertical: [], horizontal: [] });
  const blocksRef = useRef<Block[]>([]);

  useEffect(() => {
    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(blocks));
  }, [blocks]);
  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);
  const dragState = useRef<{
    id: string;
    mode: "move" | "resize";
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null>(null);

  const updateBlock = (id: string, patch: Partial<Block>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const removeBlock = (id: string) => setBlocks((prev) => prev.filter((b) => b.id !== id));

  const addBlock = (type: BlockType) => setBlocks((prev) => [...prev, newBlock(type, prev.length)]);

  const onPointerMove = useCallback((e: MouseEvent) => {
    const drag = dragState.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (drag.mode === "resize") {
      updateBlock(drag.id, {
        width: Math.max(MIN_SIZE, drag.origW + dx),
        height: Math.max(MIN_SIZE, drag.origH + dy),
      });
      return;
    }

    const moving = blocksRef.current.find((b) => b.id === drag.id);
    if (!moving) return;

    const newX = Math.max(0, drag.origX + dx);
    const newY = Math.max(0, drag.origY + dy);
    const xCandidates = [newX, newX + moving.width / 2, newX + moving.width];
    const yCandidates = [newY, newY + moving.height / 2, newY + moving.height];

    let snappedX: number | null = null;
    let snappedY: number | null = null;
    const vLines = new Set<number>();
    const hLines = new Set<number>();

    for (const other of blocksRef.current) {
      if (other.id === drag.id) continue;
      if (snappedX === null) {
        const hit = findSnap(xCandidates, [other.x, other.x + other.width / 2, other.x + other.width], SNAP_DISTANCE);
        if (hit) {
          snappedX = newX + (hit.value - hit.candidate);
          vLines.add(hit.value);
        }
      }
      if (snappedY === null) {
        const hit = findSnap(yCandidates, [other.y, other.y + other.height / 2, other.y + other.height], SNAP_DISTANCE);
        if (hit) {
          snappedY = newY + (hit.value - hit.candidate);
          hLines.add(hit.value);
        }
      }
    }

    setGuides({ vertical: [...vLines], horizontal: [...hLines] });
    updateBlock(drag.id, { x: snappedX ?? newX, y: snappedY ?? newY });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopDragging = useCallback(() => {
    dragState.current = null;
    setGuides({ vertical: [], horizontal: [] });
    window.removeEventListener("mousemove", onPointerMove);
    window.removeEventListener("mouseup", stopDragging);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onPointerMove]);

  const startDrag = (block: Block, mode: "move" | "resize") => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragState.current = {
      id: block.id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      origX: block.x,
      origY: block.y,
      origW: block.width,
      origH: block.height,
    };
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", stopDragging);
  };

  const handleFile = async (block: Block, file: File | undefined) => {
    if (!file) return;
    const dataUrl = await readAsDataUrl(file);
    updateBlock(block.id, { content: dataUrl });
  };

  const submitUrl = (block: Block) => {
    const val = (urlDrafts[block.id] ?? "").trim();
    if (!val) return;
    updateBlock(block.id, { content: val });
    setUrlDrafts((prev) => ({ ...prev, [block.id]: "" }));
  };

  const canvasHeight = Math.max(500, ...blocks.map((b) => b.y + b.height + 40));

  const recipients = Array.from(
    new Set(contacts.map((c) => c.email.trim()).filter(Boolean))
  );

  const downloadHtml = () => {
    const html = buildMarketingEmailHtml(blocks);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mailing-prestige-iberica.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyHtml = () => {
    navigator.clipboard.writeText(buildMarketingEmailHtml(blocks)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  // A real .eml file can carry an HTML body directly (mailto: links can't —
  // that's a text/plain-only browser/OS limitation) — downloading one and
  // opening it hands the user's mail client a draft that already has the
  // recipients, subject, and formatted template inside it, no paste step
  // needed.
  const downloadEmlDraft = () => {
    const html = buildMarketingEmailHtml(blocks);
    const eml = buildEmlFile(html, "Novedades de Prestige Ibérica", recipients);
    const blob = new Blob([eml], { type: "message/rfc822" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "borrador-mailing-prestige.eml";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      <div
        className="relative z-10 flex-1 min-h-0 flex flex-col gap-4 rounded-3xl p-6 backdrop-blur-xl w-full max-w-5xl mx-auto"
        style={{
          background: "rgba(255,255,255,0.55)",
          border: "1px solid rgba(255,255,255,0.6)",
          boxShadow: "0 30px 60px -20px rgba(33,31,29,0.35)",
        }}
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">Plantilla de mailing</h2>
            <p className="text-xs text-neutral-500">Añade bloques y colócalos donde quieras.</p>
          </div>

          <div className="flex items-center gap-2">
            {ADD_BUTTONS.map((btn) => (
              <button
                key={btn.type}
                onClick={() => addBlock(btn.type)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${btn.border} ${btn.bg} ${btn.text} font-medium`}
              >
                <Plus size={12} /> <btn.icon size={13} /> {btn.label}
              </button>
            ))}
            <button
              onClick={() => {
                if (blocks.length === 0 || window.confirm("Esto sustituye el contenido actual de la plantilla por el diseño de partida. ¿Continuar?")) {
                  setBlocks(buildDefaultTemplate());
                }
              }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-black/[0.04] border border-black/10 text-neutral-600 hover:bg-black/[0.07]"
            >
              <RotateCcw size={12} /> Restaurar plantilla
            </button>
            <button
              onClick={() => setExportOpen(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-800"
            >
              <Send size={13} /> Generar email
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-[480px] relative rounded-2xl border border-black/10 bg-black/[0.02] overflow-auto">
          <div className="flex flex-col items-center py-6">
            <p className="text-[11px] text-neutral-400 mb-2 tabular-nums">
              Plantilla: {CANVAS_WIDTH} × {Math.round(canvasHeight)} px
            </p>
            <div
              className="relative bg-white/50 rounded-xl border border-dashed border-black/15 shrink-0"
              style={{ width: CANVAS_WIDTH, height: canvasHeight }}
            >
              {blocks.length === 0 && (
                <p className="absolute inset-0 flex items-center justify-center text-xs text-neutral-400">
                  Añade texto, imágenes o vídeo para empezar la plantilla.
                </p>
              )}

              {/* Alignment guides: while dragging a block, a glowing "neural
                  link" line appears wherever an edge or center lines up with
                  another block's, and the drag snaps to it. */}
          {guides.vertical.map((x) => (
            <div
              key={`v-${x}`}
              className="absolute top-0 bottom-0 pointer-events-none z-30"
              style={{
                left: x,
                width: 1,
                background: "linear-gradient(to bottom, transparent, #2a9678 15%, #2a9678 85%, transparent)",
                boxShadow: "0 0 3px rgba(42,150,120,0.7)",
              }}
            />
          ))}
          {guides.horizontal.map((y) => (
            <div
              key={`h-${y}`}
              className="absolute left-0 right-0 pointer-events-none z-30"
              style={{
                top: y,
                height: 1,
                background: "linear-gradient(to right, transparent, #2a9678 15%, #2a9678 85%, transparent)",
                boxShadow: "0 0 3px rgba(42,150,120,0.7)",
              }}
            />
          ))}

          {blocks.map((block) => {
            const style = blockStyle(block.type);
            return (
            <div
              key={block.id}
              className={`absolute rounded-2xl border-2 ${style.fill} backdrop-blur-sm shadow-[0_10px_24px_-14px_rgba(33,31,29,0.4)] flex flex-col overflow-hidden ${style.border}`}
              style={{ left: block.x, top: block.y, width: block.width, height: block.height }}
            >
              <div
                onMouseDown={startDrag(block, "move")}
                className={`flex items-center justify-between gap-2 px-2.5 py-1.5 cursor-move shrink-0 border-b ${style.border} ${style.bg}`}
              >
                <span className={`flex items-center gap-1.5 text-[11px] font-semibold ${style.text}`}>
                  <style.icon size={11} />
                  {style.label}
                </span>
                <span className={`text-[9px] tabular-nums opacity-70 ${style.text}`}>
                  {Math.round(block.width)}×{Math.round(block.height)}
                </span>
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => removeBlock(block.id)}
                  className={`${style.text} hover:text-[#b9503a] p-0.5 opacity-60 hover:opacity-100 transition-opacity`}
                >
                  <Trash2 size={12} />
                </button>
              </div>

              <div className="flex-1 min-h-0 relative">
                {block.type === "text" && (
                  <div className="w-full h-full flex flex-col">
                    <div
                      onMouseDown={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 px-1.5 py-1 border-b border-black/10 bg-black/[0.02] shrink-0"
                    >
                      <select
                        value={block.fontFamily ?? "system"}
                        onChange={(e) => updateBlock(block.id, { fontFamily: e.target.value })}
                        className="flex-1 min-w-0 bg-transparent outline-none text-[10px] text-neutral-600 cursor-pointer"
                      >
                        {TEXT_FONT_OPTIONS.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {(
                          [
                            { value: "left", icon: AlignLeft },
                            { value: "center", icon: AlignCenter },
                            { value: "right", icon: AlignRight },
                          ] as { value: TextAlign; icon: typeof AlignLeft }[]
                        ).map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => updateBlock(block.id, { textAlign: opt.value })}
                            className={`p-1 rounded ${
                              (block.textAlign ?? "left") === opt.value
                                ? "bg-[#a79bcb]/30 text-[#6a56a0]"
                                : "text-neutral-400 hover:text-neutral-600"
                            }`}
                          >
                            <opt.icon size={11} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      value={block.content}
                      onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                      placeholder="Escribe tu texto..."
                      style={{
                        fontFamily: TEXT_FONT_OPTIONS.find((f) => f.value === (block.fontFamily ?? "system"))?.stack,
                        textAlign: block.textAlign ?? "left",
                      }}
                      className="flex-1 min-h-0 w-full resize-none bg-transparent outline-none p-2 text-sm text-neutral-800 placeholder:text-neutral-400"
                    />
                  </div>
                )}

                {block.type === "image" &&
                  (block.content ? (
                    <img src={block.content} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-black p-2">
                      <ImageIcon size={16} />
                      <label className="text-[11px] font-medium cursor-pointer hover:opacity-70">
                        Subir imagen
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFile(block, e.target.files?.[0])}
                        />
                      </label>
                      <div className="flex items-center gap-1 w-full px-1">
                        <input
                          value={urlDrafts[block.id] ?? ""}
                          onChange={(e) => setUrlDrafts((prev) => ({ ...prev, [block.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && submitUrl(block)}
                          placeholder="o pega una URL"
                          className="flex-1 min-w-0 bg-white/60 border border-black/10 rounded-md px-1.5 py-0.5 text-[10px] text-black placeholder:text-black/50 outline-none focus:border-[#a8dfcf]"
                        />
                        <button
                          onClick={() => submitUrl(block)}
                          className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-md bg-black/[0.05] hover:bg-black/[0.1] text-black font-medium"
                        >
                          Usar
                        </button>
                      </div>
                    </div>
                  ))}

                {block.type === "video" &&
                  (block.content ? (
                    <video src={block.content} controls className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-black p-2">
                      <Video size={16} />
                      <label className="text-[11px] font-medium cursor-pointer hover:opacity-70">
                        Subir vídeo
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => handleFile(block, e.target.files?.[0])}
                        />
                      </label>
                      <div className="flex items-center gap-1 w-full px-1">
                        <input
                          value={urlDrafts[block.id] ?? ""}
                          onChange={(e) => setUrlDrafts((prev) => ({ ...prev, [block.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && submitUrl(block)}
                          placeholder="o pega una URL"
                          className="flex-1 min-w-0 bg-white/60 border border-black/10 rounded-md px-1.5 py-0.5 text-[10px] text-black placeholder:text-black/50 outline-none focus:border-[#a8dfcf]"
                        />
                        <button
                          onClick={() => submitUrl(block)}
                          className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-md bg-black/[0.05] hover:bg-black/[0.1] text-black font-medium"
                        >
                          Usar
                        </button>
                      </div>
                    </div>
                  ))}
              </div>

              <div
                onMouseDown={startDrag(block, "resize")}
                className="absolute bottom-0 right-0 w-3.5 h-3.5 cursor-nwse-resize"
                style={{
                  background:
                    "linear-gradient(135deg, transparent 0 50%, rgba(33,31,29,0.35) 50% 60%, transparent 60% 70%, rgba(33,31,29,0.35) 70% 80%, transparent 80% 100%)",
                }}
              />
            </div>
            );
          })}
            </div>
          </div>
        </div>
      </div>

      {exportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5">
          <div className="glass rounded-3xl p-5 w-full max-w-2xl max-h-[90vh] flex flex-col gap-4 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-neutral-800">Generar email de marketing</h2>
                <p className="text-xs text-neutral-500">
                  {recipients.length} destinatario{recipients.length === 1 ? "" : "s"} en la base de datos de mailing.
                </p>
              </div>
              <button
                onClick={() => setExportOpen(false)}
                className="text-neutral-400 hover:text-neutral-800 p-1 rounded-lg hover:bg-black/5"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 min-h-0 rounded-2xl overflow-hidden border border-black/10 bg-white">
              <iframe
                title="Vista previa del email"
                srcDoc={buildMarketingEmailHtml(blocks)}
                className="w-full h-full"
                style={{ minHeight: 360 }}
                sandbox=""
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={downloadEmlDraft}
                disabled={recipients.length === 0}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-800 disabled:opacity-40"
              >
                <Mail size={13} /> Generar borrador de correo
              </button>
              <button
                onClick={downloadHtml}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-[#a8dfcf]/60 text-black/80 font-medium hover:bg-[#a8dfcf]/80"
              >
                <Download size={13} /> Descargar HTML
              </button>
              <button
                onClick={copyHtml}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-black/[0.04] border border-black/10 text-neutral-700 hover:bg-black/[0.07]"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copiado" : "Copiar HTML"}
              </button>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              <strong>Generar borrador de correo</strong> descarga un archivo .eml con los destinatarios en CCO, el
              asunto y el diseño ya formateado dentro — ábrelo y tu cliente de correo lo abrirá como un borrador listo
              para enviar. "Descargar HTML" y "Copiar HTML" son para importar la plantilla en una plataforma de email
              marketing (Mailchimp, Brevo...).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

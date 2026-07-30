import { useCallback, useRef, useState } from "react";
import { Image as ImageIcon, Plus, Trash2, Type, Video } from "lucide-react";

type BlockType = "image" | "video" | "text";

interface Block {
  id: string;
  type: BlockType;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
}

const MIN_SIZE = 60;

function newBlock(type: BlockType, index: number): Block {
  return {
    id: `${type}-${Date.now()}-${index}`,
    type,
    x: 24 + index * 18,
    y: 24 + index * 18,
    width: type === "text" ? 240 : 260,
    height: type === "text" ? 90 : 170,
    content: "",
  };
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const ADD_BUTTONS: { type: BlockType; label: string; icon: typeof ImageIcon; bg: string; text: string }[] = [
  { type: "text", label: "Texto", icon: Type, bg: "bg-[#a79bcb]/25 border-[#a79bcb]", text: "text-[#6a56a0]" },
  { type: "image", label: "Imagen", icon: ImageIcon, bg: "bg-[#a8dfcf]/30 border-[#a8dfcf]", text: "text-[#2a9678]" },
  { type: "video", label: "Vídeo", icon: Video, bg: "bg-[#f0c39a]/35 border-[#f0c39a]", text: "text-[#a3672c]" },
];

export function MailingPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [urlDrafts, setUrlDrafts] = useState<Record<string, string>>({});
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
    if (drag.mode === "move") {
      updateBlock(drag.id, { x: Math.max(0, drag.origX + dx), y: Math.max(0, drag.origY + dy) });
    } else {
      updateBlock(drag.id, {
        width: Math.max(MIN_SIZE, drag.origW + dx),
        height: Math.max(MIN_SIZE, drag.origH + dy),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopDragging = useCallback(() => {
    dragState.current = null;
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

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      {/* Same full-bleed cloud background as Database — Mailing is meant to
          share that look, just with a narrower card since this one holds an
          email-template canvas rather than a wide client grid. */}
      <div className="fixed inset-0 -z-10 overflow-hidden" style={{ background: "#e6dcd2" }}>
        <div
          className="login-cloud login-cloud-a"
          style={{ width: 640, height: 640, top: "-10%", left: "-10%", mixBlendMode: "multiply", opacity: 0.45 }}
        />
        <div
          className="login-cloud login-cloud-b"
          style={{ width: 560, height: 560, bottom: "-15%", right: "-10%", mixBlendMode: "multiply", opacity: 0.45 }}
        />
        <div
          className="login-cloud login-cloud-c"
          style={{ width: 420, height: 420, top: "35%", left: "55%", mixBlendMode: "multiply", opacity: 0.4 }}
        />
      </div>

      <div
        className="relative z-10 flex-1 min-h-0 flex flex-col gap-4 rounded-3xl p-6 backdrop-blur-xl w-full max-w-5xl mx-auto animate-fade-in-up"
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
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${btn.bg} ${btn.text} font-medium`}
              >
                <Plus size={12} /> <btn.icon size={13} /> {btn.label}
              </button>
            ))}
          </div>
        </div>

        <div
          className="flex-1 min-h-[480px] relative rounded-2xl border border-black/10 bg-black/[0.02] overflow-auto"
        >
          {blocks.length === 0 && (
            <p className="absolute inset-0 flex items-center justify-center text-xs text-neutral-400">
              Añade texto, imágenes o vídeo para empezar la plantilla.
            </p>
          )}

          {blocks.map((block) => (
            <div
              key={block.id}
              className="absolute rounded-xl border border-black/15 bg-white/70 shadow-sm flex flex-col overflow-hidden"
              style={{ left: block.x, top: block.y, width: block.width, height: block.height }}
            >
              <div
                onMouseDown={startDrag(block, "move")}
                className="flex items-center justify-between gap-2 px-2 py-1 bg-black/[0.04] cursor-move shrink-0"
              >
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-500">
                  {block.type === "text" && <Type size={11} />}
                  {block.type === "image" && <ImageIcon size={11} />}
                  {block.type === "video" && <Video size={11} />}
                  {block.type === "text" ? "Texto" : block.type === "image" ? "Imagen" : "Vídeo"}
                </span>
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => removeBlock(block.id)}
                  className="text-neutral-400 hover:text-[#b9503a] p-0.5"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              <div className="flex-1 min-h-0 relative">
                {block.type === "text" && (
                  <textarea
                    value={block.content}
                    onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                    placeholder="Escribe tu texto..."
                    className="font-mailing-text w-full h-full resize-none bg-transparent outline-none p-2 text-sm text-neutral-800 placeholder:text-neutral-400"
                  />
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
          ))}
        </div>
      </div>
    </div>
  );
}

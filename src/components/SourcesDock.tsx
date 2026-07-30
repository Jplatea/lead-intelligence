import { useState } from "react";
import { X, Link2, ExternalLink, Trash2, CheckCircle2, ShieldAlert, Loader2, HelpCircle } from "lucide-react";
import type { LeadSource, RobotsStatus } from "../data/sources";

interface Props {
  sources: LeadSource[];
  onAddSource: (url: string) => string | null;
  onRemoveSource: (id: string) => void;
  onClose: () => void;
}

const STATUS_BADGE: Record<RobotsStatus, { icon: typeof CheckCircle2; className: string; label: string }> = {
  allowed: { icon: CheckCircle2, className: "text-[#3f8f52]", label: "Permitido por robots.txt" },
  disallowed: { icon: ShieldAlert, className: "text-[#b9503a]", label: "No permitido por robots.txt" },
  blocked: { icon: ShieldAlert, className: "text-[#b9503a]", label: "Bloqueado (anti-bot)" },
  checking: { icon: Loader2, className: "text-neutral-400 animate-spin", label: "Comprobando robots.txt..." },
  unknown: { icon: HelpCircle, className: "text-neutral-400", label: "No verificable desde el navegador" },
};

export function SourcesDock({ sources, onAddSource, onRemoveSource, onClose }: Props) {
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const submit = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    const err = onAddSource(trimmed);
    if (err) {
      setMessage(err);
      return;
    }
    setMessage(`Añadida como fuente: ${trimmed}`);
    setUrl("");
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4 pointer-events-none">
      <div className="glass rounded-3xl p-5 w-full max-w-lg pointer-events-auto shadow-[0_-12px_32px_rgba(33,31,29,0.18)] animate-fade-in-up">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-neutral-800">Fuentes de prospección</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-800 p-1 rounded-lg hover:bg-black/5">
            <X size={16} />
          </button>
        </div>

        <label className="text-[11px] uppercase tracking-wide text-neutral-400 mb-1.5 block">
          Añadir URL para buscar contactos
        </label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setMessage(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="directorio-instaladores.es"
              className="w-full bg-black/[0.03] border border-black/10 rounded-lg pl-9 pr-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-400 outline-none focus:border-[#a8dfcf]"
            />
          </div>
          <button
            onClick={submit}
            className="shrink-0 text-xs px-3 py-2 rounded-lg bg-[#a8dfcf]/25 border border-[#a8dfcf] text-[#2a9678] hover:bg-[#a8dfcf]/40"
          >
            Buscar
          </button>
        </div>
        {message && <p className="text-[11px] text-neutral-500 mt-1.5">{message}</p>}

        <div className="h-px my-3.5 bg-gradient-to-r from-transparent via-black/10 to-transparent" />

        <p className="text-[11px] uppercase tracking-wide text-neutral-400 mb-2">
          {sources.length} fuente{sources.length === 1 ? "" : "s"} añadida{sources.length === 1 ? "" : "s"}
        </p>
        <div className="max-h-[35vh] overflow-y-auto space-y-2">
          {sources.map((source) => {
            const badge = STATUS_BADGE[source.robotsStatus] ?? STATUS_BADGE.unknown;
            return (
              <div
                key={source.id}
                className="flex items-center gap-3 p-3 rounded-2xl bg-black/[0.02] border border-black/6"
              >
                <Link2 size={14} className="text-[#2a9678] shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-neutral-800 truncate">{source.name}</p>
                  <p className="text-xs text-neutral-400 truncate">{source.note}</p>
                </div>
                <span title={source.robotsNote ?? badge.label} className="shrink-0">
                  <badge.icon size={15} className={badge.className} />
                </span>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-[#2a9678] hover:text-[#237a63] shrink-0 px-2.5 py-1 rounded-lg border border-[#a8dfcf] bg-[#a8dfcf]/15"
                >
                  Abrir <ExternalLink size={11} />
                </a>
                {source.custom && (
                  <button
                    onClick={() => onRemoveSource(source.id)}
                    className="text-neutral-400 hover:text-[#b9503a] shrink-0 p-1"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

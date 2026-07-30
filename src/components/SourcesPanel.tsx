import { useState } from "react";
import {
  ChevronDown,
  ExternalLink,
  Plus,
  Trash2,
  Link2,
  CheckCircle2,
  ShieldAlert,
  Loader2,
  HelpCircle,
} from "lucide-react";
import type { LeadSource, RobotsStatus } from "../data/sources";

interface Props {
  sources: LeadSource[];
  onAddSource: (url: string) => string | null;
  onRemoveSource: (id: string) => void;
}

const STATUS_BADGE: Record<RobotsStatus, { icon: typeof CheckCircle2; className: string; label: string }> = {
  allowed: { icon: CheckCircle2, className: "text-[#3f8f52]", label: "Permitido por robots.txt" },
  disallowed: { icon: ShieldAlert, className: "text-[#b9503a]", label: "No permitido por robots.txt" },
  blocked: { icon: ShieldAlert, className: "text-[#b9503a]", label: "Bloqueado (anti-bot)" },
  checking: { icon: Loader2, className: "text-neutral-400 animate-spin", label: "Comprobando robots.txt..." },
  unknown: { icon: HelpCircle, className: "text-neutral-400", label: "No verificable desde el navegador" },
};

export function SourcesPanel({ sources, onAddSource, onRemoveSource }: Props) {
  const [newUrl, setNewUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const addSource = () => {
    const trimmed = newUrl.trim();
    if (!trimmed) return;
    const err = onAddSource(trimmed);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setNewUrl("");
  };

  return (
    <div className="glass rounded-3xl p-5">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between"
      >
        <h2 className="text-sm font-semibold text-neutral-800">Fuentes de prospección</h2>
        <span className="flex items-center gap-2">
          <span className="text-xs text-neutral-400">{sources.length} fuentes</span>
          <ChevronDown
            size={14}
            className={`text-neutral-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {!expanded && (
        <p className="text-xs text-neutral-400 mt-1">
          Directorios y buscadores de instaladores/distribuidores en España y Portugal.
        </p>
      )}

      {expanded && (
        <>
          <p className="text-xs text-neutral-400 mt-1 mb-4">
            Directorios y buscadores de instaladores/distribuidores. Limita cada búsqueda a España y Portugal.
          </p>

          <div className="space-y-2 mb-4">
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

          <div className="flex items-center gap-2">
            <input
              value={newUrl}
              onChange={(e) => {
                setNewUrl(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && addSource()}
              placeholder="Añadir URL manualmente (p.ej. directorio-instaladores.es)"
              className="flex-1 bg-black/[0.03] border border-black/10 rounded-xl px-3 py-2 text-xs text-neutral-700 placeholder:text-neutral-400 outline-none focus:border-[#a8dfcf]"
            />
            <button
              onClick={addSource}
              className="flex items-center gap-1 text-xs px-3 py-2 rounded-xl bg-[#a8dfcf]/25 border border-[#a8dfcf] text-[#2a9678] hover:bg-[#a8dfcf]/40"
            >
              <Plus size={13} /> Añadir
            </button>
          </div>
          {error && <p className="text-xs text-[#b9503a] mt-1.5">{error}</p>}
          <p className="text-[10px] text-neutral-400 mt-2">
            La verificación de robots.txt se hace desde tu navegador: si el sitio bloquea CORS no podremos confirmarlo automáticamente.
          </p>
        </>
      )}
    </div>
  );
}

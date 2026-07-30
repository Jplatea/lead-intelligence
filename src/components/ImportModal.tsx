import { useRef, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  Link2,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  detectFormat,
  findAllDuplicateGroups,
  findDuplicate,
  mergeCompanyData,
  parseCSV,
  parseKML,
  parseKMZ,
  parseXLSX,
  rowsToCompanies,
  type ImportRow,
} from "../lib/importClients";
import { MergeDuplicatesModal, type DuplicateConflict, type MergeDecision } from "./MergeDuplicatesModal";
import type { Company } from "../types";
import type { LeadSource, RobotsStatus } from "../data/sources";

// Imports no longer ask "assign to whom" up front — rows land unassigned
// to José by default and get reassigned later from the Database view.
const DEFAULT_IMPORT_REP = "jose" as const;

const STATUS_BADGE: Record<RobotsStatus, { icon: typeof CheckCircle2; className: string; label: string }> = {
  allowed: { icon: CheckCircle2, className: "text-[#3f8f52]", label: "Permitido por robots.txt" },
  disallowed: { icon: ShieldAlert, className: "text-[#b9503a]", label: "No permitido por robots.txt" },
  blocked: { icon: ShieldAlert, className: "text-[#b9503a]", label: "Bloqueado (anti-bot)" },
  checking: { icon: Loader2, className: "text-neutral-400 animate-spin", label: "Comprobando robots.txt..." },
  unknown: { icon: HelpCircle, className: "text-neutral-400", label: "No verificable desde el navegador" },
};

interface Props {
  companies: Company[];
  sources: LeadSource[];
  onClose: () => void;
  onAddSource: (url: string) => string | null;
  onRemoveSource: (id: string) => void;
  onImportCompanies: (companies: Company[]) => void;
  onUpdateCompany: (id: string, patch: Partial<Company>) => void;
  onDeleteCompany: (id: string) => void;
  onRescanAll: () => void;
  scanning: boolean;
}

export function ImportModal({
  companies,
  sources,
  onClose,
  onAddSource,
  onRemoveSource,
  onImportCompanies,
  onUpdateCompany,
  onDeleteCompany,
  onRescanAll,
  scanning,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [url, setUrl] = useState("");
  const [urlMessage, setUrlMessage] = useState<string | null>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<DuplicateConflict[]>([]);

  const submitUrl = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    const err = onAddSource(trimmed);
    if (err) {
      setUrlMessage(err);
      return;
    }
    setUrlMessage(`Añadida como fuente y comprobando robots.txt: ${trimmed}`);
    setUrl("");
  };

  const handleFile = async (file: File) => {
    setError(null);
    setResult(null);
    setFileName(file.name);
    const format = detectFormat(file.name);
    if (!format) {
      setError("Formato no reconocido. Usa un archivo .csv, .kml, .kmz, .xlsx o .xls.");
      return;
    }

    let rows: ImportRow[] = [];
    try {
      if (format === "csv") {
        rows = parseCSV(await file.text());
      } else if (format === "kml") {
        rows = parseKML(await file.text());
      } else if (format === "kmz") {
        rows = parseKMZ(await file.arrayBuffer());
      } else {
        rows = parseXLSX(await file.arrayBuffer());
      }
    } catch {
      setError("No se pudo leer el archivo. Comprueba que el formato sea correcto.");
      return;
    }

    if (rows.length === 0) {
      setError("No se encontraron clientes en el archivo (revisa que tenga una columna de nombre).");
      return;
    }

    setImporting(true);
    setProgress({ done: 0, total: rows.length });
    const { companies: imported, skipped, geocodeFailed } = await rowsToCompanies(
      rows,
      DEFAULT_IMPORT_REP,
      (done, total) => setProgress({ done, total })
    );
    setImporting(false);
    setProgress(null);

    // Every client read from the file gets checked against the existing
    // database by name before being added — matches go to a merge popup
    // instead of creating a duplicate outright.
    const fresh: Company[] = [];
    const newConflicts: DuplicateConflict[] = [];
    for (const inc of imported) {
      const existing = findDuplicate(inc, companies);
      if (existing) newConflicts.push({ existing, incoming: inc });
      else fresh.push(inc);
    }

    if (fresh.length > 0) onImportCompanies(fresh);
    if (newConflicts.length > 0) setConflicts(newConflicts);

    const parts = [`${fresh.length} cliente${fresh.length === 1 ? "" : "s"} añadido${fresh.length === 1 ? "" : "s"} al mapa.`];
    if (newConflicts.length > 0)
      parts.push(`${newConflicts.length} coincid${newConflicts.length === 1 ? "e" : "en"} con clientes existentes.`);
    if (skipped > 0) parts.push(`${skipped} fila${skipped === 1 ? "" : "s"} sin datos suficientes.`);
    if (geocodeFailed.length > 0) parts.push(`No se pudo ubicar: ${geocodeFailed.join(", ")}.`);
    setResult(parts.join(" "));
  };

  const applyMergeDecisions = (decisions: MergeDecision[]) => {
    for (const { conflict, action } of decisions) {
      if (action === "merge") {
        onUpdateCompany(conflict.existing.id, mergeCompanyData(conflict.existing, conflict.incoming));
        // For duplicates found *within* the existing database (via "Reescanear"),
        // the incoming side is itself a saved record, not a new one — merging
        // means folding it into the kept record and removing the redundant copy.
        if (conflict.incomingPersisted) onDeleteCompany(conflict.incoming.id);
      }
    }
    setConflicts([]);
  };

  const rescan = () => {
    onRescanAll();
    const dupes = findAllDuplicateGroups(companies).map((c) => ({ ...c, incomingPersisted: true }));
    if (dupes.length > 0) {
      setConflicts(dupes);
    } else {
      setResult("No se han encontrado contactos duplicados.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-5">
      <div className="glass rounded-3xl p-5 w-full max-w-md max-h-[85vh] overflow-y-auto animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-neutral-800">Empresas detectadas</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-800 p-1 rounded-lg hover:bg-black/5">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-[11px] uppercase tracking-wide text-neutral-400 mb-2 block">
              Buscar clientes por URL
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setUrlMessage(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && submitUrl()}
                  placeholder="directorio-instaladores.es"
                  className="w-full bg-black/[0.03] border border-black/10 rounded-lg pl-9 pr-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-400 outline-none focus:border-[#a8dfcf]"
                />
              </div>
              <button
                onClick={submitUrl}
                className="shrink-0 text-xs px-3 py-2 rounded-lg bg-[#a8dfcf]/25 border border-[#a8dfcf] text-[#2a9678] hover:bg-[#a8dfcf]/40"
              >
                Buscar
              </button>
            </div>
            {urlMessage && <p className="text-[11px] text-neutral-500 mt-1.5">{urlMessage}</p>}
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-black/10 to-transparent" />

          <div>
            <label className="text-[11px] uppercase tracking-wide text-neutral-400 mb-2 block">
              Subir archivo (CSV, KML, KMZ, Excel)
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.kml,.kmz,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="w-full flex items-center justify-center gap-2 text-sm px-3 py-3 rounded-xl border border-dashed border-black/15 text-neutral-600 hover:bg-black/[0.03] disabled:opacity-50"
            >
              {importing ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              {importing
                ? `Importando${progress ? ` ${progress.done}/${progress.total}` : "..."}`
                : fileName
                  ? fileName
                  : "Selecciona un archivo..."}
            </button>

            {error && <p className="text-xs text-[#b9503a] mt-2">{error}</p>}
            {result && <p className="text-xs text-[#2a9678] mt-2">{result}</p>}

            <p className="text-[10px] text-neutral-400 mt-2 leading-relaxed">
              CSV/Excel: columnas nombre, ciudad, provincia, país, lat, lng (o solo ciudad/provincia para ubicar
              automáticamente). KML/KMZ: usa el nombre y las coordenadas de cada punto.
            </p>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-black/10 to-transparent" />

          <button
            onClick={rescan}
            disabled={scanning}
            className="w-full flex items-center justify-center gap-2 text-xs px-3 py-2 rounded-xl bg-black/[0.03] border border-black/10 text-neutral-600 hover:bg-black/[0.06] disabled:opacity-50"
          >
            <RefreshCw size={12} className={scanning ? "animate-spin" : ""} />
            {scanning ? "Reescaneando fuentes..." : "Reescanear todas las fuentes existentes"}
          </button>

          {sources.length > 0 && (
            <>
              <div className="h-px bg-gradient-to-r from-transparent via-black/10 to-transparent" />
              <div>
                <label className="text-[11px] uppercase tracking-wide text-neutral-400 mb-2 block">
                  Fuentes añadidas
                </label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {sources.map((source) => {
                    const badge = STATUS_BADGE[source.robotsStatus] ?? STATUS_BADGE.unknown;
                    return (
                      <div
                        key={source.id}
                        className="flex items-center gap-2 p-2 rounded-xl bg-black/[0.02] border border-black/6"
                      >
                        <Link2 size={12} className="text-[#2a9678] shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-neutral-800 truncate">{source.name}</p>
                          <p className="text-[10px] text-neutral-400 truncate">{source.note}</p>
                        </div>
                        <span title={source.robotsNote ?? badge.label} className="shrink-0">
                          <badge.icon size={13} className={badge.className} />
                        </span>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] text-[#2a9678] hover:text-[#237a63] shrink-0 px-1.5 py-0.5 rounded-md border border-[#a8dfcf] bg-[#a8dfcf]/15"
                        >
                          Abrir <ExternalLink size={9} />
                        </a>
                        <button
                          onClick={() => onRemoveSource(source.id)}
                          className="text-neutral-400 hover:text-[#b9503a] shrink-0 p-0.5"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {conflicts.length > 0 && (
        <MergeDuplicatesModal
          conflicts={conflicts}
          onClose={() => setConflicts([])}
          onApply={applyMergeDecisions}
        />
      )}
    </div>
  );
}

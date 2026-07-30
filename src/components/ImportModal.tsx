import { useRef, useState } from "react";
import { Link2, Loader2, RefreshCw, Upload, X } from "lucide-react";
import type { RepId } from "../types";
import { REPS } from "../data/config";
import { detectFormat, parseCSV, parseKML, parseKMZ, parseXLSX, rowsToCompanies, type ImportRow } from "../lib/importClients";
import type { Company } from "../types";

interface Props {
  onClose: () => void;
  onAddSource: (url: string) => string | null;
  onImportCompanies: (companies: Company[]) => void;
  onRescanAll: () => void;
  scanning: boolean;
}

export function ImportModal({ onClose, onAddSource, onImportCompanies, onRescanAll, scanning }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [url, setUrl] = useState("");
  const [urlMessage, setUrlMessage] = useState<string | null>(null);

  const [assignedRep, setAssignedRep] = useState<RepId>("jose");
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    const { companies, skipped, geocodeFailed } = await rowsToCompanies(rows, assignedRep, (done, total) =>
      setProgress({ done, total })
    );
    setImporting(false);
    setProgress(null);

    if (companies.length > 0) onImportCompanies(companies);

    const parts = [`${companies.length} cliente${companies.length === 1 ? "" : "s"} añadido${companies.length === 1 ? "" : "s"} al mapa.`];
    if (skipped > 0) parts.push(`${skipped} fila${skipped === 1 ? "" : "s"} sin datos suficientes.`);
    if (geocodeFailed.length > 0) parts.push(`No se pudo ubicar: ${geocodeFailed.join(", ")}.`);
    setResult(parts.join(" "));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-5">
      <div className="glass rounded-3xl p-5 w-full max-w-md animate-fade-in-up">
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

            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] text-neutral-400 shrink-0">Asignar a</span>
              <select
                value={assignedRep}
                onChange={(e) => setAssignedRep(e.target.value as RepId)}
                className="text-xs bg-black/[0.03] border border-black/10 rounded-lg px-2 py-1 text-neutral-700 outline-none focus:border-[#a8dfcf]"
              >
                {Object.values(REPS).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

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
            onClick={onRescanAll}
            disabled={scanning}
            className="w-full flex items-center justify-center gap-2 text-xs px-3 py-2 rounded-xl bg-black/[0.03] border border-black/10 text-neutral-600 hover:bg-black/[0.06] disabled:opacity-50"
          >
            <RefreshCw size={12} className={scanning ? "animate-spin" : ""} />
            {scanning ? "Reescaneando fuentes..." : "Reescanear todas las fuentes existentes"}
          </button>
        </div>
      </div>
    </div>
  );
}

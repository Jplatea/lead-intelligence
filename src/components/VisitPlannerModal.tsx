import { useMemo, useState } from "react";
import { FileDown, MapPin, X } from "lucide-react";
import type { Company, RepId } from "../types";
import { REPS } from "../data/config";
import { regionOf } from "../lib/regions";

interface Props {
  companies: Company[];
  onClose: () => void;
  onConfirm: (repIds: RepId[], zone: string) => void;
  onGeneratePdf: (repIds: RepId[], zone: string) => void;
}

function repCircleShadow(active: boolean): string {
  return active
    ? "inset 0 0 0 1.5px rgba(255,255,255,0.75), inset 0 0 0 1px rgba(33,31,29,0.18), 0 0 0 2px #f9f3ec, 0 0 0 3.5px #211f1d"
    : "inset 0 0 0 1.5px rgba(255,255,255,0.6), inset 0 0 0 1px rgba(33,31,29,0.12), 0 1px 2px rgba(33,31,29,0.14)";
}

export function VisitPlannerModal({ companies, onClose, onConfirm, onGeneratePdf }: Props) {
  const [repIds, setRepIds] = useState<Set<RepId>>(new Set());
  const [zone, setZone] = useState("");

  const zones = useMemo(
    () => Array.from(new Set(companies.map((c) => regionOf(c.province)))).sort((a, b) => a.localeCompare(b)),
    [companies]
  );

  const toggleRep = (id: RepId) => {
    setRepIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const matchCount = useMemo(() => {
    if (repIds.size === 0 || !zone) return 0;
    return companies.filter((c) => repIds.has(c.assignedRep) && regionOf(c.province) === zone).length;
  }, [companies, repIds, zone]);

  const confirm = () => {
    if (repIds.size === 0 || !zone) return;
    onConfirm([...repIds], zone);
  };

  const generatePdf = () => {
    if (repIds.size === 0 || !zone || matchCount === 0) return;
    onGeneratePdf([...repIds], zone);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex items-center py-5 pr-5 pointer-events-none">
      <div className="glass rounded-3xl p-5 w-full max-w-sm animate-fade-in-up pointer-events-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-neutral-800">Voy de visita</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-800 p-1 rounded-lg hover:bg-black/5">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-wide text-neutral-400 mb-2 block">
              ¿Quién eres? <span className="normal-case text-neutral-400">(elige uno, dos o los tres)</span>
            </label>
            <div className="flex items-center gap-3">
              {Object.values(REPS).map((r) => {
                const active = repIds.has(r.id);
                return (
                  <button
                    key={r.id}
                    onClick={() => toggleRep(r.id)}
                    title={r.name}
                    style={{ background: r.color, boxShadow: repCircleShadow(active) }}
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-black/75 transition-transform ${
                      active ? "scale-110" : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    {r.name[0]}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wide text-neutral-400 mb-2 block">¿A dónde vas?</label>
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <select
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                className="w-full bg-black/[0.03] border border-black/10 rounded-lg pl-9 pr-3 py-2 text-sm text-neutral-800 outline-none focus:border-[#a8dfcf]"
              >
                <option value="">Selecciona una zona</option>
                {zones.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {repIds.size > 0 && zone && (
            <p className="text-xs text-neutral-500">
              {matchCount === 0
                ? "No hay clientes de estos comerciales en esa zona."
                : `${matchCount} cliente${matchCount === 1 ? "" : "s"} de ${[...repIds]
                    .map((id) => REPS[id].name)
                    .join(", ")} en ${zone}.`}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 text-xs px-3 py-2 rounded-xl bg-black/[0.03] border border-black/10 text-neutral-600 hover:bg-black/[0.06]"
          >
            Cancelar
          </button>
          <button
            onClick={confirm}
            disabled={repIds.size === 0 || !zone}
            className="flex-1 text-xs px-3 py-2 rounded-xl bg-[#f0c39a] border border-[#f0c39a] text-black/80 font-medium hover:bg-[#e8b483] disabled:opacity-40"
          >
            Marcar clientes
          </button>
        </div>

        <button
          onClick={generatePdf}
          disabled={repIds.size === 0 || !zone || matchCount === 0}
          className="w-full flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-black/[0.03] border border-black/10 text-neutral-600 hover:bg-black/[0.06] disabled:opacity-40 mt-2"
        >
          <FileDown size={13} /> Generar PDF
        </button>
      </div>
    </div>
  );
}

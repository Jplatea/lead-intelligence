import { useMemo, useState } from "react";
import { MapPin, X } from "lucide-react";
import type { Company, RepId } from "../types";
import { REPS } from "../data/config";

interface Props {
  companies: Company[];
  onClose: () => void;
  onConfirm: (repId: RepId, zone: string) => void;
}

function repCircleShadow(active: boolean): string {
  return active
    ? "inset 0 0 0 1.5px rgba(255,255,255,0.75), inset 0 0 0 1px rgba(33,31,29,0.18), 0 0 0 2px #f9f3ec, 0 0 0 3.5px #211f1d"
    : "inset 0 0 0 1.5px rgba(255,255,255,0.6), inset 0 0 0 1px rgba(33,31,29,0.12), 0 1px 2px rgba(33,31,29,0.14)";
}

export function VisitPlannerModal({ companies, onClose, onConfirm }: Props) {
  const [repId, setRepId] = useState<RepId | null>(null);
  const [zone, setZone] = useState("");

  const zones = useMemo(
    () => Array.from(new Set(companies.map((c) => c.province))).sort((a, b) => a.localeCompare(b)),
    [companies]
  );

  const matchCount = useMemo(() => {
    if (!repId || !zone) return 0;
    return companies.filter((c) => c.assignedRep === repId && c.province === zone).length;
  }, [companies, repId, zone]);

  const confirm = () => {
    if (!repId || !zone) return;
    onConfirm(repId, zone);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-5">
      <div className="glass rounded-3xl p-5 w-full max-w-sm animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-neutral-800">Voy de visita</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-800 p-1 rounded-lg hover:bg-black/5">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-wide text-neutral-400 mb-2 block">¿Quién eres?</label>
            <div className="flex items-center gap-3">
              {Object.values(REPS).map((r) => {
                const active = r.id === repId;
                return (
                  <button
                    key={r.id}
                    onClick={() => setRepId(r.id)}
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

          {repId && zone && (
            <p className="text-xs text-neutral-500">
              {matchCount === 0
                ? "No hay clientes de este comercial en esa zona."
                : `${matchCount} cliente${matchCount === 1 ? "" : "s"} de ${REPS[repId].name} en ${zone}.`}
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
            disabled={!repId || !zone}
            className="flex-1 text-xs px-3 py-2 rounded-xl bg-[#f0c39a] border border-[#f0c39a] text-black/80 font-medium hover:bg-[#e8b483] disabled:opacity-40"
          >
            Marcar clientes
          </button>
        </div>
      </div>
    </div>
  );
}

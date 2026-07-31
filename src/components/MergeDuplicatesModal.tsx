import { useState } from "react";
import { X } from "lucide-react";
import type { Company } from "../types";

export interface DuplicateConflict {
  existing: Company;
  incoming: Company;
  // True when "incoming" is itself already a saved record (found via a
  // whole-database duplicate scan) rather than a brand-new row from a file
  // import — merging then also removes the redundant saved copy.
  incomingPersisted?: boolean;
}

export interface MergeDecision {
  conflict: DuplicateConflict;
  action: "merge" | "skip";
}

interface Props {
  conflicts: DuplicateConflict[];
  onApply: (decisions: MergeDecision[]) => void;
  onClose: () => void;
}

export function MergeDuplicatesModal({ conflicts, onApply, onClose }: Props) {
  const [actions, setActions] = useState<Record<number, "merge" | "skip">>(() =>
    Object.fromEntries(conflicts.map((_, i) => [i, "merge"]))
  );

  const setAction = (i: number, action: "merge" | "skip") => setActions((prev) => ({ ...prev, [i]: action }));

  const apply = () => {
    onApply(conflicts.map((conflict, i) => ({ conflict, action: actions[i] })));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-5">
      <div className="glass rounded-3xl p-5 w-full max-w-lg max-h-[85vh] overflow-y-auto animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="type-h2 text-neutral-800">Clientes duplicados</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              {conflicts.length} nombre{conflicts.length === 1 ? "" : "s"} ya exist{conflicts.length === 1 ? "e" : "en"}{" "}
              en la base de datos.
            </p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-800 p-1 rounded-lg hover:bg-black/5">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-2 mb-5">
          {conflicts.map((c, i) => (
            <div key={c.existing.id} className="rounded-2xl bg-black/[0.02] border border-black/6 p-3">
              <p className="text-sm font-medium text-neutral-800 mb-1.5">{c.existing.name}</p>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-500 mb-2">
                <div>
                  <p className="tracking-wide text-neutral-400 mb-0.5">Existente</p>
                  <p className="truncate">{c.existing.contact.email || "—"}</p>
                  <p className="truncate">{c.existing.contact.phone || "—"}</p>
                  <p className="truncate">{c.existing.city || "—"}</p>
                </div>
                <div>
                  <p className="tracking-wide text-neutral-400 mb-0.5">Nuevo</p>
                  <p className="truncate">{c.incoming.contact.email || "—"}</p>
                  <p className="truncate">{c.incoming.contact.phone || "—"}</p>
                  <p className="truncate">{c.incoming.city || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAction(i, "merge")}
                  className={`flex-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                    actions[i] === "merge"
                      ? "bg-[#a8dfcf]/30 border-[#a8dfcf] text-[#2a9678]"
                      : "bg-black/[0.02] border-black/10 text-neutral-500 hover:bg-black/[0.04]"
                  }`}
                >
                  Fusionar
                </button>
                <button
                  onClick={() => setAction(i, "skip")}
                  className={`flex-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                    actions[i] === "skip"
                      ? "bg-[#eda18f]/25 border-[#eda18f] text-[#b9503a]"
                      : "bg-black/[0.02] border-black/10 text-neutral-500 hover:bg-black/[0.04]"
                  }`}
                >
                  Omitir (no duplicar)
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={apply}
          className="w-full text-xs px-3 py-2 rounded-xl bg-[#a8dfcf] border border-[#a8dfcf] text-black/80 font-medium hover:bg-[#93d3bd]"
        >
          Aplicar
        </button>
      </div>
    </div>
  );
}

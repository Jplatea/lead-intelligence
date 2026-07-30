import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { BRAND_OPTIONS, SPECIALTY_OPTIONS, TYPE_OPTIONS } from "../data/config";

export interface Filters {
  types: Set<string>;
  brands: Set<string>;
  specialties: Set<string>;
}

interface Props {
  filters: Filters;
  onToggle: (group: keyof Filters, value: string) => void;
  onClear: () => void;
}

const GROUPS: { key: keyof Filters; label: string; options: string[] }[] = [
  { key: "types", label: "Perfil", options: TYPE_OPTIONS },
  { key: "brands", label: "Marcas", options: BRAND_OPTIONS },
  { key: "specialties", label: "Especialidades", options: SPECIALTY_OPTIONS },
];

export function FiltersPanel({ filters, onToggle, onClear }: Props) {
  const [openGroup, setOpenGroup] = useState<keyof Filters | null>(null);
  const hasActive =
    filters.types.size > 0 || filters.brands.size > 0 || filters.specialties.size > 0;

  return (
    <div className="relative glass rounded-2xl px-4 py-3 flex items-center gap-2 flex-wrap">
      <span className="text-xs text-neutral-500 mr-1">Filtros</span>

      {GROUPS.map((group) => {
        const active = filters[group.key];
        const isOpen = openGroup === group.key;
        return (
          <div key={group.key} className="relative">
            <button
              onClick={() => setOpenGroup(isOpen ? null : group.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-colors ${
                active.size > 0
                  ? "bg-[#a8dfcf] border-[#a8dfcf] text-black/80"
                  : "bg-black/[0.03] border-black/10 text-neutral-600 hover:bg-black/[0.06]"
              }`}
            >
              {group.label}
              {active.size > 0 && <span className="text-[10px]">({active.size})</span>}
              <ChevronDown size={12} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpenGroup(null)} />
                <div className="absolute top-full left-0 mt-2 z-50 glass rounded-2xl p-3 w-64 flex flex-wrap gap-1.5 animate-fade-in-up">
                  {group.options.map((opt) => {
                    const isActive = active.has(opt);
                    return (
                      <button
                        key={opt}
                        onClick={() => onToggle(group.key, opt)}
                        className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                          isActive
                            ? "bg-[#a8dfcf] border-[#a8dfcf] text-black/80"
                            : "bg-black/[0.03] border-black/10 text-neutral-500 hover:bg-black/[0.06] hover:text-neutral-800"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        );
      })}

      {hasActive && (
        <button
          onClick={onClear}
          className="text-[11px] text-[#2a9678] hover:text-[#237a63] ml-1"
        >
          Limpiar
        </button>
      )}
    </div>
  );
}

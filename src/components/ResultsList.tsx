import { useMemo, useState } from "react";
import { ChevronDown, Search, Trash2 } from "lucide-react";
import type { Company, RepId } from "../types";
import { REPS, STATUS_CONFIG } from "../data/config";
import { regionOf } from "../lib/regions";

export interface ResultsHighlight {
  ids: Set<string>;
  color: string;
}

interface Props {
  companies: Company[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  highlight: ResultsHighlight | null;
}

type GroupBy = "none" | "rep" | "region";

const selectClass =
  "bg-black/[0.03] border border-black/10 rounded-lg px-2 py-1 text-xs text-neutral-600 outline-none focus:border-[#a8dfcf]";

export function ResultsList({
  companies,
  selectedId,
  onSelect,
  onDelete,
  expanded,
  onExpandedChange,
  highlight,
}: Props) {
  const [query, setQuery] = useState("");
  const [filterRep, setFilterRep] = useState<RepId | "">("");
  const [filterRegion, setFilterRegion] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");

  const regions = useMemo(
    () => Array.from(new Set(companies.map((c) => regionOf(c.province)))).sort((a, b) => a.localeCompare(b)),
    [companies]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return companies.filter((c) => {
      if (filterRep && c.assignedRep !== filterRep) return false;
      if (filterRegion && regionOf(c.province) !== filterRegion) return false;
      if (q && !`${c.name} ${c.city} ${c.province}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [companies, query, filterRep, filterRegion]);

  const rows = useMemo(() => {
    if (groupBy === "none") {
      const list =
        highlight && highlight.ids.size > 0
          ? [...filtered.filter((c) => highlight.ids.has(c.id)), ...filtered.filter((c) => !highlight.ids.has(c.id))]
          : filtered;
      return list.map((company) => ({ groupLabel: null as string | null, company }));
    }
    const keyOf = (c: Company) => (groupBy === "rep" ? REPS[c.assignedRep].name : regionOf(c.province));
    const sorted = [...filtered].sort((a, b) => keyOf(a).localeCompare(keyOf(b)) || a.name.localeCompare(b.name));
    let lastKey: string | null = null;
    return sorted.map((company) => {
      const key = keyOf(company);
      const groupLabel = key !== lastKey ? key : null;
      lastKey = key;
      return { groupLabel, company };
    });
  }, [filtered, groupBy, highlight]);

  return (
    <div className="glass rounded-3xl p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={() => onExpandedChange(!expanded)} className="flex items-center gap-2 shrink-0">
          <h2 className="type-h2 text-neutral-800">Clientes</h2>
          <ChevronDown
            size={14}
            className={`text-neutral-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>

        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar cliente..."
              className="bg-black/[0.03] border border-black/10 rounded-lg pl-7 pr-2 py-1 text-xs text-neutral-700 placeholder:text-neutral-400 outline-none focus:border-[#a8dfcf] w-36"
            />
          </div>

          <span className="text-[11px] text-neutral-400 ml-1">Filtro</span>
          <select value={filterRep} onChange={(e) => setFilterRep(e.target.value as RepId | "")} className={selectClass}>
            <option value="">Comercial</option>
            {Object.values(REPS).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <select value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)} className={selectClass}>
            <option value="">Comunidad autónoma</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <span className="text-[11px] text-neutral-400 ml-1.5">Organización</span>
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)} className={selectClass}>
            <option value="none">Sin organizar</option>
            <option value="rep">Comercial</option>
            <option value="region">Comunidad autónoma</option>
          </select>

          <span className="text-xs text-neutral-500 ml-1">{filtered.length} empresas</span>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 animate-fade-in-up">
          {rows.map(({ groupLabel, company: c }) => {
            const rep = REPS[c.assignedRep];
            const status = STATUS_CONFIG[c.status];
            const isSelected = c.id === selectedId;
            const isHighlighted = highlight?.ids.has(c.id) ?? false;
            return (
              <div key={c.id}>
                {groupLabel && (
                  <p className="text-[10px] tracking-wide text-neutral-400 px-3 pt-3 pb-1 first:pt-0">
                    {groupLabel}
                  </p>
                )}
                <div
                  onClick={() => onSelect(c.id)}
                  style={isHighlighted ? { background: `${highlight!.color}35` } : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left cursor-pointer transition-colors rounded-xl ${
                    isHighlighted ? "highlight-blink" : isSelected ? "bg-[#a8dfcf]/20" : "hover:bg-black/[0.03]"
                  }`}
                >
                  {isHighlighted && (
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: highlight!.color }} />
                  )}
                  <span className="text-sm text-neutral-800 truncate flex-1 min-w-0">{c.name}</span>
                  {c.needsReview && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 bg-[#b9503a]/15 text-[#b9503a]">
                      Revisar
                    </span>
                  )}
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${status.className}`}>
                    {status.label}
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0 w-24 justify-end">
                    <span className="text-xs text-neutral-500 truncate">{rep.name}</span>
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold text-black/70 shrink-0"
                      style={{ background: rep.color }}
                    >
                      {rep.name[0]}
                    </span>
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(c.id);
                    }}
                    title="Eliminar cliente"
                    className="shrink-0 text-neutral-400 hover:text-[#b9503a] p-1 rounded-lg hover:bg-black/5"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

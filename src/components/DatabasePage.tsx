import { useState } from "react";
import { FileDown, FileSpreadsheet, Plus, Search, X } from "lucide-react";
import type { Company, RepId, CompanyStatus, AlarmLevel } from "../types";
import { REPS, STATUS_CONFIG, ALARM_CONFIG, TYPE_OPTIONS } from "../data/config";
import { exportCompaniesCSV, exportCompaniesXLSX } from "../lib/exportClients";

interface Props {
  companies: Company[];
  onUpdate: (id: string, patch: Partial<Company>) => void;
  onDelete: (id: string) => void;
}

// No backdrop-blur here: with 100+ rows this class is applied to
// thousands of inputs/selects, and per-element backdrop-filter is what
// was causing the visible scroll jank/"loading in" look. The frosted
// look still comes from the single backdrop-blur on the outer card.
const cellClass =
  "w-full bg-white/50 outline-none text-[14px] font-medium text-black placeholder:text-black/40 rounded-lg px-2 py-1 border border-black/10 focus:border-black/40 focus:bg-white/80 transition-colors";

// Selects get a dashed border instead of the native dropdown arrow — that
// arrow was eating into the little horizontal room these columns have and
// crowding the text; the dashed style is the "something different" cue
// that this field opens a list, with no icon competing for space.
const selectClass = `${cellClass} appearance-none cursor-pointer border-dashed`;

// Rows without a recognized rep (shouldn't normally happen — assignedRep is
// required — but legacy/imported data isn't guaranteed to match the union at
// runtime) fall back to the coral "needs attention" tone.
const UNASSIGNED_COLOR = "#eda18f";

type ColumnKey =
  | "type"
  | "city"
  | "province"
  | "country"
  | "postalCode"
  | "email"
  | "phone"
  | "brands"
  | "specialties"
  | "assignedRep"
  | "status"
  | "alarm";

const ALL_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "type", label: "Tipo" },
  { key: "city", label: "Ciudad" },
  { key: "province", label: "Provincia" },
  { key: "country", label: "País" },
  { key: "postalCode", label: "C.P." },
  { key: "email", label: "Email" },
  { key: "phone", label: "Teléfono" },
  { key: "brands", label: "Marcas" },
  { key: "specialties", label: "Especialidades" },
  { key: "assignedRep", label: "Comercial" },
  { key: "status", label: "Estado" },
  { key: "alarm", label: "Alarma" },
];

const DEFAULT_HIDDEN: ColumnKey[] = ["country", "postalCode", "brands", "specialties"];

function joinList(list: string[]): string {
  return list.join(", ");
}

function splitList(text: string): string[] {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function DatabasePage({ companies, onUpdate, onDelete }: Props) {
  const [query, setQuery] = useState("");
  const [hiddenColumns, setHiddenColumns] = useState<Set<ColumnKey>>(new Set(DEFAULT_HIDDEN));
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const q = query.trim().toLowerCase();
  const rows = q
    ? companies.filter((c) => `${c.name} ${c.city} ${c.province} ${c.contact.email ?? ""}`.toLowerCase().includes(q))
    : companies;

  const patchContact = (c: Company, patch: Partial<Company["contact"]>) =>
    onUpdate(c.id, { contact: { ...c.contact, ...patch } });

  const rowColor = (c: Company) => REPS[c.assignedRep]?.color ?? UNASSIGNED_COLOR;
  // Fully opaque, just lightened toward white — kept solid on purpose (not
  // translucent) so the tint per rep stays clear and consistent.
  const rowBg = (c: Company) => `color-mix(in srgb, ${rowColor(c)} 55%, white)`;

  const visibleColumns = ALL_COLUMNS.filter((col) => !hiddenColumns.has(col.key));
  const hiddenColumnDefs = ALL_COLUMNS.filter((col) => hiddenColumns.has(col.key));

  const hideColumn = (key: ColumnKey) => setHiddenColumns((prev) => new Set(prev).add(key));
  const showColumn = (key: ColumnKey) =>
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });

  const renderCell = (c: Company, key: ColumnKey) => {
    switch (key) {
      case "type":
        return (
          <select className={selectClass} value={c.type} onChange={(e) => onUpdate(c.id, { type: e.target.value })}>
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t} className="text-black">
                {t}
              </option>
            ))}
          </select>
        );
      case "city":
        return <input className={cellClass} value={c.city} onChange={(e) => onUpdate(c.id, { city: e.target.value })} />;
      case "province":
        return (
          <input className={cellClass} value={c.province} onChange={(e) => onUpdate(c.id, { province: e.target.value })} />
        );
      case "country":
        return (
          <input className={cellClass} value={c.country} onChange={(e) => onUpdate(c.id, { country: e.target.value })} />
        );
      case "postalCode":
        return (
          <input
            className={cellClass}
            value={c.postalCode}
            onChange={(e) => onUpdate(c.id, { postalCode: e.target.value })}
          />
        );
      case "email":
        return (
          <input
            className={cellClass}
            value={c.contact.email ?? ""}
            placeholder="—"
            onChange={(e) => patchContact(c, { email: e.target.value })}
          />
        );
      case "phone":
        return (
          <input
            className={cellClass}
            value={c.contact.phone ?? ""}
            placeholder="—"
            onChange={(e) => patchContact(c, { phone: e.target.value })}
          />
        );
      case "brands":
        return (
          <input
            className={cellClass}
            value={joinList(c.brands)}
            placeholder="—"
            onChange={(e) => onUpdate(c.id, { brands: splitList(e.target.value) })}
          />
        );
      case "specialties":
        return (
          <input
            className={cellClass}
            value={joinList(c.specialties)}
            placeholder="—"
            onChange={(e) => onUpdate(c.id, { specialties: splitList(e.target.value) })}
          />
        );
      case "assignedRep":
        return (
          <select
            className={selectClass}
            value={c.assignedRep}
            onChange={(e) => onUpdate(c.id, { assignedRep: e.target.value as RepId })}
          >
            {Object.values(REPS).map((r) => (
              <option key={r.id} value={r.id} className="text-black">
                {r.name}
              </option>
            ))}
          </select>
        );
      case "status":
        return (
          <select
            className={selectClass}
            value={c.status}
            onChange={(e) => onUpdate(c.id, { status: e.target.value as CompanyStatus })}
          >
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key} className="text-black">
                {cfg.label}
              </option>
            ))}
          </select>
        );
      case "alarm":
        return (
          <select
            className={selectClass}
            value={c.alarm}
            onChange={(e) => onUpdate(c.id, { alarm: e.target.value as AlarmLevel })}
          >
            {Object.entries(ALARM_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key} className="text-black">
                {cfg.label}
              </option>
            ))}
          </select>
        );
    }
  };

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      {/* Same treatment as LoginPage: a fixed, full-viewport cloud background —
          not confined to this component's own box — so it covers the whole app. */}
      <div className="fixed inset-0 -z-10 overflow-hidden" style={{ background: "#0b1220" }}>
        <div className="login-cloud login-cloud-a" style={{ width: 640, height: 640, top: "-10%", left: "-10%" }} />
        <div className="login-cloud login-cloud-b" style={{ width: 560, height: 560, bottom: "-15%", right: "-10%" }} />
        <div className="login-cloud login-cloud-c" style={{ width: 420, height: 420, top: "35%", left: "55%" }} />
      </div>

      <div
        className="relative z-10 flex-1 min-h-0 flex flex-col gap-4 rounded-3xl p-6 backdrop-blur-xl w-full"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 30px 60px -20px rgba(0,0,0,0.6)",
        }}
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Datos Clientes</h2>
            <p className="text-xs text-white/50">{rows.length} de {companies.length} clientes</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar..."
                className="bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-white/40 outline-none focus:border-[#a8dfcf] w-48"
              />
            </div>

            {hiddenColumnDefs.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setAddMenuOpen((v) => !v)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10"
                >
                  <Plus size={13} /> Columna
                </button>
                {addMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setAddMenuOpen(false)} />
                    <div className="absolute top-full right-0 mt-2 z-50 rounded-2xl p-1.5 w-44 bg-[#141a2b] border border-white/10 shadow-xl animate-fade-in-up">
                      {hiddenColumnDefs.map((col) => (
                        <button
                          key={col.key}
                          onClick={() => {
                            showColumn(col.key);
                            setAddMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left text-xs text-white/80 hover:bg-white/10 transition-colors"
                        >
                          <Plus size={11} /> {col.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            <button
              onClick={() => exportCompaniesCSV(rows)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10"
            >
              <FileDown size={13} /> CSV
            </button>
            <button
              onClick={() => exportCompaniesXLSX(rows)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#a8dfcf]/60 text-black/80 font-medium hover:bg-[#a8dfcf]/80"
            >
              <FileSpreadsheet size={13} /> Excel
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto rounded-2xl border border-white/10 bg-black/20">
          <table
            className="text-[13px]"
            style={{ borderCollapse: "separate", borderSpacing: "0 4px", minWidth: 1100, width: "100%" }}
          >
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#141a2b]">
                <th className="text-left font-medium text-white/50 uppercase tracking-wide text-[10px] px-2 py-2 border-b border-white/10 whitespace-nowrap">
                  Nombre
                </th>
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    className="text-left font-medium text-white/50 uppercase tracking-wide text-[10px] px-2 py-2 border-b border-white/10 whitespace-nowrap"
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      <button
                        onClick={() => hideColumn(col.key)}
                        title={`Quitar columna ${col.label}`}
                        className="text-white/30 hover:text-[#eda18f]"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  </th>
                ))}
                <th className="text-left font-medium text-white/50 uppercase tracking-wide text-[10px] px-2 py-2 border-b border-white/10 whitespace-nowrap" />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const bg = rowBg(c);
                return (
                  <tr key={c.id} className="hover:brightness-95 transition-[filter]">
                    <td className="pl-3 pr-1 py-1 rounded-l-xl" style={{ background: bg }}>
                      <div className="flex items-center gap-1">
                        <input
                          className={cellClass}
                          value={c.name}
                          onChange={(e) => onUpdate(c.id, { name: e.target.value })}
                        />
                        {c.needsReview && (
                          <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-black/70 text-white whitespace-nowrap">
                            Revisar
                          </span>
                        )}
                      </div>
                    </td>
                    {visibleColumns.map((col) => (
                      <td key={col.key} className="px-1 py-1" style={{ background: bg }}>
                        {renderCell(c, col.key)}
                      </td>
                    ))}
                    <td className="pl-2 pr-3 py-1 text-right rounded-r-xl" style={{ background: bg }}>
                      <button
                        onClick={() => onDelete(c.id)}
                        className="text-[10px] text-black/40 hover:text-[#b9503a]"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

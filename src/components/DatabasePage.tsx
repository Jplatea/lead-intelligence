import { useState } from "react";
import { FileDown, FileSpreadsheet, Search } from "lucide-react";
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

// Rows without a recognized rep (shouldn't normally happen — assignedRep is
// required — but legacy/imported data isn't guaranteed to match the union at
// runtime) fall back to the coral "needs attention" tone.
const UNASSIGNED_COLOR = "#eda18f";

export function DatabasePage({ companies, onUpdate, onDelete }: Props) {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const rows = q
    ? companies.filter((c) => `${c.name} ${c.city} ${c.province} ${c.contact.email ?? ""}`.toLowerCase().includes(q))
    : companies;

  const patchContact = (c: Company, patch: Partial<Company["contact"]>) =>
    onUpdate(c.id, { contact: { ...c.contact, ...patch } });

  const rowColor = (c: Company) => REPS[c.assignedRep]?.color ?? UNASSIGNED_COLOR;
  // Lightened for the row fill so the pastel reads softer against the dark card.
  const rowBg = (c: Company) => `color-mix(in srgb, ${rowColor(c)} 55%, white)`;

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
                className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-white/40 outline-none focus:border-[#a8dfcf] w-48"
              />
            </div>
            <button
              onClick={() => exportCompaniesCSV(rows)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-white hover:bg-white/15"
            >
              <FileDown size={13} /> CSV
            </button>
            <button
              onClick={() => exportCompaniesXLSX(rows)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#a8dfcf]/90 text-black/80 font-medium hover:bg-[#93d3bd]"
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
                {[
                  "Nombre",
                  "Tipo",
                  "Ciudad",
                  "Provincia",
                  "Email",
                  "Teléfono",
                  "Comercial",
                  "Estado",
                  "Alarma",
                  "",
                ].map((h) => (
                  <th key={h} className="text-left font-medium text-white/50 uppercase tracking-wide text-[10px] px-2 py-2 border-b border-white/10 whitespace-nowrap">
                    {h}
                  </th>
                ))}
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
                    <td className="px-1 py-1" style={{ background: bg }}>
                      <select
                        className={cellClass}
                        value={c.type}
                        onChange={(e) => onUpdate(c.id, { type: e.target.value })}
                      >
                        {TYPE_OPTIONS.map((t) => (
                          <option key={t} value={t} className="text-black">
                            {t}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-1 py-1" style={{ background: bg }}>
                      <input className={cellClass} value={c.city} onChange={(e) => onUpdate(c.id, { city: e.target.value })} />
                    </td>
                    <td className="px-1 py-1" style={{ background: bg }}>
                      <input className={cellClass} value={c.province} onChange={(e) => onUpdate(c.id, { province: e.target.value })} />
                    </td>
                    <td className="px-1 py-1" style={{ background: bg }}>
                      <input
                        className={cellClass}
                        value={c.contact.email ?? ""}
                        placeholder="—"
                        onChange={(e) => patchContact(c, { email: e.target.value })}
                      />
                    </td>
                    <td className="px-1 py-1" style={{ background: bg }}>
                      <input
                        className={cellClass}
                        value={c.contact.phone ?? ""}
                        placeholder="—"
                        onChange={(e) => patchContact(c, { phone: e.target.value })}
                      />
                    </td>
                    <td className="px-1 py-1" style={{ background: bg }}>
                      <select
                        className={cellClass}
                        value={c.assignedRep}
                        onChange={(e) => onUpdate(c.id, { assignedRep: e.target.value as RepId })}
                      >
                        {Object.values(REPS).map((r) => (
                          <option key={r.id} value={r.id} className="text-black">
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-1 py-1" style={{ background: bg }}>
                      <select
                        className={cellClass}
                        value={c.status}
                        onChange={(e) => onUpdate(c.id, { status: e.target.value as CompanyStatus })}
                      >
                        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                          <option key={key} value={key} className="text-black">
                            {cfg.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-1 py-1" style={{ background: bg }}>
                      <select
                        className={cellClass}
                        value={c.alarm}
                        onChange={(e) => onUpdate(c.id, { alarm: e.target.value as AlarmLevel })}
                      >
                        {Object.entries(ALARM_CONFIG).map(([key, cfg]) => (
                          <option key={key} value={key} className="text-black">
                            {cfg.label}
                          </option>
                        ))}
                      </select>
                    </td>
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

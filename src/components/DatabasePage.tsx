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

const cellClass =
  "w-full bg-white/10 backdrop-blur-sm outline-none text-xs text-white placeholder:text-white/40 rounded-lg px-2 py-1.5 border border-white/10 focus:border-[#a8dfcf] focus:bg-white/20 transition-colors";

export function DatabasePage({ companies, onUpdate, onDelete }: Props) {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const rows = q
    ? companies.filter((c) => `${c.name} ${c.city} ${c.province} ${c.contact.email ?? ""}`.toLowerCase().includes(q))
    : companies;

  const patchContact = (c: Company, patch: Partial<Company["contact"]>) =>
    onUpdate(c.id, { contact: { ...c.contact, ...patch } });

  return (
    <div className="relative flex-1 min-h-[70vh] rounded-3xl overflow-hidden" style={{ background: "#0b1220" }}>
      <div className="login-cloud login-cloud-a" style={{ width: 560, height: 560, top: "-15%", left: "-10%" }} />
      <div className="login-cloud login-cloud-b" style={{ width: 500, height: 500, bottom: "-20%", right: "-8%" }} />
      <div className="login-cloud login-cloud-c" style={{ width: 380, height: 380, top: "30%", left: "60%" }} />

      <div className="relative z-10 p-5 flex flex-col gap-4 h-full">
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

        <div className="flex-1 overflow-auto rounded-2xl border border-white/15 bg-white/[0.04] backdrop-blur-xl">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="bg-white/10 backdrop-blur-xl">
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
              {rows.map((c) => (
                <tr key={c.id} className={`border-b border-white/5 ${c.needsReview ? "bg-[#eda18f]/10" : ""} hover:bg-white/[0.06]`}>
                  <td className="px-1 py-1">
                    <input className={cellClass} value={c.name} onChange={(e) => onUpdate(c.id, { name: e.target.value })} />
                  </td>
                  <td className="px-1 py-1">
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
                  <td className="px-1 py-1">
                    <input className={cellClass} value={c.city} onChange={(e) => onUpdate(c.id, { city: e.target.value })} />
                  </td>
                  <td className="px-1 py-1">
                    <input className={cellClass} value={c.province} onChange={(e) => onUpdate(c.id, { province: e.target.value })} />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      className={cellClass}
                      value={c.contact.email ?? ""}
                      placeholder="—"
                      onChange={(e) => patchContact(c, { email: e.target.value })}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      className={cellClass}
                      value={c.contact.phone ?? ""}
                      placeholder="—"
                      onChange={(e) => patchContact(c, { phone: e.target.value })}
                    />
                  </td>
                  <td className="px-1 py-1">
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
                  <td className="px-1 py-1">
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
                  <td className="px-1 py-1">
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
                  <td className="px-2 text-right">
                    <button
                      onClick={() => onDelete(c.id)}
                      className="text-[10px] text-white/40 hover:text-[#eda18f]"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

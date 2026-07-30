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
  "w-full bg-white/40 backdrop-blur-sm outline-none text-xs text-neutral-800 placeholder:text-neutral-400 rounded-lg px-2 py-1.5 border border-black/10 focus:border-[#2a9678] focus:bg-white/80 transition-colors";

export function DatabasePage({ companies, onUpdate, onDelete }: Props) {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const rows = q
    ? companies.filter((c) => `${c.name} ${c.city} ${c.province} ${c.contact.email ?? ""}`.toLowerCase().includes(q))
    : companies;

  const patchContact = (c: Company, patch: Partial<Company["contact"]>) =>
    onUpdate(c.id, { contact: { ...c.contact, ...patch } });

  return (
    <div className="relative flex flex-col h-[78vh] rounded-3xl overflow-hidden bg-[var(--color-surface)]">
      <div
        className="login-cloud login-cloud-a"
        style={{ width: 900, height: 900, top: "-30%", left: "-15%", mixBlendMode: "normal", opacity: 0.55 }}
      />
      <div
        className="login-cloud login-cloud-b"
        style={{ width: 850, height: 850, bottom: "-35%", right: "-15%", mixBlendMode: "normal", opacity: 0.55 }}
      />
      <div
        className="login-cloud login-cloud-c"
        style={{ width: 700, height: 700, top: "20%", left: "40%", mixBlendMode: "normal", opacity: 0.5 }}
      />

      <div className="relative z-10 flex-1 min-h-0 flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">Datos Clientes</h2>
            <p className="text-xs text-neutral-500">{rows.length} de {companies.length} clientes</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar..."
                className="bg-white/40 backdrop-blur-sm border border-black/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-800 placeholder:text-neutral-400 outline-none focus:border-[#2a9678] w-48"
              />
            </div>
            <button
              onClick={() => exportCompaniesCSV(rows)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/40 backdrop-blur-sm border border-black/10 text-neutral-700 hover:bg-white/60"
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

        <div className="flex-1 min-h-0 overflow-auto rounded-2xl border border-black/10 bg-white/25 backdrop-blur-md">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="bg-white/50 backdrop-blur-xl">
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
                  <th key={h} className="text-left font-medium text-neutral-500 uppercase tracking-wide text-[10px] px-2 py-2 border-b border-black/10 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className={`border-b border-black/5 ${c.needsReview ? "bg-[#eda18f]/15" : ""} hover:bg-white/40`}>
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
                        <option key={t} value={t}>
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
                        <option key={r.id} value={r.id}>
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
                        <option key={key} value={key}>
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
                        <option key={key} value={key}>
                          {cfg.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 text-right">
                    <button
                      onClick={() => onDelete(c.id)}
                      className="text-[10px] text-neutral-400 hover:text-[#b9503a]"
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

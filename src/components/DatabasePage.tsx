import { useMemo, useState } from "react";
import { Mail, Search, SlidersHorizontal } from "lucide-react";
import type { Company, MailingContact } from "../types";
import { REPS, STATUS_CONFIG, ALARM_CONFIG } from "../data/config";

interface Props {
  companies: Company[];
  mailingContacts: MailingContact[];
  onRowClick: (company: Company, x: number, y: number) => void;
  onSelectContact: (id: string) => void;
}

// Bubble width, kept in sync with RowActionBubble.tsx — used only to clamp
// the click point away from the viewport edges so the bubble never renders
// partly off-screen.
const BUBBLE_W = 224;

type Dataset = "clients" | "newsletter";

// A styled dark tooltip (matching the app's own visual language) instead of
// the browser's plain default title-attribute tooltip — shows the cell's
// full value on hover, since Nombre/columns are truncated to a single line.
function CellTip({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <span className="relative inline-block group/tip max-w-full align-middle">
      {children}
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-20 opacity-0 scale-95 group-hover/tip:opacity-100 group-hover/tip:scale-100 transition-[opacity,transform] duration-150 whitespace-nowrap rounded-lg bg-neutral-900 text-white text-[11px] font-medium px-2.5 py-1.5 shadow-lg">
        {value}
      </span>
    </span>
  );
}

// Rows without a recognized rep (shouldn't normally happen — assignedRep is
// required — but legacy/imported data isn't guaranteed to match the union at
// runtime) fall back to the coral "needs attention" tone.
const UNASSIGNED_COLOR = "#eda18f";

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="text-xs pl-7 pr-3 py-1.5 rounded-lg border border-black/10 bg-white/70 text-neutral-800 placeholder:text-neutral-400 outline-none focus:border-black/25 w-56"
      />
    </div>
  );
}

function ColumnManager<K extends string>({
  options,
  visible,
  onToggle,
}: {
  options: { key: K; label: string }[];
  visible: Set<K>;
  onToggle: (key: K) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${
          open ? "bg-white border-black/20 text-neutral-900" : "bg-white/70 border-black/10 text-neutral-600 hover:text-neutral-900"
        }`}
      >
        <SlidersHorizontal size={13} />
        Columnas
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 mt-1.5 z-30 rounded-xl bg-white border border-black/10 shadow-lg p-1.5 w-44">
            {options.map((opt) => (
              <label
                key={opt.key}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-neutral-700 hover:bg-black/[0.04] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={visible.has(opt.key)}
                  onChange={() => onToggle(opt.key)}
                  className="accent-neutral-900"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

type ColumnKey = "type" | "city" | "province" | "country" | "email" | "phone" | "assignedRep" | "status" | "alarm";

const ALL_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "type", label: "Tipo" },
  { key: "city", label: "Ciudad" },
  { key: "province", label: "Provincia" },
  { key: "country", label: "País" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Teléfono" },
  { key: "assignedRep", label: "Comercial" },
  { key: "status", label: "Estado" },
  { key: "alarm", label: "Alarma" },
];

type NewsletterColumnKey = "email" | "companyName";

const NEWSLETTER_COLUMNS: { key: NewsletterColumnKey; label: string }[] = [
  { key: "email", label: "Email" },
  { key: "companyName", label: "Empresa" },
];

function cellText(c: Company, key: ColumnKey): string {
  switch (key) {
    case "type":
      return c.type;
    case "city":
      return c.city || "—";
    case "province":
      return c.province || "—";
    case "country":
      return c.country || "—";
    case "email":
      return c.contact.email || "—";
    case "phone":
      return c.contact.phone || "—";
    case "assignedRep":
      return REPS[c.assignedRep]?.name ?? "—";
    case "status":
      return STATUS_CONFIG[c.status]?.label ?? "—";
    case "alarm":
      return ALARM_CONFIG[c.alarm]?.label ?? "—";
  }
}

// This page is a read-only report: no editing/deleting rows — just the data
// laid out plainly on the rep's color. Search and column visibility are
// display-only controls (nothing here mutates a company/contact record).
export function DatabasePage({ companies, mailingContacts, onRowClick, onSelectContact }: Props) {
  const [dataset, setDataset] = useState<Dataset>("clients");

  const [clientQuery, setClientQuery] = useState("");
  const [visibleCols, setVisibleCols] = useState<Set<ColumnKey>>(new Set(ALL_COLUMNS.map((c) => c.key)));
  const toggleCol = (key: ColumnKey) =>
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const shownColumns = ALL_COLUMNS.filter((col) => visibleCols.has(col.key));

  const [nlQuery, setNlQuery] = useState("");
  const [nlVisibleCols, setNlVisibleCols] = useState<Set<NewsletterColumnKey>>(
    new Set(NEWSLETTER_COLUMNS.map((c) => c.key))
  );
  const toggleNlCol = (key: NewsletterColumnKey) =>
    setNlVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const shownNlColumns = NEWSLETTER_COLUMNS.filter((col) => nlVisibleCols.has(col.key));

  const rowColor = (c: Company) => REPS[c.assignedRep]?.color ?? UNASSIGNED_COLOR;
  // Fully opaque, just lightened toward white — kept solid on purpose (not
  // translucent) so the tint per rep stays clear and consistent.
  const rowBg = (c: Company) => `color-mix(in srgb, ${rowColor(c)} 55%, white)`;

  const filteredCompanies = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) => {
      const haystack = [c.name, ...ALL_COLUMNS.map((col) => cellText(c, col.key))].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [companies, clientQuery]);

  const filteredContacts = useMemo(() => {
    const q = nlQuery.trim().toLowerCase();
    if (!q) return mailingContacts;
    return mailingContacts.filter((c) =>
      [c.contactName, c.email, c.companyName].join(" ").toLowerCase().includes(q)
    );
  }, [mailingContacts, nlQuery]);

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      <div
        className="relative z-10 flex-1 min-h-0 flex flex-col gap-4 rounded-3xl p-6 backdrop-blur-xl w-full"
        style={{
          background: "rgba(255,255,255,0.55)",
          border: "1px solid rgba(255,255,255,0.6)",
          boxShadow: "0 30px 60px -20px rgba(33,31,29,0.35)",
        }}
      >
        <div className="flex items-center gap-1 p-0.5 rounded-xl bg-black/[0.05] border border-black/10 self-start">
          {(
            [
              { key: "clients", label: "Clientes" },
              { key: "newsletter", label: "Newsletter" },
            ] as { key: Dataset; label: string }[]
          ).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setDataset(opt.key)}
              className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-colors ${
                dataset === opt.key ? "bg-white shadow-sm text-neutral-900" : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {dataset === "clients" ? (
            <div className="flex-1 min-h-0 flex flex-col gap-4">
              <div className="flex items-end justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="type-h2 text-neutral-900">Datos Clientes</h2>
                  <p className="text-xs text-neutral-500">
                    {filteredCompanies.length} de {companies.length} clientes
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <SearchBox value={clientQuery} onChange={setClientQuery} placeholder="Buscar cliente..." />
                  <ColumnManager options={ALL_COLUMNS} visible={visibleCols} onToggle={toggleCol} />
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-auto rounded-2xl border border-black/10 bg-black/[0.03]">
                <table
                  className="text-[13px]"
                  style={{ borderCollapse: "separate", borderSpacing: "0 4px", minWidth: 1100, width: "100%" }}
                >
                  <thead className="sticky top-0 z-10 bg-surface">
                    <tr>
                      <th className="font-semibold text-neutral-500 tracking-wide text-[13px] px-3 py-2.5 border-b border-black/10 whitespace-nowrap text-left">
                        Nombre
                      </th>
                      {shownColumns.map((col) => (
                        <th
                          key={col.key}
                          className="font-semibold text-neutral-500 tracking-wide text-[13px] px-2 py-2.5 border-b border-black/10 whitespace-nowrap text-left"
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompanies.map((c) => {
                      const bg = rowBg(c);
                      return (
                        <tr
                          key={c.id}
                          className="h-7 cursor-pointer"
                          onClick={(e) => {
                            const x = Math.min(Math.max(e.clientX, BUBBLE_W / 2 + 8), window.innerWidth - BUBBLE_W / 2 - 8);
                            onRowClick(c, x, e.clientY);
                          }}
                        >
                          <td
                            className="pl-3 pr-1 py-1 rounded-l-xl whitespace-nowrap max-w-[160px]"
                            style={{ background: bg }}
                          >
                            <div className="flex items-center gap-1.5 max-w-full">
                              <CellTip value={c.name}>
                                <span className="font-medium text-black truncate block">{c.name}</span>
                              </CellTip>
                              {c.needsReview && (
                                <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-black/70 text-white whitespace-nowrap">
                                  Revisar
                                </span>
                              )}
                            </div>
                          </td>
                          {shownColumns.map((col, i) => (
                            <td
                              key={col.key}
                              className={`px-2 py-1 text-black/80 whitespace-nowrap ${i === shownColumns.length - 1 ? "rounded-r-xl" : ""}`}
                              style={{ background: bg }}
                            >
                              <CellTip value={cellText(c, col.key)}>{cellText(c, col.key)}</CellTip>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col gap-4">
              <div className="flex items-end justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="type-h2 text-neutral-900">Newsletter</h2>
                  <p className="text-xs text-neutral-500">
                    {filteredContacts.length} de {mailingContacts.length} contactos — independiente de la base de clientes.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <SearchBox value={nlQuery} onChange={setNlQuery} placeholder="Buscar contacto..." />
                  <ColumnManager options={NEWSLETTER_COLUMNS} visible={nlVisibleCols} onToggle={toggleNlCol} />
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-auto rounded-2xl border border-black/10 bg-black/[0.03]">
                <table className="text-[13px]" style={{ borderCollapse: "separate", borderSpacing: "0 4px", width: "100%" }}>
                  <thead className="sticky top-0 z-10 bg-surface">
                    <tr>
                      <th className="font-semibold text-neutral-500 tracking-wide text-[13px] px-3 py-2.5 border-b border-black/10 whitespace-nowrap text-left">
                        Nombre contacto
                      </th>
                      {shownNlColumns.map((col) => (
                        <th
                          key={col.key}
                          className="font-semibold text-neutral-500 tracking-wide text-[13px] px-2 py-2.5 border-b border-black/10 whitespace-nowrap text-left"
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContacts.length === 0 && (
                      <tr>
                        <td colSpan={1 + shownNlColumns.length} className="px-3 py-8 text-center text-xs text-neutral-400">
                          Sin contactos todavía.
                        </td>
                      </tr>
                    )}
                    {filteredContacts.map((c) => (
                      <tr
                        key={c.id}
                        onClick={() => onSelectContact(c.id)}
                        className="cursor-pointer"
                      >
                        <td
                          className={`pl-3 pr-1 py-1.5 whitespace-nowrap ${shownNlColumns.length === 0 ? "rounded-r-xl" : "rounded-l-xl"}`}
                          style={{ background: "rgba(167,155,203,0.14)" }}
                        >
                          <div className="flex items-center gap-1.5">
                            <Mail size={12} className="text-[#6a56a0] shrink-0" />
                            <CellTip value={c.contactName || "—"}>
                              <span className="text-black/80">{c.contactName || "—"}</span>
                            </CellTip>
                          </div>
                        </td>
                        {shownNlColumns.map((col, i) => {
                          const value = col.key === "email" ? c.email || "—" : c.companyName || "—";
                          return (
                            <td
                              key={col.key}
                              className={`px-2 py-1.5 text-black/80 whitespace-nowrap ${i === shownNlColumns.length - 1 ? "rounded-r-xl" : ""}`}
                              style={{ background: "rgba(167,155,203,0.14)" }}
                            >
                              <CellTip value={value}>{value}</CellTip>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}

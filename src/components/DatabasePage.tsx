import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Download, Building2, Search, SlidersHorizontal, AlertCircle } from "lucide-react";
import type { Company, MailingContact } from "../types";
import { REPS, STATUS_CONFIG, ALARM_CONFIG } from "../data/config";
import {
  exportCompaniesCSV,
  exportCompaniesXLSX,
  exportMailingContactsCSV,
  exportMailingContactsXLSX,
} from "../lib/exportClients";

interface Props {
  companies: Company[];
  mailingContacts: MailingContact[];
  onOpenCard: (company: Company) => void;
  onOpenCommunication: (company: Company) => void;
  onSelectContact: (id: string) => void;
}

type Dataset = "clients" | "newsletter";

// A styled dark tooltip (matching the app's own visual language) instead of
// the browser's plain default title-attribute tooltip — shows the cell's
// full value on hover, since Nombre/columns are truncated to a single line.
function CellTip({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <span className="relative inline-block min-w-0 max-w-full group/tip align-middle">
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

// A "backup" download — always exports the full dataset (ignores any
// active search filter), since the point is a complete snapshot, not just
// whatever happens to be visible.
function ExportMenu({ onCSV, onXLSX }: { onCSV: () => void; onXLSX: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${
          open ? "bg-white border-black/20 text-neutral-900" : "bg-white/70 border-black/10 text-neutral-600 hover:text-neutral-900"
        }`}
      >
        <Download size={13} />
        Backup
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 mt-1.5 z-30 rounded-xl bg-white border border-black/10 shadow-lg p-1.5 w-36">
            <button
              onClick={() => {
                onCSV();
                setOpen(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-neutral-700 hover:bg-black/[0.04] transition-colors"
            >
              Descargar CSV
            </button>
            <button
              onClick={() => {
                onXLSX();
                setOpen(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-neutral-700 hover:bg-black/[0.04] transition-colors"
            >
              Descargar XLSX
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Any column header is clickable to sort by it: first click ascending,
// second click descending, third click clears back to the natural order.
type SortDir = "asc" | "desc";
interface SortState<K extends string> {
  key: K;
  dir: SortDir;
}

function toggleSort<K extends string>(
  prev: SortState<K> | null,
  key: K
): SortState<K> | null {
  if (!prev || prev.key !== key) return { key, dir: "asc" };
  if (prev.dir === "asc") return { key, dir: "desc" };
  return null;
}

function SortableTh<K extends string>({
  label,
  columnKey,
  sort,
  onSort,
  className,
}: {
  label: string;
  columnKey: K;
  sort: SortState<K> | null;
  onSort: (key: K) => void;
  className?: string;
}) {
  const active = sort?.key === columnKey;
  return (
    <th
      onClick={() => onSort(columnKey)}
      className={`cursor-pointer select-none hover:text-neutral-700 transition-colors ${className ?? ""}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active &&
          (sort.dir === "asc" ? (
            <ChevronUp size={11} className="shrink-0" />
          ) : (
            <ChevronDown size={11} className="shrink-0" />
          ))}
      </span>
    </th>
  );
}

type ColumnKey = "email" | "type" | "city" | "province" | "country" | "phone" | "assignedRep" | "status" | "alarm";

// "email" leads the toggleable columns on purpose: combined with the two
// fixed columns before it (Nombre Empresa, Nombre Contacto), that puts
// Email in column 3 — matching the Newsletter table's own column order so
// the two datasets line up for side-by-side comparison.
const ALL_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "email", label: "Mail" },
  { key: "type", label: "Tipo" },
  { key: "city", label: "Ciudad" },
  { key: "province", label: "Provincia" },
  { key: "country", label: "País" },
  { key: "phone", label: "Teléfono" },
  { key: "assignedRep", label: "Comercial" },
  { key: "status", label: "Estado" },
  { key: "alarm", label: "Alarma" },
];

type NewsletterColumnKey = "contactName" | "email";

const NEWSLETTER_COLUMNS: { key: NewsletterColumnKey; label: string }[] = [
  { key: "contactName", label: "Nombre Contacto" },
  { key: "email", label: "Mail" },
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

type ClientSortKey = "name" | "contactName" | ColumnKey;
function clientSortValue(c: Company, key: ClientSortKey): string {
  if (key === "name") return c.name;
  if (key === "contactName") return c.contact.contactName ?? "";
  return cellText(c, key);
}

type NewsletterSortKey = "companyName" | NewsletterColumnKey;
function nlSortValue(c: MailingContact, key: NewsletterSortKey): string {
  if (key === "companyName") return c.companyName;
  if (key === "email") return c.email;
  return c.contactName;
}

// This page is a read-only report: no editing/deleting rows — just the data
// laid out plainly on the rep's color. Search and column visibility are
// display-only controls (nothing here mutates a company/contact record).
export function DatabasePage({ companies, mailingContacts, onOpenCard, onOpenCommunication, onSelectContact }: Props) {
  const [dataset, setDataset] = useState<Dataset>("clients");

  const [clientQuery, setClientQuery] = useState("");
  const [clientSort, setClientSort] = useState<SortState<ClientSortKey> | null>(null);
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
  const [nlSort, setNlSort] = useState<SortState<NewsletterSortKey> | null>(null);
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
    let list = q
      ? companies.filter((c) => {
          const haystack = [c.name, c.contact.contactName ?? "", ...ALL_COLUMNS.map((col) => cellText(c, col.key))]
            .join(" ")
            .toLowerCase();
          return haystack.includes(q);
        })
      : companies;
    if (clientSort) {
      const { key, dir } = clientSort;
      list = [...list].sort((a, b) => {
        const cmp = clientSortValue(a, key).localeCompare(clientSortValue(b, key), "es", { numeric: true });
        return dir === "asc" ? cmp : -cmp;
      });
    }
    return list;
  }, [companies, clientQuery, clientSort]);

  const filteredContacts = useMemo(() => {
    const q = nlQuery.trim().toLowerCase();
    let list = q
      ? mailingContacts.filter((c) => [c.contactName, c.email, c.companyName].join(" ").toLowerCase().includes(q))
      : mailingContacts;
    if (nlSort) {
      const { key, dir } = nlSort;
      list = [...list].sort((a, b) => {
        const cmp = nlSortValue(a, key).localeCompare(nlSortValue(b, key), "es", { numeric: true });
        return dir === "asc" ? cmp : -cmp;
      });
    }
    return list;
  }, [mailingContacts, nlQuery, nlSort]);

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
                  <ExportMenu
                    onCSV={() => exportCompaniesCSV(companies)}
                    onXLSX={() => exportCompaniesXLSX(companies)}
                  />
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-auto rounded-2xl border border-black/10 bg-black/[0.03]">
                <table
                  className="text-[13px]"
                  style={{ borderCollapse: "separate", borderSpacing: "0 4px", minWidth: 1100, width: "100%" }}
                >
                  <thead className="sticky top-0 z-10 bg-surface">
                    <tr>
                      <th className="bg-surface w-8 font-normal border-b border-black/10" aria-hidden="true"></th>
                      <SortableTh
                        label="Nombre Empresa"
                        columnKey="name"
                        sort={clientSort}
                        onSort={(key) => setClientSort((prev) => toggleSort(prev, key))}
                        className="bg-surface font-medium text-neutral-500 tracking-wide text-[13px] px-2 py-2.5 border-b border-black/10 whitespace-nowrap text-left"
                      />
                      <SortableTh
                        label="Nombre Contacto"
                        columnKey="contactName"
                        sort={clientSort}
                        onSort={(key) => setClientSort((prev) => toggleSort(prev, key))}
                        className="bg-surface font-medium text-neutral-500 tracking-wide text-[13px] px-2 py-2.5 border-b border-black/10 whitespace-nowrap text-left"
                      />
                      {shownColumns.map((col) => (
                        <SortableTh
                          key={col.key}
                          label={col.label}
                          columnKey={col.key}
                          sort={clientSort}
                          onSort={(key) => setClientSort((prev) => toggleSort(prev, key))}
                          className="bg-surface font-medium text-neutral-500 tracking-wide text-[13px] px-2 py-2.5 border-b border-black/10 whitespace-nowrap text-left"
                        />
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompanies.map((c) => {
                      const bg = rowBg(c);
                      return (
                        <tr key={c.id} className="h-7 cursor-pointer" onClick={() => onOpenCard(c)}>
                          <td className="pl-3 pr-1 py-1 rounded-l-xl w-8" style={{ background: bg }}>
                            {c.needsReview && (
                              <CellTip value="Necesita revisión">
                                <AlertCircle size={14} className="text-black/60" />
                              </CellTip>
                            )}
                          </td>
                          <td
                            className="px-2 py-1 whitespace-nowrap max-w-[160px]"
                            style={{ background: bg }}
                          >
                            <CellTip value={c.name}>
                              <span className="font-medium text-black truncate block">{c.name}</span>
                            </CellTip>
                          </td>
                          <td className="px-2 py-1 text-black/80 whitespace-nowrap" style={{ background: bg }}>
                            <CellTip value={c.contact.contactName || "—"}>{c.contact.contactName || "—"}</CellTip>
                          </td>
                          {shownColumns.map((col, i) => (
                            <td
                              key={col.key}
                              onClick={
                                col.key === "email"
                                  ? (e) => {
                                      e.stopPropagation();
                                      onOpenCommunication(c);
                                    }
                                  : undefined
                              }
                              className={`px-2 py-1 whitespace-nowrap ${i === shownColumns.length - 1 ? "rounded-r-xl" : ""} ${
                                col.key === "email" ? "cursor-pointer" : "text-black/80"
                              }`}
                              style={{ background: bg }}
                            >
                              <CellTip value={cellText(c, col.key)}>
                                {col.key === "email" && cellText(c, col.key) !== "—" ? (
                                  <span className="inline-block bg-neutral-900 text-white text-[11px] font-medium px-2 py-0.5 rounded-full hover:bg-neutral-700 transition-colors">
                                    {cellText(c, col.key)}
                                  </span>
                                ) : (
                                  cellText(c, col.key)
                                )}
                              </CellTip>
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
                  <ExportMenu
                    onCSV={() => exportMailingContactsCSV(mailingContacts)}
                    onXLSX={() => exportMailingContactsXLSX(mailingContacts)}
                  />
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-auto rounded-2xl border border-black/10 bg-black/[0.03]">
                <table className="text-[13px]" style={{ borderCollapse: "separate", borderSpacing: "0 4px", width: "100%" }}>
                  <thead className="sticky top-0 z-10 bg-surface">
                    <tr>
                      <SortableTh
                        label="Nombre Empresa"
                        columnKey="companyName"
                        sort={nlSort}
                        onSort={(key) => setNlSort((prev) => toggleSort(prev, key))}
                        className="font-medium text-neutral-500 tracking-wide text-[13px] px-3 py-2.5 border-b border-black/10 whitespace-nowrap text-left"
                      />
                      {shownNlColumns.map((col) => (
                        <SortableTh
                          key={col.key}
                          label={col.label}
                          columnKey={col.key}
                          sort={nlSort}
                          onSort={(key) => setNlSort((prev) => toggleSort(prev, key))}
                          className="bg-surface font-medium text-neutral-500 tracking-wide text-[13px] px-2 py-2.5 border-b border-black/10 whitespace-nowrap text-left"
                        />
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
                            <Building2 size={12} className="text-[#6a56a0] shrink-0" />
                            <CellTip value={c.companyName || "—"}>
                              <span className="text-black/80">{c.companyName || "—"}</span>
                            </CellTip>
                          </div>
                        </td>
                        {shownNlColumns.map((col, i) => {
                          const value = col.key === "email" ? c.email || "—" : c.contactName || "—";
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

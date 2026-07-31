import { useRef, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Columns3,
  FileDown,
  FileSpreadsheet,
  Loader2,
  Mail,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import type { Company, RepId, CompanyStatus, AlarmLevel, MailingContact } from "../types";
import { REPS, STATUS_CONFIG, ALARM_CONFIG, TYPE_OPTIONS, PROVINCE_OPTIONS_ES, PROVINCE_OPTIONS_PT } from "../data/config";
import { exportCompaniesCSV, exportCompaniesXLSX } from "../lib/exportClients";
import { parseContactsCSV, parseContactsXLSX, rowsToMailingContacts } from "../lib/importMailingContacts";
import { CustomSelect } from "./CustomSelect";

interface Props {
  companies: Company[];
  onUpdate: (id: string, patch: Partial<Company>) => void;
  onDelete: (id: string) => void;
  mailingContacts: MailingContact[];
  onUpdateMailingContact: (id: string, patch: Partial<MailingContact>) => void;
  onDeleteMailingContact: (id: string) => void;
  onImportMailingContacts: (contacts: MailingContact[]) => void;
}

type Dataset = "clients" | "newsletter";

// No backdrop-blur here: with 100+ rows this class is applied to
// thousands of inputs/selects, and per-element backdrop-filter is what
// was causing the visible scroll jank/"loading in" look. The frosted
// look still comes from the single backdrop-blur on the outer card.
const cellClass =
  "w-full bg-transparent outline-none text-[14px] font-medium text-black placeholder:text-black/40 rounded-lg px-2 py-1 border border-black/40 focus:border-black transition-colors";

// Selects get a dashed gray border instead of the native dropdown arrow —
// that arrow was eating into the little horizontal room these columns have
// and crowding the text; the dashed style (plus the gray vs. black tone) is
// the "something different" cue that this field opens a list.
const selectClass =
  "w-full bg-transparent outline-none text-[14px] font-medium text-black rounded-lg px-2 py-1 border border-dashed border-neutral-400 focus:border-neutral-600 appearance-none cursor-pointer transition-colors";

// Rows without a recognized rep (shouldn't normally happen — assignedRep is
// required — but legacy/imported data isn't guaranteed to match the union at
// runtime) fall back to the coral "needs attention" tone.
const UNASSIGNED_COLOR = "#eda18f";

type SortKey = "name" | ColumnKey;

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

export function DatabasePage({
  companies,
  onUpdate,
  onDelete,
  mailingContacts,
  onUpdateMailingContact,
  onDeleteMailingContact,
  onImportMailingContacts,
}: Props) {
  const [dataset, setDataset] = useState<Dataset>("clients");
  const [query, setQuery] = useState("");
  const [hiddenColumns, setHiddenColumns] = useState<Set<ColumnKey>>(new Set(DEFAULT_HIDDEN));
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);
  const [newsletterQuery, setNewsletterQuery] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const nq = newsletterQuery.trim().toLowerCase();
  const newsletterRows = nq
    ? mailingContacts.filter((c) => `${c.contactName} ${c.email} ${c.companyName}`.toLowerCase().includes(nq))
    : mailingContacts;

  const handleImportFile = async (file: File) => {
    setImportError(null);
    const ext = file.name.split(".").pop()?.toLowerCase();
    let rows;
    try {
      if (ext === "csv") rows = parseContactsCSV(await file.text());
      else if (ext === "xlsx" || ext === "xls") rows = parseContactsXLSX(await file.arrayBuffer());
      else {
        setImportError("Formato no reconocido. Usa un archivo .csv, .xlsx o .xls.");
        return;
      }
    } catch {
      setImportError("No se pudo leer el archivo. Comprueba que el formato sea correcto.");
      return;
    }
    if (rows.length === 0) {
      setImportError("No se encontraron contactos con email en el archivo.");
      return;
    }
    setImporting(true);
    const { contacts: imported } = rowsToMailingContacts(rows, mailingContacts);
    if (imported.length > 0) onImportMailingContacts(imported);
    setImporting(false);
  };

  const q = query.trim().toLowerCase();
  const filteredRows = q
    ? companies.filter((c) => `${c.name} ${c.city} ${c.province} ${c.contact.email ?? ""}`.toLowerCase().includes(q))
    : companies;

  const sortValue = (c: Company, key: SortKey): string => {
    switch (key) {
      case "name":
        return c.name;
      case "email":
        return c.contact.email ?? "";
      case "phone":
        return c.contact.phone ?? "";
      case "brands":
        return joinList(c.brands);
      case "specialties":
        return joinList(c.specialties);
      case "assignedRep":
        return REPS[c.assignedRep]?.name ?? "";
      case "status":
        return STATUS_CONFIG[c.status]?.label ?? "";
      case "alarm":
        return ALARM_CONFIG[c.alarm]?.label ?? "";
      default:
        return String(c[key] ?? "");
    }
  };

  const rows = useMemo(() => {
    if (!sort) return filteredRows;
    const sorted = [...filteredRows].sort((a, b) => sortValue(a, sort.key).localeCompare(sortValue(b, sort.key), "es"));
    return sort.dir === "desc" ? sorted.reverse() : sorted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredRows, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((prev) => (prev && prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  const patchContact = (c: Company, patch: Partial<Company["contact"]>) =>
    onUpdate(c.id, { contact: { ...c.contact, ...patch } });

  const rowColor = (c: Company) => REPS[c.assignedRep]?.color ?? UNASSIGNED_COLOR;
  // Fully opaque, just lightened toward white — kept solid on purpose (not
  // translucent) so the tint per rep stays clear and consistent.
  const rowBg = (c: Company) => `color-mix(in srgb, ${rowColor(c)} 55%, white)`;

  const visibleColumns = ALL_COLUMNS.filter((col) => !hiddenColumns.has(col.key));

  const toggleColumn = (key: ColumnKey) =>
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const renderCell = (c: Company, key: ColumnKey) => {
    switch (key) {
      case "type":
        return (
          <CustomSelect
            triggerClassName={selectClass}
            value={c.type}
            options={TYPE_OPTIONS.map((t) => ({ value: t, label: t }))}
            onChange={(v) => onUpdate(c.id, { type: v })}
          />
        );
      case "city":
        return <input className={cellClass} value={c.city} onChange={(e) => onUpdate(c.id, { city: e.target.value })} />;
      case "province": {
        const known = PROVINCE_OPTIONS_ES.includes(c.province) || PROVINCE_OPTIONS_PT.includes(c.province);
        const options = [
          ...(known ? [] : [{ value: c.province, label: c.province }]),
          ...PROVINCE_OPTIONS_ES.map((p) => ({ value: p, label: p, group: "España" })),
          ...PROVINCE_OPTIONS_PT.map((p) => ({ value: p, label: p, group: "Portugal" })),
        ];
        return (
          <CustomSelect
            triggerClassName={selectClass}
            value={c.province}
            options={options}
            onChange={(v) => onUpdate(c.id, { province: v })}
          />
        );
      }
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
          <CustomSelect
            triggerClassName={selectClass}
            value={c.assignedRep}
            options={Object.values(REPS).map((r) => ({ value: r.id, label: r.name }))}
            onChange={(v) => onUpdate(c.id, { assignedRep: v as RepId })}
          />
        );
      case "status":
        return (
          <CustomSelect
            triggerClassName={selectClass}
            value={c.status}
            options={Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({ value: key, label: cfg.label }))}
            onChange={(v) => onUpdate(c.id, { status: v as CompanyStatus })}
          />
        );
      case "alarm":
        return (
          <CustomSelect
            triggerClassName={selectClass}
            value={c.alarm}
            options={Object.entries(ALARM_CONFIG).map(([key, cfg]) => ({ value: key, label: cfg.label }))}
            onChange={(v) => onUpdate(c.id, { alarm: v as AlarmLevel })}
          />
        );
    }
  };

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

        <AnimatePresence mode="wait" initial={false}>
          {dataset === "clients" ? (
            <motion.div
              key="clients"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="flex-1 min-h-0 flex flex-col gap-4"
            >
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
                      className="bg-black/[0.03] border border-black/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-800 placeholder:text-neutral-400 outline-none focus:border-[#a8dfcf] w-48"
                    />
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setColumnsMenuOpen((v) => !v)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-black/[0.03] border border-black/10 text-neutral-700 hover:bg-black/[0.06]"
                    >
                      <Columns3 size={13} /> Añadir/Eliminar
                    </button>
                    {columnsMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setColumnsMenuOpen(false)} />
                        <div className="absolute top-full right-0 mt-2 z-50 glass rounded-2xl p-1.5 w-52 shadow-xl animate-fade-in-up max-h-72 overflow-y-auto">
                          {ALL_COLUMNS.map((col) => {
                            const visible = !hiddenColumns.has(col.key);
                            return (
                              <button
                                key={col.key}
                                onClick={() => toggleColumn(col.key)}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left text-xs text-neutral-700 hover:bg-black/[0.04] transition-colors"
                              >
                                <span
                                  className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border ${
                                    visible ? "bg-[#a8dfcf] border-[#a8dfcf]" : "border-black/20"
                                  }`}
                                >
                                  {visible && <Check size={10} className="text-black/80" />}
                                </span>
                                {col.label}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => exportCompaniesCSV(rows)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-black/[0.03] border border-black/10 text-neutral-700 hover:bg-black/[0.06]"
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

              <div className="flex-1 min-h-0 overflow-auto rounded-2xl border border-black/10 bg-black/[0.03]">
                <table
                  className="text-[13px]"
                  style={{ borderCollapse: "separate", borderSpacing: "0 4px", minWidth: 1100, width: "100%" }}
                >
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <th className="font-semibold text-neutral-500 uppercase tracking-wide text-[13px] px-3 py-2.5 border-b border-black/10 whitespace-nowrap">
                        <button
                          onClick={() => toggleSort("name")}
                          className="w-full flex items-center justify-center gap-1 hover:text-neutral-800"
                        >
                          Nombre
                          {sort?.key === "name" &&
                            (sort.dir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
                        </button>
                      </th>
                      {visibleColumns.map((col) => (
                        <th
                          key={col.key}
                          className="font-semibold text-neutral-500 uppercase tracking-wide text-[13px] px-2 py-2.5 border-b border-black/10 whitespace-nowrap"
                        >
                          <button
                            onClick={() => toggleSort(col.key)}
                            className="w-full flex items-center justify-center gap-1 hover:text-neutral-800"
                          >
                            {col.label}
                            {sort?.key === col.key &&
                              (sort.dir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
                          </button>
                        </th>
                      ))}
                      <th className="font-semibold text-neutral-500 uppercase tracking-wide text-[13px] px-2 py-2.5 border-b border-black/10 whitespace-nowrap" />
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
                              title="Eliminar cliente"
                              className="text-black/40 hover:text-[#b9503a] p-1 rounded-lg hover:bg-black/5"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="newsletter"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="flex-1 min-h-0 flex flex-col gap-4"
            >
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-neutral-900">Newsletter</h2>
                  <p className="text-xs text-neutral-500">
                    {newsletterRows.length} de {mailingContacts.length} contactos — independiente de la base de clientes.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      value={newsletterQuery}
                      onChange={(e) => setNewsletterQuery(e.target.value)}
                      placeholder="Buscar..."
                      className="bg-black/[0.03] border border-black/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-800 placeholder:text-neutral-400 outline-none focus:border-[#a8dfcf] w-48"
                    />
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImportFile(file);
                      e.target.value = "";
                    }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#a8dfcf]/60 text-black/80 font-medium hover:bg-[#a8dfcf]/80 disabled:opacity-50"
                  >
                    {importing ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                    Importar
                  </button>
                </div>
              </div>

              {importError && <p className="text-xs text-[#b9503a]">{importError}</p>}

              <div className="flex-1 min-h-0 overflow-auto rounded-2xl border border-black/10 bg-black/[0.03]">
                <table className="text-[13px]" style={{ borderCollapse: "separate", borderSpacing: "0 4px", width: "100%" }}>
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <th className="font-semibold text-neutral-500 uppercase tracking-wide text-[13px] px-3 py-2.5 border-b border-black/10 whitespace-nowrap text-left">
                        Nombre contacto
                      </th>
                      <th className="font-semibold text-neutral-500 uppercase tracking-wide text-[13px] px-2 py-2.5 border-b border-black/10 whitespace-nowrap text-left">
                        Email
                      </th>
                      <th className="font-semibold text-neutral-500 uppercase tracking-wide text-[13px] px-2 py-2.5 border-b border-black/10 whitespace-nowrap text-left">
                        Empresa
                      </th>
                      <th className="font-semibold text-neutral-500 uppercase tracking-wide text-[13px] px-2 py-2.5 border-b border-black/10 whitespace-nowrap" />
                    </tr>
                  </thead>
                  <tbody>
                    {newsletterRows.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-center text-xs text-neutral-400">
                          Sin contactos todavía — importa un CSV o Excel con nombre, email y empresa.
                        </td>
                      </tr>
                    )}
                    {newsletterRows.map((c) => (
                      <tr key={c.id} className="hover:brightness-95 transition-[filter]">
                        <td className="pl-3 pr-1 py-1 rounded-l-xl" style={{ background: "rgba(167,155,203,0.14)" }}>
                          <div className="flex items-center gap-1.5">
                            <Mail size={12} className="text-[#6a56a0] shrink-0" />
                            <input
                              className={cellClass}
                              value={c.contactName}
                              placeholder="—"
                              onChange={(e) => onUpdateMailingContact(c.id, { contactName: e.target.value })}
                            />
                          </div>
                        </td>
                        <td className="px-1 py-1" style={{ background: "rgba(167,155,203,0.14)" }}>
                          <input
                            className={cellClass}
                            value={c.email}
                            onChange={(e) => onUpdateMailingContact(c.id, { email: e.target.value })}
                          />
                        </td>
                        <td className="px-1 py-1" style={{ background: "rgba(167,155,203,0.14)" }}>
                          <input
                            className={cellClass}
                            value={c.companyName}
                            placeholder="—"
                            onChange={(e) => onUpdateMailingContact(c.id, { companyName: e.target.value })}
                          />
                        </td>
                        <td className="pl-2 pr-3 py-1 text-right rounded-r-xl" style={{ background: "rgba(167,155,203,0.14)" }}>
                          <button
                            onClick={() => onDeleteMailingContact(c.id)}
                            title="Eliminar contacto"
                            className="text-black/40 hover:text-[#b9503a] p-1 rounded-lg hover:bg-black/5"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

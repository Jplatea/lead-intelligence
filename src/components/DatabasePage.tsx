import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mail } from "lucide-react";
import type { Company, MailingContact } from "../types";
import { REPS, STATUS_CONFIG, ALARM_CONFIG } from "../data/config";
import { NewsletterContactCard } from "./NewsletterContactCard";

interface Props {
  companies: Company[];
  mailingContacts: MailingContact[];
  onSelectCompany: (id: string) => void;
  onDeleteMailingContact: (id: string) => void;
  onUpdateMailingContact: (id: string, patch: Partial<MailingContact>) => void;
}

type Dataset = "clients" | "newsletter";

// Rows without a recognized rep (shouldn't normally happen — assignedRep is
// required — but legacy/imported data isn't guaranteed to match the union at
// runtime) fall back to the coral "needs attention" tone.
const UNASSIGNED_COLOR = "#eda18f";

type ColumnKey = "type" | "city" | "province" | "country" | "postalCode" | "email" | "phone" | "assignedRep" | "status" | "alarm";

const ALL_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "type", label: "Tipo" },
  { key: "city", label: "Ciudad" },
  { key: "province", label: "Provincia" },
  { key: "country", label: "País" },
  { key: "postalCode", label: "C.P." },
  { key: "email", label: "Email" },
  { key: "phone", label: "Teléfono" },
  { key: "assignedRep", label: "Comercial" },
  { key: "status", label: "Estado" },
  { key: "alarm", label: "Alarma" },
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
    case "postalCode":
      return c.postalCode || "—";
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

// This page is a read-only report: no sorting, filtering, column toggles,
// export, or per-row editing/deleting — just the data laid out plainly on
// the rep's color, per explicit request to simplify it down to information
// only.
export function DatabasePage({
  companies,
  mailingContacts,
  onSelectCompany,
  onDeleteMailingContact,
  onUpdateMailingContact,
}: Props) {
  const [dataset, setDataset] = useState<Dataset>("clients");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const selectedContact = mailingContacts.find((c) => c.id === selectedContactId) ?? null;

  const rowColor = (c: Company) => REPS[c.assignedRep]?.color ?? UNASSIGNED_COLOR;
  // Fully opaque, just lightened toward white — kept solid on purpose (not
  // translucent) so the tint per rep stays clear and consistent.
  const rowBg = (c: Company) => `color-mix(in srgb, ${rowColor(c)} 55%, white)`;

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
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">Datos Clientes</h2>
                <p className="text-xs text-neutral-500">{companies.length} clientes</p>
              </div>

              <div className="flex-1 min-h-0 overflow-auto rounded-2xl border border-black/10 bg-black/[0.03]">
                <table
                  className="text-[13px]"
                  style={{ borderCollapse: "separate", borderSpacing: "0 4px", minWidth: 1100, width: "100%" }}
                >
                  <thead className="sticky top-0 z-10 bg-surface">
                    <tr>
                      <th className="font-semibold text-neutral-500 uppercase tracking-wide text-[13px] px-3 py-2.5 border-b border-black/10 whitespace-nowrap text-left">
                        Nombre
                      </th>
                      {ALL_COLUMNS.map((col) => (
                        <th
                          key={col.key}
                          className="font-semibold text-neutral-500 uppercase tracking-wide text-[13px] px-2 py-2.5 border-b border-black/10 whitespace-nowrap text-left"
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((c) => {
                      const bg = rowBg(c);
                      return (
                        <tr
                          key={c.id}
                          className="h-7 cursor-pointer hover:brightness-95 transition-[filter]"
                          onClick={() => onSelectCompany(c.id)}
                        >
                          <td
                            className="pl-3 pr-1 py-1 rounded-l-xl whitespace-nowrap max-w-[160px] overflow-hidden"
                            style={{ background: bg }}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-black truncate" title={c.name}>
                                {c.name}
                              </span>
                              {c.needsReview && (
                                <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-black/70 text-white whitespace-nowrap">
                                  Revisar
                                </span>
                              )}
                            </div>
                          </td>
                          {ALL_COLUMNS.map((col, i) => (
                            <td
                              key={col.key}
                              className={`px-2 py-1 text-black/80 whitespace-nowrap ${i === ALL_COLUMNS.length - 1 ? "rounded-r-xl" : ""}`}
                              style={{ background: bg }}
                              title={cellText(c, col.key)}
                            >
                              {cellText(c, col.key)}
                            </td>
                          ))}
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
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">Newsletter</h2>
                <p className="text-xs text-neutral-500">
                  {mailingContacts.length} contactos — independiente de la base de clientes.
                </p>
              </div>

              <div className="flex-1 min-h-0 overflow-auto rounded-2xl border border-black/10 bg-black/[0.03]">
                <table className="text-[13px]" style={{ borderCollapse: "separate", borderSpacing: "0 4px", width: "100%" }}>
                  <thead className="sticky top-0 z-10 bg-surface">
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
                    </tr>
                  </thead>
                  <tbody>
                    {mailingContacts.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-3 py-8 text-center text-xs text-neutral-400">
                          Sin contactos todavía.
                        </td>
                      </tr>
                    )}
                    {mailingContacts.map((c) => (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedContactId(c.id)}
                        className="cursor-pointer hover:brightness-95 transition-[filter]"
                      >
                        <td className="pl-3 pr-1 py-1.5 rounded-l-xl" style={{ background: "rgba(167,155,203,0.14)" }}>
                          <div className="flex items-center gap-1.5">
                            <Mail size={12} className="text-[#6a56a0] shrink-0" />
                            <span className="text-black/80">{c.contactName || "—"}</span>
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-black/80" style={{ background: "rgba(167,155,203,0.14)" }}>
                          {c.email}
                        </td>
                        <td
                          className="px-2 py-1.5 text-black/80 rounded-r-xl"
                          style={{ background: "rgba(167,155,203,0.14)" }}
                        >
                          {c.companyName || "—"}
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

      {selectedContact && (
        <NewsletterContactCard
          contact={selectedContact}
          onClose={() => setSelectedContactId(null)}
          onDelete={onDeleteMailingContact}
          onUpdate={onUpdateMailingContact}
        />
      )}
    </div>
  );
}

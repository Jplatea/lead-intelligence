import { X, Mail, Building2 } from "lucide-react";
import type { CompanyMailingMatch } from "../lib/matchMailing";

interface Props {
  matches: CompanyMailingMatch[];
  onClose: () => void;
}

// Shows every client company that also shows up in the mailing list
// (matched by contact email, or by company name when the emails don't
// line up) - a read-only cross-check, triggered from the "Empresas
// detectadas" icon alongside its existing review-arrows toggle.
export function CompanyMailingMatchesModal({ matches, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-5">
      <div className="glass rounded-3xl p-5 w-full max-w-lg max-h-[85vh] overflow-y-auto animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="type-h2 text-neutral-800">Coincidencias clientes / mailing</h2>
            <p className="text-xs text-neutral-500">
              {matches.length === 0
                ? "Ninguna empresa de clientes coincide con la lista de mailing."
                : `${matches.length} empresa${matches.length === 1 ? "" : "s"} presente${matches.length === 1 ? "" : "s"} en ambas bases de datos.`}
            </p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-800 p-1 rounded-lg hover:bg-black/5">
            <X size={16} />
          </button>
        </div>

        {matches.length > 0 && (
          <div className="space-y-2">
            {matches.map(({ company, contact, matchedBy }) => (
              <div key={`${company.id}-${contact.id}`} className="rounded-xl bg-black/[0.02] border border-black/6 p-3">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Building2 size={12} className="text-[#2a9678] shrink-0" />
                    <p className="text-xs font-medium text-neutral-800 truncate">{company.name}</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#a8dfcf]/40 text-[#1f5e4d]">
                    {matchedBy === "email" ? "mismo email" : "mismo nombre"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 pl-[18px]">
                  <Mail size={11} className="text-[#6a56a0] shrink-0" />
                  <p className="text-[11px] text-neutral-500 truncate">
                    {contact.contactName || "—"} · {contact.email}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

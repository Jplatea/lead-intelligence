import { useEffect } from "react";
import { X, Mail, Building2 } from "lucide-react";
import type { CompanyMailingMatch } from "../lib/matchMailing";

interface Props {
  matches: CompanyMailingMatch[];
  onClose: () => void;
}

// A floating card centered over the map (not a full-screen modal) showing
// every client company that also appears in the mailing list, matched by
// name (Clientes' "Nombre" column vs mailing's "Empresa" column). With no
// matches it's just a brief "Sin coincidencias" toast that dismisses
// itself after two seconds instead of needing a manual close.
export function CompanyMailingMatchesModal({ matches, onClose }: Props) {
  const hasMatches = matches.length > 0;

  useEffect(() => {
    if (hasMatches) return;
    const timer = setTimeout(onClose, 2000);
    return () => clearTimeout(timer);
  }, [hasMatches, onClose]);

  if (!hasMatches) {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
        <div className="glass rounded-2xl px-5 py-3 animate-fade-in-up">
          <p className="text-sm text-neutral-700">Sin coincidencias</p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-5">
      <div className="fixed inset-0 z-0" onClick={onClose} />
      <div className="relative glass rounded-3xl p-5 w-full max-w-lg max-h-full overflow-y-auto animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="type-h2 text-neutral-800">Coincidencias clientes / mailing</h2>
            <p className="text-xs text-neutral-500">
              {matches.length} empresa{matches.length === 1 ? "" : "s"} presente{matches.length === 1 ? "" : "s"} en
              ambas bases de datos.
            </p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-800 p-1 rounded-lg hover:bg-black/5">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-2">
          {matches.map(({ company, contact }) => (
            <div key={`${company.id}-${contact.id}`} className="rounded-xl bg-black/[0.02] border border-black/6 p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Building2 size={12} className="text-[#2a9678] shrink-0" />
                <p className="text-xs font-medium text-neutral-800 truncate">{company.name}</p>
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
      </div>
    </div>
  );
}

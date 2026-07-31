import { Trash2, X } from "lucide-react";
import type { MailingContact } from "../types";

interface Props {
  contact: MailingContact;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: Partial<MailingContact>) => void;
}

// Same visual language as the client "tarjeta de contactos": a dashed,
// tinted box while empty, solid once filled in.
function fieldClass(isEmpty: boolean): string {
  return `w-full rounded-lg px-2.5 py-1.5 text-sm font-medium text-neutral-800 placeholder:text-neutral-400 outline-none focus:border-[#a79bcb] transition-colors ${
    isEmpty
      ? "bg-black/[0.015] border border-dashed border-neutral-300 hover:border-neutral-400"
      : "bg-black/[0.03] border border-black/10 hover:border-black/20"
  }`;
}

export function NewsletterContactCard({ contact, onClose, onDelete, onUpdate }: Props) {
  return (
    <div className="fixed top-0 right-0 h-screen w-[420px] max-w-[92vw] p-5 pt-[76px] overflow-y-auto z-50 flex flex-col gap-5 pointer-events-none">
      <div className="pointer-events-auto glass float-card rounded-3xl p-6 pb-10 animate-fade-in-up">
        <div className="flex items-start justify-between mb-5">
          <h2 className="text-sm font-semibold text-neutral-900">Contacto Newsletter</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-800 p-1 rounded-lg hover:bg-black/5">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-wide text-neutral-400 mb-1 block">Nombre contacto</label>
            <input
              value={contact.contactName}
              onChange={(e) => onUpdate(contact.id, { contactName: e.target.value })}
              placeholder="Sin nombre"
              className={fieldClass(!contact.contactName)}
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide text-neutral-400 mb-1 block">Email</label>
            <input
              value={contact.email}
              onChange={(e) => onUpdate(contact.id, { email: e.target.value })}
              placeholder="Sin email"
              className={fieldClass(!contact.email)}
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide text-neutral-400 mb-1 block">Empresa</label>
            <input
              value={contact.companyName}
              onChange={(e) => onUpdate(contact.id, { companyName: e.target.value })}
              placeholder="Sin empresa"
              className={fieldClass(!contact.companyName)}
            />
          </div>
        </div>

        <button
          onClick={() => {
            onDelete(contact.id);
            onClose();
          }}
          className="mt-6 w-full flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-black/[0.03] border border-black/10 text-[#b9503a] hover:bg-[#b9503a]/10"
        >
          <Trash2 size={13} /> Eliminar contacto
        </button>
      </div>
    </div>
  );
}

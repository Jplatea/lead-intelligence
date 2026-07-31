import { Trash2, X } from "lucide-react";
import type { MailingContact } from "../types";

interface Props {
  contact: MailingContact;
  onClose: () => void;
  onDelete: (id: string) => void;
}

// The read-only counterpart to the client "tarjeta de contactos": clicking a
// row in the Newsletter table opens this instead of editing inline — it
// only shows the three fields plus a delete action, matching the
// database page's "information only" simplification.
export function NewsletterContactCard({ contact, onClose, onDelete }: Props) {
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
            <p className="text-sm font-medium text-neutral-800">{contact.contactName || "—"}</p>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide text-neutral-400 mb-1 block">Email</label>
            <p className="text-sm font-medium text-neutral-800">{contact.email}</p>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide text-neutral-400 mb-1 block">Empresa</label>
            <p className="text-sm font-medium text-neutral-800">{contact.companyName || "—"}</p>
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

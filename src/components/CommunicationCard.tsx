import { X } from "lucide-react";
import type { Company, RepId } from "../types";
import { REPS } from "../data/config";
import { AuroraBackground } from "./AuroraBackground";
import { WhatsAppPanel } from "./WhatsAppPanel";

interface Props {
  company: Company;
  repId: RepId;
  onClose: () => void;
}

export function CommunicationCard({ company, repId, onClose }: Props) {
  return (
    <div className="fixed top-0 right-0 h-screen w-[960px] max-w-[92vw] p-5 pt-[76px] overflow-y-auto z-50 flex flex-col gap-5 pointer-events-none">
      <div className="pointer-events-auto relative overflow-hidden float-card rounded-3xl animate-fade-in-up flex flex-col gap-4 border border-white/60 shadow-[0_10px_30px_-14px_rgba(33,31,29,0.35)]">
        <AuroraBackground colors={[REPS.jose.color, REPS.fran.color, REPS.victor.color]} />
        <div className="relative z-10 p-6 pb-8 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] tracking-widest text-neutral-600 mb-1">Comunicación</p>
              <h2 className="type-h1 truncate">{company.name}</h2>
              <p className="text-xs text-neutral-500 truncate">{company.contact.email || "Sin email de contacto"}</p>
            </div>
            <button onClick={onClose} className="shrink-0 p-1.5 rounded-full hover:bg-black/5 text-neutral-500">
              <X size={16} />
            </button>
          </div>

          <WhatsAppPanel company={company} repId={repId} />
        </div>
      </div>
    </div>
  );
}

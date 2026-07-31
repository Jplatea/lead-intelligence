import { useState } from "react";
import { X, Mail, RefreshCw, AlertCircle } from "lucide-react";
import type { Company } from "../types";
import { fetchRecentEmails as fetchGmail, isGmailConfigured, requestGmailAccessToken } from "../lib/gmail";
import { fetchRecentEmails as fetchOutlook, isOutlookConfigured, requestOutlookAccessToken } from "../lib/outlook";

interface Props {
  company: Company;
  onClose: () => void;
}

// Gmail's and Outlook's message shapes are already identical after each
// lib's own parsing — a single shared shape here for rendering either.
interface EmailMessage {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

type Status = "idle" | "loading" | "error" | "ready";
type Provider = "gmail" | "outlook";

export function CommunicationCard({ company, onClose }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [error, setError] = useState("");

  const connect = async (provider: Provider) => {
    setStatus("loading");
    setError("");
    try {
      const email = company.contact.email;
      if (!email) throw new Error("Este cliente no tiene un email de contacto guardado.");
      const msgs =
        provider === "gmail"
          ? await fetchGmail(await requestGmailAccessToken(), email, 10)
          : await fetchOutlook(await requestOutlookAccessToken(), email, 10);
      setMessages(msgs);
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo conectar con el correo.");
      setStatus("error");
    }
  };

  return (
    <div className="fixed top-0 right-0 h-screen w-[480px] max-w-[92vw] p-5 pt-[76px] overflow-y-auto z-50 flex flex-col gap-5 pointer-events-none">
      <div className="pointer-events-auto glass float-card rounded-3xl p-6 pb-8 animate-fade-in-up flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] tracking-widest text-neutral-400 mb-1">Comunicación</p>
            <h2 className="type-h1 truncate">{company.name}</h2>
            <p className="text-xs text-neutral-500 truncate">{company.contact.email || "Sin email de contacto"}</p>
          </div>
          <button onClick={onClose} className="shrink-0 p-1.5 rounded-full hover:bg-black/5 text-neutral-500">
            <X size={16} />
          </button>
        </div>

        {status === "idle" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Mail size={28} className="text-neutral-300" />
            <p className="text-xs text-neutral-500 max-w-[280px]">
              Conecta tu correo para ver los últimos 10 correos con este cliente. Solo se leen los mensajes — no se
              envía ni modifica nada.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => connect("gmail")}
                disabled={!isGmailConfigured()}
                className="text-xs font-medium px-4 py-2 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Conectar Gmail
              </button>
              <button
                onClick={() => connect("outlook")}
                disabled={!isOutlookConfigured()}
                className="text-xs font-medium px-4 py-2 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Conectar Outlook
              </button>
            </div>
            {!isGmailConfigured() && (
              <p className="text-[11px] text-[#b9503a] max-w-[280px] flex items-center gap-1.5">
                <AlertCircle size={12} className="shrink-0" />
                Falta configurar el acceso a Gmail (VITE_GOOGLE_CLIENT_ID).
              </p>
            )}
            {!isOutlookConfigured() && (
              <p className="text-[11px] text-[#b9503a] max-w-[280px] flex items-center gap-1.5">
                <AlertCircle size={12} className="shrink-0" />
                Falta configurar el acceso a Outlook (VITE_MICROSOFT_CLIENT_ID).
              </p>
            )}
          </div>
        )}

        {status === "loading" && (
          <div className="flex flex-col items-center gap-2 py-10">
            <RefreshCw size={20} className="animate-spin text-neutral-400" />
            <p className="text-xs text-neutral-500">Buscando correos...</p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <AlertCircle size={22} className="text-[#b9503a]" />
            <p className="text-xs text-neutral-600 max-w-[280px]">{error}</p>
            <button
              onClick={() => setStatus("idle")}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-black/[0.04] border border-black/10 hover:bg-black/[0.07] transition-colors"
            >
              Volver a intentar
            </button>
          </div>
        )}

        {status === "ready" && (
          <div className="flex flex-col gap-2">
            {messages.length === 0 ? (
              <p className="text-xs text-neutral-400 text-center py-6">No se encontraron correos con este contacto.</p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="rounded-xl border border-black/10 bg-white/60 p-3 flex flex-col gap-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-neutral-900 truncate">{m.subject}</p>
                    <p className="text-[10px] text-neutral-400 shrink-0">
                      {new Date(m.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <p className="text-[11px] text-neutral-500 truncate">{m.from}</p>
                  <p className="text-xs text-neutral-600 line-clamp-2">{m.snippet}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

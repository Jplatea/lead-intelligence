import { useEffect, useState } from "react";
import { X, RefreshCw, AlertCircle, Reply, Loader2 } from "lucide-react";
import { WhatsAppIcon } from "./WhatsAppIcon";
import { OutlookIcon } from "./OutlookIcon";
import type { Company, RepId } from "../types";
import { fetchRecentEmails as fetchOutlook, isOutlookConfigured, preloadOutlook, requestOutlookAccessToken } from "../lib/outlook";
import { fetchRecentEmailsViaAgent, replyToEmailViaAgent } from "../lib/localAgent";
import { REPS } from "../data/config";
import { AuroraBackground } from "./AuroraBackground";
import { WhatsAppPanel } from "./WhatsAppPanel";

interface Props {
  company: Company;
  repId: RepId;
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
type Source = "outlook" | "agent" | "demo";

// How many characters of a snippet show collapsed before "Leer más" is
// worth offering — anything shorter already fits without truncating.
const COLLAPSED_PREVIEW_LENGTH = 180;

// Placeholder content only — used by "Probar con datos de ejemplo" below so
// the feature can be reviewed end-to-end while waiting for a tenant admin
// to grant the real Outlook consent. Never mixed with real messages, and
// always shown behind the isDemo banner so it can't be mistaken for a real
// inbox.
function buildDemoMessages(companyName: string): EmailMessage[] {
  const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
  return [
    {
      id: "demo-1",
      subject: `Consulta sobre instalación — ${companyName}`,
      from: "contacto@ejemplo.com",
      date: daysAgo(2),
      snippet: "Buenos días, quería preguntar por el presupuesto de la instalación que hablamos la semana pasada...",
    },
    {
      id: "demo-2",
      subject: "Re: Presupuesto sistema audiovisual",
      from: "contacto@ejemplo.com",
      date: daysAgo(6),
      snippet: "Gracias por el presupuesto, lo hemos revisado internamente y nos gustaría ajustar algunos puntos...",
    },
    {
      id: "demo-3",
      subject: "Disponibilidad para la instalación",
      from: "contacto@ejemplo.com",
      date: daysAgo(11),
      snippet: "¿Tendríais disponibilidad la semana que viene para hacer la instalación en nuestras oficinas?",
    },
  ];
}

export function CommunicationCard({ company, repId, onClose }: Props) {
  const [channel, setChannel] = useState<"email" | "whatsapp">("email");
  const [status, setStatus] = useState<Status>("idle");
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [error, setError] = useState("");
  const [isDemo, setIsDemo] = useState(false);
  const [source, setSource] = useState<Source | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyError, setReplyError] = useState("");

  // Load Microsoft's auth SDK as soon as this card appears, so the click
  // handler below can call loginPopup() with as little delay as possible —
  // popup blockers only reliably allow the OAuth window when it opens right
  // after the user's gesture.
  useEffect(() => {
    preloadOutlook();
  }, []);

  const connect = async () => {
    setStatus("loading");
    setError("");
    setIsDemo(false);
    try {
      const email = company.contact.email;
      if (!email) throw new Error("Este cliente no tiene un email de contacto guardado.");
      const msgs = await fetchOutlook(await requestOutlookAccessToken(), email, 10);
      setMessages(msgs);
      setSource("outlook");
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo conectar con el correo.");
      setStatus("error");
    }
  };

  const showDemo = () => {
    setIsDemo(true);
    setMessages(buildDemoMessages(company.name));
    setSource("demo");
    setStatus("ready");
  };

  const connectLocalAgent = async () => {
    setStatus("loading");
    setError("");
    setIsDemo(false);
    try {
      const email = company.contact.email;
      if (!email) throw new Error("Este cliente no tiene un email de contacto guardado.");
      const msgs = await fetchRecentEmailsViaAgent(email, 10);
      setMessages(msgs);
      setSource("agent");
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo conectar con el agente local.");
      setStatus("error");
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Never sends anything itself — just opens a reply window/compose UI for
  // the rep to write and send themselves. Via the local agent that's
  // Outlook's own native reply window (real quoting/threading); otherwise
  // it's a plain mailto: link to the rep's own default mail client.
  const handleReply = async (m: EmailMessage) => {
    setReplyError("");
    if (source === "agent") {
      setReplyingId(m.id);
      try {
        await replyToEmailViaAgent(m.id);
      } catch (e) {
        setReplyError(e instanceof Error ? e.message : "No se pudo abrir la respuesta.");
      } finally {
        setReplyingId(null);
      }
      return;
    }
    const subject = /^re:/i.test(m.subject) ? m.subject : `RE: ${m.subject}`;
    window.open(`mailto:${m.from}?subject=${encodeURIComponent(subject)}`, "_blank");
  };

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

        <div className="flex items-center gap-1.5 -mt-1">
          <button
            onClick={() => setChannel("email")}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
              channel === "email"
                ? "bg-[#0364B8] text-white"
                : "bg-[#0364B8]/10 text-[#0364B8] hover:bg-[#0364B8]/20"
            }`}
          >
            <OutlookIcon size={12} /> Outlook
          </button>
          <button
            onClick={() => setChannel("whatsapp")}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
              channel === "whatsapp"
                ? "bg-[#25D366] text-white"
                : "bg-[#25D366]/10 text-[#1a9350] hover:bg-[#25D366]/20"
            }`}
          >
            <WhatsAppIcon size={12} /> WhatsApp
          </button>
        </div>

        {channel === "whatsapp" ? (
          <WhatsAppPanel company={company} repId={repId} />
        ) : (
          <>
        {status === "idle" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <OutlookIcon size={28} className="text-neutral-300" />
            <p className="text-xs text-neutral-500 max-w-[280px]">
              Conecta tu correo para ver los últimos 10 correos con este cliente. Solo se leen los mensajes — no se
              envía ni modifica nada.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={connect}
                disabled={!isOutlookConfigured()}
                className="text-xs font-medium px-4 py-2 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Conectar Outlook
              </button>
              <button
                onClick={connectLocalAgent}
                title="Requiere tener el script outlook_agent.py ejecutándose en este ordenador"
                className="text-xs font-medium px-4 py-2 rounded-lg bg-black/[0.04] border border-black/10 text-neutral-700 hover:bg-black/[0.07] transition-colors"
              >
                Agente local
              </button>
            </div>
            {!isOutlookConfigured() && (
              <p className="text-[11px] text-[#b9503a] max-w-[280px] flex items-center gap-1.5">
                <AlertCircle size={12} className="shrink-0" />
                Falta configurar el acceso a Outlook (VITE_MICROSOFT_CLIENT_ID).
              </p>
            )}
            <p className="text-[11px] text-neutral-400 max-w-[280px]">
              "Agente local" lee tu Outlook de escritorio directamente en este PC — requiere ejecutar antes
              outlook_agent.py (ver instrucciones en local-agent/).
            </p>
            <button
              onClick={showDemo}
              className="text-[11px] text-neutral-400 hover:text-neutral-600 underline underline-offset-2 transition-colors"
            >
              Probar con datos de ejemplo
            </button>
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
            {isDemo && (
              <p className="text-[11px] text-[#a3672c] bg-[#f0c39a]/25 border border-[#f0c39a]/60 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                <AlertCircle size={12} className="shrink-0" />
                Datos de ejemplo — no son correos reales.
              </p>
            )}
            {replyError && (
              <p className="text-[11px] text-[#b9503a] bg-[#eda18f]/15 border border-[#eda18f]/50 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                <AlertCircle size={12} className="shrink-0" />
                {replyError}
              </p>
            )}
            {messages.length === 0 ? (
              <p className="text-xs text-neutral-400 text-center py-6">No se encontraron correos con este contacto.</p>
            ) : (
              messages.map((m) => {
                const expanded = expandedIds.has(m.id);
                const canExpand = m.snippet.length > COLLAPSED_PREVIEW_LENGTH || m.snippet.includes("\n");
                return (
                  <div key={m.id} className="rounded-xl border border-black/10 bg-white/60 p-3 flex flex-col gap-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-neutral-900 truncate">{m.subject}</p>
                      <p className="text-[10px] text-neutral-400 shrink-0">
                        {new Date(m.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <p className="text-[11px] text-neutral-500 truncate">{m.from}</p>
                    <p className={`text-xs text-neutral-600 ${expanded ? "whitespace-pre-wrap" : "line-clamp-2"}`}>
                      {m.snippet}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      {canExpand && (
                        <button
                          onClick={() => toggleExpanded(m.id)}
                          className="text-[11px] font-medium text-[#2a9678] hover:text-[#1f5e4d] transition-colors"
                        >
                          {expanded ? "Leer menos" : "Leer más"}
                        </button>
                      )}
                      <button
                        onClick={() => handleReply(m)}
                        disabled={replyingId === m.id}
                        className="text-[11px] font-medium text-neutral-500 hover:text-neutral-800 transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        {replyingId === m.id ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <Reply size={11} />
                        )}
                        Responder
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
          </>
        )}
        </div>
      </div>
    </div>
  );
}

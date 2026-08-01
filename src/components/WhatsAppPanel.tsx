import { useEffect, useState } from "react";
import { Send, Loader2, AlertCircle } from "lucide-react";
import type { Company, RepId } from "../types";
import { REPS } from "../data/config";
import {
  isWhatsAppConnected,
  normalizePhoneToWaId,
  fetchWhatsAppMessages,
  sendWhatsAppMessage,
} from "../lib/whatsapp";
import { WhatsAppIcon } from "./WhatsAppIcon";
import type { WhatsAppMessage } from "../types";

interface Props {
  company: Company;
  repId: RepId;
}

type Status = "idle" | "loading" | "ready" | "error";

export function WhatsAppPanel({ company, repId }: Props) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const connected = isWhatsAppConnected(repId);
  const waId = normalizePhoneToWaId(company.contact.phone, company.country);

  useEffect(() => {
    if (!connected || !waId) return;
    setStatus("loading");
    setError("");
    fetchWhatsAppMessages(waId, repId)
      .then((msgs) => {
        setMessages(msgs);
        setStatus("ready");
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "No se pudieron cargar los mensajes.");
        setStatus("error");
      });
  }, [waId, repId, connected]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !waId || sending) return;
    setSending(true);
    setError("");
    try {
      await sendWhatsAppMessage(repId, waId, trimmed);
      setMessages((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          repId,
          waId,
          direction: "outbound",
          body: trimmed,
          createdAt: new Date().toISOString(),
        },
      ]);
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar el mensaje.");
    } finally {
      setSending(false);
    }
  };

  if (!connected) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <WhatsAppIcon size={28} />
        <p className="text-xs text-neutral-500 max-w-[240px]">
          {REPS[repId].name} todavía no ha conectado su WhatsApp.
        </p>
      </div>
    );
  }

  if (!waId) {
    return <p className="text-xs text-neutral-400 text-center py-10">Este cliente no tiene un teléfono guardado.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="text-[11px] text-[#b9503a] bg-[#eda18f]/15 border border-[#eda18f]/50 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
          <AlertCircle size={12} className="shrink-0" />
          {error}
        </p>
      )}

      {status === "loading" ? (
        <div className="flex flex-col items-center gap-2 py-10">
          <Loader2 size={20} className="animate-spin text-neutral-400" />
          <p className="text-xs text-neutral-500">Cargando mensajes...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto px-0.5">
          {messages.length === 0 ? (
            <p className="text-xs text-neutral-400 text-center py-6">
              No hay mensajes de WhatsApp con este contacto todavía.
            </p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`rounded-xl px-3 py-2 text-xs max-w-[80%] ${
                  m.direction === "outbound"
                    ? "self-end bg-[#a8dfcf]/30 text-black/80"
                    : "self-start bg-white/70 text-neutral-700 border border-black/5"
                }`}
              >
                {m.body}
              </div>
            ))
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Escribe un mensaje..."
          className="flex-1 min-w-0 text-xs bg-black/[0.03] border border-black/10 rounded-lg px-2.5 py-2 text-neutral-700 placeholder:text-neutral-400 outline-none focus:border-[#a8dfcf]"
        />
        <button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          className="shrink-0 w-8 h-8 rounded-lg bg-[#a8dfcf]/25 border border-[#a8dfcf] text-[#2a9678] flex items-center justify-center hover:bg-[#a8dfcf]/40 disabled:opacity-40"
        >
          {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
        </button>
      </div>
    </div>
  );
}

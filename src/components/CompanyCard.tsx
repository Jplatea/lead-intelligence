import { useState } from "react";
import { X, Mail, Phone, Sparkles, Check, Send, ChevronDown } from "lucide-react";
import type { Company, RepId, CompanyStatus } from "../types";
import {
  REPS,
  STATUS_CONFIG,
  ALARM_CONFIG,
  TYPE_OPTIONS,
  PROVINCE_OPTIONS_ES,
  PROVINCE_OPTIONS_PT,
  PASTEL_TEXT,
} from "../data/config";
import { CustomSelect } from "./CustomSelect";

interface Props {
  company: Company;
  onClose: () => void;
  onUpdate: (patch: Partial<Company>) => void;
  onAddComment: (repId: RepId, text: string) => void;
}

function Divider() {
  return <div className="h-px my-3.5 bg-gradient-to-r from-transparent via-black/10 to-transparent" />;
}

const selectClass =
  "bg-black/[0.03] border border-black/10 rounded-lg outline-none focus:border-[#a8dfcf]";

// All fields in this card are shown and editable regardless of whether
// they're already filled in — this shared style reads as an underlined,
// borderless field until focused, so empty fields don't look broken.
const fieldClass =
  "w-full bg-transparent outline-none text-xs text-neutral-700 placeholder:text-neutral-400 border-b border-black/10 focus:border-[#a8dfcf] pb-1 transition-colors";

const dropdownClass =
  "w-full bg-black/[0.02] outline-none text-xs text-neutral-700 border border-dashed border-neutral-300 hover:border-neutral-400 focus:border-[#a8dfcf] rounded-lg px-2 py-1.5 cursor-pointer transition-colors text-left";

function splitList(text: string): string[] {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Flat solid-color fill with a crisp, layered edge (double inset ring for a
// refined bezel, no gradient/gloss) — used for the Comercial avatars and the
// Tipo select, per feedback that those should read as flat but high-quality.
function crispEdge(active: boolean): string {
  return active
    ? "inset 0 0 0 1.5px rgba(255,255,255,0.75), inset 0 0 0 1px rgba(33,31,29,0.18), 0 0 0 2px #f9f3ec, 0 0 0 3.5px #211f1d"
    : "inset 0 0 0 1.5px rgba(255,255,255,0.6), inset 0 0 0 1px rgba(33,31,29,0.12), 0 1px 2px rgba(33,31,29,0.14)";
}

export function CompanyCard({ company, onClose, onUpdate, onAddComment }: Props) {
  const status = STATUS_CONFIG[company.status];
  const alarm = ALARM_CONFIG[company.alarm];

  const [statusOpen, setStatusOpen] = useState(false);
  const [commentRep, setCommentRep] = useState<RepId>(company.assignedRep);
  const [commentText, setCommentText] = useState("");

  const submitComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    onAddComment(commentRep, trimmed);
    setCommentText("");
  };

  const patchContact = (patch: Partial<Company["contact"]>) => onUpdate({ contact: { ...company.contact, ...patch } });

  const knownProvince = PROVINCE_OPTIONS_ES.includes(company.province) || PROVINCE_OPTIONS_PT.includes(company.province);
  const provinceOptions = [
    ...(knownProvince ? [] : [{ value: company.province, label: company.province || "Sin especificar" }]),
    ...PROVINCE_OPTIONS_ES.map((p) => ({ value: p, label: p, group: "España" })),
    ...PROVINCE_OPTIONS_PT.map((p) => ({ value: p, label: p, group: "Portugal" })),
  ];

  return (
    <div className="glass float-card rounded-3xl p-5 animate-fade-in-up">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p
            className={`text-[10px] uppercase tracking-widest mb-1 ${
              company.importedType === "manual" ? "text-[#3f6fc0]" : "text-[#2a9678]"
            }`}
          >
            {company.importedType === "manual" ? "Introducido manualmente" : "Detectado automáticamente"}
          </p>
          <input
            value={company.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Nombre de la empresa"
            className="text-lg font-semibold text-neutral-900 leading-tight bg-transparent outline-none border-b border-transparent focus:border-[#a8dfcf] w-full"
          />
          {company.needsReview && (
            <div className="mt-1.5">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#b9503a]/15 text-[#b9503a]">
                Revisar — faltan datos obligatorios
              </span>
            </div>
          )}
        </div>
        <div className="flex items-start gap-2 shrink-0">
          <div className="relative">
            <button
              onClick={() => setStatusOpen((v) => !v)}
              style={{ background: status.hex, boxShadow: crispEdge(false) }}
              className="flex items-center gap-1 text-[10px] font-semibold text-black/75 px-2.5 py-1 rounded-full"
            >
              {status.label}
              <ChevronDown size={11} className={`transition-transform ${statusOpen ? "rotate-180" : ""}`} />
            </button>

            {statusOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setStatusOpen(false)} />
                <div className="absolute top-full right-0 mt-2 z-50 glass rounded-2xl p-1.5 w-40 shadow-[0_12px_28px_rgba(33,31,29,0.18)] animate-fade-in-up">
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => {
                        onUpdate({ status: key as CompanyStatus });
                        setStatusOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left text-xs text-neutral-700 hover:bg-black/[0.04] transition-colors"
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.hex }} />
                      <span className="flex-1">{cfg.label}</span>
                      {key === company.status && <Check size={12} className="text-neutral-500" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-800 p-1 -mt-1 rounded-lg hover:bg-black/5"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <Divider />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <h3 className="text-[11px] uppercase tracking-widest text-neutral-400 mb-2">Contacto</h3>
          <div className="space-y-2 text-neutral-700">
            <div className="flex items-center gap-2">
              <Mail size={13} className="text-[#2a9678] shrink-0" />
              <input
                value={company.contact.email ?? ""}
                onChange={(e) => patchContact({ email: e.target.value })}
                placeholder="Sin email"
                className={fieldClass}
              />
            </div>
            <div className="flex items-center gap-2">
              <Phone size={13} className="text-[#2a9678] shrink-0" />
              <input
                value={company.contact.phone ?? ""}
                onChange={(e) => patchContact({ phone: e.target.value })}
                placeholder="Sin teléfono"
                className={fieldClass}
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-[11px] uppercase tracking-widest text-neutral-400 mb-2">Ubicación</h3>
          <div className="space-y-2">
            <input
              value={company.city}
              onChange={(e) => onUpdate({ city: e.target.value })}
              placeholder="Ciudad"
              className={fieldClass}
            />
            <CustomSelect
              value={company.province}
              options={provinceOptions}
              onChange={(v) => onUpdate({ province: v })}
              triggerClassName={dropdownClass}
            />
            <div className="flex gap-2">
              <input
                value={company.country}
                onChange={(e) => onUpdate({ country: e.target.value })}
                placeholder="País"
                className={fieldClass}
              />
              <input
                value={company.postalCode}
                onChange={(e) => onUpdate({ postalCode: e.target.value })}
                placeholder="C.P."
                className={`${fieldClass} w-16 shrink-0`}
              />
            </div>
          </div>
        </div>
      </div>

      <Divider />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <h3 className="text-[11px] uppercase tracking-widest text-neutral-400 mb-2">Marcas</h3>
          <input
            value={company.brands.join(", ")}
            onChange={(e) => onUpdate({ brands: splitList(e.target.value) })}
            placeholder="Sin marcas"
            className={fieldClass}
          />
        </div>
        <div>
          <h3 className="text-[11px] uppercase tracking-widest text-neutral-400 mb-2">Especialidades</h3>
          <input
            value={company.specialties.join(", ")}
            onChange={(e) => onUpdate({ specialties: splitList(e.target.value) })}
            placeholder="Sin especialidades"
            className={fieldClass}
          />
        </div>
      </div>

      {company.aiSummary && (
        <>
          <Divider />
          <div className="rounded-2xl bg-[#a79bcb]/[0.10] border border-[#a79bcb]/30 p-3">
            <div
              className="flex items-center gap-1.5 mb-1.5 text-[11px] font-medium uppercase tracking-widest"
              style={{ color: PASTEL_TEXT.purple }}
            >
              <Sparkles size={12} /> Resumen IA
            </div>
            <p className="text-xs text-neutral-700 leading-relaxed">{company.aiSummary}</p>
            {company.aiRecommendation && (
              <p className="text-xs mt-2 leading-relaxed" style={{ color: PASTEL_TEXT.purple }}>
                {company.aiRecommendation}
              </p>
            )}
          </div>
        </>
      )}

      <Divider />

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[9px] uppercase tracking-wide text-neutral-400 mb-1">Comercial</p>
          <div className="flex items-center justify-center gap-2">
            {Object.values(REPS).map((r) => {
              const isActive = r.id === company.assignedRep;
              return (
                <button
                  key={r.id}
                  title={r.name}
                  onClick={() => onUpdate({ assignedRep: r.id })}
                  style={{ background: r.color, boxShadow: crispEdge(isActive) }}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-black/75 shrink-0 transition-transform ${
                    isActive ? "scale-110" : "opacity-70 hover:opacity-100 hover:scale-105"
                  }`}
                >
                  {r.name[0]}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-[9px] uppercase tracking-wide text-neutral-400 mb-1">Tipo</p>
          <CustomSelect
            value={company.type}
            options={TYPE_OPTIONS.map((t) => ({ value: t, label: t }))}
            onChange={(v) => onUpdate({ type: v })}
            triggerStyle={{ background: "#f9f3ec", boxShadow: crispEdge(false) }}
            triggerClassName="text-[10px] text-neutral-700 px-1.5 py-1 w-full rounded-lg outline-none text-center cursor-pointer"
          />
        </div>

        <div>
          <p className="text-[9px] uppercase tracking-wide text-neutral-400 mb-1">Alarma</p>
          <CustomSelect
            value={company.alarm}
            options={Object.entries(ALARM_CONFIG).map(([key, cfg]) => ({ value: key, label: cfg.label }))}
            onChange={(v) => onUpdate({ alarm: v as Company["alarm"] })}
            triggerStyle={{ background: "#f9f3ec", boxShadow: crispEdge(false) }}
            triggerClassName="flex items-center justify-center gap-1 text-[10px] text-neutral-700 px-1.5 py-1 w-full rounded-lg outline-none cursor-pointer"
          />
          <div className="flex items-center justify-center gap-1 mt-1">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${alarm.dot}`} />
          </div>
        </div>
      </div>

      <Divider />

      <div>
        <h3 className="text-[11px] uppercase tracking-widest text-neutral-400 mb-2">Comentarios</h3>

        {company.comments.length > 0 && (
          <div className="space-y-2.5 mb-3">
            {company.comments.map((c, i) => {
              const commentRepInfo = REPS[c.repId as RepId];
              return (
                <div key={i} className="pl-2.5 border-l-2 text-xs" style={{ borderColor: commentRepInfo.color }}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-medium" style={{ color: commentRepInfo.textColor }}>
                      {commentRepInfo.name}
                    </span>
                    <span className="text-neutral-400">· {c.date}</span>
                  </div>
                  <p className="text-neutral-700">{c.text}</p>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-2">
          <select
            value={commentRep}
            onChange={(e) => setCommentRep(e.target.value as RepId)}
            className={`text-xs text-neutral-700 px-1.5 py-1.5 shrink-0 ${selectClass}`}
          >
            {Object.values(REPS).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitComment()}
            placeholder="Escribe un comentario..."
            className="flex-1 min-w-0 text-xs bg-black/[0.03] border border-black/10 rounded-lg px-2 py-1.5 text-neutral-700 placeholder:text-neutral-400 outline-none focus:border-[#a8dfcf]"
          />
          <button
            onClick={submitComment}
            className="shrink-0 w-7 h-7 rounded-lg bg-[#a8dfcf]/25 border border-[#a8dfcf] text-[#2a9678] flex items-center justify-center hover:bg-[#a8dfcf]/40"
          >
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

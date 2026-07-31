import { useMemo, useState } from "react";
import { X, Mail, Phone, Sparkles, Check, Send, ChevronDown, MapPin, Loader2 } from "lucide-react";
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
import { geocodeAddress } from "../lib/geocode";
import { CustomSelect } from "./CustomSelect";
import { TagInput } from "./TagInput";

interface Props {
  company: Company;
  allCompanies: Company[];
  onClose: () => void;
  onUpdate: (patch: Partial<Company>) => void;
  onAddComment: (repId: RepId, text: string) => void;
}

function Divider() {
  return <div className="h-px my-4 bg-gradient-to-r from-transparent via-black/10 to-transparent" />;
}

const selectClass =
  "bg-black/[0.03] border border-black/10 rounded-lg outline-none focus:border-[#a8dfcf]";

// One shared visual language for every editable field in this card: a
// dashed, faintly-tinted box while empty (an invitation to fill it in), that
// solidifies into a normal bordered box the moment it has a value. Applied
// uniformly to text inputs, CustomSelect triggers, and TagInput so nothing
// reads as a different "kind" of control.
const FIELD_BASE =
  "rounded-lg px-2.5 py-1.5 text-xs text-neutral-700 placeholder:text-neutral-400 outline-none focus:border-[#a8dfcf] transition-colors w-full";

function fieldTone(isEmpty: boolean): string {
  return isEmpty
    ? "bg-black/[0.015] border border-dashed border-neutral-300 hover:border-neutral-400"
    : "bg-black/[0.03] border border-black/10 hover:border-black/20";
}

function fieldClass(isEmpty: boolean): string {
  return `${FIELD_BASE} ${fieldTone(isEmpty)}`;
}

function fieldClassIcon(isEmpty: boolean): string {
  return `${FIELD_BASE} pl-7 ${fieldTone(isEmpty)}`;
}

// Flat solid-color fill with a crisp, layered edge (double inset ring for a
// refined bezel, no gradient/gloss) — used for the Comercial avatars and the
// Tipo select, per feedback that those should read as flat but high-quality.
function crispEdge(active: boolean): string {
  return active
    ? "inset 0 0 0 1.5px rgba(255,255,255,0.75), inset 0 0 0 1px rgba(33,31,29,0.18), 0 0 0 2px #f9f3ec, 0 0 0 3.5px #211f1d"
    : "inset 0 0 0 1.5px rgba(255,255,255,0.6), inset 0 0 0 1px rgba(33,31,29,0.12), 0 1px 2px rgba(33,31,29,0.14)";
}

export function CompanyCard({ company, allCompanies, onClose, onUpdate, onAddComment }: Props) {
  const status = STATUS_CONFIG[company.status];
  const alarm = ALARM_CONFIG[company.alarm];

  const [statusOpen, setStatusOpen] = useState(false);
  const [commentRep, setCommentRep] = useState<RepId>(company.assignedRep);
  const [commentText, setCommentText] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [addressMsg, setAddressMsg] = useState<string | null>(null);

  const submitComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    onAddComment(commentRep, trimmed);
    setCommentText("");
  };

  // Explicit action only (button/Enter), never as-you-type, per Nominatim's
  // usage policy — confirms the address is real and moves the map point to
  // it, the same verification flow NewCompanyModal uses when creating one.
  const verifyAddress = async () => {
    const query = company.address?.trim();
    if (!query) return;
    setGeocoding(true);
    setAddressMsg(null);
    try {
      const results = await geocodeAddress(query);
      if (results.length === 0) {
        setAddressMsg("No se ha encontrado esa dirección. Prueba a afinarla.");
      } else {
        const r = results[0];
        onUpdate({ lat: r.lat, lng: r.lng });
        setAddressMsg(`Verificada: ${r.displayName}`);
      }
    } catch {
      setAddressMsg("No se pudo verificar la dirección ahora mismo. Inténtalo de nuevo.");
    } finally {
      setGeocoding(false);
    }
  };

  const patchContact = (patch: Partial<Company["contact"]>) => onUpdate({ contact: { ...company.contact, ...patch } });

  const knownProvince = PROVINCE_OPTIONS_ES.includes(company.province) || PROVINCE_OPTIONS_PT.includes(company.province);
  const provinceOptions = [
    ...(knownProvince ? [] : [{ value: company.province, label: company.province || "Sin especificar" }]),
    ...PROVINCE_OPTIONS_ES.map((p) => ({ value: p, label: p, group: "España" })),
    ...PROVINCE_OPTIONS_PT.map((p) => ({ value: p, label: p, group: "Portugal" })),
  ];

  const allBrands = useMemo(
    () => Array.from(new Set(allCompanies.flatMap((c) => c.brands))).sort((a, b) => a.localeCompare(b, "es")),
    [allCompanies]
  );
  const allSpecialties = useMemo(
    () => Array.from(new Set(allCompanies.flatMap((c) => c.specialties))).sort((a, b) => a.localeCompare(b, "es")),
    [allCompanies]
  );

  return (
    <div className="glass float-card rounded-3xl p-6 pb-10 animate-fade-in-up">
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-[11px] uppercase tracking-widest text-neutral-400 mb-2">Contacto</h3>
          <div className="space-y-2">
            <div className="relative">
              <Mail size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#2a9678] pointer-events-none" />
              <input
                value={company.contact.email ?? ""}
                onChange={(e) => patchContact({ email: e.target.value })}
                placeholder="Sin email"
                className={fieldClassIcon(!company.contact.email)}
              />
            </div>
            <div className="relative">
              <Phone size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#2a9678] pointer-events-none" />
              <input
                value={company.contact.phone ?? ""}
                onChange={(e) => patchContact({ phone: e.target.value })}
                placeholder="Sin teléfono"
                className={fieldClassIcon(!company.contact.phone)}
              />
            </div>
            <a
              href={company.contact.email ? `mailto:${company.contact.email}` : undefined}
              onClick={(e) => {
                if (!company.contact.email) e.preventDefault();
              }}
              aria-disabled={!company.contact.email}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                company.contact.email
                  ? "bg-[#2a9678]/10 border border-[#2a9678]/40 text-[#2a9678] hover:bg-[#2a9678]/20"
                  : "bg-black/[0.015] border border-dashed border-neutral-300 text-neutral-400 cursor-not-allowed"
              }`}
            >
              <Send size={13} /> Mandar mail
            </a>
          </div>
        </div>

        <div>
          <h3 className="text-[11px] uppercase tracking-widest text-neutral-400 mb-2">Ubicación</h3>
          <div className="space-y-2">
            <input
              value={company.city}
              onChange={(e) => onUpdate({ city: e.target.value })}
              placeholder="Ciudad"
              className={fieldClass(!company.city)}
            />
            <div>
              <div className="flex gap-1.5">
                <input
                  value={company.address ?? ""}
                  onChange={(e) => {
                    onUpdate({ address: e.target.value });
                    setAddressMsg(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), verifyAddress())}
                  placeholder="Dirección"
                  className={fieldClass(!company.address)}
                />
                <button
                  onClick={verifyAddress}
                  disabled={geocoding || !company.address?.trim()}
                  title="Verificar dirección en el mapa"
                  className="shrink-0 w-8 h-8 rounded-lg bg-black/[0.03] border border-black/10 text-neutral-600 hover:bg-black/[0.06] disabled:opacity-40 flex items-center justify-center"
                >
                  {geocoding ? <Loader2 size={13} className="animate-spin" /> : <MapPin size={13} />}
                </button>
              </div>
              {addressMsg && <p className="text-[10px] text-neutral-500 mt-1 leading-snug">{addressMsg}</p>}
            </div>
            <CustomSelect
              value={company.province}
              options={provinceOptions}
              onChange={(v) => onUpdate({ province: v })}
              triggerClassName={`${fieldClass(!company.province)} text-left cursor-pointer`}
            />
            <div className="flex gap-2">
              <input
                value={company.country}
                onChange={(e) => onUpdate({ country: e.target.value })}
                placeholder="País"
                className={`${fieldClass(!company.country)} flex-1 min-w-0`}
              />
              <input
                value={company.postalCode}
                onChange={(e) => onUpdate({ postalCode: e.target.value })}
                placeholder="C.P."
                className={`${fieldClass(!company.postalCode)} !w-16 shrink-0`}
              />
            </div>
          </div>
        </div>
      </div>

      <Divider />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-[11px] uppercase tracking-widest text-neutral-400 mb-2">Marcas</h3>
          <TagInput
            value={company.brands}
            options={allBrands}
            onChange={(brands) => onUpdate({ brands })}
            placeholder="Sin marcas"
          />
        </div>
        <div>
          <h3 className="text-[11px] uppercase tracking-widest text-neutral-400 mb-2">Especialidades</h3>
          <TagInput
            value={company.specialties}
            options={allSpecialties}
            onChange={(specialties) => onUpdate({ specialties })}
            placeholder="Sin especialidades"
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

      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-[9px] uppercase tracking-wide text-neutral-400 mb-1.5">Comercial</p>
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
          <p className="text-[9px] uppercase tracking-wide text-neutral-400 mb-1.5">Tipo</p>
          <CustomSelect
            value={company.type}
            options={TYPE_OPTIONS.map((t) => ({ value: t, label: t }))}
            onChange={(v) => onUpdate({ type: v })}
            triggerStyle={{ background: "#f9f3ec", boxShadow: crispEdge(false) }}
            triggerClassName="text-[10px] text-neutral-700 px-1.5 py-1.5 w-full rounded-lg outline-none text-center cursor-pointer"
          />
        </div>

        <div>
          <p className="text-[9px] uppercase tracking-wide text-neutral-400 mb-1.5">Alarma</p>
          <CustomSelect
            value={company.alarm}
            options={Object.entries(ALARM_CONFIG).map(([key, cfg]) => ({ value: key, label: cfg.label }))}
            onChange={(v) => onUpdate({ alarm: v as Company["alarm"] })}
            triggerStyle={{ background: "#f9f3ec", boxShadow: crispEdge(false) }}
            triggerClassName="flex items-center justify-center gap-1 text-[10px] text-neutral-700 px-1.5 py-1.5 w-full rounded-lg outline-none cursor-pointer"
          />
          <div className="flex items-center justify-center gap-1 mt-1.5">
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

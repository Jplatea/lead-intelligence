import { useState } from "react";
import { HelpCircle, Loader2, MapPin, Search, X } from "lucide-react";
import type { Company, RepId } from "../types";
import { REPS, TYPE_OPTIONS } from "../data/config";
import { geocodeAddress } from "../lib/geocode";

interface Props {
  lat: number;
  lng: number;
  onCancel: () => void;
  onCreate: (company: Company) => void;
}

const inputClass =
  "w-full bg-black/[0.03] border border-black/10 rounded-lg px-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-400 outline-none focus:border-[#a8dfcf]";

const FLUOR = "#d4ff00";

function Req() {
  return (
    <span
      className="ml-1.5 text-[9px] font-bold tracking-wide px-1.5 py-0.5 rounded"
      style={{ background: FLUOR, color: "#1a1a1a" }}
    >
      Obligatorio
    </span>
  );
}

function Opt() {
  return <span className="ml-1.5 text-[9px] text-neutral-400 tracking-wide">Opcional</span>;
}

function HelpItem({ label, required, note }: { label: string; required?: boolean; note?: string }) {
  return (
    <li className="flex flex-wrap items-center gap-x-1 text-xs text-neutral-700">
      <span>{label}</span>
      {required ? <Req /> : !note ? <Opt /> : null}
      {note && <span className="text-[10px] text-neutral-400">— {note}</span>}
    </li>
  );
}

function HelpSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] tracking-widest text-neutral-400 mb-1.5">{title}</h3>
      <ul className="space-y-1.5">{children}</ul>
    </div>
  );
}

function HelpPopup({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-5">
      <div className="glass rounded-3xl p-5 w-full max-w-sm max-h-[85vh] overflow-y-auto animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="type-h2 text-neutral-800">Campos a rellenar</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-800 p-1 rounded-lg hover:bg-black/5">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <HelpSection title="Identificación y ubicación">
            <HelpItem label="Identificador único" note="automático" />
            <HelpItem label="Nombre de la empresa" required />
            <HelpItem label="Tipo (Integrador / Arquitecto / Decorador)" required />
            <HelpItem label="Dirección completa" required />
            <HelpItem label="Coordenadas para el mapa" note="salen de la dirección" />
          </HelpSection>

          <HelpSection title="Contacto">
            <HelpItem label="Email" required />
            <HelpItem label="Teléfono" required />
          </HelpSection>

          <HelpSection title="Clasificación">
            <HelpItem label="Marcas que trabaja (KNX, Control4, etc.)" />
            <HelpItem label="Especialidades (Cinema, Audio, Iluminación, etc.)" />
          </HelpSection>

          <HelpSection title="Gestión comercial">
            <HelpItem label="Comercial asignado (José/Fran/Víctor)" required />
            <HelpItem label="Estado (Nuevo/Contactado/No interesado/Trabajando)" required />
            <HelpItem label="Nivel de alarma" />
          </HelpSection>

          <HelpSection title="Relaciones">
            <HelpItem label="Empresas relacionadas" note="para las líneas del mapa" />
          </HelpSection>
        </div>
      </div>
    </div>
  );
}

export function NewCompanyModal({ lat: initialLat, lng: initialLng, onCancel, onCreate }: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState(TYPE_OPTIONS[0]);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [assignedRep, setAssignedRep] = useState<RepId>("jose");
  const [error, setError] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const [address, setAddress] = useState("");
  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [country, setCountry] = useState("España");
  const [postalCode, setPostalCode] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeMsg, setGeocodeMsg] = useState<string | null>(null);

  const searchAddress = async () => {
    if (!address.trim()) return;
    setGeocoding(true);
    setGeocodeMsg(null);
    try {
      const results = await geocodeAddress(address.trim());
      if (results.length === 0) {
        setGeocodeMsg("No se ha encontrado esa dirección. Prueba a afinarla.");
      } else {
        const r = results[0];
        setLat(r.lat);
        setLng(r.lng);
        setCity(r.city ?? "");
        setProvince(r.province ?? "");
        setCountry(r.country ?? "España");
        setPostalCode(r.postalCode ?? "");
        setGeocodeMsg(`Ubicación encontrada: ${r.displayName}`);
      }
    } catch {
      setGeocodeMsg("No se pudo buscar la dirección ahora mismo. Inténtalo de nuevo.");
    } finally {
      setGeocoding(false);
    }
  };

  const submit = () => {
    if (!name.trim() || !address.trim() || !email.trim() || !phone.trim()) {
      setError("Nombre, dirección, email y teléfono son obligatorios.");
      return;
    }
    const company: Company = {
      id: `manual-${Date.now()}`,
      name: name.trim(),
      type,
      city: city.trim() || address.trim(),
      province: province.trim() || "Sin especificar",
      country,
      postalCode,
      lat,
      lng,
      contact: {
        email: email.trim(),
        phone: phone.trim(),
      },
      brands: [],
      specialties: [],
      assignedRep,
      status: "nuevo",
      alarm: "nunca_contactado",
      importedType: "manual",
      comments: [],
    };
    onCreate(company);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-5">
      <div className="glass rounded-3xl p-5 w-full max-w-sm animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="type-h2 text-neutral-800">Nuevo cliente</h2>
            <button
              onClick={() => setHelpOpen(true)}
              title="Qué campos rellenar"
              className="text-neutral-400 hover:text-neutral-800 p-0.5 rounded-full hover:bg-black/5"
            >
              <HelpCircle size={15} />
            </button>
          </div>
          <button onClick={onCancel} className="text-neutral-400 hover:text-neutral-800 p-1 rounded-lg hover:bg-black/5">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] tracking-wide text-neutral-400 mb-1 block">Nombre *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Nombre de la empresa" />
          </div>

          <div>
            <label className="text-[11px] tracking-wide text-neutral-400 mb-1 block">Tipo</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] tracking-wide text-neutral-400 mb-1 block">
              Dirección completa *
            </label>
            <div className="flex gap-2">
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), searchAddress())}
                className={inputClass}
                placeholder="Calle, número, ciudad..."
              />
              <button
                onClick={searchAddress}
                disabled={geocoding || !address.trim()}
                title="Buscar dirección"
                className="shrink-0 w-9 h-9 rounded-lg bg-black/[0.03] border border-black/10 text-neutral-600 hover:bg-black/[0.06] disabled:opacity-40 flex items-center justify-center"
              >
                {geocoding ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              </button>
            </div>
            {geocodeMsg && (
              <p className="text-[10px] text-neutral-500 mt-1 flex items-start gap-1">
                <MapPin size={11} className="shrink-0 mt-0.5" />
                {geocodeMsg}
              </p>
            )}
            <p className="text-[10px] text-neutral-400 mt-1">
              Ubicación: {lat.toFixed(4)}, {lng.toFixed(4)} (busca la dirección para afinar el punto en el mapa).
            </p>
          </div>

          <div>
            <label className="text-[11px] tracking-wide text-neutral-400 mb-1 block">Email *</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="contacto@empresa.com" />
          </div>

          <div>
            <label className="text-[11px] tracking-wide text-neutral-400 mb-1 block">Teléfono *</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="+34 ..." />
          </div>

          <div>
            <label className="text-[11px] tracking-wide text-neutral-400 mb-1 block">Comercial asignado</label>
            <select value={assignedRep} onChange={(e) => setAssignedRep(e.target.value as RepId)} className={inputClass}>
              {Object.values(REPS).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-xs text-[#b9503a] mt-3">{error}</p>}

        <div className="flex items-center gap-2 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 text-xs px-3 py-2 rounded-xl bg-black/[0.03] border border-black/10 text-neutral-600 hover:bg-black/[0.06]"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            className="flex-1 text-xs px-3 py-2 rounded-xl bg-[#a8dfcf] border border-[#a8dfcf] text-black/80 font-medium hover:bg-[#93d3bd]"
          >
            Crear cliente
          </button>
        </div>
      </div>

      {helpOpen && <HelpPopup onClose={() => setHelpOpen(false)} />}
    </div>
  );
}

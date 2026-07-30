import { useState } from "react";
import { Loader2, MapPin, Search, X } from "lucide-react";
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

export function NewCompanyModal({ lat: initialLat, lng: initialLng, onCancel, onCreate }: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState(TYPE_OPTIONS[0]);
  const [city, setCity] = useState("");
  const [country, setCountry] = useState<"España" | "Portugal">("España");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [assignedRep, setAssignedRep] = useState<RepId>("jose");
  const [error, setError] = useState<string | null>(null);

  const [address, setAddress] = useState("");
  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeMsg, setGeocodeMsg] = useState<string | null>(null);

  const searchAddress = async () => {
    if (!address.trim()) return;
    setGeocoding(true);
    setGeocodeMsg(null);
    try {
      const query = [address.trim(), city.trim(), country].filter(Boolean).join(", ");
      const results = await geocodeAddress(query);
      if (results.length === 0) {
        setGeocodeMsg("No se ha encontrado esa dirección. Prueba a afinarla o sitúa el punto en el mapa.");
      } else {
        setLat(results[0].lat);
        setLng(results[0].lng);
        setGeocodeMsg(`Ubicación encontrada: ${results[0].displayName}`);
      }
    } catch {
      setGeocodeMsg("No se pudo buscar la dirección ahora mismo. Inténtalo de nuevo.");
    } finally {
      setGeocoding(false);
    }
  };

  const submit = () => {
    if (!name.trim() || !city.trim()) {
      setError("Nombre y ciudad son obligatorios.");
      return;
    }
    const company: Company = {
      id: `manual-${Date.now()}`,
      name: name.trim(),
      type,
      city: city.trim(),
      province: city.trim(),
      country,
      postalCode: "",
      lat,
      lng,
      contact: {
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      },
      brands: [],
      specialties: [],
      assignedRep,
      status: "nuevo",
      alarm: "nunca_contactado",
      lastActionLabel: "Sin registrar",
      importedType: "manual",
      comments: [],
      nextActions: [{ label: "Primer contacto", dueInDays: 1 }],
    };
    onCreate(company);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-5">
      <div className="glass rounded-3xl p-5 w-full max-w-sm animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-neutral-800">Nuevo cliente</h2>
          <button onClick={onCancel} className="text-neutral-400 hover:text-neutral-800 p-1 rounded-lg hover:bg-black/5">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] uppercase tracking-wide text-neutral-400 mb-1 block">Nombre *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Nombre de la empresa" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-wide text-neutral-400 mb-1 block">Tipo</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wide text-neutral-400 mb-1 block">País</label>
              <select value={country} onChange={(e) => setCountry(e.target.value as "España" | "Portugal")} className={inputClass}>
                <option value="España">España</option>
                <option value="Portugal">Portugal</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wide text-neutral-400 mb-1 block">Ciudad *</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} placeholder="Ciudad" />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wide text-neutral-400 mb-1 block">
              Dirección exacta (opcional)
            </label>
            <div className="flex gap-2">
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), searchAddress())}
                className={inputClass}
                placeholder="Calle, número..."
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
              Ubicación: {lat.toFixed(4)}, {lng.toFixed(4)} (según el punto marcado en el mapa, o la dirección buscada).
            </p>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wide text-neutral-400 mb-1 block">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="contacto@empresa.com" />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wide text-neutral-400 mb-1 block">Teléfono</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="+34 ..." />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wide text-neutral-400 mb-1 block">Comercial asignado</label>
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
    </div>
  );
}

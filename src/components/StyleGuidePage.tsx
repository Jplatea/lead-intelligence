import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { COMPANIES } from "../data/mockCompanies";
import { ALARM_CONFIG, PASTEL, REPS, STATUS_CONFIG } from "../data/config";
import { TEXT_FONT_OPTIONS } from "../lib/mailingTemplate";
import { CompanyCard } from "./CompanyCard";

// Epilogue is now the app's real base typeface (loaded in index.html),
// falling back to San Francisco/system sans — matches src/index.css.
const WEB_FONT_STACK =
  "'Epilogue', -apple-system, BlinkMacSystemFont, 'SF Pro Text', ui-sans-serif, system-ui, 'Segoe UI', Roboto, 'Inter', sans-serif";
const NEWSLETTER_FONT_STACK = "'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif";

// Extra fonts available to try out here for comparison only — the "Sistema"
// option above already covers the real current default for each section.
// Nexa and Cloud are commercial/unverified typefaces with no free
// web-embeddable source; listed for comparison, but without an actual
// licensed font file they'll just fall back to the browser's default
// sans-serif rather than rendering the real typeface.
const EXTRA_FONT_CHOICES: { label: string; value: string }[] = [
  { label: "Nexa (sin licencia cargada)", value: "'Nexa', sans-serif" },
  { label: "Cloud (sin licencia cargada)", value: "'Cloud', sans-serif" },
];

interface TypeField {
  id: string;
  label: string;
  code: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  lineHeight?: number;
  letterSpacing?: string;
  textTransform?: "uppercase";
}

const WEB_TYPE_FIELDS: TypeField[] = [
  {
    id: "web-title",
    label: "Nombre de empresa (título de tarjeta)",
    code: "text-lg font-semibold text-neutral-900 (18px)",
    fontFamily: WEB_FONT_STACK,
    fontSize: 18,
    fontWeight: 600,
    color: "#171614",
  },
  {
    id: "web-section",
    label: "Título de sección",
    code: "text-sm font-semibold text-neutral-900 (14px)",
    fontFamily: WEB_FONT_STACK,
    fontSize: 14,
    fontWeight: 600,
    color: "#171614",
  },
  {
    id: "web-label",
    label: "ETIQUETA DE CAMPO",
    code: "text-[11px] uppercase tracking-widest text-neutral-400",
    fontFamily: WEB_FONT_STACK,
    fontSize: 11,
    fontWeight: 400,
    color: "#a3a29e",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  {
    id: "web-hint",
    label: "Texto secundario / hint",
    code: "text-xs text-neutral-500 (12px)",
    fontFamily: WEB_FONT_STACK,
    fontSize: 12,
    fontWeight: 400,
    color: "#78766f",
  },
  {
    id: "web-body",
    label: "Cuerpo de texto general",
    code: "text-sm text-neutral-700 (14px)",
    fontFamily: WEB_FONT_STACK,
    fontSize: 14,
    fontWeight: 400,
    color: "#3f3d38",
  },
  {
    id: "web-field",
    label: "Texto de campo / formulario",
    code: "text-xs text-neutral-700 (12px)",
    fontFamily: WEB_FONT_STACK,
    fontSize: 12,
    fontWeight: 400,
    color: "#3f3d38",
  },
];

const NEWSLETTER_TYPE_FIELDS: TypeField[] = [
  {
    id: "nl-heading",
    label: "Título de sección (heading)",
    code: "23px · peso 700 · color #bea05a · line-height 1.3",
    fontFamily: NEWSLETTER_FONT_STACK,
    fontSize: 23,
    fontWeight: 700,
    color: "#bea05a",
    lineHeight: 1.3,
  },
  {
    id: "nl-body",
    label: "Párrafo de cuerpo (body)",
    code: "15px · peso 400 · color #211f1d · line-height 1.7",
    fontFamily: NEWSLETTER_FONT_STACK,
    fontSize: 15,
    fontWeight: 400,
    color: "#211f1d",
    lineHeight: 1.7,
  },
];

interface ColorField {
  id: string;
  label: string;
  hex: string;
  sub?: string;
}

const REP_COLOR_FIELDS: ColorField[] = Object.values(REPS).map((r) => ({
  id: `rep-${r.id}`,
  label: r.name,
  hex: r.color,
  sub: r.textColor,
}));

const BASE_COLOR_FIELDS: ColorField[] = [
  { id: "base-surface", label: "Superficie (surface)", hex: "#f9f3ec" },
  { id: "base-bg", label: "Fondo general", hex: "#e6dcd2" },
  { id: "base-text", label: "Texto principal", hex: "#211f1d" },
  { id: "base-gold", label: "Dorado — marca newsletter", hex: "#bea05a" },
  { id: "base-highlight", label: "Resaltado — Voy de visita", hex: "#b026ff" },
];

const STATUS_COLOR_FIELDS: ColorField[] = Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
  id: `status-${key}`,
  label: cfg.label,
  hex: cfg.hex,
}));

const ALARM_COLOR_FIELDS: ColorField[] = Object.entries(ALARM_CONFIG).map(([key, cfg]) => ({
  id: `alarm-${key}`,
  label: cfg.label,
  hex: cfg.hex,
}));

const PASTEL_COLOR_FIELDS: ColorField[] = Object.entries(PASTEL).map(([key, hex]) => ({
  id: `pastel-${key}`,
  label: key,
  hex,
}));

const FONT_WEIGHTS = [400, 500, 600, 700, 800];

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/70 border border-black/10 p-5">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-400">{title}</h3>
      {subtitle && <p className="text-[11px] text-neutral-400 mt-0.5 mb-4">{subtitle}</p>}
      <div className={subtitle ? "" : "mt-4"}>{children}</div>
    </div>
  );
}

function TypeSample({
  field,
  defaultFontFamily,
  onChange,
}: {
  field: TypeField;
  defaultFontFamily: string;
  onChange: (patch: Partial<TypeField>) => void;
}) {
  return (
    <div className="flex flex-col gap-2 py-2.5 border-b border-black/5 last:border-0">
      <p
        style={{
          fontFamily: field.fontFamily,
          fontSize: field.fontSize,
          fontWeight: field.fontWeight,
          color: field.color,
          lineHeight: field.lineHeight,
          letterSpacing: field.letterSpacing,
          textTransform: field.textTransform,
        }}
      >
        {field.label}
      </p>
      <p className="text-[10px] text-neutral-400 font-mono">{field.code}</p>
      <div className="flex items-center gap-3 flex-wrap">
        <label className="flex items-center gap-1 text-[10px] text-neutral-400">
          Fuente
          <select
            value={field.fontFamily}
            onChange={(e) => onChange({ fontFamily: e.target.value })}
            className="bg-black/[0.03] border border-black/10 rounded px-1 py-0.5 text-[11px] text-neutral-700 outline-none cursor-pointer max-w-[140px]"
          >
            <option value={defaultFontFamily}>Sistema (predeterminada)</option>
            {EXTRA_FONT_CHOICES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1 text-[10px] text-neutral-400">
          Tamaño
          <input
            type="number"
            value={field.fontSize}
            min={8}
            max={48}
            onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
            className="w-14 bg-black/[0.03] border border-black/10 rounded px-1.5 py-0.5 text-[11px] text-neutral-700 outline-none focus:border-[#a8dfcf]"
          />
          px
        </label>
        <label className="flex items-center gap-1 text-[10px] text-neutral-400">
          Peso
          <select
            value={field.fontWeight}
            onChange={(e) => onChange({ fontWeight: Number(e.target.value) })}
            className="bg-black/[0.03] border border-black/10 rounded px-1 py-0.5 text-[11px] text-neutral-700 outline-none cursor-pointer"
          >
            {FONT_WEIGHTS.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1 text-[10px] text-neutral-400">
          Color
          <input
            type="color"
            value={field.color}
            onChange={(e) => onChange({ color: e.target.value })}
            className="w-5 h-5 rounded cursor-pointer border border-black/10 p-0"
          />
        </label>
      </div>
    </div>
  );
}

function ColorSwatch({ field, onChange }: { field: ColorField; onChange: (hex: string) => void }) {
  return (
    <div className="flex items-center gap-2.5">
      <label className="relative shrink-0 cursor-pointer" title="Editar color (solo vista previa)">
        <span className="block w-8 h-8 rounded-lg border border-black/10" style={{ background: field.hex }} />
        <input
          type="color"
          value={field.hex}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
      </label>
      <div className="min-w-0">
        <p className="text-xs font-medium text-neutral-800 truncate">{field.label}</p>
        <p className="text-[10px] text-neutral-400 font-mono truncate">
          {field.hex}
          {field.sub ? ` · ${field.sub}` : ""}
        </p>
      </div>
    </div>
  );
}

// A living reference for the web app's own design system — real values
// pulled directly from the app's own code (config.ts, index.css,
// mailingTemplate.ts). Every field here is editable for side-by-side
// comparison (font size/weight/color, swatch hex) but the edits are purely
// local page state — nothing here ever writes back to config.ts or any
// real component, so trying combinations can never change the live app by
// accident. "Restablecer" clears every override back to the real values.
// Super-admin only (José).
export function StyleGuidePage() {
  const sampleCompany = COMPANIES[0];
  const [typeOverrides, setTypeOverrides] = useState<Record<string, Partial<TypeField>>>({});
  const [colorOverrides, setColorOverrides] = useState<Record<string, string>>({});

  const hasOverrides = Object.keys(typeOverrides).length > 0 || Object.keys(colorOverrides).length > 0;

  const resolveType = (f: TypeField): TypeField => ({ ...f, ...typeOverrides[f.id] });
  const resolveColor = (f: ColorField): ColorField => ({ ...f, hex: colorOverrides[f.id] ?? f.hex });

  const patchType = (id: string, patch: Partial<TypeField>) =>
    setTypeOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const patchColor = (id: string, hex: string) => setColorOverrides((prev) => ({ ...prev, [id]: hex }));

  const resetAll = () => {
    setTypeOverrides({});
    setColorOverrides({});
  };

  const renderTypeGroup = (fields: TypeField[]) =>
    fields.map((f) => (
      <TypeSample
        key={f.id}
        field={resolveType(f)}
        defaultFontFamily={f.fontFamily}
        onChange={(patch) => patchType(f.id, patch)}
      />
    ));

  const renderColorGroup = (fields: ColorField[]) =>
    fields.map((f) => <ColorSwatch key={f.id} field={resolveColor(f)} onChange={(hex) => patchColor(f.id, hex)} />);

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      {/* Epilogue is now loaded app-wide (index.html) since it's the base
          typeface, so no page-scoped <link> is needed here anymore. */}
      <div
        className="relative z-10 flex-1 min-h-0 overflow-auto rounded-3xl p-6 backdrop-blur-xl w-full"
        style={{
          background: "rgba(255,255,255,0.55)",
          border: "1px solid rgba(255,255,255,0.6)",
          boxShadow: "0 30px 60px -20px rgba(33,31,29,0.35)",
        }}
      >
        <div className="max-w-5xl mx-auto flex flex-col gap-5 pb-10">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="type-h2 text-neutral-900">Guía de estilo</h2>
              <p className="text-xs text-neutral-500">
                Referencia interna de diseño — solo visible para José. Cada campo es editable para comparar
                combinaciones; son cambios de solo vista previa en esta página, nunca afectan a la web real.
              </p>
            </div>
            <button
              onClick={resetAll}
              disabled={!hasOverrides}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-black/[0.04] border border-black/10 text-neutral-600 hover:bg-black/[0.07] disabled:opacity-40 shrink-0"
            >
              <RotateCcw size={12} /> Restablecer
            </button>
          </div>

          <SectionCard title="Jerarquía tipográfica — Web" subtitle="Fuente base: San Francisco / -apple-system">
            <div>{renderTypeGroup(WEB_TYPE_FIELDS)}</div>
          </SectionCard>

          <SectionCard
            title="Jerarquía tipográfica — Newsletter"
            subtitle="Fuente base: pila de fuentes de sistema, web-safe para clientes de correo"
          >
            <div>
              {renderTypeGroup(NEWSLETTER_TYPE_FIELDS)}
              <div className="pt-3">
                <p className="text-xs text-neutral-500 mb-2">Fuentes seleccionables por bloque de texto:</p>
                <div className="flex flex-wrap gap-1.5">
                  {TEXT_FONT_OPTIONS.map((f) => (
                    <span
                      key={f.value}
                      style={{ fontFamily: f.stack }}
                      className="text-xs px-2.5 py-1 rounded-md bg-black/[0.04] border border-black/10 text-neutral-700"
                    >
                      {f.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Colores usados">
            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-neutral-400 mb-2">Comerciales</p>
                <div className="space-y-2">{renderColorGroup(REP_COLOR_FIELDS)}</div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wide text-neutral-400 mb-2">Base</p>
                <div className="space-y-2">{renderColorGroup(BASE_COLOR_FIELDS)}</div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wide text-neutral-400 mb-2">Estados de cliente</p>
                <div className="space-y-2">{renderColorGroup(STATUS_COLOR_FIELDS)}</div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wide text-neutral-400 mb-2">Niveles de alarma</p>
                <div className="space-y-2">{renderColorGroup(ALARM_COLOR_FIELDS)}</div>
              </div>

              <div className="col-span-2">
                <p className="text-[10px] uppercase tracking-wide text-neutral-400 mb-2">Paleta pastel completa</p>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">{renderColorGroup(PASTEL_COLOR_FIELDS)}</div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Objetos" subtitle="Componentes reutilizables, mostrados en vivo tal como aparecen en la web">
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-xs font-medium text-neutral-700 mb-2">Tarjeta clientes</p>
                <div className="w-[420px]">
                  <CompanyCard
                    company={sampleCompany}
                    allCompanies={COMPANIES}
                    onClose={() => {}}
                    onUpdate={() => {}}
                    onAddComment={() => {}}
                  />
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

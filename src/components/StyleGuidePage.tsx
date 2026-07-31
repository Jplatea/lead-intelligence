import { COMPANIES } from "../data/mockCompanies";
import { ALARM_CONFIG, PASTEL, REPS, STATUS_CONFIG } from "../data/config";
import { TEXT_FONT_OPTIONS } from "../lib/mailingTemplate";
import { CompanyCard } from "./CompanyCard";

const WEB_FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', ui-sans-serif, system-ui, 'Segoe UI', Roboto, 'Inter', sans-serif";
const NEWSLETTER_FONT_STACK = "'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif";

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/70 border border-black/10 p-5">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-400">{title}</h3>
      {subtitle && <p className="text-[11px] text-neutral-400 mt-0.5 mb-4">{subtitle}</p>}
      <div className={subtitle ? "" : "mt-4"}>{children}</div>
    </div>
  );
}

function TypeSample({ label, code, style }: { label: string; code: string; style?: React.CSSProperties }) {
  return (
    <div className="flex flex-col gap-1 py-2 border-b border-black/5 last:border-0">
      <p style={style}>{label}</p>
      <p className="text-[10px] text-neutral-400 font-mono">{code}</p>
    </div>
  );
}

function ColorSwatch({ hex, label, sub }: { hex: string; label: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-8 h-8 rounded-lg border border-black/10 shrink-0" style={{ background: hex }} />
      <div className="min-w-0">
        <p className="text-xs font-medium text-neutral-800 truncate">{label}</p>
        <p className="text-[10px] text-neutral-400 font-mono truncate">
          {hex}
          {sub ? ` · ${sub}` : ""}
        </p>
      </div>
    </div>
  );
}

// A living reference for the web app's own design system — real values
// pulled directly from the app's own code (config.ts, index.css,
// mailingTemplate.ts), not a separately-maintained document that can drift
// out of sync. Super-admin only (José).
export function StyleGuidePage() {
  const sampleCompany = COMPANIES[0];

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      <div
        className="relative z-10 flex-1 min-h-0 overflow-auto rounded-3xl p-6 backdrop-blur-xl w-full"
        style={{
          background: "rgba(255,255,255,0.55)",
          border: "1px solid rgba(255,255,255,0.6)",
          boxShadow: "0 30px 60px -20px rgba(33,31,29,0.35)",
        }}
      >
        <div className="max-w-5xl mx-auto flex flex-col gap-5 pb-10">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">Guía de estilo</h2>
            <p className="text-xs text-neutral-500">
              Referencia interna de diseño — solo visible para José. Tipografía, colores y componentes tal como se
              usan realmente en la web.
            </p>
          </div>

          <SectionCard title="Jerarquía tipográfica — Web" subtitle="Fuente base: San Francisco / -apple-system">
            <div>
              <TypeSample
                label="Nombre de empresa (título de tarjeta)"
                code="text-lg font-semibold text-neutral-900 (18px)"
                style={{ fontFamily: WEB_FONT_STACK, fontSize: 18, fontWeight: 600, color: "#171614" }}
              />
              <TypeSample
                label="Título de sección"
                code="text-sm font-semibold text-neutral-900 (14px)"
                style={{ fontFamily: WEB_FONT_STACK, fontSize: 14, fontWeight: 600, color: "#171614" }}
              />
              <TypeSample
                label="ETIQUETA DE CAMPO"
                code="text-[11px] uppercase tracking-widest text-neutral-400"
                style={{
                  fontFamily: WEB_FONT_STACK,
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#a3a29e",
                }}
              />
              <TypeSample
                label="Texto secundario / hint"
                code="text-xs text-neutral-500 (12px)"
                style={{ fontFamily: WEB_FONT_STACK, fontSize: 12, color: "#78766f" }}
              />
              <TypeSample
                label="Cuerpo de texto general"
                code="text-sm text-neutral-700 (14px)"
                style={{ fontFamily: WEB_FONT_STACK, fontSize: 14, color: "#3f3d38" }}
              />
              <TypeSample
                label="Texto de campo / formulario"
                code="text-xs text-neutral-700 (12px)"
                style={{ fontFamily: WEB_FONT_STACK, fontSize: 12, color: "#3f3d38" }}
              />
            </div>
          </SectionCard>

          <SectionCard title="Jerarquía tipográfica — Newsletter" subtitle="Fuente base: pila de fuentes de sistema, web-safe para clientes de correo">
            <div>
              <TypeSample
                label="Título de sección (heading)"
                code="23px · peso 700 · color #bea05a · line-height 1.3"
                style={{ fontFamily: NEWSLETTER_FONT_STACK, fontSize: 23, fontWeight: 700, color: "#bea05a", lineHeight: 1.3 }}
              />
              <TypeSample
                label="Párrafo de cuerpo (body)"
                code="15px · peso 400 · color #211f1d · line-height 1.7"
                style={{ fontFamily: NEWSLETTER_FONT_STACK, fontSize: 15, fontWeight: 400, color: "#211f1d", lineHeight: 1.7 }}
              />
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
                <div className="space-y-2">
                  {Object.values(REPS).map((r) => (
                    <ColorSwatch key={r.id} hex={r.color} label={r.name} sub={r.textColor} />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wide text-neutral-400 mb-2">Base</p>
                <div className="space-y-2">
                  <ColorSwatch hex="#f9f3ec" label="Superficie (surface)" />
                  <ColorSwatch hex="#e6dcd2" label="Fondo general" />
                  <ColorSwatch hex="#211f1d" label="Texto principal" />
                  <ColorSwatch hex="#bea05a" label="Dorado — marca newsletter" />
                  <ColorSwatch hex="#b026ff" label="Resaltado — Voy de visita" />
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wide text-neutral-400 mb-2">Estados de cliente</p>
                <div className="space-y-2">
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <ColorSwatch key={key} hex={cfg.hex} label={cfg.label} />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wide text-neutral-400 mb-2">Niveles de alarma</p>
                <div className="space-y-2">
                  {Object.entries(ALARM_CONFIG).map(([key, cfg]) => (
                    <ColorSwatch key={key} hex={cfg.hex} label={cfg.label} />
                  ))}
                </div>
              </div>

              <div className="col-span-2">
                <p className="text-[10px] uppercase tracking-wide text-neutral-400 mb-2">Paleta pastel completa</p>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                  {Object.entries(PASTEL).map(([key, hex]) => (
                    <ColorSwatch key={key} hex={hex} label={key} />
                  ))}
                </div>
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

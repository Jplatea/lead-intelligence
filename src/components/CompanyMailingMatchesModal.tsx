import { useEffect, useState } from "react";
import { X, Mail, Building2, Triangle, Circle } from "lucide-react";
import type { CompanyMailingMatch } from "../lib/matchMailing";
import { AuroraBackground } from "./AuroraBackground";

interface Props {
  matches: CompanyMailingMatch[];
  onClose: () => void;
  onSync: (match: CompanyMailingMatch, direction: "left" | "right") => void;
}

type Direction = "left" | "right";

function matchKey(match: CompanyMailingMatch): string {
  return `${match.company.id}-${match.contact.id}`;
}

interface ControlButtonProps {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  color: string;
  glow: string;
  title: string;
  children: React.ReactNode;
}

// A bare icon, not a button-with-a-circle-around-it: no background, no
// border, just the glyph itself colored, with a thin dashed ring rotating
// slowly around it (a radar-sweep/targeting-reticle feel, reusing the same
// keyframe as the map's own radar-sweep animation) - swapped in after a
// blurred drop-shadow "blob" pulse read as a fuzzy square instead of
// looking futuristic.
function ControlButton({ onClick, disabled, active, color, glow, title, children }: ControlButtonProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`relative w-7 h-7 flex items-center justify-center bg-transparent border-none transition-transform duration-150 ${
        disabled ? "opacity-20 cursor-not-allowed" : "hover:scale-125 active:scale-90 cursor-pointer"
      }`}
      style={disabled ? undefined : { color }}
    >
      {!disabled && (
        <span
          className="absolute inset-0 rounded-full border border-dashed pointer-events-none"
          style={{
            borderColor: glow,
            opacity: active ? 0.95 : 0.4,
            animation: `radar-sweep ${active ? "1.1s" : "3.2s"} linear infinite`,
          }}
        />
      )}
      <span className="relative z-10 flex items-center justify-center">{children}</span>
    </button>
  );
}

// A floating card centered over the map (not a full-screen modal) showing
// every client company that also appears in the mailing list, matched by
// name (Clientes' "Nombre" column vs mailing's "Empresa" column). Each row
// splits left/right - left is that company's own record (Clientes), right
// is its mailing record - and a control cluster in the middle lets the rep
// reconcile the two emails: the triangles copy one side's email onto the
// other (staged, not yet saved), X discards that staged copy, and the
// circle confirms it - writing the change to the real database and
// dropping the row from this list. The soft mint-to-purple background
// (left = Empresas detectadas' own mint, right = Mailing's own purple)
// reuses the same blurred-blob "aurora" technique as CloudBackground/
// login-cloud elsewhere in the app (fixed colors instead of cycling, and
// mix-blend-mode "multiply" like CloudBackground's own instances use -
// the base .login-cloud class defaults to "screen", which is nearly
// invisible against this light cream background).
// With zero matches there's nothing worth showing - closes immediately and
// silently instead of surfacing any empty-state message.
export function CompanyMailingMatchesModal({ matches, onClose, onSync }: Props) {
  const hasMatches = matches.length > 0;
  const [pending, setPending] = useState<Record<string, Direction>>({});

  useEffect(() => {
    if (hasMatches) return;
    onClose();
  }, [hasMatches, onClose]);

  if (!hasMatches) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-5 pointer-events-none">
      <div className="relative pointer-events-auto rounded-3xl w-full max-w-2xl max-h-full overflow-hidden animate-fade-in-up border border-white/60 shadow-[0_30px_60px_-20px_rgba(33,31,29,0.35)]">
        <AuroraBackground colors={["#a8dfcf", "#a79bcb"]} />

        <div className="relative z-10 p-5 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="type-h2 text-neutral-800">Coincidencias clientes / mailing</h2>
              <p className="text-xs text-neutral-500">
                {matches.length} empresa{matches.length === 1 ? "" : "s"} presente{matches.length === 1 ? "" : "s"} en
                ambas bases de datos.
              </p>
            </div>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-800 p-1 rounded-lg hover:bg-black/5">
              <X size={16} />
            </button>
          </div>

          <div className="space-y-2">
            {matches.map((match) => {
              const { company, contact } = match;
              const key = matchKey(match);
              const dir = pending[key];
              const leftEmail = dir === "left" ? contact.email : company.contact.email;
              const rightEmail = dir === "right" ? company.contact.email : contact.email;

              const stage = (d: Direction) => setPending((prev) => ({ ...prev, [key]: d }));
              const reset = () =>
                setPending((prev) => {
                  const next = { ...prev };
                  delete next[key];
                  return next;
                });
              const confirm = () => {
                if (!dir) return;
                onSync(match, dir);
                reset();
              };

              return (
                <div
                  key={key}
                  className="grid grid-cols-[1fr_auto_1fr] items-stretch rounded-xl bg-white/55 border border-black/6 overflow-hidden"
                >
                  <div className={`p-3 min-w-0 ${dir === "left" ? "bg-[#a8dfcf]/15" : ""}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Building2 size={12} className="text-[#1f5e4d] shrink-0" />
                      <p className="text-xs font-medium text-neutral-800 truncate">{company.name}</p>
                    </div>
                    <p className="text-[11px] text-neutral-500 truncate pl-[18px]">{leftEmail || "—"}</p>
                    {dir === "left" && <p className="text-[9px] text-amber-600 pl-[18px] mt-0.5">pendiente de confirmar</p>}
                  </div>

                  <div className="flex items-center justify-center gap-1.5 px-2 border-x border-black/6 bg-black/[0.015]">
                    <ControlButton
                      onClick={() => stage("left")}
                      active={dir === "left"}
                      color="#1f5e4d"
                      glow="rgba(168, 223, 207, 0.9)"
                      title="Copiar el email de mailing al cliente"
                    >
                      <Triangle size={13} strokeWidth={2.5} style={{ transform: "rotate(-90deg)" }} />
                    </ControlButton>

                    <div className="flex flex-col gap-1">
                      <ControlButton
                        onClick={reset}
                        disabled={!dir}
                        color="#b9503a"
                        glow="rgba(237, 161, 143, 0.9)"
                        title="Deshacer"
                      >
                        <X size={17} strokeWidth={2.5} />
                      </ControlButton>
                      <ControlButton
                        onClick={confirm}
                        disabled={!dir}
                        color="#2a9678"
                        glow="rgba(143, 201, 174, 0.9)"
                        title="Confirmar y guardar"
                      >
                        <Circle size={12} strokeWidth={2.5} />
                      </ControlButton>
                    </div>

                    <ControlButton
                      onClick={() => stage("right")}
                      active={dir === "right"}
                      color="#5a4a8a"
                      glow="rgba(167, 155, 203, 0.9)"
                      title="Copiar el email del cliente a mailing"
                    >
                      <Triangle size={13} strokeWidth={2.5} style={{ transform: "rotate(90deg)" }} />
                    </ControlButton>
                  </div>

                  <div className={`p-3 min-w-0 ${dir === "right" ? "bg-[#a79bcb]/15" : ""}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Mail size={12} className="text-[#5a4a8a] shrink-0" />
                      <p className="text-xs font-medium text-neutral-800 truncate">{contact.companyName || "—"}</p>
                    </div>
                    <p className="text-[11px] text-neutral-500 truncate pl-[18px]">{rightEmail || "—"}</p>
                    {dir === "right" && <p className="text-[9px] text-amber-600 pl-[18px] mt-0.5">pendiente de confirmar</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

import type { LucideIcon } from "lucide-react";
import { Building2, Crown, CalendarClock, AlertTriangle, Loader2 } from "lucide-react";
import type { Company } from "../types";

interface Props {
  companies: Company[];
  mailingContactsCount: number;
  scanning: boolean;
  onOpenImport: () => void;
  onToggleReviewArrows: () => void;
  onOpenVisit: () => void;
  onOpenMailingImport: () => void;
  onShowUncontacted: () => void;
}

interface Tile {
  label: string;
  value: number;
  hint: string;
  icon: LucideIcon;
  bg: string;
  onClick: () => void;
  onIconClick?: () => void;
  spinning?: boolean;
  alarm?: boolean;
  blinkClass?: string;
}

export function StatsRow({
  companies,
  mailingContactsCount,
  scanning,
  onOpenImport,
  onToggleReviewArrows,
  onOpenVisit,
  onOpenMailingImport,
  onShowUncontacted,
}: Props) {
  const upcomingMeetings = companies.filter((c) => c.alarm === "reunion_proxima").length;
  const neverContacted = companies.filter(
    (c) => c.alarm === "nunca_contactado" || c.alarm === "mas_30_dias"
  ).length;
  const needsReview = companies.some((c) => c.needsReview);

  const tiles: Tile[] = [
    {
      label: "Empresas detectadas",
      value: companies.length,
      hint: scanning ? "escaneando fuentes..." : needsReview ? "hay clientes por revisar" : "en la Península",
      icon: scanning ? Loader2 : Building2,
      bg: "bg-[#a8dfcf]",
      onClick: onOpenImport,
      onIconClick: onToggleReviewArrows,
      spinning: scanning,
      alarm: needsReview,
      blinkClass: "detect-blink",
    },
    {
      label: "Mailing",
      value: mailingContactsCount,
      hint: "contactos de mailing",
      icon: Crown,
      bg: "bg-[#a79bcb]",
      onClick: onOpenMailingImport,
    },
    {
      label: "Voy de visita",
      value: upcomingMeetings,
      hint: "agendadas",
      icon: CalendarClock,
      bg: "bg-[#f0c39a]",
      onClick: onOpenVisit,
    },
    {
      label: "Sin contactar / +30d",
      value: neverContacted,
      hint: "requieren acción",
      icon: AlertTriangle,
      bg: "bg-[#eda18f]",
      onClick: onShowUncontacted,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          role="button"
          tabIndex={0}
          onClick={tile.onClick}
          onKeyDown={(e) => e.key === "Enter" && tile.onClick()}
          className={`relative rounded-2xl p-4 text-left shadow-[0_10px_24px_-14px_rgba(33,31,29,0.35)] transition-transform hover:scale-[1.015] cursor-pointer ${tile.bg}`}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-black/60">{tile.label}</span>
            <button
              type="button"
              onClick={(e) => {
                if (tile.onIconClick) {
                  e.stopPropagation();
                  tile.onIconClick();
                }
              }}
              className={`w-8 h-8 rounded-full flex items-center justify-center ${tile.alarm ? (tile.blinkClass ?? "alarm-blink") : "bg-black/15"}`}
            >
              <tile.icon size={15} className={`text-black/70 ${tile.spinning ? "animate-spin" : ""}`} strokeWidth={2.25} />
            </button>
          </div>
          <p className="text-3xl font-medium text-black/80 tracking-tight">{tile.value}</p>
          <p className="text-xs text-black/50 mt-1">{tile.hint}</p>
        </div>
      ))}
    </div>
  );
}

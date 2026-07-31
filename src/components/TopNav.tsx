import { useState } from "react";
import { Radar, ChevronDown, LogOut, CircuitBoard, Mail, Palette } from "lucide-react";
import type { RepId } from "../types";
import { REPS } from "../data/config";
import { NeuralCell } from "./NeuralCell";

export type AppView = "dashboard" | "database" | "mailing" | "guide";

// Only José (jplaza@legroupeprestige.es) gets the internal style-guide tab —
// a super-admin-only reference page, not something the other reps need.
const SUPER_ADMIN: RepId = "jose";

interface Props {
  loggedInRep: RepId;
  onLogout: () => void;
  view: AppView;
  onViewChange: (view: AppView, originRect?: DOMRect) => void;
}

export function TopNav({ loggedInRep, onLogout, view, onViewChange }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const rep = REPS[loggedInRep];

  const tabs: { label: string; icon: typeof Radar; view: AppView }[] = [
    { label: "Lead Intelligence", icon: Radar, view: "dashboard" },
    { label: "Database", icon: CircuitBoard, view: "database" },
    { label: "Mailing", icon: Mail, view: "mailing" },
    ...(loggedInRep === SUPER_ADMIN ? [{ label: "Guía", icon: Palette, view: "guide" as AppView }] : []),
  ];

  return (
    <header className="sticky top-0 z-30 glass border-x-0 border-t-0 px-6 py-3 flex items-center gap-8">
      <div className="flex items-center gap-2">
        <NeuralCell size={34} animated />
        <span className="text-sm font-medium tracking-wide text-neutral-900">ILEADS</span>
      </div>
      <nav className="flex items-center gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.label}
            onClick={(e) => onViewChange(tab.view, e.currentTarget.getBoundingClientRect())}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              view === tab.view
                ? "bg-neutral-900 text-white"
                : "text-neutral-500 hover:text-neutral-800 hover:bg-black/5"
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </nav>
      <div className="ml-auto relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-black/5"
        >
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium text-black/70"
            style={{ background: rep.color }}
          >
            {rep.name[0]}
          </span>
          <span className="text-xs text-neutral-600">{rep.name}</span>
          <ChevronDown size={12} className={`text-neutral-400 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute top-full right-0 mt-2 z-50 glass rounded-2xl p-1.5 w-40 shadow-[0_12px_28px_rgba(33,31,29,0.18)] animate-fade-in-up">
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left text-xs text-[#b9503a] hover:bg-black/[0.04] transition-colors"
              >
                <LogOut size={13} />
                Cerrar sesión
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

import { Radar, CircleUserRound } from "lucide-react";

const TABS = [{ label: "Lead Intelligence", icon: Radar, active: true }];

export function TopNav() {
  return (
    <header className="sticky top-0 z-30 glass border-x-0 border-t-0 px-6 py-3 flex items-center gap-8">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-[#a8dfcf] flex items-center justify-center text-black font-bold text-sm">
          P
        </div>
        <span className="text-sm font-semibold tracking-wide text-neutral-900">PRESTIGE IBÉRICA</span>
      </div>
      <nav className="flex items-center gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.label}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              tab.active
                ? "bg-neutral-900 text-white"
                : "text-neutral-500 hover:text-neutral-800 hover:bg-black/5"
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <CircleUserRound size={26} className="text-neutral-400" />
      </div>
    </header>
  );
}

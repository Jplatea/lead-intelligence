import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { TopNav, type AppView } from "./components/TopNav";
import { LoginPage } from "./components/LoginPage";
import { DatabasePage } from "./components/DatabasePage";
import { FiltersPanel, type Filters } from "./components/FiltersPanel";
import { IberiaMap } from "./components/IberiaMap";
import type { ResultsHighlight } from "./components/ResultsList";
import { CompanyCard } from "./components/CompanyCard";
import { StatsRow } from "./components/StatsRow";
import { NewCompanyModal } from "./components/NewCompanyModal";
import { VisitPlannerModal } from "./components/VisitPlannerModal";
import { MailingModal } from "./components/MailingModal";
import { ImportModal } from "./components/ImportModal";
import { COMPANIES } from "./data/mockCompanies";
import { DEFAULT_SOURCES, type LeadSource } from "./data/sources";
import { checkUrlAndScan } from "./lib/robotsCheck";
import { clearSession, loadSession, saveSession } from "./lib/auth";
import type { Company, RepId } from "./types";

const SOURCES_STORAGE_KEY = "lead-intelligence:custom-sources";
const COMPANIES_STORAGE_KEY = "lead-intelligence:companies";

function loadCustomSources(): LeadSource[] {
  try {
    const raw = localStorage.getItem(SOURCES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Interim persistence: the client list (including manual edits, deletes, and
// bulk imports) survives page reloads via localStorage — this is browser-only
// (not shared across devices) and not a substitute for a real backend, but it
// stops data from silently vanishing on refresh until a database is set up.
function loadCompanies(): Company[] {
  try {
    const raw = localStorage.getItem(COMPANIES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : COMPANIES;
  } catch {
    return COMPANIES;
  }
}

function hostnameLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function todayLabel() {
  return new Date().toLocaleDateString("es-ES", { day: "numeric", month: "short" }).replace(".", "");
}

function App() {
  const [session, setSession] = useState<RepId | null>(loadSession);
  const [view, setView] = useState<AppView>("dashboard");
  const [viewTransition, setViewTransition] = useState<"idle" | "out" | "in">("idle");
  const [companies, setCompanies] = useState<Company[]>(loadCompanies);
  const [filters, setFilters] = useState<Filters>({
    types: new Set(),
    brands: new Set(),
    specialties: new Set(),
  });
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingPosition, setPendingPosition] = useState<{ lat: number; lng: number } | null>(null);

  const [highlight, setHighlight] = useState<ResultsHighlight | null>(null);
  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const [mailingModalOpen, setMailingModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const [sources, setSources] = useState<LeadSource[]>(() => [...DEFAULT_SOURCES, ...loadCustomSources()]);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const custom = sources.filter((s) => s.custom);
    localStorage.setItem(SOURCES_STORAGE_KEY, JSON.stringify(custom));
  }, [sources]);

  useEffect(() => {
    localStorage.setItem(COMPANIES_STORAGE_KEY, JSON.stringify(companies));
  }, [companies]);

  const updateCompany = (id: string, patch: Partial<Company>) => {
    setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const deleteCompany = (id: string) => {
    setCompanies((prev) => prev.filter((c) => c.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
  };

  const addComment = (id: string, repId: RepId, text: string) => {
    setCompanies((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, comments: [...c.comments, { repId, text, date: todayLabel() }] }
          : c
      )
    );
  };

  const toggleFilter = (group: keyof Filters, value: string) => {
    setFilters((prev) => {
      const next = new Set(prev[group]);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return { ...prev, [group]: next };
    });
  };

  const createCompany = (company: Company) => {
    setCompanies((prev) => [...prev, company]);
    setPendingPosition(null);
    setSelectedId(company.id);
  };

  const importCompanies = (imported: Company[]) => {
    setCompanies((prev) => [...prev, ...imported]);
  };

  const clearFilters = () =>
    setFilters({ types: new Set(), brands: new Set(), specialties: new Set() });

  const addSource = (rawUrl: string): string | null => {
    const withProtocol = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    try {
      new URL(withProtocol);
    } catch {
      return "URL no válida";
    }
    const id = `custom-${Date.now()}`;
    setSources((prev) => [
      ...prev,
      {
        id,
        name: hostnameLabel(withProtocol),
        url: withProtocol,
        note: "Añadida manualmente.",
        custom: true,
        robotsStatus: "checking",
      },
    ]);
    checkUrlAndScan(withProtocol).then((result) => {
      setSources((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                robotsStatus: result.status,
                robotsNote: result.note,
                note: result.snippet ? `"${result.snippet}..."` : s.note,
              }
            : s
        )
      );
    });
    return null;
  };

  const scanAllSources = async () => {
    setScanning(true);
    await Promise.all(
      sources.map(async (s) => {
        const result = await checkUrlAndScan(s.url);
        setSources((prev) =>
          prev.map((x) =>
            x.id === s.id
              ? {
                  ...x,
                  robotsStatus: result.status,
                  robotsNote: result.note,
                  note: result.snippet ? `"${result.snippet}..."` : x.note,
                }
              : x
          )
        );
      })
    );
    setScanning(false);
  };

  const handleVisitConfirm = (repIds: RepId[], zone: string) => {
    const ids = new Set(
      companies.filter((c) => repIds.includes(c.assignedRep) && c.province === zone).map((c) => c.id)
    );
    setHighlight({ ids, color: "#f0c39a" });
    setVisitModalOpen(false);
  };

  const handleShowUncontacted = () => {
    const ids = new Set(
      companies
        .filter((c) => c.alarm === "nunca_contactado" || c.alarm === "mas_30_dias")
        .map((c) => c.id)
    );
    setHighlight({ ids, color: "#eda18f" });
  };

  const filteredCompanies = useMemo(() => {
    const q = query.trim().toLowerCase();
    const terms = q.length ? q.split(/\s+/) : [];

    return companies.filter((c) => {
      if (filters.types.size && !filters.types.has(c.type)) return false;
      if (filters.brands.size && ![...filters.brands].every((b) => c.brands.includes(b)))
        return false;
      if (
        filters.specialties.size &&
        ![...filters.specialties].every((s) => c.specialties.includes(s))
      )
        return false;

      if (terms.length) {
        const haystack = [c.name, c.city, c.type, ...c.brands, ...c.specialties]
          .join(" ")
          .toLowerCase();
        if (!terms.every((t) => haystack.includes(t))) return false;
      }
      return true;
    });
  }, [companies, filters, query]);

  const selectedCompany = companies.find((c) => c.id === selectedId) ?? null;

  if (!session) {
    return (
      <LoginPage
        onLogin={(repId) => {
          saveSession(repId);
          setSession(repId);
        }}
      />
    );
  }

  const logout = () => {
    clearSession();
    setSession(null);
  };

  // "Database" click plays a brief merge: the stat tiles and filter/search
  // bar shrink down toward the map card below them (which gives its own
  // small absorbing pulse), then the Database card grows into place once
  // the view actually switches — going the other way is just an instant
  // swap, only the dashboard->database direction was asked for.
  const handleViewChange = (next: AppView) => {
    if (next === view) return;
    if (next === "database" && view === "dashboard") {
      setViewTransition("out");
      setTimeout(() => {
        setView(next);
        setViewTransition("in");
        setTimeout(() => setViewTransition("idle"), 500);
      }, 420);
    } else {
      setView(next);
    }
  };

  if (view === "database") {
    return (
      <div className="min-h-screen flex flex-col">
        <TopNav loggedInRep={session} onLogout={logout} view={view} onViewChange={handleViewChange} />
        <main className="flex-1 flex flex-col p-5 max-w-[1600px] w-full mx-auto">
          <DatabasePage
            companies={companies}
            onUpdate={updateCompany}
            onDelete={deleteCompany}
            entering={viewTransition === "in"}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav loggedInRep={session} onLogout={logout} view={view} onViewChange={handleViewChange} />

      <main className="flex-1 flex flex-col gap-5 p-5 max-w-[1600px] w-full mx-auto">
        <StatsRow
          companies={filteredCompanies}
          scanning={scanning}
          onScan={() => setImportModalOpen(true)}
          onOpenVisit={() => setVisitModalOpen(true)}
          onOpenMailing={() => setMailingModalOpen(true)}
          onShowUncontacted={handleShowUncontacted}
          merging={viewTransition === "out"}
        />

        <div className={`flex items-center gap-3 flex-wrap ${viewTransition === "out" ? "bar-merging" : ""}`}>
          <FiltersPanel filters={filters} onToggle={toggleFilter} onClear={clearFilters} />

          <div className="relative flex-1 min-w-[240px]">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar: Madrid KNX Control4..."
              className="w-full glass rounded-2xl pl-11 pr-36 py-3 text-sm text-neutral-800 placeholder:text-neutral-400 outline-none focus:border-[#a8dfcf] truncate"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-neutral-500 bg-surface px-2 py-1 rounded-full pointer-events-none whitespace-nowrap">
              {filteredCompanies.length} empresas
            </span>
          </div>
        </div>

        <div className={`h-[560px] ${viewTransition === "out" ? "map-absorbing" : ""}`}>
          <IberiaMap
            companies={filteredCompanies}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onPlaceNew={(lat, lng) => setPendingPosition({ lat, lng })}
            highlight={highlight}
          />
        </div>
      </main>

      {pendingPosition && (
        <NewCompanyModal
          lat={pendingPosition.lat}
          lng={pendingPosition.lng}
          onCancel={() => setPendingPosition(null)}
          onCreate={createCompany}
        />
      )}

      {visitModalOpen && (
        <VisitPlannerModal
          companies={companies}
          onClose={() => setVisitModalOpen(false)}
          onConfirm={handleVisitConfirm}
        />
      )}

      {mailingModalOpen && <MailingModal onClose={() => setMailingModalOpen(false)} />}

      {importModalOpen && (
        <ImportModal
          companies={companies}
          onClose={() => setImportModalOpen(false)}
          onAddSource={addSource}
          onImportCompanies={importCompanies}
          onUpdateCompany={updateCompany}
          onDeleteCompany={deleteCompany}
          onRescanAll={scanAllSources}
          scanning={scanning}
        />
      )}

      {selectedCompany && (
        <div className="fixed top-0 right-0 h-screen w-[480px] max-w-[92vw] p-5 pt-[76px] overflow-y-auto z-40 flex flex-col gap-5 pointer-events-none">
          <div className="pointer-events-auto">
            <CompanyCard
              key={selectedCompany.id}
              company={selectedCompany}
              onClose={() => setSelectedId(null)}
              onUpdate={(patch) => updateCompany(selectedCompany.id, patch)}
              onAddComment={(repId, text) => addComment(selectedCompany.id, repId, text)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

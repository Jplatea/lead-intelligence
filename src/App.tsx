import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Search } from "lucide-react";
import { TopNav, type AppView } from "./components/TopNav";
import { LoginPage } from "./components/LoginPage";
import { DatabasePage } from "./components/DatabasePage";
import { CloudBackground } from "./components/CloudBackground";
import { FiltersPanel, type Filters } from "./components/FiltersPanel";
import { IberiaMap } from "./components/IberiaMap";
import type { ResultsHighlight } from "./components/ResultsList";
import { CompanyCard } from "./components/CompanyCard";
import { StatsRow } from "./components/StatsRow";
import { NewCompanyModal } from "./components/NewCompanyModal";
import { VisitPlannerModal } from "./components/VisitPlannerModal";
import { MailingPage } from "./components/MailingPage";
import { ImportModal } from "./components/ImportModal";
import { MailingImportModal } from "./components/MailingImportModal";
import { COMPANIES } from "./data/mockCompanies";
import { DEFAULT_SOURCES, type LeadSource } from "./data/sources";
import { REPS } from "./data/config";
import { checkUrlAndScan } from "./lib/robotsCheck";
import { clearSession, loadSession, saveSession } from "./lib/auth";
import { generateVisitPdf } from "./lib/visitPdf";
import type { Company, MailingContact, RepId } from "./types";

const SOURCES_STORAGE_KEY = "lead-intelligence:custom-sources";
const COMPANIES_STORAGE_KEY = "lead-intelligence:companies";
const MAILING_CONTACTS_STORAGE_KEY = "lead-intelligence:mailing-contacts";

function loadCustomSources(): LeadSource[] {
  try {
    const raw = localStorage.getItem(SOURCES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// The mailing database is a deliberately separate contacts list (name/
// email/company only) — it never merges with the main leads/companies
// database, so it gets its own storage key and load/save cycle.
function loadMailingContacts(): MailingContact[] {
  try {
    const raw = localStorage.getItem(MAILING_CONTACTS_STORAGE_KEY);
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
  const [visited, setVisited] = useState<Set<AppView>>(() => new Set(["dashboard"]));
  const [transformOrigin, setTransformOrigin] = useState("50% 50%");
  const [companies, setCompanies] = useState<Company[]>(loadCompanies);
  const [mailingContacts, setMailingContacts] = useState<MailingContact[]>(loadMailingContacts);
  const [mailingImportModalOpen, setMailingImportModalOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    types: new Set(),
    brands: new Set(),
    specialties: new Set(),
  });
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingPosition, setPendingPosition] = useState<{ lat: number; lng: number } | null>(null);

  const [highlight, setHighlight] = useState<ResultsHighlight | null>(null);
  const [reviewArrowIds, setReviewArrowIds] = useState<Set<string> | null>(null);
  const [visitModalOpen, setVisitModalOpen] = useState(false);
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

  useEffect(() => {
    localStorage.setItem(MAILING_CONTACTS_STORAGE_KEY, JSON.stringify(mailingContacts));
  }, [mailingContacts]);

  const updateCompany = (id: string, patch: Partial<Company>) => {
    setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const importMailingContacts = (imported: MailingContact[]) => {
    setMailingContacts((prev) => [...prev, ...imported]);
  };

  const deleteMailingContact = (id: string) => {
    setMailingContacts((prev) => prev.filter((c) => c.id !== id));
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

  const removeSource = (id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
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

  const handleGenerateVisitPdf = (repIds: RepId[], zone: string) => {
    const matches = companies.filter((c) => repIds.includes(c.assignedRep) && c.province === zone);
    if (matches.length === 0) return;
    generateVisitPdf(matches, repIds.map((id) => REPS[id].name), zone);
  };

  const handleShowUncontacted = () => {
    const ids = new Set(
      companies
        .filter((c) => c.alarm === "nunca_contactado" || c.alarm === "mas_30_dias")
        .map((c) => c.id)
    );
    setHighlight({ ids, color: "#eda18f" });
  };

  // "Empresas detectadas" card opens the import modal (unchanged); its
  // blinking badge instead points out companies pending review on the map
  // with an animated arrow, toggling on/off.
  const handleToggleReviewArrows = () => {
    setReviewArrowIds((prev) =>
      prev ? null : new Set(companies.filter((c) => c.needsReview).map((c) => c.id))
    );
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

  // Switching tabs materializes the new page in place — a soft
  // blur+scale+fade, spring-eased (critically damped, no overshoot, per
  // Apple's fluid-interface guidance) — anchored to the clicked nav tab so
  // it visibly grows from where the user tapped. Pages stay mounted once
  // visited instead of unmounting on every switch: Database's table (and
  // its many CustomSelect cells) is expensive to build, and remounting it
  // on every visit was what made switching to/from it feel slow — now that
  // cost is paid once, and later switches are just a cheap opacity/blur/
  // scale tween on already-built DOM.
  const handleViewChange = (next: AppView, originRect?: DOMRect) => {
    if (next === view) return;
    if (originRect) {
      const originX = ((originRect.left + originRect.width / 2) / window.innerWidth) * 100;
      const originY = ((originRect.top + originRect.height / 2) / window.innerHeight) * 100;
      setTransformOrigin(`${originX}% ${originY}%`);
    }
    setVisited((prev) => (prev.has(next) ? prev : new Set(prev).add(next)));
    setView(next);
  };

  const pageMotionProps = (pageView: AppView) => ({
    initial: { opacity: 0, scale: 0.96, filter: "blur(6px)" },
    animate: {
      opacity: view === pageView ? 1 : 0,
      scale: view === pageView ? 1 : 0.96,
      filter: view === pageView ? "blur(0px)" : "blur(6px)",
    },
    transition: { type: "spring" as const, bounce: 0, duration: 0.22 },
    style: {
      transformOrigin,
      pointerEvents: (view === pageView ? "auto" : "none") as "auto" | "none",
      zIndex: view === pageView ? 1 : 0,
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <CloudBackground active={view === "database" || view === "mailing"} />
      <TopNav loggedInRep={session} onLogout={logout} view={view} onViewChange={handleViewChange} />

      <div className="relative flex-1 min-h-0">
        {visited.has("dashboard") && (
          <motion.main
            {...pageMotionProps("dashboard")}
            className="absolute inset-0 flex flex-col gap-5 p-5 max-w-[1600px] w-full mx-auto overflow-y-auto"
          >
            <StatsRow
              companies={filteredCompanies}
              mailingContactsCount={mailingContacts.length}
              scanning={scanning}
              onOpenImport={() => setImportModalOpen(true)}
              onToggleReviewArrows={handleToggleReviewArrows}
              onOpenVisit={() => setVisitModalOpen(true)}
              onOpenMailingImport={() => setMailingImportModalOpen(true)}
              onShowUncontacted={handleShowUncontacted}
            />

            <div className="flex items-center gap-3 flex-wrap">
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

            <div className="h-[560px]">
              <IberiaMap
                companies={filteredCompanies}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onPlaceNew={(lat, lng) => setPendingPosition({ lat, lng })}
                highlight={highlight}
                reviewIds={reviewArrowIds ?? undefined}
              />
            </div>
          </motion.main>
        )}

        {visited.has("database") && (
          <motion.main
            {...pageMotionProps("database")}
            className="absolute inset-0 flex flex-col p-5 max-w-[1600px] w-full mx-auto overflow-y-auto"
          >
            <DatabasePage companies={companies} onUpdate={updateCompany} onDelete={deleteCompany} />
          </motion.main>
        )}

        {visited.has("mailing") && (
          <motion.main
            {...pageMotionProps("mailing")}
            className="absolute inset-0 flex flex-col p-5 max-w-[1600px] w-full mx-auto overflow-y-auto"
          >
            <MailingPage contacts={mailingContacts} />
          </motion.main>
        )}
      </div>

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
          onGeneratePdf={handleGenerateVisitPdf}
        />
      )}

      {importModalOpen && (
        <ImportModal
          companies={companies}
          sources={sources}
          onClose={() => setImportModalOpen(false)}
          onAddSource={addSource}
          onRemoveSource={removeSource}
          onImportCompanies={importCompanies}
          onUpdateCompany={updateCompany}
          onDeleteCompany={deleteCompany}
          onRescanAll={scanAllSources}
          scanning={scanning}
        />
      )}

      {mailingImportModalOpen && (
        <MailingImportModal
          contacts={mailingContacts}
          onClose={() => setMailingImportModalOpen(false)}
          onImport={importMailingContacts}
          onDeleteContact={deleteMailingContact}
        />
      )}

      {selectedCompany && (
        <div className="fixed top-0 right-0 h-screen w-[480px] max-w-[92vw] p-5 pt-[76px] overflow-y-auto z-40 flex flex-col gap-5 pointer-events-none">
          <div className="pointer-events-auto">
            <CompanyCard
              key={selectedCompany.id}
              company={selectedCompany}
              allCompanies={companies}
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

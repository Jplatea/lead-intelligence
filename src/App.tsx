import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Loader2, Search } from "lucide-react";
import { TopNav, type AppView } from "./components/TopNav";
import { LoginPage } from "./components/LoginPage";
import { DatabasePage } from "./components/DatabasePage";
import { CloudBackground } from "./components/CloudBackground";
import { FiltersPanel, type Filters } from "./components/FiltersPanel";
import { IberiaMap } from "./components/IberiaMap";
import type { ResultsHighlight } from "./components/ResultsList";
import { CompanyCard } from "./components/CompanyCard";
import { StatsRow } from "./components/StatsRow";
import { VisitPlannerModal } from "./components/VisitPlannerModal";
import { NewsletterContactCard } from "./components/NewsletterContactCard";
import { CommunicationCard } from "./components/CommunicationCard";
import { RowActionBubble } from "./components/RowActionBubble";
import { MailingPage } from "./components/MailingPage";
import { StyleGuidePage } from "./components/StyleGuidePage";
import { ImportModal } from "./components/ImportModal";
import { MailingImportModal } from "./components/MailingImportModal";
import { COMPANIES } from "./data/mockCompanies";
import { DEFAULT_SOURCES, type LeadSource } from "./data/sources";
import { REPS, TYPE_OPTIONS } from "./data/config";
import { checkUrlAndScan } from "./lib/robotsCheck";
import { findAllMailingDuplicateGroups } from "./lib/importMailingContacts";
import { findCompanyMailingMatches, type CompanyMailingMatch } from "./lib/matchMailing";
import { CompanyMailingMatchesModal } from "./components/CompanyMailingMatchesModal";
import { clearSession, loadSession, saveSession } from "./lib/auth";
import { generateVisitPdf } from "./lib/visitPdf";
import { regionOf } from "./lib/regions";
import { IBERIA_CENTER } from "./lib/mapStyle";
import { isSupabaseConfigured } from "./lib/supabase";
import {
  fetchCompanies,
  fetchMailingContacts,
  insertCompanies,
  updateCompanyRow,
  deleteCompanyRow,
  insertMailingContacts,
  updateMailingContactRow,
  deleteMailingContactRow,
  deleteMailingContactRows,
} from "./lib/db";
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
  const [companies, setCompanies] = useState<Company[]>(isSupabaseConfigured() ? [] : loadCompanies);
  const [mailingContacts, setMailingContacts] = useState<MailingContact[]>(
    isSupabaseConfigured() ? [] : loadMailingContacts
  );
  const [dataLoading, setDataLoading] = useState(isSupabaseConfigured());
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);
  const [mailingImportModalOpen, setMailingImportModalOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    types: new Set(),
    brands: new Set(),
    specialties: new Set(),
  });
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [communicationId, setCommunicationId] = useState<string | null>(null);
  const [actionBubble, setActionBubble] = useState<{ company: Company; x: number; y: number } | null>(null);

  const [highlight, setHighlight] = useState<ResultsHighlight | null>(null);
  const [reviewArrowIds, setReviewArrowIds] = useState<Set<string> | null>(null);
  const [companyMailingMatches, setCompanyMailingMatches] = useState<CompanyMailingMatch[] | null>(null);
  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const [sources, setSources] = useState<LeadSource[]>(() => [...DEFAULT_SOURCES, ...loadCustomSources()]);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const custom = sources.filter((s) => s.custom);
    localStorage.setItem(SOURCES_STORAGE_KEY, JSON.stringify(custom));
  }, [sources]);

  // Supabase is the real database now - local storage is kept only as a
  // secondary write-through cache (still useful if Supabase has a hiccup),
  // never the primary source once Supabase is configured. On first load, if
  // Supabase comes back completely empty, this migrates whatever's still
  // sitting in this browser's local storage up to it (reading the raw key
  // directly, not loadCompanies()'s own mock-data fallback, so the bundled
  // demo data never gets uploaded as if it were real).
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    (async () => {
      try {
        const [remoteCompanies, remoteContacts] = await Promise.all([fetchCompanies(), fetchMailingContacts()]);
        if (cancelled) return;
        if (remoteCompanies.length === 0 && remoteContacts.length === 0) {
          let localCompanies: Company[] = [];
          let localContacts: MailingContact[] = [];
          try {
            const raw = localStorage.getItem(COMPANIES_STORAGE_KEY);
            localCompanies = raw ? JSON.parse(raw) : [];
          } catch {
            localCompanies = [];
          }
          try {
            const raw = localStorage.getItem(MAILING_CONTACTS_STORAGE_KEY);
            localContacts = raw ? JSON.parse(raw) : [];
          } catch {
            localContacts = [];
          }
          if (localCompanies.length > 0) await insertCompanies(localCompanies);
          if (localContacts.length > 0) await insertMailingContacts(localContacts);
          setCompanies(localCompanies.length > 0 ? localCompanies : COMPANIES);
          setMailingContacts(localContacts);
        } else {
          setCompanies(remoteCompanies);
          setMailingContacts(remoteContacts);
        }
      } catch (e) {
        console.error("Supabase load failed, falling back to local storage", e);
        if (cancelled) return;
        setDataLoadError(
          e instanceof Error ? e.message : "No se pudo conectar con la base de datos. Usando datos locales."
        );
        setCompanies(loadCompanies());
        setMailingContacts(loadMailingContacts());
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(COMPANIES_STORAGE_KEY, JSON.stringify(companies));
  }, [companies]);

  useEffect(() => {
    localStorage.setItem(MAILING_CONTACTS_STORAGE_KEY, JSON.stringify(mailingContacts));
  }, [mailingContacts]);

  // Any manual edit clears the "Revisar" flag by default — a rep touching
  // the record is itself a sign it's been looked at. Callers that need to
  // recompute it themselves (e.g. merging import duplicates) can still pass
  // an explicit needsReview in the patch, which takes precedence.
  const updateCompany = (id: string, patch: Partial<Company>) => {
    const fullPatch = { ...patch, needsReview: patch.needsReview ?? false };
    setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, ...fullPatch } : c)));
    if (isSupabaseConfigured()) {
      updateCompanyRow(id, fullPatch).catch((e) => console.error("Supabase updateCompanyRow failed", e));
    }
  };

  const importMailingContacts = (imported: MailingContact[]) => {
    setMailingContacts((prev) => [...prev, ...imported]);
    if (isSupabaseConfigured()) {
      insertMailingContacts(imported).catch((e) => console.error("Supabase insertMailingContacts failed", e));
    }
  };

  const deleteMailingContact = (id: string) => {
    setMailingContacts((prev) => prev.filter((c) => c.id !== id));
    if (isSupabaseConfigured()) {
      deleteMailingContactRow(id).catch((e) => console.error("Supabase deleteMailingContactRow failed", e));
    }
  };

  // Removes any mailing contact sharing an email with an earlier one in the
  // list, then writes the result to localStorage immediately - not just
  // relying on the usual autosave effect, since that only fires on a state
  // change and this should confirm a save even when zero duplicates exist.
  const rescanMailingDuplicates = (): number => {
    const dupes = findAllMailingDuplicateGroups(mailingContacts);
    const idsToRemove = new Set(dupes.map((d) => d.incoming.id));
    const deduped = idsToRemove.size > 0 ? mailingContacts.filter((c) => !idsToRemove.has(c.id)) : mailingContacts;
    if (idsToRemove.size > 0) setMailingContacts(deduped);
    localStorage.setItem(MAILING_CONTACTS_STORAGE_KEY, JSON.stringify(deduped));
    if (isSupabaseConfigured() && idsToRemove.size > 0) {
      deleteMailingContactRows([...idsToRemove]).catch((e) => console.error("Supabase dedup delete failed", e));
    }
    return dupes.length;
  };

  const updateMailingContact = (id: string, patch: Partial<MailingContact>) => {
    setMailingContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    if (isSupabaseConfigured()) {
      updateMailingContactRow(id, patch).catch((e) => console.error("Supabase updateMailingContactRow failed", e));
    }
  };

  const deleteCompany = (id: string) => {
    setCompanies((prev) => prev.filter((c) => c.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
    if (isSupabaseConfigured()) {
      deleteCompanyRow(id).catch((e) => console.error("Supabase deleteCompanyRow failed", e));
    }
  };

  const addComment = (id: string, repId: RepId, text: string) => {
    const comment = { repId, text, date: todayLabel() };
    setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, comments: [...c.comments, comment] } : c)));
    if (isSupabaseConfigured()) {
      const existing = companies.find((c) => c.id === id);
      if (existing) {
        updateCompanyRow(id, { comments: [...existing.comments, comment] }).catch((e) =>
          console.error("Supabase addComment failed", e)
        );
      }
    }
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
    setSelectedId(company.id);
    if (isSupabaseConfigured()) {
      insertCompanies([company]).catch((e) => console.error("Supabase insertCompanies failed", e));
    }
  };

  // "Añadir cliente manualmente" opens the same CompanyCard used for editing
  // any existing one, pre-filled blank - but as a draft that isn't in
  // `companies` yet and has no map pin, so nothing is created until
  // "Guardar" is pressed. Position is a placeholder (Iberia's own center)
  // that's replaced the moment the rep verifies a real address - it's never
  // shown as a marker either way, since drafts aren't part of `companies`.
  const buildBlankCompany = (): Company => ({
    id: `manual-${Date.now()}`,
    name: "",
    type: TYPE_OPTIONS[0],
    city: "",
    province: "",
    country: "España",
    postalCode: "",
    lat: IBERIA_CENTER.lat,
    lng: IBERIA_CENTER.lng,
    contact: {},
    brands: [],
    specialties: [],
    assignedRep: "jose",
    status: "nuevo",
    alarm: "nunca_contactado",
    importedType: "manual",
    comments: [],
    needsReview: false,
  });

  const [draftCompany, setDraftCompany] = useState<Company | null>(null);

  const startNewCompanyDraft = () => {
    setDraftCompany(buildBlankCompany());
  };

  const updateDraftCompany = (patch: Partial<Company>) => {
    setDraftCompany((prev) => (prev ? { ...prev, ...patch, needsReview: patch.needsReview ?? false } : prev));
  };

  const discardDraftCompany = () => setDraftCompany(null);

  const saveDraftCompany = () => {
    if (!draftCompany) return;
    createCompany(draftCompany);
    setDraftCompany(null);
  };

  const importCompanies = (imported: Company[]) => {
    setCompanies((prev) => [...prev, ...imported]);
    if (isSupabaseConfigured()) {
      insertCompanies(imported).catch((e) => console.error("Supabase insertCompanies failed", e));
    }
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
      companies.filter((c) => repIds.includes(c.assignedRep) && regionOf(c.province) === zone).map((c) => c.id)
    );
    setHighlight({ ids, color: "#b026ff" });
  };

  const handleGenerateVisitPdf = (repIds: RepId[], zone: string) => {
    const matches = companies.filter((c) => repIds.includes(c.assignedRep) && regionOf(c.province) === zone);
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
  // blinking badge toggles the review arrows on the map AND now also
  // cross-checks the clients database against the mailing list, opening a
  // results modal listing any company present in both.
  const handleToggleReviewArrows = () => {
    setReviewArrowIds((prev) =>
      prev ? null : new Set(companies.filter((c) => c.needsReview).map((c) => c.id))
    );
    setCompanyMailingMatches(findCompanyMailingMatches(companies, mailingContacts));
  };

  // Applies one side's email onto the other for a matched company/contact
  // pair (direction "left" copies the mailing contact's email onto the
  // client record, "right" copies the client's email onto the mailing
  // contact), then drops that pair from the pending matches list since it's
  // now resolved - the underlying autosave effects persist both stores.
  const handleSyncMatch = (match: CompanyMailingMatch, direction: "left" | "right") => {
    if (direction === "left") {
      updateCompany(match.company.id, { contact: { ...match.company.contact, email: match.contact.email } });
    } else {
      updateMailingContact(match.contact.id, { email: match.company.contact.email });
    }
    setCompanyMailingMatches((prev) =>
      prev ? prev.filter((m) => !(m.company.id === match.company.id && m.contact.id === match.contact.id)) : prev
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
  const selectedContact = mailingContacts.find((c) => c.id === selectedContactId) ?? null;
  const communicationCompany = companies.find((c) => c.id === communicationId) ?? null;

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

  if (dataLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#f9f3ec]">
        <Loader2 size={24} className="animate-spin text-neutral-400" />
        <p className="text-xs text-neutral-500">Cargando datos...</p>
      </div>
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
    // Explicit request: any open floating card/modal should close when
    // switching between the 4 main sections, not follow you across tabs.
    setSelectedId(null);
    setSelectedContactId(null);
    setCommunicationId(null);
    setActionBubble(null);
    setVisitModalOpen(false);
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
      {dataLoadError && (
        <div className="bg-[#eda18f]/20 border-b border-[#eda18f]/40 text-[#b9503a] text-xs text-center py-1.5 px-4">
          No se pudo conectar con la base de datos ({dataLoadError}) — mostrando datos guardados en este navegador.
        </div>
      )}

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

            <div className="relative h-[560px]">
              <IberiaMap
                companies={filteredCompanies}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onAddNew={startNewCompanyDraft}
                highlight={highlight}
                reviewIds={reviewArrowIds ?? undefined}
              />
              {companyMailingMatches && (
                <CompanyMailingMatchesModal
                  matches={companyMailingMatches}
                  onSync={handleSyncMatch}
                  onClose={() => setCompanyMailingMatches(null)}
                />
              )}
            </div>
          </motion.main>
        )}

        {visited.has("database") && (
          <motion.main
            {...pageMotionProps("database")}
            className="absolute inset-0 flex flex-col p-5 max-w-[1600px] w-full mx-auto overflow-hidden"
          >
            <DatabasePage
              companies={companies}
              mailingContacts={mailingContacts}
              onRowClick={(company, x, y) => setActionBubble({ company, x, y })}
              onSelectContact={setSelectedContactId}
            />
          </motion.main>
        )}

        {visited.has("mailing") && (
          <motion.main
            {...pageMotionProps("mailing")}
            className="absolute inset-0 flex flex-col p-5 max-w-[1600px] w-full mx-auto overflow-hidden"
          >
            <MailingPage contacts={mailingContacts} />
          </motion.main>
        )}

        {visited.has("guide") && session === "jose" && (
          <motion.main
            {...pageMotionProps("guide")}
            className="absolute inset-0 flex flex-col p-5 max-w-[1600px] w-full mx-auto overflow-hidden"
          >
            <StyleGuidePage />
          </motion.main>
        )}
      </div>

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
          onRescanDuplicates={rescanMailingDuplicates}
        />
      )}

      {(draftCompany || selectedCompany) && (
        <div className="fixed top-0 right-0 h-screen w-[480px] max-w-[92vw] p-5 pt-[76px] overflow-y-auto z-50 flex flex-col gap-5 pointer-events-none">
          <div className="pointer-events-auto">
            {draftCompany ? (
              <CompanyCard
                key="draft"
                company={draftCompany}
                allCompanies={companies}
                onClose={discardDraftCompany}
                onUpdate={updateDraftCompany}
                onAddComment={() => {}}
                isDraft
                onSave={saveDraftCompany}
              />
            ) : (
              selectedCompany && (
                <CompanyCard
                  key={selectedCompany.id}
                  company={selectedCompany}
                  allCompanies={companies}
                  onClose={() => setSelectedId(null)}
                  onUpdate={(patch) => updateCompany(selectedCompany.id, patch)}
                  onAddComment={(repId, text) => addComment(selectedCompany.id, repId, text)}
                  onDelete={() => deleteCompany(selectedCompany.id)}
                />
              )
            )}
          </div>
        </div>
      )}

      {selectedContact && (
        <NewsletterContactCard
          contact={selectedContact}
          onClose={() => setSelectedContactId(null)}
          onDelete={deleteMailingContact}
          onUpdate={updateMailingContact}
        />
      )}

      {communicationCompany && (
        <CommunicationCard company={communicationCompany} repId={session} onClose={() => setCommunicationId(null)} />
      )}

      {actionBubble && (
        <RowActionBubble
          x={actionBubble.x}
          y={actionBubble.y}
          onClose={() => setActionBubble(null)}
          onViewCard={() => {
            setSelectedId(actionBubble.company.id);
            setCommunicationId(null);
            setActionBubble(null);
          }}
          onCommunicate={() => {
            setCommunicationId(actionBubble.company.id);
            setSelectedId(null);
            setActionBubble(null);
          }}
        />
      )}
    </div>
  );
}

export default App;

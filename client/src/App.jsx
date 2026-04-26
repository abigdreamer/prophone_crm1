import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import {
  BrowserRouter, Routes, Route, Navigate,
  Outlet, useLocation, useNavigate, useParams,
} from "react-router-dom";
import { LayoutList, ChevronDown, Building2 } from "lucide-react";

import LoginScreen          from "./components/LoginScreen";
import CompanySelectScreen  from "./components/CompanySelectScreen";
import TopNav               from "./components/TopNav";
import LifecycleChart  from "./components/LifecycleChart";
import ProfileDropdown from "./components/ProfileDropdown";

import PageDashboard      from "./pages/PageDashboard";
import PageTable          from "./pages/PageTable";
import PageEmailTemplates from "./pages/PageEmailTemplates";
import PageEmailBuilder   from "./pages/PageEmailBuilder";
import PageProfile        from "./pages/PageProfile";
import PageMarketing      from "./pages/PageMarketing";
import PageSettings       from "./pages/PageSettings";
import PageUsers          from "./pages/PageUsers";
import PageCompanies      from "./pages/PageCompanies";
import PageDomains        from "./pages/PageDomains";
import NotFound           from "./pages/NotFound";

import T                    from "./theme";
import { getContacts }                    from "./api/contacts.api";
import { logoutUser, selectCompany as selectCompanyApi } from "./api/auth.api";
import { listCompanies }                 from "./api/companies.api";
import { PageLoader, ContentLoader } from "./components/ui/Loader";

// ─── App-wide context ─────────────────────────────────────────────────────────
export const AppContext = createContext(null);
export function useApp() { return useContext(AppContext); }

// ─── Contacts sidebar ─────────────────────────────────────────────────────────
function ContactsNavSidebar() {
  return (
    <div style={{
      width: 200, flexShrink: 0,
      background: T.surface, borderRight: "1px solid " + T.border,
      display: "flex", flexDirection: "column", paddingTop: 16,
    }}>
      <div style={{ padding: "0 14px 10px", fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>
        Contacts
      </div>
      <div style={{
        display: "flex", alignItems: "center", gap: 9, padding: "10px 14px",
        background: T.accentLow, borderLeft: "3px solid " + T.accent,
        color: T.accent, fontSize: 13, fontWeight: 600,
      }}>
        <LayoutList size={15} />
        <span>List</span>
      </div>
    </div>
  );
}

// ─── Company scope selector (super_admin only) ───────────────────────────────
function CompanyScopeSelector() {
  const { scopedCompany, setScopedCompany, setCurrentUserAndToken } = useApp();
  const [companies, setCompanies] = useState([]);
  const [open, setOpen]           = useState(false);
  const [switching, setSwitching] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    listCompanies().then(setCompanies).catch(() => {});
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = companies.find(c => c.prophone_id === scopedCompany);
  const label    = selected ? selected.name : "All";

  async function handlePick(prophone_id) {
    if (switching) return;
    setSwitching(true);
    try {
      const data = await selectCompanyApi(prophone_id);
      setCurrentUserAndToken(data.user, data.token);
      setScopedCompany(prophone_id);
    } catch {
      // silent — company switch is best-effort
    } finally {
      setSwitching(false);
      setOpen(false);
    }
  }

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 7,
          padding: "5px 10px 5px 8px",
          background: scopedCompany ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.1)",
          border: "1px solid " + (scopedCompany ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.18)"),
          borderRadius: 7, cursor: "pointer", fontFamily: "inherit",
          color: "#fff", fontSize: 12, fontWeight: 500,
          transition: "all 0.12s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = scopedCompany ? "rgba(99,102,241,0.35)" : "rgba(255,255,255,0.18)"}
        onMouseLeave={e => e.currentTarget.style.background = scopedCompany ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.1)"}
      >
        <Building2 size={12} style={{ opacity: 0.75 }} />
        <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        <ChevronDown size={12} style={{ opacity: 0.65, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0,
          background: "#fff", border: "1px solid #e2e8f0",
          borderRadius: 10, minWidth: 200, zIndex: 700,
          boxShadow: "0 8px 32px rgba(0,0,0,0.14)", overflow: "hidden", padding: 6,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase", padding: "4px 8px 6px" }}>
            Company scope
          </div>
          {companies.map(c => {
            const active = c.prophone_id === scopedCompany;
            return (
              <button
                key={c.prophone_id ?? "__all__"}
                onClick={() => handlePick(c.prophone_id)}
                disabled={switching}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  width: "100%", padding: "8px 10px",
                  background: active ? "#eef2ff" : "transparent",
                  border: "none", borderRadius: 6,
                  cursor: switching ? "default" : "pointer",
                  fontFamily: "inherit", fontSize: 12,
                  fontWeight: active ? 700 : 400,
                  color: active ? "#4f46e5" : "#1e293b",
                  textAlign: "left",
                }}
                onMouseEnter={e => { if (!active && !switching) e.currentTarget.style.background = "#f8fafc"; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
              >
                <Building2 size={12} style={{ color: active ? "#4f46e5" : "#94a3b8", flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                {active && <span style={{ fontSize: 10, color: "#4f46e5" }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Route wrappers (need hooks, so must be React components) ─────────────────

function DashboardRoute() {
  const navigate = useNavigate();
  const { pool, clientId, viewMode, contacts, setContacts, currentUser, setViewMode } = useApp();
  return (
    <PageDashboard
      pool={pool} clientId={clientId} viewMode={viewMode}
      contacts={contacts} setContacts={setContacts} currentUser={currentUser}
      setViewMode={v => { setViewMode(v); navigate("/contacts"); }}
      setPage={p => navigate("/" + (p === "all-contacts" ? "contacts" : p))}
    />
  );
}

function ContactsRoute() {
  const { pool, clientId, viewMode, setViewMode, contacts, setContacts, currentUser, handleSelect } = useApp();
  return (
    <PageTable
      pool={pool} clientId={clientId}
      viewMode={viewMode} setViewMode={setViewMode}
      contacts={contacts} setContacts={setContacts}
      currentUser={currentUser} onSelect={handleSelect}
    />
  );
}

function EmailTemplatesRoute() {
  const navigate = useNavigate();
  return (
    <PageEmailTemplates
      onOpenBuilder={id => navigate(id ? `/email-builder/${id}` : "/email-builder")}
    />
  );
}

function EmailBuilderRoute() {
  const { id } = useParams();
  const navigate = useNavigate();
  return <PageEmailBuilder templateId={id} onBack={() => navigate(-1)} />;
}

function ProfileRoute() {
  const navigate = useNavigate();
  const { currentUser } = useApp();
  return <PageProfile user={currentUser} onBack={() => navigate(-1)} />;
}

function SettingsRoute()  { const { currentUser } = useApp(); return <PageSettings  currentUser={currentUser} />; }
function UsersRoute()     { const { currentUser, scopedCompany } = useApp(); return <PageUsers     currentUser={currentUser} scopedCompany={scopedCompany} />; }
function CompaniesRoute() { const { currentUser, scopedCompany } = useApp(); return <PageCompanies currentUser={currentUser} scopedCompany={scopedCompany} />; }

// ─── Protected layout ─────────────────────────────────────────────────────────
function AppLayout() {
  const { currentUser, handleLogout, charted, setCharted, handleUpdate, loading, firstLoad } = useApp();
  const isSuperAdmin = currentUser?.role === "super_admin";
  const navigate  = useNavigate();
  const { pathname } = useLocation();

  const isContacts = pathname === "/contacts";
  const isEmail    = pathname.startsWith("/email");
  const isProfile  = pathname === "/profile";
  const isFullPage = isEmail || ["/marketing", "/settings", "/users", "/companies", "/domains"].includes(pathname);
  const showPanel  = !isFullPage && !isProfile && charted;

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      background: T.bg, color: T.text,
      fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif",
      fontSize: 14, overflow: "hidden",
    }}>
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div style={{
        height: 54, flexShrink: 0, background: T.header,
        display: "flex", alignItems: "center",
        padding: "0 16px", gap: 12, zIndex: 200,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginRight: 4, flexShrink: 0 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: "linear-gradient(135deg, #6366f1, #818cf8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 900, color: "#fff",
            boxShadow: "0 2px 8px rgba(99,102,241,0.4)", flexShrink: 0,
          }}>P</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", lineHeight: 1, letterSpacing: "-0.03em" }}>Prophone</div>
            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em", fontWeight: 600, textTransform: "uppercase" }}>CRM</div>
          </div>
        </div>

        <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.15)", flexShrink: 0 }} />

        <TopNav />

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {isSuperAdmin && <CompanyScopeSelector />}
          <ProfileDropdown
            user={currentUser}
            onProfile={() => navigate("/profile")}
            onLogout={handleLogout}
          />
        </div>
      </div>

      {firstLoad && loading && <PageLoader text="Loading CRM data…" />}

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

        {isContacts && <ContactsNavSidebar />}

        <div style={{
          flex: 1,
          overflow: isFullPage ? "hidden" : "auto",
          padding: isFullPage || isProfile ? 0 : 20,
          minWidth: 0, position: "relative", minHeight: 0,
        }}>
          {!firstLoad && loading && !isFullPage && !isProfile && (
            <ContentLoader text="Loading contacts…" />
          )}
          <Outlet />
        </div>

        {showPanel && (
          <div style={{
            width: 420, flexShrink: 0,
            background: T.surface, borderLeft: "1px solid " + T.border,
            display: "flex", flexDirection: "column", overflow: "hidden",
          }}>
            <div style={{
              padding: "10px 14px", borderBottom: "1px solid " + T.border,
              display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>Lead Lifecycle</div>
              <button
                onClick={() => setCharted(null)}
                style={{ background: "none", border: "none", color: T.muted, fontSize: 16, cursor: "pointer", padding: 0 }}
              >✕</button>
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <LifecycleChart contact={charted} onUpdate={handleUpdate} currentUser={currentUser} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try { const s = localStorage.getItem("prophone_user"); return s ? JSON.parse(s) : null; }
    catch { return null; }
  });

  // super_admin company scope: null = all companies, string = specific prophone_id
  // Initialised from currentUser.prophone_id when it exists (set by selectCompany JWT flow)
  const [scopedCompany, setScopedCompany] = useState(() =>
    currentUser?.prophone_id || localStorage.getItem("prophone_scoped_company") || null
  );

  // Gate skip flag — persists across refreshes; cleared on logout
  const [gateSkipped, setGateSkipped] = useState(() =>
    !!localStorage.getItem("prophone_gate_skipped")
  );

  // Keep prophone_scoped_company in sync so API helpers can read it without prop drilling
  useEffect(() => {
    if (scopedCompany) localStorage.setItem("prophone_scoped_company", scopedCompany);
    else localStorage.removeItem("prophone_scoped_company");
  }, [scopedCompany]);

  function setCurrentUserAndToken(user, token) {
    localStorage.setItem("prophone_token", token);
    localStorage.setItem("prophone_user", JSON.stringify(user));
    setCurrentUser(user);
  }

  function skipGate() {
    localStorage.setItem("prophone_gate_skipped", "1");
    setGateSkipped(true);
  }

  function handleSetUser(user) {
    if (user) localStorage.setItem("prophone_user", JSON.stringify(user));
    else logoutUser();
    setCurrentUser(user);
    setScopedCompany(null);
    localStorage.removeItem("prophone_scoped_company");
    if (!user) {
      setGateSkipped(false);
      localStorage.removeItem("prophone_gate_skipped");
    }
  }

  const handleLogout = () => handleSetUser(null);

  const isSuperAdmin     = currentUser?.role === "super_admin";
  const showCompanyGate  = isSuperAdmin && !currentUser?.prophone_id && !gateSkipped;

  const pool     = "prospect";
  const clientId = currentUser?.prophone_id || (isSuperAdmin ? scopedCompany : null);

  const [viewMode,  setViewMode]  = useState("all");
  const [contacts,  setContacts]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const [selected,  setSelected]  = useState(null);
  const [charted,   setCharted]   = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    setLoading(true);
    getContacts(pool, clientId)
      .then(data => { if (!cancelled) { setContacts(data); setSelected(null); setCharted(null); } })
      .catch(err => console.error("Failed to load contacts:", err))
      .finally(() => { if (!cancelled) { setLoading(false); setFirstLoad(false); } });
    return () => { cancelled = true; };
  }, [clientId, currentUser]);

  const handleSelect = useCallback(c => { setSelected(c); setCharted(c); }, []);
  const handleUpdate = useCallback(updated => {
    setContacts(prev => prev.map(c => c.id === updated.id ? updated : c));
    setSelected(updated);
    setCharted(updated);
  }, []);

  const ctx = {
    currentUser, handleSetUser, handleLogout,
    setCurrentUserAndToken, skipGate,
    scopedCompany, setScopedCompany,
    pool, clientId,
    viewMode, setViewMode,
    contacts, setContacts,
    loading, firstLoad,
    selected, setSelected,
    charted, setCharted,
    handleSelect, handleUpdate,
  };

  return (
    <AppContext.Provider value={ctx}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route
            path="/login"
            element={currentUser ? <Navigate to="/dashboard" replace /> : <LoginScreen onLogin={handleSetUser} />}
          />

          {/* Protected — gate shows company selector for super_admin on first login */}
          <Route element={
            !currentUser
              ? <Navigate to="/login" replace />
              : showCompanyGate
              ? <CompanySelectScreen
                  onSelect={(user, token) => {
                    setCurrentUserAndToken(user, token);
                    setScopedCompany(user.prophone_id);
                  }}
                  onBack={handleLogout}
                />
              : <AppLayout />
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"         element={<DashboardRoute />} />
            <Route path="/contacts"          element={<ContactsRoute />} />
            <Route path="/marketing"         element={<PageMarketing />} />
            <Route path="/email-templates"   element={<EmailTemplatesRoute />} />
            <Route path="/email-builder"     element={<EmailBuilderRoute />} />
            <Route path="/email-builder/:id" element={<EmailBuilderRoute />} />
            <Route path="/settings"          element={<SettingsRoute />} />
            <Route path="/profile"           element={<ProfileRoute />} />
            <Route path="/users"             element={<UsersRoute />} />
            <Route path="/companies"         element={<CompaniesRoute />} />
            <Route path="/domains"           element={<PageDomains />} />
            <Route path="*"                  element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppContext.Provider>
  );
}

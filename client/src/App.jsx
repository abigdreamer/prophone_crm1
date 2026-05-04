import { useState, useEffect, useCallback, useRef } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { usePool } from "./context/PoolContext";

import TopNav from "./components/TopNav";
import PoolSwitcher from "./components/PoolSwitcher";
import Sidebar from "./components/Sidebar";
import LifecycleChart from "./components/LifecycleChart";
import UserChip from "./components/layout/UserChip";
import ComingSoon from "./components/layout/ComingSoon";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ContactsPage from "./pages/ContactsPage";
import DomainsPage from "./pages/DomainsPage";
import ClientsPage from "./pages/ClientsPage";
import TemplatesPage from "./pages/TemplatesPage";
import ContactDetailPanel from "./components/ContactDetailPanel";

import T from "./theme";
import { useAuth } from "./hooks/useAuth";
import { useContacts } from "./hooks/useContacts";
import { PageLoader, ContentLoader } from "./components/ui/Loader";

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const { currentUser, setCurrentUser, loading, signOut } = useAuth();

  if (loading) return <PageLoader text="Loading…" />;

  return (
    <Routes>
      <Route
        path="/login"
        element={currentUser ? <Navigate to="/dashboard" replace /> : <LoginPage onLogin={setCurrentUser} />}
      />
      <Route
        path="/*"
        element={currentUser ? <AppLayout currentUser={currentUser} onSignOut={signOut} /> : <Navigate to="/login" replace />}
      />
    </Routes>
  );
}

// ─── Main layout (rendered only when authenticated) ───────────────────────────
function AppLayout({ currentUser, onSignOut }) {
  const navigate = useNavigate();
  const location = useLocation();

  const { pool, setPool, clientId, setClientId } = usePool();
  const [viewMode, setViewMode] = useState("all");
  const [selected, setSelected] = useState(null);
  const [charted,  setCharted]  = useState(null);
  const [search,   setSearch]   = useState("");
  const searchRef = useRef(null);

  const { contacts, setContacts, contactCounts, loading, firstLoad } =
    useContacts(currentUser);

  const page      = location.pathname.replace("/", "") || "dashboard";
  const isContacts = page === "contacts";

  // ── Navigation helper ───────────────────────────────────────────────────────
  const navigateTo = useCallback((p) => {
    setSelected(null);
    setCharted(null);
    navigate("/" + p);
  }, [navigate]);

  // ── Contact handlers ────────────────────────────────────────────────────────
  const handleSelect = useCallback((c) => {
    setSelected(c);
    setCharted(c);
    if (c) setSearch("");
  }, []);

  const handleUpdate = useCallback((updated) => {
    setContacts(prev => prev.map(c => c.id === updated.id ? updated : c));
    setSelected(updated);
    setCharted(updated);
  }, [setContacts]);

  // ── Pool / client switching ─────────────────────────────────────────────────
  const handlePoolSwitch = useCallback((p) => {
    setPool(p);
    setSelected(null);
    setCharted(null);
  }, [setPool]);

  const handleClientSwitch = useCallback((id) => {
    setClientId(id);
    setPool("client");
    setSelected(null);
    setCharted(null);
  }, [setClientId, setPool]);

  // ── Global keyboard search ──────────────────────────────────────────────────
  useEffect(() => {
    function handler(e) {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape")    { setSearch(""); setSelected(null); setCharted(null); return; }
      if (e.key === "Backspace") { setSearch(p => p.slice(0, -1)); searchRef.current?.focus(); return; }
      if (e.key.length === 1)    { setSearch(p => p + e.key); searchRef.current?.focus(); }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      background: T.bg, color: T.text,
      fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif",
      fontSize: 13, overflow: "hidden",
    }}>
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div style={{
        height: 50, flexShrink: 0, position: "relative",
        background: T.surface, borderBottom: "1px solid " + T.border,
        display: "flex", alignItems: "center",
        padding: "0 14px", gap: 10, zIndex: 2000,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginRight: 4, flexShrink: 0 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 6, background: T.accent,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 800, color: "#fff",
          }}>G</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: T.text, lineHeight: 1, letterSpacing: "-0.02em" }}>GeniusAI</div>
            <div style={{ fontSize: 8, color: T.muted, letterSpacing: "0.05em" }}>PROPHONE</div>
          </div>
        </div>

        <PoolSwitcher
          pool={pool}
          clientId={clientId}
          onSwitchPool={handlePoolSwitch}
          onSwitchClient={handleClientSwitch}
          contactCounts={contactCounts}
        />

        <TopNav
          page={page}
          viewMode={viewMode}
          setPage={navigateTo}
          setViewMode={setViewMode}
        />

        {/* Right side: search badge + user chip */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {search && (
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              background: T.accent + "14", border: "1px solid " + T.accent + "40",
              borderRadius: 5, padding: "3px 8px",
            }}>
              <span style={{ fontSize: 11, color: T.accent }}>⌕ "{search}"</span>
              <button
                onClick={() => setSearch("")}
                style={{ background: "none", border: "none", color: T.accent, cursor: "pointer", fontSize: 11, padding: 0 }}
              >✕</button>
            </div>
          )}
          <UserChip user={currentUser} onSignOut={onSignOut} />
        </div>
      </div>

      {/* ── First-load full page loader ──────────────────────────────────────── */}
      {firstLoad && loading && <PageLoader text="Loading CRM data…" />}

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

        {/* Sidebar — only on contacts page */}
        {isContacts && (
          <Sidebar
            pool={pool} clientId={clientId} viewMode={viewMode}
            selected={selected} onSelect={handleSelect}
            search={search} setSearch={setSearch} searchRef={searchRef}
            contacts={contacts} setContacts={setContacts}
            currentUser={currentUser}
          />
        )}

        {/* Page body */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

          {/* Contacts sub-nav */}
          {isContacts && (
            <div style={{
              display: "flex", gap: 2,
              background: T.surface, borderRadius: 8, padding: 3,
              border: "1px solid " + T.border,
              alignSelf: "flex-start", margin: "20px 0 0 20px",
            }}>
              {[
                ["all",       "All",       T.dim  ],
                ["leads",     "Leads",     T.blue ],
                ["customers", "Customers", T.green],
                ["lost",      "Lost",      T.red  ],
              ].map(([mode, label, c]) => (
                <button
                  key={mode}
                  onClick={() => { setViewMode(mode); navigate("/contacts"); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 14px", borderRadius: 6, border: "none",
                    cursor: "pointer",
                    background: viewMode === mode ? T.card : "transparent",
                    color: viewMode === mode ? c : T.muted,
                    fontWeight: viewMode === mode ? 700 : 400,
                    fontSize: 11, fontFamily: "inherit",
                  }}
                >
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                    background: c,
                    opacity: viewMode === mode ? 1 : 0.35,
                    transition: "background 0.15s",
                  }} />
                  {label}
                </button>
              ))}
            </div>
          )}

          <div style={{ flex: 1, overflowY: "auto", padding: 20, position: "relative" }}>
            {!firstLoad && loading && <ContentLoader text="Loading contacts…" />}

            {isContacts && selected ? (
              <ContactDetailPanel
                contact={selected}
                onUpdate={handleUpdate}
                currentUser={currentUser}
              />
            ) : (
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={
                  <DashboardPage
                    pool={pool} clientId={clientId}
                    viewMode={viewMode}
                    setViewMode={(v) => { setViewMode(v); navigate("/contacts"); }}
                    setPage={navigateTo}
                    contacts={contacts}
                    currentUser={currentUser}
                  />
                } />
                <Route path="/contacts" element={
                  <ContactsPage
                    pool={pool} clientId={clientId}
                    viewMode={viewMode}
                    onSelect={handleSelect}
                    selected={selected}
                    search={search}
                    contacts={contacts} setContacts={setContacts}
                    currentUser={currentUser}
                  />
                } />
                <Route path="/domains"    element={<DomainsPage />} />
                <Route path="/templates" element={<TemplatesPage />} />
                <Route path="/reports"   element={<ComingSoon page="reports" />} />
                <Route path="/settings"  element={<ComingSoon page="settings" />} />
                <Route path="/clients"  element={<ClientsPage />} />
                <Route path="*"         element={<Navigate to="/dashboard" replace />} />
              </Routes>
            )}
          </div>
        </div>

        {/* Right panel: lifecycle chart */}
        {charted && (
          <div style={{
            width: 420, flexShrink: 0,
            background: T.surface, borderLeft: "1px solid " + T.border,
            display: "flex", flexDirection: "column", overflow: "hidden",
          }}>
            <div style={{
              padding: "10px 14px", borderBottom: "1px solid " + T.border,
              display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.text }}>Lead Lifecycle</div>
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

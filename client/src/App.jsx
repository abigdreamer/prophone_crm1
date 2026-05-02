import { useState, useEffect, useCallback, useRef } from "react";

import LoginScreen   from "./components/LoginScreen";
import TopNav        from "./components/TopNav";
import PoolSwitcher  from "./components/PoolSwitcher";
import Sidebar       from "./components/Sidebar";
import LifecycleChart from "./components/LifecycleChart";
import Avatar        from "./components/ui/Avatar";

import PageDashboard from "./pages/PageDashboard";
import PageTable     from "./pages/PageTable";

import T             from "./theme";
import * as db       from "./lib/db";
import { PageLoader, ContentLoader } from "./components/ui/Loader";

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [currentUser,  setCurrentUser]  = useState(null);
  const [authLoading,  setAuthLoading]  = useState(true);

  // Navigation state
  const [pool,      setPool]      = useState("prospect");
  const [clientId,  setClientId]  = useState("foxtow");
  const [page,      setPage]      = useState("dashboard");
  const [viewMode,  setViewMode]  = useState("all");

  // Selection / panel state
  const [selected, setSelected] = useState(null);
  const [charted,  setCharted]  = useState(null);

  // Search
  const [search,   setSearch]   = useState("");
  const searchRef               = useRef(null);

  const [contacts,     setContacts]     = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [firstLoad,    setFirstLoad]    = useState(true);

  // ── Restore session from localStorage token on mount ───────────────────────
  useEffect(() => {
    const token = localStorage.getItem('prophone_token');
    if (!token) { setAuthLoading(false); return; }
    db.getMe()
      .then(user => setCurrentUser(user))
      .catch(err => {
        if (err.message === 'Invalid or expired token' || err.message === 'Authorization required') {
          localStorage.removeItem('prophone_token');
        }
      })
      .finally(() => setAuthLoading(false));
  }, []);

  // ── Load contacts when pool / client changes ────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    setLoading(true);
    db.getContacts(pool, clientId)
      .then(data => {
        if (!cancelled) {
          setContacts(data);
          setSelected(null);
          setCharted(null);
          setSearch("");
        }
      })
      .catch(err => console.error("Failed to load contacts:", err))
      .finally(() => {
        if (!cancelled) { setLoading(false); setFirstLoad(false); }
      });
    return () => { cancelled = true; };
  }, [pool, clientId, currentUser]);

  // ── Global keyboard search ──────────────────────────────────────────────────
  useEffect(() => {
    function handler(e) {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "Escape") {
        setSearch(""); setSelected(null); setCharted(null);
        return;
      }
      if (e.key === "Backspace") {
        setSearch(p => p.slice(0, -1));
        searchRef.current?.focus();
        return;
      }
      if (e.key.length === 1) {
        setSearch(p => p + e.key);
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSelect = useCallback(c => {
    setSelected(c);
    setCharted(c);
    if (c) setSearch("");
  }, []);

  const handleUpdate = useCallback(updated => {
    setContacts(prev => prev.map(c => c.id === updated.id ? updated : c));
    setSelected(updated);
    setCharted(updated);
  }, []);

  const handlePoolSwitch   = useCallback(p  => { setPool(p);     setPage("dashboard"); }, []);
  const handleClientSwitch = useCallback(id => { setClientId(id); setPool("client"); setPage("dashboard"); }, []);

  const col = pool === "prospect" ? T.accent : "#fb923c";

  // ── Auth gate ───────────────────────────────────────────────────────────────
  if (authLoading)   return <PageLoader text="Loading…" />;
  if (!currentUser)  return <LoginScreen onLogin={setCurrentUser} />;

  // ── Page renderer ───────────────────────────────────────────────────────────
  function renderPage() {
    const shared = { pool, clientId, viewMode, contacts, setContacts, currentUser };

    if (page === "dashboard") {
      return (
        <PageDashboard
          {...shared}
          setViewMode={v => { setViewMode(v); setPage("table"); }}
          setPage={setPage}
        />
      );
    }

    if (["table","all-contacts","leads","customers","lost"].includes(page)) {
      const vm =
        page === "all-contacts" ? "all"       :
        page === "leads"        ? "leads"     :
        page === "customers"    ? "customers" :
        page === "lost"         ? "lost"      : viewMode;
      return (
        <PageTable
          {...shared}
          onSelect={handleSelect}
          search={search}
          viewMode={vm}
        />
      );
    }

    return (
      <PageDashboard
        {...shared}
        setViewMode={v => { setViewMode(v); setPage("table"); }}
        setPage={setPage}
      />
    );
  }

  return (
    <div
      style={{
        display: "flex", flexDirection: "column",
        height: "100vh",
        background: T.bg, color: T.text,
        fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif",
        fontSize: 13, overflow: "hidden",
      }}
    >
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          height: 50, flexShrink: 0,
          background: T.surface, borderBottom: "1px solid " + T.border,
          display: "flex", alignItems: "center",
          padding: "0 14px", gap: 10, zIndex: 200,
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginRight: 4, flexShrink: 0 }}>
          <div
            style={{
              width: 24, height: 24, borderRadius: 6,
              background: T.accent,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 800, color: "#fff",
            }}
          >
            G
          </div>
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
        />

        <TopNav
          page={page}
          viewMode={viewMode}
          setPage={p => { setPage(p); setSelected(null); setCharted(null); }}
          setViewMode={setViewMode}
        />

        {/* Right side: search badge + user chip + sign out */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {search && (
            <div
              style={{
                display: "flex", alignItems: "center", gap: 5,
                background: T.accent + "14", border: "1px solid " + T.accent + "40",
                borderRadius: 5, padding: "3px 8px",
              }}
            >
              <span style={{ fontSize: 11, color: T.accent }}>⌕ "{search}"</span>
              <button
                onClick={() => setSearch("")}
                style={{ background: "none", border: "none", color: T.accent, cursor: "pointer", fontSize: 11, padding: 0 }}
              >
                ✕
              </button>
            </div>
          )}

          <div
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "4px 9px",
              background: T.card, border: "1px solid " + T.border,
              borderRadius: 6,
            }}
          >
            <Avatar user={currentUser} size={20} />
            <span style={{ fontSize: 10, color: T.dim, fontWeight: 600 }}>{currentUser.name.split(" ")[0]}</span>
            <span style={{ fontSize: 9, color: T.muted }}>· {currentUser.role}</span>
          </div>

          <button
            onClick={() => { localStorage.removeItem('prophone_token'); setCurrentUser(null); }}
            style={{
              background: "none", border: "1px solid " + T.border,
              borderRadius: 5, color: T.muted,
              fontSize: 10, cursor: "pointer",
              padding: "4px 8px", fontFamily: "inherit",
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = T.red)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = T.border)}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* ── First-load full page loader ──────────────────────────────────────── */}
      {firstLoad && loading && <PageLoader text="Loading CRM data…" />}

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

        {/* Sidebar */}
        <Sidebar
          pool={pool}
          clientId={clientId}
          viewMode={viewMode}
          selected={selected}
          onSelect={handleSelect}
          search={search}
          setSearch={setSearch}
          searchRef={searchRef}
          contacts={contacts}
          setContacts={setContacts}
          currentUser={currentUser}
        />

        {/* Page body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20, minWidth: 0, position: "relative" }}>
          {!firstLoad && loading && <ContentLoader text="Loading contacts…" />}
          {renderPage()}
        </div>

        {/* Right panel: lifecycle chart */}
        {charted && (
          <div
            style={{
              width: 420, flexShrink: 0,
              background: T.surface, borderLeft: "1px solid " + T.border,
              display: "flex", flexDirection: "column", overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "10px 14px",
                borderBottom: "1px solid " + T.border,
                display: "flex", alignItems: "center", justifyContent: "space-between",
                flexShrink: 0,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: T.text }}>Lead Lifecycle</div>
              <button
                onClick={() => setCharted(null)}
                style={{ background: "none", border: "none", color: T.muted, fontSize: 16, cursor: "pointer", padding: 0 }}
              >
                ✕
              </button>
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <LifecycleChart
                contact={charted}
                onUpdate={handleUpdate}
                currentUser={currentUser}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

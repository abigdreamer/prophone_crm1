import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { usePool } from './context/PoolContext';
import { useTheme } from './context/ThemeContext';
import { VIEW_MODE, STAGE_GROUPS } from './constants/index';

import { X, ChevronRight } from 'lucide-react';
import TopNav from './components/TopNav';
import PoolSwitcher from './components/PoolSwitcher';
import Sidebar from './components/Sidebar';
import MarketingSidebar from './components/MarketingSidebar';
import LifecycleChart from './components/LifecycleChart';
import UserChip from './components/layout/UserChip';
import ThemeSwitcher from './components/layout/ThemeSwitcher';
import ComingSoon from './components/layout/ComingSoon';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DomainsPage from './pages/DomainsPage';
import TemplatesPage from './pages/TemplatesPage';
import CampaignsPage from './pages/CampaignsPage';
import CampaignDetailPage from './pages/CampaignDetailPage';
import SettingsPage from './pages/SettingsPage';
import ContactDetailPanel from './components/ContactDetailPanel';
import ContactFormInline from './components/ContactFormInline';
import LogActivityInline from './components/inline/LogActivityInline';
import StageInline from './components/inline/StageInline';
import CancelInline from './components/inline/CancelInline';
import RestoreInline from './components/inline/RestoreInline';
import ImportInline from './components/inline/ImportInline';

import { useAuth } from './hooks/useAuth';
import { useContacts } from './hooks/useContacts';
import { PageLoader, ContentLoader } from './components/ui/Loader';
import { useAppToast } from './context/ToastContext';
import * as db from './services/api';

export default function App() {
  const { currentUser, setCurrentUser, loading, signOut } = useAuth();
  if (loading) return <PageLoader text="Loading…" />;
  return (
    <Routes>
      <Route
        path="/login"
        element={currentUser ? <Navigate to="/contacts" replace /> : <LoginPage onLogin={setCurrentUser} />}
      />
      <Route
        path="/*"
        element={currentUser ? <AppLayout currentUser={currentUser} onSignOut={signOut} /> : <Navigate to="/login" replace />}
      />
    </Routes>
  );
}

function AppLayout({ currentUser, onSignOut }) {
  const T = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const { pool, setPool, clientId, setClientId } = usePool();
  const [viewMode, setViewMode] = useState(VIEW_MODE.ALL);
  const [selected, setSelected] = useState(null);
  // centerMode: null | 'add' | 'edit' | 'log' | 'stage' | 'cancel' | 'restore' | 'import'
  const [centerMode, setCenterMode] = useState(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [search, setSearch] = useState('');
  const searchRef = useRef(null);
  const toast = useAppToast();

  const [lifecycleOpen, setLifecycleOpen] = useState(true);
  const [mktgCollapsed, setMktgCollapsed] = useState(
    () => localStorage.getItem('mktg-sidebar-collapsed') === 'true',
  );
  const [mktgMobileOpen, setMktgMobileOpen] = useState(false);

  const { contacts, setContacts, contactCounts, loading, firstLoad } = useContacts(currentUser);
  const [canceledContacts, setCanceledContacts] = useState([]);

  // Auto-select first matching contact whenever nothing is selected on the contacts page
  useEffect(() => {
    const onContacts = location.pathname.split('/')[1] === 'contacts';
    if (!onContacts || selected || centerMode === 'add') return;
    const pool = viewMode === VIEW_MODE.CANCELED ? canceledContacts : contacts;
    const stages = STAGE_GROUPS[viewMode];
    const first = (stages && stages.length > 0)
      ? pool.find(c => stages.includes(c.lifecycleStage))
      : pool[0];
    if (first) setSelected(first);
  }, [location.pathname, selected, centerMode, viewMode, contacts, canceledContacts]); // eslint-disable-line

  useEffect(() => {
    if (viewMode !== VIEW_MODE.CANCELED || !currentUser) return;
    db.getCanceledContacts().then(setCanceledContacts).catch(() => {});
  }, [viewMode, pool, clientId, currentUser]);

  const page = location.pathname.replace('/', '') || 'dashboard';
  const pageRoot = page.split('/')[0];
  const isContacts = pageRoot === 'contacts';
  const isMarketing = ['domains', 'templates', 'campaigns', 'sequences'].includes(pageRoot);

  const navigateTo = useCallback((p) => {
    setSelected(null);
    setCenterMode(null);
    navigate('/' + p);
  }, [navigate]);

  const handleToggleMktgCollapse = useCallback(() => {
    setMktgCollapsed((c) => {
      const next = !c;
      localStorage.setItem('mktg-sidebar-collapsed', String(next));
      return next;
    });
  }, []);

  const handleMarketingClick = useCallback(() => {
    if (!isMarketing) navigateTo('domains');
    setMktgMobileOpen((o) => !o);
  }, [isMarketing, navigateTo]);

  const handleSelect = useCallback((c) => {
    setSelected(c);
    setCenterMode(null);
  }, []);

  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
    setSelected(null);
    setCenterMode(null);
    navigate('/contacts');
  }, [navigate]);

  const handleUpdate = useCallback((updated) => {
    if (updated.isCanceled) {
      setContacts((prev) => prev.filter((c) => c.id !== updated.id));
      setSelected(updated);
    } else {
      setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setCanceledContacts((prev) => prev.filter((c) => c.id !== updated.id));
      setSelected(updated);
    }
  }, [setContacts]);

  // ── Contact CRUD inline handlers ──────────────────────────────────────────

  const handleAddNew = useCallback(() => {
    setSelected(null);
    setCenterMode('add');
    navigate('/contacts');
  }, [navigate]);

  const handleEditInline = useCallback((contact) => {
    setSelected(contact);
    setCenterMode('edit');
  }, []);

  const handleAddSave = useCallback(async (nc) => {
    try {
      const saved = await db.createContact(nc);
      setContacts((prev) => [saved, ...prev]);
      setSelected(saved);
      setCenterMode(null);
      toast.success('Contact added.');
    } catch {
      toast.error('Failed to save contact.');
    }
  }, [setContacts, toast]);

  const handleEditSave = useCallback(async (updated) => {
    try {
      const refreshed = await db.updateContact(updated.id, updated);
      setContacts((prev) => prev.map((c) => (c.id === refreshed.id ? refreshed : c)));
      setSelected(refreshed);
      setCenterMode(null);
      toast.success('Contact saved.');
    } catch {
      toast.error('Failed to update contact.');
    }
  }, [setContacts, toast]);

  // ── Inline action handlers ─────────────────────────────────────────────────

  const handleContactAction = useCallback((action) => {
    setCenterMode(action);
  }, []);

  const handleLogActivity = useCallback(async (act) => {
    if (!selected) return;
    try {
      await db.addActivity(selected.id, act);
      const refreshed = await db.getContact(selected.id);
      handleUpdate(refreshed);
      setCenterMode(null);
      toast.success('Activity logged.');
    } catch {
      toast.error('Failed to log activity.');
    }
  }, [selected, handleUpdate, toast]);

  const handleStageChange = useCallback(async (updated) => {
    try {
      const newAct = updated.activities[updated.activities.length - 1];
      await db.updateContact(updated.id, updated);
      await db.addActivity(updated.id, newAct);
      const refreshed = await db.getContact(updated.id);
      handleUpdate(refreshed);
      setCenterMode(null);
      toast.success('Stage updated.');
    } catch {
      toast.error('Failed to update stage.');
    }
  }, [handleUpdate, toast]);

  const handleCancelContact = useCallback(async (reason) => {
    if (!selected) return;
    try {
      const refreshed = await db.cancelContact(selected.id, reason);
      handleUpdate(refreshed);
      setCenterMode(null);
      toast.success('Contact canceled.');
    } catch {
      toast.error('Failed to cancel contact.');
    }
  }, [selected, handleUpdate, toast]);

  const handleRestoreConfirm = useCallback(async () => {
    if (!selected) return;
    setRestoreLoading(true);
    try {
      const refreshed = await db.restoreContact(selected.id);
      setCanceledContacts((prev) => prev.filter((c) => c.id !== selected.id));
      const fresh = await db.getContacts();
      setContacts(fresh);
      setSelected(refreshed);
      setCenterMode(null);
      toast.success('Contact restored.');
    } catch {
      toast.error('Failed to restore contact.');
    } finally {
      setRestoreLoading(false);
    }
  }, [selected, setContacts, toast]);

  const handleImportDone = useCallback(async () => {
    try {
      const fresh = await db.getContacts();
      setContacts(fresh);
    } catch {}
  }, [setContacts]);

  const handleRestoreContact = useCallback(async (contactId) => {
    setCanceledContacts((prev) => prev.filter((c) => c.id !== contactId));
    try {
      const fresh = await db.getContacts();
      setContacts(fresh);
    } catch {}
  }, [setContacts]);

  const handlePoolSwitch = useCallback((p) => {
    setPool(p);
    setSelected(null);
    setCenterMode(null);
  }, [setPool]);

  const handleClientSwitch = useCallback((id) => {
    setClientId(id);
    setPool('client');
    setSelected(null);
    setCenterMode(null);
  }, [setClientId, setPool]);

  const handleCancelForm = useCallback(() => setCenterMode(null), []);

  useEffect(() => {
    function handler(e) {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Escape') {
        setSearch('');
        if (centerMode) { setCenterMode(null); return; }
        setSelected(null);
        return;
      }
      if (e.key === 'Enter' && isContacts && selected && !centerMode) {
        handleEditInline(selected);
        return;
      }
      if (isContacts && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        const pool = viewMode === VIEW_MODE.CANCELED ? canceledContacts : contacts;
        const stages = STAGE_GROUPS[viewMode];
        const list = (stages && stages.length > 0)
          ? pool.filter(c => stages.includes(c.lifecycleStage))
          : pool;
        if (list.length === 0) return;
        const currentIdx = selected ? list.findIndex(c => c.id === selected.id) : -1;
        const nextIdx = e.key === 'ArrowDown'
          ? Math.min(currentIdx === -1 ? 0 : currentIdx + 1, list.length - 1)
          : Math.max(currentIdx <= 0 ? 0 : currentIdx - 1, 0);
        if (list[nextIdx]?.id !== selected?.id) {
          setSelected(list[nextIdx]);
          setCenterMode(null);
        }
        return;
      }
      if (e.key === 'Backspace') {
        setSearch((p) => p.slice(0, -1));
        searchRef.current?.focus();
        return;
      }
      if (e.key.length === 1) {
        setSearch((p) => p + e.key);
        searchRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [centerMode, isContacts, viewMode, contacts, canceledContacts, selected, handleEditInline]); // eslint-disable-line

  // ── Render center panel content ────────────────────────────────────────────

  function renderCenter() {
    if (isContacts) {
      if (centerMode === 'add') {
        return <ContactFormInline onSave={handleAddSave} onCancel={handleCancelForm} pool={pool} clientId={clientId} currentUser={currentUser} />;
      }
      if (centerMode === 'edit' && selected) {
        return <ContactFormInline contact={selected} onSave={handleEditSave} onCancel={handleCancelForm} pool={pool} clientId={clientId} currentUser={currentUser} />;
      }
      if (centerMode === 'log' && selected) {
        return <LogActivityInline contact={selected} onSave={handleLogActivity} onBack={handleCancelForm} currentUser={currentUser} />;
      }
      if (centerMode === 'stage' && selected) {
        return <StageInline contact={selected} onSave={handleStageChange} onBack={handleCancelForm} currentUser={currentUser} />;
      }
      if (centerMode === 'cancel' && selected) {
        return <CancelInline contact={selected} onSave={handleCancelContact} onBack={handleCancelForm} />;
      }
      if (centerMode === 'restore' && selected) {
        return <RestoreInline contact={selected} onConfirm={handleRestoreConfirm} onBack={handleCancelForm} loading={restoreLoading} />;
      }
      if (centerMode === 'import') {
        return <ImportInline onBack={handleCancelForm} clientId={clientId} pool={pool} onImported={handleImportDone} />;
      }
      if (selected) {
        return (
          <ContactDetailPanel
            contact={selected}
            onUpdate={handleUpdate}
            onEdit={handleEditInline}
            onAction={handleContactAction}
            currentUser={currentUser}
          />
        );
      }

      // Empty state — no contact selected or no contacts match the current filter
      const pool_all = viewMode === VIEW_MODE.CANCELED ? canceledContacts : contacts;
      const emptyStages = STAGE_GROUPS[viewMode];
      const hasAny = emptyStages?.length > 0
        ? pool_all.some(c => emptyStages.includes(c.lifecycleStage))
        : pool_all.length > 0;
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '60vh', gap: 16, padding: 32,
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke={T.border} strokeWidth="1.2" style={{ width: 56, height: 56 }}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.dim, marginBottom: 6 }}>
              {hasAny ? 'Select a contact' : `No ${viewMode === VIEW_MODE.ALL ? '' : viewMode + ' '}contacts found`}
            </div>
            <div style={{ fontSize: 12, color: T.muted }}>
              {hasAny
                ? 'Pick a contact from the sidebar to view their details'
                : 'Try a different filter or add a new contact to get started'}
            </div>
          </div>
          {!hasAny && (
            <button
              onClick={handleAddNew}
              style={{
                padding: '8px 20px', background: T.accent, border: 'none', borderRadius: 8,
                color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: `0 2px 8px ${T.accent}44`,
              }}
            >
              + Add Contact
            </button>
          )}
        </div>
      );
    }

    return (
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/dashboard"
          element={
            <DashboardPage
              pool={pool} clientId={clientId} viewMode={viewMode}
              setViewMode={(v) => { setViewMode(v); navigate('/contacts'); }}
              setPage={navigateTo} contacts={contacts} currentUser={currentUser}
            />
          }
        />
        <Route path="/domains" element={<DomainsPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/campaigns" element={<CampaignsPage />} />
        <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
        <Route path="/reports" element={<ComingSoon page="reports" />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: T.bg, color: T.text,
      fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif",
      fontSize: 13, overflow: 'hidden',
    }}>
      {/* Top bar */}
      <div style={{
        height: 50, flexShrink: 0, position: 'relative',
        background: T.navBg, borderBottom: '1px solid ' + T.navBorder,
        display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10, zIndex: 2000,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginRight: 4, flexShrink: 0 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7, background: T.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 900, color: '#fff',
            boxShadow: `0 2px 6px ${T.accent}44`,
          }}>G</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: T.navText, lineHeight: 1, letterSpacing: '-0.02em' }}>
              GeniusAI
            </div>
            <div style={{ fontSize: 8, color: T.navMuted, fontWeight: 700, letterSpacing: '0.05em' }}>
              PROPHONE
            </div>
          </div>
        </div>

        <PoolSwitcher
          pool={pool} clientId={clientId}
          onSwitchPool={handlePoolSwitch} onSwitchClient={handleClientSwitch}
          contactCounts={contactCounts}
        />

        <TopNav
          page={page} viewMode={viewMode}
          setPage={navigateTo} setViewMode={setViewMode}
          onMarketingClick={handleMarketingClick}
        />

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {search && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: `${T.accent}1A`, border: `1px solid ${T.accent}33`,
              borderRadius: 6, padding: '4px 10px',
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10, opacity: 0.9 }}>
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.accent, letterSpacing: '0.01em' }}>
                "{search}"
              </span>
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: T.accent, cursor: 'pointer', fontSize: 11, padding: 0, marginLeft: 2, display: 'flex' }}>
                ✕
              </button>
            </div>
          )}
          <ThemeSwitcher />
          <UserChip user={currentUser} onSignOut={onSignOut} />
        </div>
      </div>

      {firstLoad && loading && <PageLoader text="Loading CRM data…" />}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {isContacts && (
          <Sidebar
            pool={pool} clientId={clientId}
            viewMode={viewMode} onViewModeChange={handleViewModeChange}
            selected={selected} onSelect={handleSelect}
            onAddNew={handleAddNew} onEditInline={handleEditInline}
            onImport={() => { setCenterMode('import'); navigate('/contacts'); }}
            search={search} setSearch={setSearch} searchRef={searchRef}
            contacts={viewMode === VIEW_MODE.CANCELED ? canceledContacts : contacts}
            canceledContacts={canceledContacts}
            setContacts={viewMode === VIEW_MODE.CANCELED ? setCanceledContacts : setContacts}
            currentUser={currentUser}
          />
        )}

        {isMarketing && (
          <MarketingSidebar
            page={pageRoot} onNavigate={navigateTo}
            collapsed={mktgCollapsed} onToggleCollapse={handleToggleMktgCollapse}
            mobileOpen={mktgMobileOpen} onMobileClose={() => setMktgMobileOpen(false)}
          />
        )}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: 20, position: 'relative' }}>
            {!firstLoad && loading && <ContentLoader text="Loading contacts…" />}
            {renderCenter()}
          </div>
        </div>

        {/* Right panel — Lead Lifecycle (collapsible) */}
        {isContacts && lifecycleOpen && (
          <div style={{
            width: 320, flexShrink: 0,
            background: T.surface, borderLeft: '1px solid ' + T.border,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{
              padding: '10px 14px', borderBottom: '1px solid ' + T.border,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: T.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Lead Lifecycle
              </div>
              <button
                onClick={() => setLifecycleOpen(false)}
                title="Close panel"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: T.muted, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: 4, borderRadius: 5, lineHeight: 1,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = T.border; e.currentTarget.style.color = T.text; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = T.muted; }}
              >
                <X size={14} />
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              {selected ? (
                <LifecycleChart
                  contact={selected}
                  onUpdate={handleUpdate}
                  onEdit={handleEditInline}
                  onAction={handleContactAction}
                  currentUser={currentUser}
                />
              ) : (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: '100%', color: T.muted, fontSize: 12, padding: 24, textAlign: 'center',
                }}>
                  Select a contact to view lifecycle
                </div>
              )}
            </div>
          </div>
        )}

        {/* Collapsed lifecycle — slim reopen tab */}
        {isContacts && !lifecycleOpen && (
          <div style={{ flexShrink: 0, borderLeft: '1px solid ' + T.border, background: T.surface }}>
            <button
              onClick={() => setLifecycleOpen(true)}
              title="Open Lead Lifecycle"
              style={{
                width: 28, height: '100%', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 8,
                background: 'none', border: 'none', cursor: 'pointer', color: T.muted,
                padding: '12px 0',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = T.text)}
              onMouseLeave={e => (e.currentTarget.style.color = T.muted)}
            >
              <ChevronRight size={14} />
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase', writingMode: 'vertical-rl',
                transform: 'rotate(180deg)', color: 'inherit',
              }}>Lifecycle</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

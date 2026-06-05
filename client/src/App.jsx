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

import { X, ChevronRight, LayoutGrid, Menu, Mail, Plus, Upload, PenLine, Check } from 'lucide-react';
import { useWindowWidth } from './hooks/useWindowWidth';
import { STAGE_DEF } from './data/stages';
import TopNav from './components/TopNav';
import PoolSwitcher from './components/PoolSwitcher';
import Sidebar from './components/Sidebar';
import MarketingSubNav from './components/MarketingSubNav';
import ReportsSubNav from './components/ReportsSubNav';
import SettingsSubNav from './components/SettingsSubNav';
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
import ReportsPage from './pages/ReportsPage';
import ProfilePage from './pages/ProfilePage';
import RedditMonitorPage from './pages/RedditMonitorPage';
import ContactDetailPanel from './components/ContactDetailPanel';
import CancelInline from './components/inline/CancelInline';
import RestoreInline from './components/inline/RestoreInline';
import ImportInline from './components/inline/ImportInline';
import SendEmailInline from './components/inline/SendEmailInline';

import { useAuth } from './hooks/useAuth';
import { useContacts } from './hooks/useContacts';
import { useClients } from './context/ClientsContext';
import { PageLoader, ContentLoader } from './components/ui/Loader';
import { useAppToast } from './context/ToastContext';
import * as db from './services/api';

export default function App() {
  const { currentUser, setCurrentUser, loading, signOut } = useAuth();
  const { reload: reloadClients } = useClients();

  // ClientsProvider mounts before auth resolves, so the first fetch has no token.
  // Re-fetch as soon as currentUser is available (login or page refresh).
  useEffect(() => {
    if (currentUser) reloadClients();
  }, [currentUser?.id]); // eslint-disable-line

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
  // centerMode: null | 'add' | 'cancel' | 'restore' | 'import' | 'sendEmail'
  const [centerMode, setCenterMode] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [search, setSearch] = useState('');
  const searchRef = useRef(null);
  const toast = useAppToast();
  const [editMode, setEditMode] = useState(false);

  // Reset edit mode whenever the user navigates to a different contact
  useEffect(() => { setEditMode(false); }, [selected?.id]); // eslint-disable-line

  // Debounce search so the API only fires 400 ms after the user stops typing
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Server-side filter params driven by Sidebar callbacks
  const [contactFilters, setContactFilters] = useState({ stages: [], sortBy: 'company_az', scoreMin: 0, scoreMax: 100, udfFilters: {}, customFilters: {} });

  // live form data from center panel → feeds right-panel live preview
  const [liveFormData, setLiveFormData] = useState(null);
  // center panel dirty flag → prevents App-level Escape from deselecting while editing
  const centerDirtyRef = useRef(false);

  const winWidth = useWindowWidth();
  const isMobile = winWidth < 768;
  const isTablet = winWidth >= 768 && winWidth < 1100;
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [lifecycleOpen, setLifecycleOpen] = useState(winWidth >= 1100);

  // Resizable panel widths — persisted to localStorage
  const [sidebarW, setSidebarW] = useState(() => {
    const saved = localStorage.getItem('crm-sidebar-width');
    return saved ? Math.max(160, Math.min(400, parseInt(saved))) : 248;
  });
  const [lifecycleW, setLifecycleW] = useState(() => {
    const saved = localStorage.getItem('crm-lifecycle-width');
    return saved ? Math.max(220, Math.min(480, parseInt(saved))) : 310;
  });

  // Auto-collapse/expand lifecycle as window resizes
  useEffect(() => {
    setLifecycleOpen(winWidth >= 1100);
  }, [winWidth >= 1100]); // eslint-disable-line
  const [mktgCollapsed, setMktgCollapsed] = useState(
    () => localStorage.getItem('mktg-sidebar-collapsed') === 'true',
  );
  const [mktgMobileOpen, setMktgMobileOpen] = useState(false);
  const [templateEditing, setTemplateEditing] = useState(false);

  const { contacts, setContacts, contactCounts, loading, firstLoad } = useContacts(currentUser);
  const [canceledContacts, setCanceledContacts] = useState([]);

  // Contacts visible in the current viewMode — used to scope the selection display
  const visibleSelectedIds = (() => {
    const pool_list = viewMode === VIEW_MODE.CANCELED ? canceledContacts : contacts;
    const stages = STAGE_GROUPS[viewMode];
    const inView = stages?.length > 0
      ? pool_list.filter(c => stages.includes(c.lifecycleStage))
      : pool_list;
    return inView.filter(c => selectedIds.has(c.id)).map(c => c.id);
  })();

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

  useEffect(() => { setSelectedIds(new Set()); }, [pool, clientId]);

  const page = location.pathname.replace('/', '') || 'dashboard';
  const pageRoot = page.split('/')[0];
  const isContacts = pageRoot === 'contacts';
  const isMarketing = ['domains', 'templates', 'campaigns', 'sequences'].includes(pageRoot);
  const isReports = pageRoot === 'reports';
  const isSettings = pageRoot === 'settings';

  useEffect(() => {
    if (pageRoot !== 'templates') setTemplateEditing(false);
  }, [pageRoot]);

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
    setLiveFormData(null);
    centerDirtyRef.current = false;
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
    setCenterMode(null);
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
      const stageChanged = selected?.lifecycleStage && updated.lifecycleStage !== selected.lifecycleStage;
      const refreshed = await db.updateContact(updated.id, updated);
      if (stageChanged) {
        await db.addActivity(updated.id, {
          type: "stage_changed",
          note: `Stage: ${STAGE_DEF[selected.lifecycleStage]?.label} → ${STAGE_DEF[updated.lifecycleStage]?.label}`,
          by: currentUser?.name || "Unknown",
        });
        const withAct = await db.getContact(updated.id);
        setContacts((prev) => prev.map((c) => (c.id === withAct.id ? withAct : c)));
        setSelected(withAct);
      } else {
        setContacts((prev) => prev.map((c) => (c.id === refreshed.id ? refreshed : c)));
        setSelected(refreshed);
      }
      setCenterMode(null);
      toast.success('Contact saved.');
    } catch {
      toast.error('Failed to update contact.');
    }
  }, [selected, currentUser, setContacts, toast]);

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
    // Navigate to the top-level route so stale campaign/template IDs are dropped
    const topRoute = "/" + (window.location.pathname.split("/").filter(Boolean)[0] || "");
    window.location.href = topRoute;
  }, [setPool]);

  const handleClientSwitch = useCallback((id) => {
    setClientId(id);
    setPool('client');
    // Keep only the first path segment — strips both query params (?id=...) AND
    // route-level IDs (/campaigns/old-uuid → /campaigns)
    const topRoute = "/" + (window.location.pathname.split("/").filter(Boolean)[0] || "");
    window.location.href = topRoute;
  }, [setClientId, setPool]);

  const handleCancelForm = useCallback(() => setCenterMode(null), []);

  const handleImportBack = useCallback(async () => {
    setCenterMode(null);
    try {
      const fresh = await db.getContacts();
      setContacts(fresh);
    } catch {}
  }, [setContacts]);

  const handleToggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleToggleSelectAll = useCallback((filteredIds) => {
    setSelectedIds(prev => {
      const allSelected = filteredIds.every(id => prev.has(id));
      const next = new Set(prev);
      if (allSelected) filteredIds.forEach(id => next.delete(id));
      else filteredIds.forEach(id => next.add(id));
      return next;
    });
  }, []);

  // Replace the entire selection with a specific set of IDs (used by sidebar limit picker)
  const handleSelectBulk = useCallback((ids) => {
    setSelectedIds(new Set(ids));
  }, []);

  const handleSendEmail = useCallback(() => {
    if (selected && selectedIds.size === 0) {
      setSelectedIds(new Set([selected.id]));
    }
    setCenterMode('sendEmail');
  }, [selected, selectedIds]);

  useEffect(() => {
    function handler(e) {
      const tag = e.target.tagName;
      const isFormEl = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Arrow navigation: works everywhere in contacts view except the sidebar search
      if (isContacts && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && e.target !== searchRef.current) {
        if (isFormEl) return;
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

      if (isFormEl) return;
      if (e.key === 'Escape') {
        setSearch('');
        if (centerDirtyRef.current) return;
        if (centerMode) { setCenterMode(null); return; }
        setSelected(null);
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

  // ── Live contact preview (merges unsaved form edits for right panel) ─────────

  const liveContact = liveFormData && selected ? {
    ...selected,
    ...liveFormData,
    trucks:        parseInt(liveFormData.trucks)        || selected.trucks        || 0,
    contractValue: parseInt(liveFormData.contractValue) || selected.contractValue || 0,
    tags: liveFormData.tags
      ? liveFormData.tags.split(",").map(t => t.trim()).filter(Boolean)
      : (selected.tags || []),
  } : selected;

  // ── View mode filter options ──────────────────────────────────────────────

  const VIEW_MODE_OPTS = [
    { mode: VIEW_MODE.ALL,        label: "All",        Icon: List,          colorKey: "dim"    },
    { mode: VIEW_MODE.PROSPECTS,  label: "Prospects",  Icon: UserPlus,      colorKey: "amber"  },
    { mode: VIEW_MODE.LEADS,      label: "Leads",      Icon: Users,         colorKey: "blue"   },
    { mode: VIEW_MODE.WARM,       label: "Warm",       Icon: Flame,         colorKey: "orange" },
    { mode: VIEW_MODE.HOT,        label: "Hot",        Icon: Zap,           colorKey: "red"    },
    { mode: VIEW_MODE.CUSTOMER,   label: "Customer",   Icon: Star,          colorKey: "green"  },
    { mode: VIEW_MODE.BACKBURNER, label: "Backburner", Icon: Clock,         colorKey: "purple" },
    { mode: VIEW_MODE.LOST,       label: "Lost",       Icon: AlertTriangle, colorKey: "muted"  },
    { mode: VIEW_MODE.CANCELED,   label: "Canceled",   Icon: XCircle,       colorKey: "red"    },
  ];

  // ── Panel resize drag handlers ─────────────────────────────────────────────

  function startResizeSidebar(e) {
    if (isMobile) return;
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarW;
    let currentW = startW;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    function onMove(ev) {
      currentW = Math.max(160, Math.min(400, startW + (ev.clientX - startX)));
      setSidebarW(currentW);
    }
    function onUp() {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      localStorage.setItem('crm-sidebar-width', String(currentW));
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function startResizeLifecycle(e) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = lifecycleW;
    let currentW = startW;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    function onMove(ev) {
      currentW = Math.max(220, Math.min(480, startW - (ev.clientX - startX)));
      setLifecycleW(currentW);
    }
    function onUp() {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      localStorage.setItem('crm-lifecycle-width', String(currentW));
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  // ── Render center panel content ────────────────────────────────────────────

  function renderCenter() {
    if (isContacts) {
      if (centerMode === 'add') {
        return (
          <ContactDetailPanel
            contact={null}
            onSave={handleAddSave}
            onAction={handleContactAction}
            currentUser={currentUser}
            pool={pool}
            clientId={clientId}
            onFormChange={setLiveFormData}
            onDirtyChange={v => { centerDirtyRef.current = v; }}
          />
        );
      }
      if (centerMode === 'cancel' && selected) {
        return <CancelInline contact={selected} onSave={handleCancelContact} onBack={handleCancelForm} />;
      }
      if (centerMode === 'restore' && selected) {
        return <RestoreInline contact={selected} onConfirm={handleRestoreConfirm} onBack={handleCancelForm} loading={restoreLoading} />;
      }
      if (centerMode === 'import') {
        return <ImportInline onBack={handleImportBack} clientId={clientId} pool={pool} onImported={handleImportDone} />;
      }
      if (centerMode === 'sendEmail') {
        const ids = visibleSelectedIds.length > 0 ? visibleSelectedIds : (selected ? [selected.id] : []);
        return (
          <SendEmailInline
            contactIds={ids}
            onBack={() => setCenterMode(null)}
            onSent={() => { setCenterMode(null); setSelectedIds(new Set()); }}
          />
        );
      }
      if (selected) {
        return (
          <ContactDetailPanel
            contact={selected}
            onSave={handleEditSave}
            onAction={handleContactAction}
            currentUser={currentUser}
            pool={pool}
            clientId={clientId}
            onFormChange={setLiveFormData}
            onDirtyChange={v => { centerDirtyRef.current = v; }}
            editMode={editMode}
            onEditModeChange={setEditMode}
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
        <Route path="/" element={<Navigate to="/contacts" replace />} />
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
        <Route path="/templates" element={<TemplatesPage onEditingChange={setTemplateEditing} />} />
        <Route path="/campaigns" element={<CampaignsPage />} />
        <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
        <Route path="/reddit" element={<RedditMonitorPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<ProfilePage currentUser={currentUser} />} />
        <Route path="*" element={<Navigate to="/contacts" replace />} />
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
        {/* Mobile hamburger */}
        {isMobile && isContacts && (
          <button
            onClick={() => setMobileSidebarOpen(o => !o)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', color: T.navText,
              display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6, flexShrink: 0,
            }}
          >
            <Menu size={18} />
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginRight: 4, flexShrink: 0 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7, background: T.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 900, color: '#fff',
            boxShadow: `0 2px 6px ${T.accent}44`,
          }}>G</div>
          {!isMobile && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: T.navText, lineHeight: 1, letterSpacing: '-0.02em' }}>
                GeniusAI
              </div>
              <div style={{ fontSize: 8, color: T.navMuted, fontWeight: 700, letterSpacing: '0.05em' }}>
                PROPHONE
              </div>
            </div>
          )}
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
        {/* Mobile backdrop */}
        {isMobile && mobileSidebarOpen && (
          <div
            onClick={() => setMobileSidebarOpen(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
              zIndex: 200, backdropFilter: 'blur(2px)',
            }}
          />
        )}

        {isContacts && (
          <>
            <div style={{
              ...(isMobile ? {
                position: 'fixed', left: 0, top: 50, bottom: 0, zIndex: 201,
                transform: mobileSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1)',
                boxShadow: mobileSidebarOpen ? '4px 0 24px rgba(0,0,0,0.3)' : 'none',
              } : { flexShrink: 0 }),
              width: isMobile ? 280 : sidebarW,
              background: T.surface,
              display: 'flex', flexDirection: 'column', overflow: 'hidden', height: isMobile ? undefined : '100%',
            }}>
              <Sidebar
                pool={pool} clientId={clientId}
                viewMode={viewMode} onViewModeChange={e => { handleViewModeChange(e); setMobileSidebarOpen(false); }}
                selected={selected} onSelect={c => { handleSelect(c); if (isMobile) setMobileSidebarOpen(false); }}
                onAddNew={() => { handleAddNew(); setMobileSidebarOpen(false); }}
                onEditInline={handleEditInline}
                onImport={() => { setCenterMode('import'); navigate('/contacts'); setMobileSidebarOpen(false); }}
                search={search} setSearch={setSearch} searchRef={searchRef}
                contacts={viewMode === VIEW_MODE.CANCELED ? canceledContacts : contacts}
                canceledContacts={canceledContacts}
                setContacts={viewMode === VIEW_MODE.CANCELED ? setCanceledContacts : setContacts}
                currentUser={currentUser}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onToggleSelectAll={handleToggleSelectAll}
                onSelectBulk={handleSelectBulk}
              />
            </div>
            {/* Sidebar ↔ center drag handle */}
            {!isMobile && (
              <div
                onMouseDown={startResizeSidebar}
                style={{
                  width: 5, flexShrink: 0, cursor: 'col-resize',
                  background: T.border, opacity: 0.5,
                  transition: 'opacity 0.15s, background 0.15s',
                  zIndex: 5,
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = T.accent; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.background = T.border; }}
              />
            )}
          </>
        )}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {/* ── Section sub-navbars ───────────────────────────────────────── */}
          {isMarketing && !templateEditing && (
            <MarketingSubNav page={pageRoot} onNavigate={navigateTo} />
          )}
          {isReports && <ReportsSubNav />}
          {isSettings && <SettingsSubNav />}
          {/* ── Center filter bar (contacts only, not in modal modes) ─────── */}
          {isContacts && centerMode !== 'import' && centerMode !== 'cancel' && centerMode !== 'restore' && centerMode !== 'sendEmail' && (
            <div style={{
              flexShrink: 0, borderBottom: '1px solid ' + T.border,
              background: T.surface, padding: '8px 12px',
              display: 'flex', alignItems: 'center', gap: 8,
              overflowX: 'auto', whiteSpace: 'nowrap',
            }}>
              {selected && (
                <button
                  onClick={() => setEditMode(v => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 12px',
                    background: editMode ? T.accent : 'transparent',
                    border: '1px solid ' + (editMode ? T.accent : T.border),
                    borderRadius: 20,
                    color: editMode ? '#fff' : T.dim,
                    fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'all 0.18s',
                    boxShadow: editMode ? `0 2px 10px ${T.accent}44` : 'none',
                    letterSpacing: '0.01em',
                  }}
                  onMouseEnter={e => {
                    if (!editMode) {
                      e.currentTarget.style.background = T.accent + '12';
                      e.currentTarget.style.borderColor = T.accent + '70';
                      e.currentTarget.style.color = T.accent;
                    }
                  }}
                  onMouseLeave={e => {
                    if (!editMode) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = T.border;
                      e.currentTarget.style.color = T.dim;
                    }
                  }}
                >
                  {editMode
                    ? <><Check size={12} strokeWidth={2.5} /> Done</>
                    : <><PenLine size={12} strokeWidth={2} /> Edit Layout</>
                  }
                </button>
              )}
              <button
                onClick={() => { handleAddNew(); setMobileSidebarOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 13px', background: T.accent, border: 'none', borderRadius: 6,
                  color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: `0 1px 6px ${T.accent}44`,
                  transition: 'box-shadow 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 3px 12px ${T.accent}66`; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = `0 1px 6px ${T.accent}44`; }}
              >
                <Plus size={12} strokeWidth={2.5} />
                Add Contact
              </button>
              <button
                onClick={() => { setCenterMode('import'); navigate('/contacts'); setMobileSidebarOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 13px', background: 'transparent',
                  border: '1px solid ' + T.accent + '55',
                  borderRadius: 6, color: T.accent, fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = T.accent + '12'; e.currentTarget.style.borderColor = T.accent + '99'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = T.accent + '55'; }}
              >
                <Upload size={11} strokeWidth={2.5} />
                Import
              </button>
            </div>
          )}

          {/* Bulk selection action bar */}
          {isContacts && visibleSelectedIds.length > 0 && viewMode !== VIEW_MODE.CANCELED && centerMode !== 'sendEmail' && (
            <div style={{
              flexShrink: 0, borderBottom: '1px solid ' + T.border,
              background: T.accent + '0e', padding: '7px 14px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.accent }}>
                {visibleSelectedIds.length} contact{visibleSelectedIds.length > 1 ? 's' : ''} selected
              </span>
              <div style={{ flex: 1 }} />
              <button
                onClick={() => setCenterMode('sendEmail')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 13px', background: T.blue, border: 'none',
                  borderRadius: 6, color: '#fff', fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <Mail size={11} /> Send Email Campaign
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                style={{
                  padding: '5px 10px', background: 'transparent',
                  border: '1px solid ' + T.border, borderRadius: 6,
                  color: T.muted, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Clear
              </button>
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? 12 : isTablet ? 16 : 20, position: 'relative' }}>
            {!firstLoad && loading && <ContentLoader text="Loading contacts…" />}
            {renderCenter()}
          </div>
        </div>

        {/* Right panel — Lead Lifecycle (collapsible) */}
        {isContacts && lifecycleOpen && (
          <>
          {/* Center ↔ lifecycle drag handle */}
          <div
            onMouseDown={startResizeLifecycle}
            style={{
              width: 5, flexShrink: 0, cursor: 'col-resize',
              background: T.border, opacity: 0.5,
              transition: 'opacity 0.15s, background 0.15s',
              zIndex: 5,
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = T.accent; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.background = T.border; }}
          />
          <div style={{
            width: lifecycleW, flexShrink: 0,
            background: T.surface,
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
                  contact={liveContact}
                  onLogActivity={handleLogActivity}
                  onCancelContact={handleCancelContact}
                  onRestoreContact={handleRestoreConfirm}
                  onSendEmail={handleSendEmail}
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
          </>
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

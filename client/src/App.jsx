import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { usePool } from './context/PoolContext';
import { useTheme, useThemeName } from './context/ThemeContext';
import { VIEW_MODE } from './constants/index';

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
import ContactsPage from './pages/ContactsPage';
import DomainsPage from './pages/DomainsPage';
import TemplatesPage from './pages/TemplatesPage';
import CampaignsPage from './pages/CampaignsPage';
import CampaignDetailPage from './pages/CampaignDetailPage';
import SettingsPage from './pages/SettingsPage';
import ContactDetailPanel from './components/ContactDetailPanel';
import ContactFormPanel from './components/ContactFormPanel';

import { useAuth } from './hooks/useAuth';
import { useContacts } from './hooks/useContacts';
import { PageLoader, ContentLoader } from './components/ui/Loader';
import * as db from './services/api';

export default function App() {
  const { currentUser, setCurrentUser, loading, signOut } = useAuth();

  if (loading) return <PageLoader text="Loading…" />;

  return (
    <Routes>
      <Route
        path="/login"
        element={
          currentUser ? (
            <Navigate to="/contacts" replace />
          ) : (
            <LoginPage onLogin={setCurrentUser} />
          )
        }
      />
      <Route
        path="/*"
        element={
          currentUser ? (
            <AppLayout currentUser={currentUser} onSignOut={signOut} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

function AppLayout({ currentUser, onSignOut }) {
  const T = useTheme();
  const themeName = useThemeName();
  const navigate = useNavigate();
  const location = useLocation();

  const { pool, setPool, clientId, setClientId } = usePool();
  const [viewMode, setViewMode] = useState(VIEW_MODE.ALL);
  const [selected, setSelected] = useState(null);
  const [charted, setCharted] = useState(null);
  const [search, setSearch] = useState('');
  const searchRef = useRef(null);

  const [mktgCollapsed, setMktgCollapsed] = useState(
    () => localStorage.getItem('mktg-sidebar-collapsed') === 'true',
  );
  const [mktgMobileOpen, setMktgMobileOpen] = useState(false);
  const [contactFormPanel, setContactFormPanel] = useState(null); // null | { mode: 'add' } | { mode: 'edit', contact }

  const { contacts, setContacts, contactCounts, loading, firstLoad } =
    useContacts(currentUser);
  const [canceledContacts, setCanceledContacts] = useState([]);

  useEffect(() => {
    if (viewMode !== VIEW_MODE.CANCELED || !currentUser) return;
    db.getCanceledContacts()
      .then(setCanceledContacts)
      .catch(() => {});
  }, [viewMode, pool, clientId, currentUser]);

  const page = location.pathname.replace('/', '') || 'dashboard';
  const pageRoot = page.split('/')[0];
  const isContacts = pageRoot === 'contacts';
  const isMarketing = [
    'domains',
    'templates',
    'campaigns',
    'sequences',
  ].includes(pageRoot);

  const navigateTo = useCallback(
    (p) => {
      setSelected(null);
      setCharted(null);
      setContactFormPanel(null);
      navigate('/' + p);
    },
    [navigate],
  );

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
    setCharted(c);
    setContactFormPanel(null);
  }, []);

  const handleUpdate = useCallback(
    (updated) => {
      if (updated.isCanceled) {
        setContacts((prev) => prev.filter((c) => c.id !== updated.id));
        // Keep panel open — show the canceled contact with Restore button
        setSelected(updated);
        setCharted(updated);
      } else {
        setContacts((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c)),
        );
        setCanceledContacts((prev) => prev.filter((c) => c.id !== updated.id));
        setSelected(updated);
        setCharted(updated);
      }
    },
    [setContacts],
  );

  const handleRestoreContact = useCallback(
    async (contactId) => {
      setCanceledContacts((prev) => prev.filter((c) => c.id !== contactId));
      try {
        const fresh = await db.getContacts();
        setContacts(fresh);
      } catch {}
    },
    [setContacts],
  );

  const handlePoolSwitch = useCallback(
    (p) => {
      setPool(p);
      setSelected(null);
      setCharted(null);
    },
    [setPool],
  );

  const handleClientSwitch = useCallback(
    (id) => {
      setClientId(id);
      setPool('client');
      setSelected(null);
      setCharted(null);
    },
    [setClientId, setPool],
  );

  const handleOpenAddContact = useCallback(() => {
    setSelected(null);
    setCharted(null);
    setContactFormPanel({ mode: 'add' });
  }, []);

  const handleOpenEditContact = useCallback((contact) => {
    setContactFormPanel({ mode: 'edit', contact });
  }, []);

  const handleContactFormSaved = useCallback((result) => {
    setContactFormPanel(prev => {
      if (prev?.mode === 'edit') {
        setContacts(c => c.map(x => x.id === result.id ? result : x));
        setSelected(s => s?.id === result.id ? result : s);
        setCharted(ch => ch?.id === result.id ? result : ch);
      } else {
        setContacts(c => [result, ...c]);
      }
      return null;
    });
  }, [setContacts]);

  useEffect(() => {
    function handler(e) {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Escape') {
        setSearch('');
        setSelected(null);
        setCharted(null);
        setContactFormPanel(null);
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
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: T.bg,
        color: T.text,
        fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif",
        fontSize: 13,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: 50,
          flexShrink: 0,
          position: 'relative',
          background: T.navBg,
          borderBottom: '1px solid ' + T.navBorder,
          display: 'flex',
          alignItems: 'center',
          padding: '0 14px',
          gap: 10,
          zIndex: 2000,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            marginRight: 4,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: T.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 900,
              color: '#fff',
              boxShadow: `0 2px 6px ${T.accent}44`,
            }}
          >
            G
          </div>
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: T.navText,
                lineHeight: 1,
                letterSpacing: '-0.02em',
              }}
            >
              GeniusAI
            </div>
            <div
              style={{
                fontSize: 8,
                color: T.navMuted,
                fontWeight: 700,
                letterSpacing: '0.05em',
              }}
            >
              PROPHONE
            </div>
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
          onMarketingClick={handleMarketingClick}
        />

        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {search && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: `${T.accent}1A`,
                border: `1px solid ${T.accent}33`,
                borderRadius: 6,
                padding: '4px 10px',
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke={T.accent}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ width: 10, height: 10, opacity: 0.9 }}
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: T.accent,
                  letterSpacing: '0.01em',
                }}
              >
                "{search}"
              </span>
              <button
                onClick={() => setSearch('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: T.accent,
                  cursor: 'pointer',
                  fontSize: 11,
                  padding: 0,
                  marginLeft: 2,
                  display: 'flex',
                }}
              >
                ✕
              </button>
            </div>
          )}
          <ThemeSwitcher />
          <UserChip user={currentUser} onSignOut={onSignOut} />
        </div>
      </div>

      {firstLoad && loading && <PageLoader text="Loading CRM data…" />}

      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {isContacts && (
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
            loading={loading}
            onOpenPanel={(cfg) => {
              if (cfg?.mode === 'edit' && cfg?.contact) {
                handleOpenEditContact(cfg.contact);
              } else {
                handleOpenAddContact();
              }
            }}
          />
        )}

        {isMarketing && (
          <MarketingSidebar
            page={pageRoot}
            onNavigate={navigateTo}
            collapsed={mktgCollapsed}
            onToggleCollapse={handleToggleMktgCollapse}
            mobileOpen={mktgMobileOpen}
            onMobileClose={() => setMktgMobileOpen(false)}
          />
        )}

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          {isContacts && (
            <div
              style={{
                display: 'flex',
                gap: 4,
                background: T.card,
                borderRadius: 10,
                padding: 4,
                border: '1px solid ' + T.border,
                alignSelf: 'flex-start',
                margin: '20px 0 0 20px',
                boxShadow:
                  themeName === 'light'
                    ? T.shadow
                    : '0 2px 8px rgba(0,0,0,0.2)',
                flexWrap: 'wrap',
              }}
            >
              {[
                [VIEW_MODE.ALL, 'All', T.dim],
                [VIEW_MODE.PROSPECTS, 'Prospects', T.amber],
                [VIEW_MODE.LEADS, 'Leads', T.blue],
                [VIEW_MODE.WARM, 'Warm', T.orange],
                [VIEW_MODE.HOT, 'Hot', T.red],
                [VIEW_MODE.CUSTOMER, 'Customer', T.green],
                [VIEW_MODE.BACKBURNER, 'Backburner', T.purple],
                [VIEW_MODE.LOST, 'Lost', T.muted],
              ].map(([mode, label, c]) => (
                <button
                  key={mode}
                  onClick={() => {
                    setViewMode(mode);
                    setSelected(null);
                    setCharted(null);
                    setContactFormPanel(null);
                    navigate('/contacts');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 14px',
                    borderRadius: 7,
                    border: 'none',
                    cursor: 'pointer',
                    background: viewMode === mode ? `${c}15` : 'transparent',
                    color: viewMode === mode ? c : T.muted,
                    fontWeight: viewMode === mode ? 800 : 500,
                    fontSize: 11,
                    fontFamily: 'inherit',
                    transition: 'all 0.2s',
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: c,
                      opacity: viewMode === mode ? 1 : 0.3,
                    }}
                  />
                  {label}
                </button>
              ))}
            </div>
          )}

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 20,
              position: 'relative',
            }}
          >
            {!firstLoad && loading && (
              <ContentLoader rows={10} cols={9} />
            )}

            {isContacts && selected ? (
              <ContactDetailPanel
                contact={selected}
                onUpdate={handleUpdate}
                currentUser={currentUser}
                onEditContact={handleOpenEditContact}
              />
            ) : (
              <Routes>
                <Route
                  path="/"
                  element={<Navigate to="/dashboard" replace />}
                />
                <Route
                  path="/dashboard"
                  element={
                    <DashboardPage
                      pool={pool}
                      clientId={clientId}
                      viewMode={viewMode}
                      setViewMode={(v) => {
                        setViewMode(v);
                        navigate('/contacts');
                      }}
                      setPage={navigateTo}
                      contacts={contacts}
                      currentUser={currentUser}
                    />
                  }
                />
                <Route
                  path="/contacts"
                  element={
                    <ContactsPage
                      pool={pool}
                      clientId={clientId}
                      viewMode={viewMode}
                      onSelect={handleSelect}
                      selected={selected}
                      search={search}
                      contacts={
                        viewMode === VIEW_MODE.CANCELED
                          ? canceledContacts
                          : contacts
                      }
                      setContacts={
                        viewMode === VIEW_MODE.CANCELED
                          ? setCanceledContacts
                          : setContacts
                      }
                      currentUser={currentUser}
                      onRestoreContact={handleRestoreContact}
                      onAddContact={handleOpenAddContact}
                      onEditContact={handleOpenEditContact}
                    />
                  }
                />
                <Route path="/domains" element={<DomainsPage />} />
                <Route path="/templates" element={<TemplatesPage />} />
                <Route path="/campaigns" element={<CampaignsPage />} />
                <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
                <Route
                  path="/reports"
                  element={<ComingSoon page="reports" />}
                />
                <Route
                  path="/settings"
                  element={<SettingsPage />}
                />
                <Route
                  path="*"
                  element={<Navigate to="/dashboard" replace />}
                />
              </Routes>
            )}
          </div>

        </div>

        {(contactFormPanel || charted) && (
          <div
            style={{
              width: 420,
              flexShrink: 0,
              background: T.surface,
              borderLeft: '1px solid ' + T.border,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid ' + T.border,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: T.text,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {contactFormPanel
                  ? (contactFormPanel.mode === 'edit' ? 'Edit Contact' : 'Add Contact')
                  : 'Lead Lifecycle'}
              </div>
              <button
                onClick={() => contactFormPanel ? setContactFormPanel(null) : setCharted(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: T.muted,
                  fontSize: 18,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              {contactFormPanel ? (
                <ContactFormPanel
                  key={contactFormPanel.mode === 'edit' ? contactFormPanel.contact?.id : 'add'}
                  mode={contactFormPanel.mode}
                  contact={contactFormPanel.contact}
                  pool={pool}
                  clientId={clientId}
                  currentUser={currentUser}
                  onSaved={handleContactFormSaved}
                  onClose={() => setContactFormPanel(null)}
                />
              ) : (
                <LifecycleChart
                  contact={charted}
                  onUpdate={handleUpdate}
                  currentUser={currentUser}
                  onEditContact={handleOpenEditContact}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

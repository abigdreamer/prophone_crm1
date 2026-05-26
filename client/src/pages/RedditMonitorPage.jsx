import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import { usePool } from '../context/PoolContext';
import { useAppToast } from '../context/ToastContext';
import { Eye, Radio, FileText, CheckCircle, Plus, Trash2, Power, PowerOff, RefreshCw } from 'lucide-react';
import RedditPostCard from '../components/RedditPostCard';
import RedditMonitorModal from '../components/modals/RedditMonitorModal';
import * as db from '../services/api';

function getPageWindow(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total];
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '…', current - 1, current, current + 1, '…', total];
}

const TABS = [
  { id: 'all',       label: 'All' },
  { id: 'new',       label: 'New' },
  { id: 'drafted',   label: 'Drafted' },
  { id: 'posted',    label: 'Posted' },
  { id: 'dismissed', label: 'Dismissed' },
];

export default function RedditMonitorPage() {
  const T = useTheme();
  const { clientId } = usePool();
  const toast = useAppToast();

  const [tab, setTab] = useState('all');
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [monitors, setMonitors] = useState([]);
  const [stats, setStats] = useState({ activeMonitors: 0, totalPosts: 0, draftsReady: 0, posted: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editMonitor, setEditMonitor] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const params = { limit: pageSize, offset: (page - 1) * pageSize };
      if (clientId) params.clientId = clientId;
      if (tab !== 'all') params.status = tab;

      const [postsRes, monRes, statsRes] = await Promise.all([
        db.getRedditPosts(params),
        db.getRedditMonitors(clientId),
        db.getRedditStats(clientId),
      ]);
      setPosts(postsRes.posts || []);
      setTotal(postsRes.total || 0);
      setMonitors(monRes || []);
      setStats(statsRes || {});
    } catch (err) {
      console.error('Failed to load reddit data:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId, tab, page, pageSize]);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-refresh every 30s
  useEffect(() => {
    const iv = setInterval(loadData, 30_000);
    return () => clearInterval(iv);
  }, [loadData]);

  async function handleSaveMonitor(data) {
    if (editMonitor) {
      await db.updateRedditMonitor(editMonitor.id, data);
      toast.success('Monitor updated');
    } else {
      await db.createRedditMonitor(data);
      toast.success('Monitor created');
    }
    setEditMonitor(null);
    loadData();
  }

  async function handleDeleteMonitor(id) {
    await db.deleteRedditMonitor(id);
    toast.success('Monitor deleted');
    loadData();
  }

  async function handleToggleMonitor(mon) {
    await db.updateRedditMonitor(mon.id, { isActive: !mon.isActive });
    loadData();
  }

  async function handleGenerateDraft(postId) {
    try {
      const updated = await db.generateRedditDraft(postId);
      setPosts(prev => prev.map(p => p.id === postId ? updated : p));
      toast.success('AI draft generated');
    } catch {
      toast.error('Failed to generate draft');
    }
  }

  async function handleUpdatePost(postId, data) {
    try {
      const updated = await db.updateRedditPost(postId, data);
      setPosts(prev => prev.map(p => p.id === postId ? updated : p));
      loadData(); // refresh stats
    } catch {
      toast.error('Failed to update post');
    }
  }

  const statCards = [
    { label: 'Active Monitors', value: stats.activeMonitors, Icon: Radio, color: T.accent },
    { label: 'Posts Found', value: stats.totalPosts, Icon: Eye, color: T.blue },
    { label: 'Drafts Ready', value: stats.draftsReady, Icon: FileText, color: T.purple },
    { label: 'Posted', value: stats.posted, Icon: CheckCircle, color: T.green },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.text }}>Reddit Monitor</h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: T.muted }}>
            Track Reddit posts, generate AI comment drafts, and engage with your community
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={async () => { setRefreshing(true); await loadData(); setRefreshing(false); }}
            disabled={refreshing}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '8px 14px', fontSize: 11, fontWeight: 600, borderRadius: 8,
              background: 'transparent', border: '1px solid ' + T.border,
              color: T.dim, cursor: refreshing ? 'default' : 'pointer', fontFamily: 'inherit',
              opacity: refreshing ? 0.5 : 1,
            }}
          >
            <RefreshCw size={12} style={refreshing ? { animation: 'spin 1s linear infinite' } : {}} /> {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => { setEditMonitor(null); setShowModal(true); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '8px 16px', fontSize: 11, fontWeight: 700, borderRadius: 8,
              background: T.accent, border: 'none', color: '#fff',
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 2px 6px ' + T.accent + '44',
            }}
          >
            <Plus size={13} /> Add Monitor
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {statCards.map(s => (
          <div key={s.label} style={{
            background: T.card, border: '1px solid ' + T.border, borderRadius: 10,
            padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: s.color + '18',
            }}>
              <s.Icon size={18} color={s.color} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: T.text }}>{s.value}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {s.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Monitors list */}
      {monitors.length > 0 && (
        <div style={{
          background: T.card, border: '1px solid ' + T.border, borderRadius: 10,
          padding: 14, marginBottom: 20,
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: T.dim, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
            Monitors
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {monitors.map(m => (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 12px', borderRadius: 8,
                background: m.isActive ? T.accent + '12' : T.surface,
                border: '1px solid ' + (m.isActive ? T.accent + '40' : T.border),
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: m.isActive ? T.accent : T.muted }}>
                  r/{m.subreddit}
                </span>
                <span style={{ fontSize: 10, color: T.muted }}>
                  {(m.keywords || []).length} keywords
                </span>
                <button
                  onClick={() => handleToggleMonitor(m)}
                  title={m.isActive ? 'Pause' : 'Resume'}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: m.isActive ? T.green : T.muted, display: 'flex', padding: 2,
                  }}
                >
                  {m.isActive ? <Power size={12} /> : <PowerOff size={12} />}
                </button>
                <button
                  onClick={() => { setEditMonitor(m); setShowModal(true); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: T.muted, display: 'flex', padding: 2, fontSize: 10,
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteMonitor(m.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: T.red, display: 'flex', padding: 2,
                  }}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid ' + T.border, paddingBottom: 0 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setPage(1); }}
            style={{
              padding: '8px 16px', fontSize: 12, fontWeight: tab === t.id ? 700 : 500,
              background: 'transparent', border: 'none',
              borderBottom: tab === t.id ? '2px solid ' + T.accent : '2px solid transparent',
              color: tab === t.id ? T.accent : T.muted,
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <select
          value={pageSize}
          onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
          style={{
            background: T.surface, border: '1px solid ' + T.border,
            borderRadius: 6, padding: '5px 9px', color: T.text, fontSize: 11,
            fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
            alignSelf: 'center',
          }}
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <span style={{ fontSize: 11, color: T.muted, alignSelf: 'center', paddingRight: 8 }}>
          {total} post{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Posts */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: T.muted, fontSize: 13 }}>
          Loading...
        </div>
      ) : posts.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 60, color: T.muted,
          background: T.card, border: '1px solid ' + T.border, borderRadius: 12,
        }}>
          <Radio size={40} strokeWidth={1.2} color={T.border} style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 14, fontWeight: 700, color: T.dim, marginBottom: 6 }}>
            {monitors.length === 0 ? 'No monitors configured' : 'No posts found yet'}
          </div>
          <div style={{ fontSize: 12, color: T.muted }}>
            {monitors.length === 0
              ? 'Add a Reddit monitor to start tracking posts'
              : 'The poller checks every 60 seconds. New matching posts will appear here.'}
          </div>
        </div>
      ) : (
        posts.map(p => (
          <RedditPostCard
            key={p.id}
            post={p}
            onGenerateDraft={handleGenerateDraft}
            onUpdatePost={handleUpdatePost}
          />
        ))
      )}

      {/* Pagination */}
      {(() => {
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const safePage = Math.min(page, totalPages);
        const rangeStart = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
        const rangeEnd = Math.min(safePage * pageSize, total);
        if (totalPages <= 1) return null;
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 4px', gap: 8, marginTop: 12 }}>
            <span style={{ fontSize: 11, color: T.muted, flexShrink: 0 }}>
              {rangeStart}–{rangeEnd} of {total.toLocaleString()}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                style={{ padding: '5px 11px', borderRadius: 6, fontSize: 11, cursor: safePage === 1 ? 'default' : 'pointer', background: T.surface, border: `1px solid ${T.border}`, color: safePage === 1 ? T.muted : T.text, fontFamily: 'inherit' }}
              >← Prev</button>
              {getPageWindow(safePage, totalPages).map((p, i) =>
                p === '…' ? (
                  <span key={`e-${i}`} style={{ padding: '5px 4px', color: T.muted, fontSize: 11 }}>…</span>
                ) : (
                  <button key={p} onClick={() => setPage(p)}
                    style={{ minWidth: 32, padding: '5px 6px', borderRadius: 6, fontSize: 11, cursor: p === safePage ? 'default' : 'pointer', fontFamily: 'inherit', background: p === safePage ? T.accent : T.surface, border: `1px solid ${p === safePage ? T.accent : T.border}`, color: p === safePage ? '#fff' : T.text, fontWeight: p === safePage ? 700 : 400 }}
                  >{p}</button>
                )
              )}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                style={{ padding: '5px 11px', borderRadius: 6, fontSize: 11, cursor: safePage === totalPages ? 'default' : 'pointer', background: T.surface, border: `1px solid ${T.border}`, color: safePage === totalPages ? T.muted : T.text, fontFamily: 'inherit' }}
              >Next →</button>
            </div>
            <span style={{ fontSize: 11, color: T.muted, flexShrink: 0 }}>Page {safePage} of {totalPages}</span>
          </div>
        );
      })()}

      {/* Modal */}
      {showModal && (
        <RedditMonitorModal
          monitor={editMonitor}
          clientId={clientId}
          onSave={handleSaveMonitor}
          onClose={() => { setShowModal(false); setEditMonitor(null); }}
        />
      )}
    </div>
  );
}

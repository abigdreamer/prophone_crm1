import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { X } from 'lucide-react';

const DEFAULT_SUBREDDITS = [
  'towing', 'trucking', 'Truckers', 'smallbusiness', 'fleet', 'logistics',
];

const DEFAULT_KEYWORDS = 'tow, towing, truck, tow truck, dispatch, fleet, roadside, breakdown, GPS, hauling, wrecker, flatbed, impound, accident, stranded, roadside assistance, fleet management, dispatch software';

export default function RedditMonitorModal({ monitor, clientId, onSave, onClose }) {
  const T = useTheme();
  const [subreddit, setSubreddit] = useState('');
  const [keywordsText, setKeywordsText] = useState(monitor ? '' : DEFAULT_KEYWORDS);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (monitor) {
      setSubreddit(monitor.subreddit || '');
      setKeywordsText((monitor.keywords || []).join(', '));
      setIsActive(monitor.isActive !== false);
    }
  }, [monitor]);

  async function handleSubmit(e) {
    e.preventDefault();
    const keywords = keywordsText.split(',').map(k => k.trim()).filter(Boolean);
    if (!subreddit.trim() || keywords.length === 0) return;
    setSaving(true);
    try {
      await onSave({
        clientId,
        subreddit: subreddit.trim().replace(/^r\//, ''),
        keywords,
        isActive,
      });
      onClose();
    } catch {
      // handled by parent
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', fontSize: 13, fontFamily: 'inherit',
    background: T.bg, border: '1px solid ' + T.border, borderRadius: 8,
    color: T.text, outline: 'none',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 5000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div style={{
        background: T.card, border: '1px solid ' + T.border, borderRadius: 14,
        width: 480, maxWidth: '95vw', padding: 24,
        boxShadow: T.shadowLg,
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.text }}>
            {monitor ? 'Edit Monitor' : 'Add Reddit Monitor'}
          </h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: T.muted,
            display: 'flex', padding: 4, borderRadius: 6,
          }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.dim, display: 'block', marginBottom: 5 }}>
              Subreddit
            </label>
            <input
              value={subreddit}
              onChange={e => setSubreddit(e.target.value)}
              placeholder="e.g. towing"
              style={inputStyle}
              required
            />
            <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {DEFAULT_SUBREDDITS.map(s => (
                <button
                  key={s} type="button"
                  onClick={() => setSubreddit(s)}
                  style={{
                    padding: '2px 8px', fontSize: 10, fontWeight: 600, borderRadius: 10,
                    background: subreddit === s ? T.accent + '22' : T.surface,
                    border: '1px solid ' + (subreddit === s ? T.accent : T.border),
                    color: subreddit === s ? T.accent : T.muted,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  r/{s}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.dim, display: 'block', marginBottom: 5 }}>
              Keywords (comma-separated)
            </label>
            <textarea
              value={keywordsText}
              onChange={e => setKeywordsText(e.target.value)}
              placeholder="tow truck, dispatch software, GPS fleet, roadside assistance"
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
              required
            />
          </div>

          <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.dim }}>Active</label>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              style={{
                width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
                background: isActive ? T.green : T.border,
                position: 'relative', transition: 'background 0.2s',
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 2,
                left: isActive ? 18 : 2,
                transition: 'left 0.2s',
              }} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{
              padding: '8px 18px', fontSize: 12, fontWeight: 600, borderRadius: 8,
              background: 'transparent', border: '1px solid ' + T.border,
              color: T.dim, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{
              padding: '8px 18px', fontSize: 12, fontWeight: 700, borderRadius: 8,
              background: T.accent, border: 'none', color: '#fff', cursor: 'pointer',
              fontFamily: 'inherit', opacity: saving ? 0.6 : 1,
            }}>
              {saving ? 'Saving...' : monitor ? 'Update' : 'Add Monitor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

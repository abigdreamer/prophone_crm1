import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { X } from 'lucide-react';

const DATE_PRESETS = [
  { value: '', label: 'Any time' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_year', label: 'Last Year' },
  { value: 'custom', label: 'Custom Range' },
];

export default function RedditFilterModal({ filter, clientId, onSave, onClose }) {
  const T = useTheme();
  const [name, setName] = useState('');
  const [keywordsText, setKeywordsText] = useState('');
  const [datePreset, setDatePreset] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (filter) {
      setName(filter.name || '');
      setKeywordsText((filter.keywords || []).join(', '));
      setDatePreset(filter.datePreset || '');
      setDateFrom(filter.dateFrom ? filter.dateFrom.slice(0, 10) : '');
      setDateTo(filter.dateTo ? filter.dateTo.slice(0, 10) : '');
    }
  }, [filter]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    const keywords = keywordsText.split(',').map(k => k.trim()).filter(Boolean);
    setSaving(true);
    try {
      await onSave({
        clientId,
        name: name.trim(),
        keywords,
        datePreset: datePreset || null,
        dateFrom: datePreset === 'custom' && dateFrom ? dateFrom : null,
        dateTo: datePreset === 'custom' && dateTo ? dateTo : null,
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
            {filter ? 'Edit Filter' : 'Save Filter'}
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
              Filter Name
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Towing Keywords"
              style={inputStyle}
              required
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.dim, display: 'block', marginBottom: 5 }}>
              Keywords (comma-separated)
            </label>
            <textarea
              value={keywordsText}
              onChange={e => setKeywordsText(e.target.value)}
              placeholder="tow truck, dispatch, GPS fleet"
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
            <div style={{ fontSize: 10, color: T.muted, marginTop: 4 }}>
              Leave empty to filter by date only
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.dim, display: 'block', marginBottom: 5 }}>
              Date Range
            </label>
            <select
              value={datePreset}
              onChange={e => setDatePreset(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {DATE_PRESETS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {datePreset === 'custom' && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.dim, display: 'block', marginBottom: 5 }}>
                  From
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.dim, display: 'block', marginBottom: 5 }}>
                  To
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
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
              {saving ? 'Saving...' : filter ? 'Update' : 'Save Filter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

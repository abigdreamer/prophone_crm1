import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sparkles, Copy, ExternalLink, Check, X, Clock } from 'lucide-react';

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const STATUS_COLORS = {
  new: { bg: '#3b82f622', border: '#3b82f6', text: '#3b82f6', label: 'New' },
  drafting: { bg: '#f59e0b22', border: '#f59e0b', text: '#f59e0b', label: 'Drafting' },
  drafted: { bg: '#8b5cf622', border: '#8b5cf6', text: '#8b5cf6', label: 'Draft Ready' },
  posted: { bg: '#22c55e22', border: '#22c55e', text: '#22c55e', label: 'Posted' },
  dismissed: { bg: '#64748b22', border: '#64748b', text: '#64748b', label: 'Dismissed' },
};

export default function RedditPostCard({ post, onGenerateDraft, onUpdatePost }) {
  const T = useTheme();
  const [drafting, setDrafting] = useState(false);
  const [copied, setCopied] = useState(false);

  const sc = STATUS_COLORS[post.status] || STATUS_COLORS.new;

  async function handleDraft() {
    setDrafting(true);
    try {
      await onGenerateDraft(post.id);
    } finally {
      setDrafting(false);
    }
  }

  async function handleCopy() {
    if (!post.aiDraft) return;
    await navigator.clipboard.writeText(post.aiDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{
      background: T.card, border: '1px solid ' + T.border, borderRadius: 12,
      padding: 16, marginBottom: 12, transition: 'border-color 0.15s',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 10, fontWeight: 700, color: T.accent,
              background: T.accent + '18', borderRadius: 6, padding: '2px 7px',
            }}>
              r/{post.subreddit}
            </span>
            <span style={{ fontSize: 10, color: T.muted }}>u/{post.author}</span>
            <span style={{ fontSize: 10, color: T.muted, display: 'flex', alignItems: 'center', gap: 3 }}>
              <Clock size={9} /> {timeAgo(post.redditCreatedAt)}
            </span>
          </div>
          <a
            href={post.permalink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 14, fontWeight: 700, color: T.text, textDecoration: 'none',
              lineHeight: 1.3, display: 'block',
            }}
            onMouseEnter={e => e.currentTarget.style.color = T.accent}
            onMouseLeave={e => e.currentTarget.style.color = T.text}
          >
            {post.title}
          </a>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 8,
          background: sc.bg, border: '1px solid ' + sc.border, color: sc.text,
          flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          {sc.label}
        </span>
      </div>

      {/* Body preview */}
      {post.body && (
        <div style={{
          fontSize: 12, color: T.dim, lineHeight: 1.5, marginBottom: 10,
          maxHeight: 60, overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {post.body.slice(0, 200)}{post.body.length > 200 ? '...' : ''}
        </div>
      )}

      {/* Matched keywords */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
        {(post.matchedKeywords || []).map(kw => (
          <span key={kw} style={{
            fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 6,
            background: T.amber + '18', color: T.amber, border: '1px solid ' + T.amber + '33',
          }}>
            {kw}
          </span>
        ))}
      </div>

      {/* AI Draft */}
      {post.aiDraft && (
        <div style={{
          background: T.surface, border: '1px solid ' + T.border, borderRadius: 8,
          padding: 12, marginBottom: 12,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.purple, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            AI Draft
          </div>
          <div style={{ fontSize: 12, color: T.text, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {post.aiDraft}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {(post.status === 'new' || post.status === 'drafted') && (
          <button
            onClick={handleDraft}
            disabled={drafting}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', fontSize: 11, fontWeight: 700, borderRadius: 7,
              background: T.purple, border: 'none', color: '#fff',
              cursor: drafting ? 'wait' : 'pointer', fontFamily: 'inherit',
              opacity: drafting ? 0.6 : 1,
            }}
          >
            <Sparkles size={12} />
            {drafting ? 'Generating...' : post.aiDraft ? 'Regenerate Draft' : 'Generate Draft'}
          </button>
        )}

        {post.aiDraft && (
          <button
            onClick={handleCopy}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', fontSize: 11, fontWeight: 600, borderRadius: 7,
              background: 'transparent', border: '1px solid ' + T.border,
              color: copied ? T.green : T.dim, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied!' : 'Copy Draft'}
          </button>
        )}

        <a
          href={post.permalink}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 12px', fontSize: 11, fontWeight: 600, borderRadius: 7,
            background: 'transparent', border: '1px solid ' + T.border,
            color: T.dim, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none',
          }}
        >
          <ExternalLink size={12} /> Open in Reddit
        </a>

        {post.status !== 'posted' && post.status !== 'dismissed' && (
          <>
            {post.aiDraft && (
              <button
                onClick={() => onUpdatePost(post.id, { status: 'posted', postedComment: post.aiDraft })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', fontSize: 11, fontWeight: 700, borderRadius: 7,
                  background: T.green, border: 'none', color: '#fff',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <Check size={12} /> Mark as Posted
              </button>
            )}
            <button
              onClick={() => onUpdatePost(post.id, { status: 'dismissed' })}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', fontSize: 11, fontWeight: 600, borderRadius: 7,
                background: 'transparent', border: '1px solid ' + T.border,
                color: T.muted, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <X size={12} /> Dismiss
            </button>
          </>
        )}
      </div>
    </div>
  );
}

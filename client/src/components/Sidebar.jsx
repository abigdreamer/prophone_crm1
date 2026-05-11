import { useState, useRef, useEffect } from "react";
import Hi from "./ui/Hi";
import ScoreBar from "./ui/ScoreBar";
import { useTheme } from "../context/ThemeContext";
import { useClientById } from "../context/ClientsContext";
import { STAGE_DEF, LEAD_STAGES, CUSTOMER_STAGES, LOST_STAGES, ALL_STAGES } from "../data/stages";
import fmt from "../utils/format";
import { SkeletonContactCard } from "./ui/Loader";

function SidebarSkeleton() {
  return (
    <div>
      {Array.from({ length: 9 }).map((_, i) => <SkeletonContactCard key={i} />)}
    </div>
  );
}

export default function Sidebar({
  pool, clientId, viewMode, selected, onSelect,
  search, setSearch, searchRef, contacts, setContacts, currentUser, loading,
  onOpenPanel,
}) {
  const T = useTheme();
  const [stageF, setStageF] = useState("all");
  const [sortF, setSortF] = useState("recent");
  const [isFocused, setIsFocused] = useState(false);
  const listRef = useRef(null);

  const client = useClientById(clientId);
  const col = pool === "prospect" ? T.accent : (client?.color || T.accent);

  // --- NEW: Auto-focus logic on mount ---
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchRef?.current) searchRef.current.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, [searchRef]);

  // Auto-select first visible result when search changes
  useEffect(() => {
    if (!search.trim()) return;
    // Use a short delay so the filtered list is computed first
    const t = setTimeout(() => {
      const first = filtered[0];
      if (first && (!selected || selected.id !== first.id)) {
        onSelect(first);
      }
    }, 80);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const modeFiltered = contacts.filter(c => {
    if (viewMode === "leads") return LEAD_STAGES.includes(c.lifecycleStage);
    if (viewMode === "customers") return c.lifecycleStage === "customer";
    if (viewMode === "lost") return LOST_STAGES.includes(c.lifecycleStage);
    return true;
  });

  const stageOpts =
    viewMode === "leads" ? LEAD_STAGES :
      viewMode === "customers" ? CUSTOMER_STAGES :
        viewMode === "lost" ? LOST_STAGES : ALL_STAGES;

  const filtered = modeFiltered
    .filter(c => {
      if (stageF !== "all" && c.lifecycleStage !== stageF) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (c.firstName + " " + c.lastName).toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.company || "").toLowerCase().includes(q) ||
        (c.address || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortF === "name")      return (a.firstName + " " + a.lastName).localeCompare(b.firstName + " " + b.lastName);
      if (sortF === "firstName") return a.firstName.localeCompare(b.firstName);
      if (sortF === "lastName")  return (a.lastName || "").localeCompare(b.lastName || "");
      if (sortF === "score")     return b.leadScore - a.leadScore;
      return new Date(b.lastActivityAt || b.createdAt) - new Date(a.lastActivityAt || a.createdAt);
    });

  function navigateDir(dir) {
    const visible = filtered.slice(0, 150);
    if (visible.length === 0) return;
    const currentIdx = selected ? visible.findIndex(c => c.id === selected.id) : -1;

    let nextIdx;
    if (dir === "down") {
      nextIdx = currentIdx === -1 ? 0 : Math.min(currentIdx + 1, visible.length - 1);
    } else {
      if (currentIdx <= 0) return;
      nextIdx = currentIdx - 1;
    }

    const next = visible[nextIdx];
    onSelect(next);
    requestAnimationFrame(() => {
      const el = listRef.current?.querySelector(`[data-contact-id="${next.id}"]`);
      el?.scrollIntoView({ block: "nearest" });
      listRef.current?.focus();
    });
  }

  function navigate(e) {
    const NAV_KEYS = ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Enter"];
    if (!NAV_KEYS.includes(e.key)) return;
    e.preventDefault();

    if (e.key === "Enter") {
      if (selected) onOpenPanel({ mode: "edit", contact: selected });
      return;
    }

    if (e.key === "ArrowDown") { navigateDir("down"); return; }
    if (e.key === "ArrowUp")   { navigateDir("up");   return; }

    const visible = filtered.slice(0, 150);
    if (visible.length === 0) return;
    const currentIdx = selected ? visible.findIndex(c => c.id === selected.id) : -1;
    const container = listRef.current;
    const firstRow = container?.querySelector("[data-contact-id]");
    const pageSize = (container && firstRow)
      ? Math.max(1, Math.floor(container.clientHeight / firstRow.offsetHeight))
      : 10;
    const nextIdx = e.key === "PageDown"
      ? (currentIdx === -1 ? pageSize - 1 : Math.min(currentIdx + pageSize, visible.length - 1))
      : (currentIdx === -1 ? 0 : Math.max(currentIdx - pageSize, 0));
    const next = visible[nextIdx];
    onSelect(next);
    requestAnimationFrame(() => {
      const el = listRef.current?.querySelector(`[data-contact-id="${next.id}"]`);
      el?.scrollIntoView({ block: "nearest" });
      listRef.current?.focus();
    });
  }

  function handleSearchKeyDown(e) { navigate(e); }
  function handleListKeyDown(e)   { navigate(e); }

  return (
    <div style={{
      width: 290, flexShrink: 0,
      background: T.surface, borderRight: "1px solid " + T.border,
      display: "flex", flexDirection: "column", height: "100%", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "10px 14px", background: col + "0D", borderBottom: "1px solid " + T.border,
        display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: col, boxShadow: `0 0 8px ${col}66` }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: col, letterSpacing: '0.02em' }}>
            {pool === "prospect" ? "PROSPECT POOL" : (client?.name?.toUpperCase() || "CLIENT")}
          </span>
          <span style={{ fontSize: 9, color: T.muted }}>{filtered.length} visible</span>
        </div>

        {/* Prev / Next navigation arrows */}
        <div style={{ display: "flex", gap: 2, marginRight: 4 }}>
          {(["up", "down"]).map(dir => {
            const visible = filtered.slice(0, 150);
            const idx = selected ? visible.findIndex(c => c.id === selected.id) : -1;
            const disabled = dir === "up" ? idx <= 0 : (visible.length === 0 || idx === visible.length - 1);
            return (
              <button
                key={dir}
                onClick={() => navigateDir(dir)}
                disabled={disabled}
                title={dir === "up" ? "Previous lead (↑)" : "Next lead (↓)"}
                style={{
                  background: disabled ? "transparent" : col + "18",
                  border: "1px solid " + (disabled ? T.border : col + "55"),
                  borderRadius: 5, cursor: disabled ? "default" : "pointer",
                  color: disabled ? T.muted : col,
                  fontSize: 11, fontWeight: 700, padding: "2px 6px",
                  lineHeight: 1, transition: "all 0.15s",
                }}
              >
                {dir === "up" ? "▲" : "▼"}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => onOpenPanel({ mode: "add" })}
          style={{
            background: col, border: "none", borderRadius: 6, color: "#fff",
            fontSize: 11, fontWeight: 700, padding: "5px 12px", cursor: "pointer",
            boxShadow: `0 2px 4px ${col}44`, transition: 'transform 0.1s'
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          + Add
        </button>
      </div>

      {/* Search & Filters */}
      <div style={{ padding: "12px 12px 8px", flexShrink: 0, borderBottom: "1px solid " + T.border }}>
        <div style={{ position: "relative", marginBottom: 10 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{
              position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
              width: 14, height: 14,
              /* CHANGED: Icon turns green when focused or searching */
              color: (isFocused || search) ? col : T.muted,
              pointerEvents: "none",
              transition: "color 0.2s ease"
            }}>
            <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} onKeyDown={handleSearchKeyDown}
            /* CHANGED: Added Focus tracking */
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Search contacts..."
            style={{
              width: "100%", background: T.card,
              /* CHANGED: Border turns green (col) if focused or searching */
              border: "1px solid " + ((isFocused || search) ? col : T.border),
              borderRadius: 8, padding: "8px 30px 8px 32px", color: T.text, fontSize: 12, outline: "none", fontFamily: "inherit",
              transition: "border-color 0.2s ease"
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={sortF} onChange={e => setSortF(e.target.value)}
            style={{
              background: T.bg, border: "1px solid " + T.border, borderRadius: 6,
              padding: "4px 8px", color: T.dim, fontSize: 10, outline: "none", cursor: "pointer"
            }}
          >
            <option value="recent">Recent</option>
            <option value="score">Score (High → Low)</option>
            <option value="firstName">First Name (A–Z)</option>
            <option value="lastName">Last Name (A–Z)</option>
            <option value="name">Name (A–Z)</option>
          </select>

          <StageFilterBtn T={T} label="All" active={stageF === "all"} color={col} onClick={() => setStageF("all")} />
          {stageOpts.slice(0, 5).map(s => (
            <StageFilterBtn key={s} T={T} label={STAGE_DEF[s].label} active={stageF === s} color={STAGE_DEF[s].color} onClick={() => setStageF(s)} />
          ))}
        </div>
      </div>

      {/* List */}
      <div
        ref={listRef}
        tabIndex={-1}
        onKeyDown={handleListKeyDown}
        style={{ flex: 1, overflowY: "auto", outline: "none" }}
      >
        {loading ? (
          <SidebarSkeleton />
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: T.muted, fontSize: 12 }}>No results found</div>
        ) : (
          filtered.slice(0, 150).map(c => {
            const sd = STAGE_DEF[c.lifecycleStage] || STAGE_DEF.new;
            const isSel = selected?.id === c.id;
            return (
              <div
                key={c.id} data-contact-id={c.id}
                onClick={() => { onSelect(c); requestAnimationFrame(() => listRef.current?.focus()); }}
                style={{
                  padding: "12px 14px", borderBottom: "1px solid " + T.border, cursor: "pointer",
                  background: isSel ? col + "14" : "transparent",
                  borderLeft: `4px solid ${isSel ? col : "transparent"}`,
                  transition: "all 0.15s ease"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: isSel ? col : T.text }}>
                    <Hi text={c.firstName + " " + c.lastName} q={search} />
                  </div>
                  <span style={{ fontSize: 9, color: sd.color, fontWeight: 800, background: sd.color + '15', padding: '2px 6px', borderRadius: 4 }}>
                    {sd.label.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: T.dim, marginBottom: 4 }}><Hi text={c.company} q={search} /></div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <ScoreBar score={c.leadScore} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: T.text }}>{c.leadScore}</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, alignItems: "center" }}>
                  <div style={{ display: 'flex', gap: 8, minWidth: 0 }}>
                    {c.address && <span style={{ fontSize: 10, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>📍 {c.address}</span>}
                    {c.trucks > 0 && <span style={{ fontSize: 10, color: T.orange, fontWeight: 600, flexShrink: 0 }}>🚛 {c.trucks}</span>}
                  </div>
                  <span style={{ fontSize: 9, color: T.muted }}>{fmt.ago(c.lastActivityAt)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function StageFilterBtn({ T, label, active, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "3px 8px", fontSize: 9, borderRadius: 12, cursor: "pointer",
        background: active ? color : "transparent",
        border: "1px solid " + (active ? color : T.border),
        color: active ? "#fff" : T.muted,
        fontWeight: active ? 700 : 400,
        fontFamily: "inherit", transition: "all 0.2s"
      }}
    >
      {label}
    </button>
  );
}
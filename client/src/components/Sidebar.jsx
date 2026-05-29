import { useState, useRef, useEffect } from "react";
import { List, UserPlus, Users, Flame, Zap, Star, Clock, AlertTriangle, XCircle, SlidersHorizontal } from "lucide-react";
import Hi from "./ui/Hi";
import ScoreBar from "./ui/ScoreBar";
import { useTheme } from "../context/ThemeContext";
import { useClientById } from "../context/ClientsContext";
import { STAGE_DEF } from "../data/stages";
import { VIEW_MODE, STATUS, STAGE_GROUPS } from "../constants/index";
import fmt from "../utils/format";

// Checkbox used in contact list rows
function Checkbox({ checked, indeterminate, onChange, color }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate ?? false;
  }, [indeterminate]);
  return (
    <div
      onClick={e => { e.stopPropagation(); onChange?.(); }}
      style={{
        width: 15, height: 15, borderRadius: 4, flexShrink: 0,
        border: "1.5px solid " + (checked || indeterminate ? color : "rgba(255,255,255,0.2)"),
        background: checked || indeterminate ? color : "rgba(0,0,0,0.25)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", transition: "all 0.15s", boxSizing: "border-box",
        boxShadow: checked || indeterminate ? `0 0 6px ${color}55` : "none",
      }}
    >
      {indeterminate && !checked ? (
        <div style={{ width: 7, height: 1.5, background: "#fff", borderRadius: 1 }} />
      ) : checked ? (
        <svg viewBox="0 0 10 8" width={9} height={7} fill="none">
          <polyline points="1,4 3.5,6.5 9,1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </div>
  );
}

const VIEW_MODE_TABS = [
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

const SORT_OPTS = [
  { value: "recent",     label: "Newest first"     },
  { value: "old",        label: "Oldest first"     },
  { value: "score_desc", label: "Score high → low" },
  { value: "score_asc",  label: "Score low → high" },
  { value: "name_az",    label: "Name A → Z"       },
  { value: "name_za",    label: "Name Z → A"       },
];


function contactDisplayName(c) {
  const name = [c?.firstName, c?.lastName].filter(Boolean).join(" ").trim();
  return name || c?.email || "Unknown Contact";
}

export default function Sidebar({
  pool, clientId,
  viewMode, onViewModeChange,
  selected, onSelect, onAddNew, onEditInline, onImport,
  search, setSearch, searchRef,
  contacts, setContacts, currentUser,
  selectedIds, onToggleSelect, onToggleSelectAll, onSelectBulk,
  hasMore, loadMore, loadingMore, total,
  // controlled filter panel (optional — from App.jsx center header button)
  filterOpen: filterOpenProp, onFilterToggle,
}) {
  const T = useTheme();

  // Filter state
  const [checkedModes,    setCheckedModes]    = useState(new Set());
  const [checkedStatuses, setCheckedStatuses] = useState(new Set());
  const [sortF,           setSortF]           = useState("recent");
  const [scoreFrom,       setScoreFrom]       = useState(0);
  const [scoreTo,         setScoreTo]         = useState(100);

  // Filter panel open/close — controlled externally or local
  const [localFilterOpen, setLocalFilterOpen] = useState(false);
  const isFilterOpen = filterOpenProp !== undefined ? filterOpenProp : localFilterOpen;
  function toggleFilter() {
    if (onFilterToggle) onFilterToggle();
    else setLocalFilterOpen(v => !v);
  }
  function closeFilter() {
    if (onFilterToggle && isFilterOpen) onFilterToggle();
    else setLocalFilterOpen(false);
  }

  const [isFocused,    setIsFocused]    = useState(false);
  const [displayLimit, setDisplayLimit] = useState(150);

  const listRef        = useRef(null);
  const filteredLenRef = useRef(0);
  const filterPanelRef = useRef(null);
  const hasMoreRef     = useRef(false);
  const loadMoreRef    = useRef(null);
  const loadingMoreRef = useRef(false);

  const client = useClientById(clientId);
  const col = pool === "prospect" ? T.accent : (client?.color || T.accent);
  const showingCanceled = viewMode === VIEW_MODE.CANCELED;
  const selEnabled = !!onToggleSelect && !showingCanceled;

  const activeFilterCount = [
    checkedModes.size > 0,
    checkedStatuses.size > 0,
    scoreFrom > 0 || scoreTo < 100,
  ].filter(Boolean).length;

  useEffect(() => {
    const timer = setTimeout(() => { searchRef?.current?.focus(); }, 150);
    return () => clearTimeout(timer);
  }, [searchRef]);

  // Reset local filters when parent viewMode changes (external navigation)
  useEffect(() => {
    setCheckedModes(new Set());
    setCheckedStatuses(new Set());
    setScoreFrom(0);
    setScoreTo(100);
    setDisplayLimit(150);
  }, [viewMode]);

  useEffect(() => { setDisplayLimit(150); }, [search, sortF, checkedModes, checkedStatuses, scoreFrom, scoreTo]);

  // Close panel on outside click
  useEffect(() => {
    if (!isFilterOpen) return;
    function handler(e) {
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target)) {
        closeFilter();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isFilterOpen]); // eslint-disable-line

  hasMoreRef.current     = hasMore     ?? false;
  loadMoreRef.current    = loadMore    ?? null;
  loadingMoreRef.current = loadingMore ?? false;

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    function onScroll() {
      const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 300;
      if (!nearBottom) return;
      setDisplayLimit(prev => {
        const next = prev + 150;
        return next > filteredLenRef.current ? filteredLenRef.current : next;
      });
      if (hasMoreRef.current && !loadingMoreRef.current && loadMoreRef.current) {
        loadMoreRef.current();
      }
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const viewModeStages = STAGE_GROUPS[viewMode];

  const filtered = contacts
    .filter(c => {
      // Stage filter — local checkboxes override viewMode when set
      if (checkedModes.size > 0) {
        const allowedStages = new Set([...checkedModes].flatMap(m => STAGE_GROUPS[m] || []));
        if (!allowedStages.has(c.lifecycleStage)) return false;
      } else if (viewModeStages?.length > 0) {
        if (!viewModeStages.includes(c.lifecycleStage)) return false;
      }
      // Status filter
      if (checkedStatuses.size > 0) {
        const s = c.status || (c.isCanceled ? STATUS.CANCELED : STATUS.ACTIVE);
        if (!checkedStatuses.has(s)) return false;
      }
      // Score range
      const score = c.leadScore || 0;
      if (score < scoreFrom || score > scoreTo) return false;
      // Search
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const name = contactDisplayName(c).toLowerCase();
      return (
        name.includes(q) ||
        (c.email   || "").toLowerCase().includes(q) ||
        (c.company || "").toLowerCase().includes(q) ||
        (c.address || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortF === "name_az") return contactDisplayName(a).localeCompare(contactDisplayName(b));
      if (sortF === "name_za") return contactDisplayName(b).localeCompare(contactDisplayName(a));
      if (sortF === "score_desc") return (b.leadScore || 0) - (a.leadScore || 0);
      if (sortF === "score_asc")  return (a.leadScore || 0) - (b.leadScore || 0);
      if (sortF === "old") return new Date(a.lastActivityAt || a.createdAt) - new Date(b.lastActivityAt || b.createdAt);
      return new Date(b.lastActivityAt || b.createdAt) - new Date(a.lastActivityAt || a.createdAt); // recent
    });

  filteredLenRef.current = filtered.length;

  useEffect(() => {
    if (!search.trim() || filtered.length === 0) return;
    if (filtered[0].id !== selected?.id) onSelect(filtered[0]);
  }, [search]); // eslint-disable-line

  function handleSearchKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      const inFiltered = selected && filtered.some(c => c.id === selected.id);
      const target = inFiltered ? selected : filtered[0];
      if (target && onEditInline) { onSelect(target); onEditInline(target); }
      return;
    }
    if (!["ArrowDown", "ArrowUp", "PageDown", "PageUp"].includes(e.key)) return;
    e.preventDefault();
    const visible = filtered.slice(0, displayLimit);
    if (visible.length === 0) return;
    const currentIdx = selected ? visible.findIndex(c => c.id === selected.id) : -1;
    let nextIdx;
    if (e.key === "ArrowDown") {
      nextIdx = currentIdx === -1 ? 0 : Math.min(currentIdx + 1, visible.length - 1);
    } else if (e.key === "ArrowUp") {
      if (currentIdx <= 0) return;
      nextIdx = currentIdx - 1;
    } else {
      const container = listRef.current;
      const firstRow = container?.querySelector("[data-contact-id]");
      const pageSize = (container && firstRow)
        ? Math.max(1, Math.floor(container.clientHeight / firstRow.offsetHeight))
        : 10;
      nextIdx = e.key === "PageDown"
        ? (currentIdx === -1 ? pageSize - 1 : Math.min(currentIdx + pageSize, visible.length - 1))
        : (currentIdx === -1 ? 0 : Math.max(currentIdx - pageSize, 0));
    }
    const next = visible[nextIdx];
    onSelect(next);
    requestAnimationFrame(() => {
      const el = listRef.current?.querySelector(`[data-contact-id="${next.id}"]`);
      el?.scrollIntoView({ block: "nearest" });
      listRef.current?.focus();
    });
  }

  // Shared inline checkbox box visual
  function CbBox({ checked, color }) {
    return (
      <div style={{
        width: 14, height: 14, borderRadius: 3.5, flexShrink: 0,
        border: "1.5px solid " + (checked ? color : T.border),
        background: checked ? color : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.15s",
        boxShadow: checked ? `0 0 5px ${color}44` : "none",
      }}>
        {checked && (
          <svg viewBox="0 0 10 8" width={8} height={6} fill="none">
            <polyline points="1,4 3.5,6.5 9,1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", background: T.surface, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Pool header */}
      <div style={{ padding: "10px 14px", background: col + "0D", borderBottom: "1px solid " + T.border, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: col, boxShadow: `0 0 8px ${col}66`, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: col, letterSpacing: "0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {pool === "prospect" ? "Prospect Pool" : (client?.name || "Client")}
            </div>
            <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>
              {total > contacts.length
                ? <>{filtered.length.toLocaleString()} shown · <span style={{ color: col, fontWeight: 700 }}>{total.toLocaleString()}</span> total</>
                : <>{filtered.length.toLocaleString()} leads</>
              }
              {selEnabled && (() => {
                const n = filtered.filter(c => selectedIds?.has(c.id)).length;
                return n > 0 ? <span style={{ color: col, fontWeight: 700, marginLeft: 6 }}>· {n.toLocaleString()} selected</span> : null;
              })()}
            </div>
          </div>
          {selEnabled && (() => {
            const someChecked = filtered.some(c => selectedIds?.has(c.id));
            const allChecked  = filtered.length > 0 && filtered.every(c => selectedIds?.has(c.id));
            return (
              <Checkbox
                checked={allChecked}
                indeterminate={someChecked && !allChecked}
                onChange={() => onToggleSelectAll?.(filtered.map(c => c.id))}
                color={col}
              />
            );
          })()}
        </div>
      </div>

      {/* Search + filter button */}
      <div style={{ padding: "10px 12px 8px", flexShrink: 0, position: "relative" }} ref={filterPanelRef}>
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: (isFocused || search) ? col : T.muted, pointerEvents: "none" }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Search contacts…"
              style={{
                width: "100%", background: T.card,
                border: "1px solid " + ((isFocused || search) ? col : T.border),
                borderRadius: 8, padding: "7px 26px 7px 30px", color: T.text,
                fontSize: 12, outline: "none", fontFamily: "inherit", boxSizing: "border-box",
              }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 12, padding: 0 }}>✕</button>
            )}
          </div>

          {/* Sort dropdown */}
          <select
            value={sortF}
            onChange={e => setSortF(e.target.value)}
            style={{
              flexShrink: 0, height: 34,
              background: T.card, border: "1px solid " + T.border,
              borderRadius: 8, padding: "0 6px",
              color: sortF !== "recent" ? col : T.muted,
              fontSize: 11, fontWeight: sortF !== "recent" ? 600 : 400,
              outline: "none", fontFamily: "inherit", cursor: "pointer",
              minWidth: 130,
            }}
          >
            {SORT_OPTS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          {/* Filter toggle button */}
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={toggleFilter}
            title="Filters"
            style={{
              position: "relative", flexShrink: 0,
              width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
              background: isFilterOpen || activeFilterCount > 0 ? col + "18" : T.card,
              border: "1px solid " + (isFilterOpen || activeFilterCount > 0 ? col + "60" : T.border),
              borderRadius: 8, cursor: "pointer",
              color: isFilterOpen || activeFilterCount > 0 ? col : T.muted,
              transition: "all 0.15s",
            }}
          >
            <SlidersHorizontal size={14} strokeWidth={2} />
            {activeFilterCount > 0 && (
              <span style={{
                position: "absolute", top: -5, right: -5,
                width: 15, height: 15, borderRadius: "50%",
                background: col, color: "#fff",
                fontSize: 8, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center",
                lineHeight: 1,
              }}>{activeFilterCount}</span>
            )}
          </button>
        </div>

        {/* ── Filter dropdown panel ───────────────────────────────── */}
        {isFilterOpen && (
          <div style={{
            position: "absolute", top: "calc(100% - 2px)", left: 12, right: 12, zIndex: 300,
            background: T.card, border: "1px solid " + T.border, borderRadius: 12,
            boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
            animation: "crm-fadein 0.15s ease",
            maxHeight: "calc(100vh - 180px)", overflowY: "auto",
          }}>

            {/* Sticky header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "11px 14px 10px",
              borderBottom: "1px solid " + T.border,
              position: "sticky", top: 0, background: T.card, zIndex: 1,
              borderRadius: "12px 12px 0 0",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <SlidersHorizontal size={13} style={{ color: col }} />
                <span style={{ fontSize: 12, fontWeight: 800, color: T.text }}>Filters</span>
                {activeFilterCount > 0 && (
                  <span style={{
                    fontSize: 9, fontWeight: 800,
                    background: col + "22", color: col,
                    padding: "2px 7px", borderRadius: 10,
                  }}>{activeFilterCount} active</span>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => {
                      setCheckedModes(new Set());
                      setCheckedStatuses(new Set());
                      setSortF("recent");
                      setScoreFrom(0);
                      setScoreTo(100);
                    }}
                    style={{ background: "none", border: "none", color: T.accent, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", padding: 0 }}
                  >Clear all</button>
                )}
                <button
                  onClick={closeFilter}
                  style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", padding: 3, display: "flex", borderRadius: 4, lineHeight: 1 }}
                >
                  <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            <div style={{ padding: "12px 14px 16px", display: "flex", flexDirection: "column", gap: 18 }}>

              {/* ── STAGE ── */}
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, color: T.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 7 }}>Stage</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                  {VIEW_MODE_TABS.map(({ mode, label, Icon, colorKey }) => {
                    const c = T[colorKey] || T.dim;
                    const isAll = mode === VIEW_MODE.ALL;
                    const checked = isAll ? checkedModes.size === 0 : checkedModes.has(mode);
                    return (
                      <div
                        key={mode}
                        onClick={() => {
                          if (isAll) {
                            setCheckedModes(new Set());
                          } else {
                            setCheckedModes(prev => {
                              const next = new Set(prev);
                              if (next.has(mode)) next.delete(mode); else next.add(mode);
                              return next;
                            });
                          }
                        }}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "5px 7px", borderRadius: 6, cursor: "pointer",
                          background: checked ? c + "14" : "transparent",
                          transition: "background 0.12s", userSelect: "none",
                        }}
                      >
                        <CbBox checked={checked} color={c} />
                        <Icon size={10} strokeWidth={2} style={{ color: checked ? c : T.muted, flexShrink: 0 }} />
                        <span style={{ fontSize: 10, color: checked ? T.text : T.dim, fontWeight: checked ? 700 : 400 }}>
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── STATUS ── */}
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, color: T.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 7 }}>Status</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {[
                    { value: "all",           label: "All",      color: T.dim,   dot: false },
                    { value: STATUS.ACTIVE,   label: "Active",   color: T.green, dot: true  },
                    { value: STATUS.PENDING,  label: "Pending",  color: T.amber, dot: true  },
                    { value: STATUS.CANCELED, label: "Canceled", color: T.red,   dot: true  },
                  ].map(({ value, label, color, dot }) => {
                    const isAll   = value === "all";
                    const checked = isAll ? checkedStatuses.size === 0 : checkedStatuses.has(value);
                    return (
                      <div
                        key={value}
                        onClick={() => {
                          if (isAll) {
                            setCheckedStatuses(new Set());
                          } else {
                            setCheckedStatuses(prev => {
                              const next = new Set(prev);
                              if (next.has(value)) next.delete(value); else next.add(value);
                              return next;
                            });
                          }
                        }}
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "6px 7px", borderRadius: 6, cursor: "pointer",
                          background: checked ? color + "12" : "transparent",
                          transition: "background 0.12s", userSelect: "none",
                        }}
                      >
                        <CbBox checked={checked} color={color} />
                        <span style={{ fontSize: 11, color: checked ? T.text : T.dim, fontWeight: checked ? 600 : 400, flex: 1 }}>
                          {label}
                        </span>
                        {dot && <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, opacity: checked ? 1 : 0.35, flexShrink: 0 }} />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── LEAD SCORE RANGE ── */}
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, color: T.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Lead Score</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 9, color: T.muted, marginBottom: 4, fontWeight: 600, letterSpacing: "0.05em" }}>FROM</div>
                    <input
                      type="number"
                      min={0} max={100}
                      value={scoreFrom}
                      onChange={e => {
                        const v = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                        setScoreFrom(v);
                        if (scoreTo < v) setScoreTo(v);
                      }}
                      style={{
                        width: "100%", background: T.bg,
                        border: "1px solid " + (scoreFrom > 0 ? col : T.border),
                        borderRadius: 6, padding: "6px 8px",
                        color: T.text, fontSize: 12, fontWeight: 600,
                        outline: "none", fontFamily: "inherit",
                        boxSizing: "border-box",
                        transition: "border-color 0.15s",
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = col; }}
                      onBlur={e => { e.currentTarget.style.borderColor = scoreFrom > 0 ? col : T.border; }}
                    />
                  </div>
                  <div style={{ color: T.muted, fontSize: 15, paddingBottom: 7, flexShrink: 0 }}>→</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 9, color: T.muted, marginBottom: 4, fontWeight: 600, letterSpacing: "0.05em" }}>TO</div>
                    <input
                      type="number"
                      min={0} max={100}
                      value={scoreTo}
                      onChange={e => {
                        const v = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                        setScoreTo(v);
                        if (scoreFrom > v) setScoreFrom(v);
                      }}
                      style={{
                        width: "100%", background: T.bg,
                        border: "1px solid " + (scoreTo < 100 ? col : T.border),
                        borderRadius: 6, padding: "6px 8px",
                        color: T.text, fontSize: 12, fontWeight: 600,
                        outline: "none", fontFamily: "inherit",
                        boxSizing: "border-box",
                        transition: "border-color 0.15s",
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = col; }}
                      onBlur={e => { e.currentTarget.style.borderColor = scoreTo < 100 ? col : T.border; }}
                    />
                  </div>
                </div>
                {(scoreFrom > 0 || scoreTo < 100) && (
                  <div style={{ fontSize: 10, color: col, fontWeight: 700, marginTop: 6 }}>
                    Showing score {scoreFrom} – {scoreTo}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Contact list */}
      <div ref={listRef} style={{ flex: 1, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.3 }}>{search ? "🔍" : "👥"}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.dim, marginBottom: 4 }}>
              {search ? "No results" : "No contacts"}
            </div>
            <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5 }}>
              {search
                ? `Nothing matched "${search}"`
                : viewMode !== VIEW_MODE.ALL
                  ? "No contacts in this stage group"
                  : "Add a contact to get started"}
            </div>
          </div>
        ) : (
          filtered.slice(0, displayLimit).map(c => {
            const sd = STAGE_DEF[c.lifecycleStage] || STAGE_DEF.new;
            const isSel    = selected?.id === c.id;
            const isChecked = selEnabled && selectedIds?.has(c.id);
            const displayName = contactDisplayName(c);
            return (
              <div
                key={c.id}
                data-contact-id={c.id}
                onClick={() => onSelect(c)}
                style={{
                  padding: "11px 14px", borderBottom: "1px solid " + T.border,
                  cursor: "pointer",
                  background: isChecked ? col + "0d" : isSel ? col + "14" : "transparent",
                  borderLeft: `4px solid ${isSel ? col : "transparent"}`,
                  transition: "background 0.1s",
                  display: "flex", alignItems: "flex-start", gap: 8,
                }}
              >
                {selEnabled && (
                  <div style={{ paddingTop: 2, flexShrink: 0 }}>
                    <Checkbox checked={isChecked} onChange={() => onToggleSelect?.(c.id)} color={col} />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: isSel ? col : T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: 6 }}>
                      <Hi text={displayName} q={search} />
                    </div>
                    <span style={{ fontSize: 9, color: sd.color, fontWeight: 800, background: sd.color + "15", padding: "2px 6px", borderRadius: 4, flexShrink: 0 }}>
                      {sd.label.toUpperCase()}
                    </span>
                  </div>
                  {c.company && (
                    <div style={{ fontSize: 11, color: T.dim, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <Hi text={c.company} q={search} />
                    </div>
                  )}
                  {!showingCanceled && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <div style={{ flex: 1 }}><ScoreBar score={c.leadScore} /></div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: T.text, flexShrink: 0 }}>{c.leadScore}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 6, minWidth: 0 }}>
                      {c.address && (
                        <span style={{ fontSize: 10, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130 }}>
                          📍 {c.address}
                        </span>
                      )}
                      {c.trucks > 0 && (
                        <span style={{ fontSize: 10, color: T.orange, fontWeight: 600, flexShrink: 0 }}>🚛 {c.trucks}</span>
                      )}
                    </div>
                    <span style={{ fontSize: 9, color: T.muted, flexShrink: 0 }}>{fmt.ago(c.lastActivityAt || c.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        {loadingMore && (
          <div style={{ padding: "12px 16px", textAlign: "center", fontSize: 10, color: T.muted, borderTop: "1px solid " + T.border }}>
            <span style={{
              display: "inline-block", width: 12, height: 12, borderRadius: "50%",
              border: "2px solid " + T.border, borderTopColor: col,
              animation: "crm-spin 0.65s linear infinite", verticalAlign: "middle", marginRight: 6,
            }} />
            Loading…
          </div>
        )}
      </div>
    </div>
  );
}

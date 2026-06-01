import { useState, useRef, useEffect, useCallback } from "react";
import Hi from "./ui/Hi";

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
import ScoreBar from "./ui/ScoreBar";
import { useTheme } from "../context/ThemeContext";
import { useClientById } from "../context/ClientsContext";
import { STAGE_DEF, LEAD_STAGES, CUSTOMER_STAGES, LOST_STAGES, ALL_STAGES } from "../data/stages";
import { VIEW_MODE, STATUS, STAGE_GROUPS } from "../constants/index";
import fmt from "../utils/format";

const VIEW_MODE_OPTIONS = [
  { mode: VIEW_MODE.ALL,        label: "All",        colorKey: "dim"    },
  { mode: VIEW_MODE.PROSPECTS,  label: "Prospects",  colorKey: "amber"  },
  { mode: VIEW_MODE.LEADS,      label: "Leads",      colorKey: "blue"   },
  { mode: VIEW_MODE.WARM,       label: "Warm",       colorKey: "orange" },
  { mode: VIEW_MODE.HOT,        label: "Hot",        colorKey: "red"    },
  { mode: VIEW_MODE.CUSTOMER,   label: "Customer",   colorKey: "green"  },
  { mode: VIEW_MODE.BACKBURNER, label: "Backburner", colorKey: "purple" },
  { mode: VIEW_MODE.LOST,       label: "Lost",       colorKey: "muted"  },
  { mode: VIEW_MODE.CANCELED,   label: "Canceled",   colorKey: "red"    },
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
}) {
  const T = useTheme();
  const [stageF, setStageF] = useState("all");
  const [statusF, setStatusF] = useState("all");
  const [sortF, setSortF] = useState("recent");
  const [limitF, setLimitF] = useState(0); // 0 = no cap; >0 = hard cap
  const [showCustom, setShowCustom] = useState(false);
  const [customVal, setCustomVal] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(150);
  const listRef = useRef(null);
  const filteredLenRef = useRef(0);

  const client = useClientById(clientId);
  const col = pool === "prospect" ? T.accent : (client?.color || T.accent);
  const showingCanceled = viewMode === VIEW_MODE.CANCELED;
  const selEnabled = !!onToggleSelect && !showingCanceled;

  // Apply a hard display-cap and auto-check those contacts
  function applyLimit(n) {
    setLimitF(n);
    if (n > 0 && selEnabled && onSelectBulk) {
      onSelectBulk(filtered.slice(0, n).map(c => c.id));
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => { searchRef?.current?.focus(); }, 150);
    return () => clearTimeout(timer);
  }, [searchRef]);

  // Reset filters when viewMode changes
  useEffect(() => { setStageF("all"); setStatusF("all"); }, [viewMode]);

  // Reset scroll-based display limit when any filter/sort/limit changes
  useEffect(() => { setDisplayLimit(limitF || 150); }, [viewMode, stageF, statusF, search, sortF, limitF]);

  // Keep a ref for limitF so the scroll closure always reads the latest value
  const limitFRef = useRef(0);
  limitFRef.current = limitF;

  // Infinite scroll — disabled when a hard cap (limitF) is active
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    function onScroll() {
      if (limitFRef.current > 0) return; // hard cap set — don't grow
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 300) {
        setDisplayLimit(prev => {
          const next = prev + 150;
          return next > filteredLenRef.current ? filteredLenRef.current : next;
        });
      }
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []); // eslint-disable-line — intentional: attach once, refs keep values fresh

  const stageOpts = STAGE_GROUPS[viewMode] || ALL_STAGES;
  const viewModeStages = STAGE_GROUPS[viewMode]; // undefined = ALL, [] = backburner

  const filtered = contacts
    .filter(c => {
      // Filter by viewMode's stage group
      if (viewModeStages !== undefined && viewModeStages.length > 0) {
        if (!viewModeStages.includes(c.lifecycleStage)) return false;
      }
      if (stageF !== "all" && c.lifecycleStage !== stageF) return false;
      if (statusF !== "all") {
        const s = c.status || (c.isCanceled ? STATUS.CANCELED : STATUS.ACTIVE);
        if (s !== statusF) return false;
      }
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const name = contactDisplayName(c).toLowerCase();
      return (
        name.includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.company || "").toLowerCase().includes(q) ||
        (c.address || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortF === "name") return contactDisplayName(a).localeCompare(contactDisplayName(b));
      if (sortF === "score") return b.leadScore - a.leadScore;
      return new Date(b.lastActivityAt || b.createdAt) - new Date(a.lastActivityAt || a.createdAt);
    });

  // Keep ref in sync so infinite-scroll handler reads current length
  filteredLenRef.current = filtered.length;

  // Live-select first result as the user types so center panel stays in sync
  useEffect(() => {
    if (!search.trim() || filtered.length === 0) return;
    if (filtered[0].id !== selected?.id) onSelect(filtered[0]);
  }, [search]); // eslint-disable-line — intentionally only re-run when search changes

  function handleSearchKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      // Use the currently selected contact if it's in the filtered list (user may have
      // navigated with arrow keys), otherwise fall back to the first filtered result.
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

  const selStyle = {
    background: T.bg, border: "1px solid " + T.border, borderRadius: 6,
    padding: "4px 7px", color: T.dim, fontSize: 10, outline: "none", cursor: "pointer",
    fontFamily: "inherit",
  };

  return (
    <div style={{
      width: "100%", height: "100%",
      background: T.surface,
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Pool header */}
      <div style={{
        padding: "12px 14px", background: col + "0D", borderBottom: "1px solid " + T.border,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 9, height: 9, borderRadius: "50%", background: col, boxShadow: `0 0 8px ${col}66`, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: col, letterSpacing: "0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {pool === "prospect" ? "Prospect Pool" : (client?.name || "Client")}
            </div>
            <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>
              {limitF > 0 && filtered.length > limitF
                ? <><span style={{ color: col, fontWeight: 700 }}>{Math.min(limitF, filtered.length).toLocaleString()}</span> of {filtered.length.toLocaleString()} leads</>
                : <>{filtered.length.toLocaleString()} leads</>
              }
              {selEnabled && (() => {
                const totalSelected = filtered.filter(c => selectedIds?.has(c.id)).length;
                return totalSelected > 0
                  ? <span style={{ color: col, fontWeight: 700, marginLeft: 6 }}>· {totalSelected.toLocaleString()} selected</span>
                  : null;
              })()}
            </div>
          </div>
          {selEnabled && (() => {
            const someChecked = filtered.some(c => selectedIds?.has(c.id));
            const allChecked = filtered.length > 0 && filtered.every(c => selectedIds?.has(c.id));
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

      {/* Search */}
      <div style={{ padding: "10px 12px 6px", flexShrink: 0 }}>
        <div style={{ position: "relative", marginBottom: 8 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{
              position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
              width: 14, height: 14, color: (isFocused || search) ? col : T.muted, pointerEvents: "none",
            }}>
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
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
              borderRadius: 8, padding: "7px 28px 7px 32px", color: T.text,
              fontSize: 12, outline: "none", fontFamily: "inherit", boxSizing: "border-box",
            }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", color: T.muted, cursor: "pointer",
              fontSize: 12, padding: 0, lineHeight: 1,
            }}>✕</button>
          )}
        </div>

        {/* Filters row */}
        <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
          <select value={sortF} onChange={e => setSortF(e.target.value)} style={selStyle}>
            <option value="recent">Recent</option>
            <option value="score">Score (High → Low)</option>
            <option value="firstName">First Name (A–Z)</option>
            <option value="lastName">Last Name (A–Z)</option>
            <option value="name">Name (A–Z)</option>
          </select>

          <select value={stageF} onChange={e => setStageF(e.target.value)} style={selStyle}>
            <option value="all">All Stages</option>
            {stageOpts.map(s => <option key={s} value={s}>{STAGE_DEF[s]?.label}</option>)}
          </select>

          <select value={statusF} onChange={e => setStatusF(e.target.value)} style={selStyle}>
            <option value="all">All Status</option>
            <option value={STATUS.ACTIVE}>Active</option>
            <option value={STATUS.PENDING}>Pending</option>
            <option value={STATUS.CANCELED}>Canceled</option>
          </select>

          {/* Limit picker: preset dropdown + optional custom input */}
          <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
            <select
              value={showCustom ? "custom" : limitF}
              onChange={e => {
                const val = e.target.value;
                if (val === "custom") {
                  setShowCustom(true);
                  setLimitF(0);
                  setCustomVal("");
                } else {
                  setShowCustom(false);
                  setCustomVal("");
                  applyLimit(parseInt(val, 10));
                }
              }}
              style={{
                ...selStyle,
                color: (limitF > 0 || showCustom) ? col : T.dim,
                borderColor: (limitF > 0 || showCustom) ? col + "70" : T.border,
              }}
              title="Limit contacts shown and auto-select them"
            >
              <option value={0}>All</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={500}>500</option>
              <option value={1000}>1k</option>
              <option value="custom">Custom…</option>
            </select>

            {showCustom && (
              <input
                type="number"
                min={1}
                value={customVal}
                onChange={e => setCustomVal(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    const n = parseInt(customVal, 10);
                    if (n > 0) applyLimit(n);
                  }
                  if (e.key === "Escape") {
                    setShowCustom(false);
                    setCustomVal("");
                    applyLimit(0);
                  }
                }}
                onBlur={() => {
                  const n = parseInt(customVal, 10);
                  if (n > 0) applyLimit(n);
                }}
                placeholder="e.g. 750"
                autoFocus
                style={{
                  width: 64, padding: "4px 6px",
                  background: T.bg, border: "1px solid " + col + "70",
                  borderRadius: 6, color: col, fontSize: 10,
                  outline: "none", fontFamily: "inherit",
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Contact list */}
      <div ref={listRef} style={{ flex: 1, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.3 }}>
              {search ? "🔍" : "👥"}
            </div>
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
            const isSel = selected?.id === c.id;
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
                    <Checkbox
                      checked={isChecked}
                      onChange={() => onToggleSelect?.(c.id)}
                      color={col}
                    />
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
                    <div style={{ flex: 1 }}>
                      <ScoreBar score={c.leadScore} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: T.text, flexShrink: 0 }}>
                      {c.leadScore}
                    </span>
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
                      <span style={{ fontSize: 10, color: T.orange, fontWeight: 600, flexShrink: 0 }}>
                        🚛 {c.trucks}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 9, color: T.muted, flexShrink: 0 }}>
                    {fmt.ago(c.lastActivityAt || c.createdAt)}
                  </span>
                </div>
                </div>
              </div>
            );
          })
        )}
        {filtered.length > 0 && displayLimit < filtered.length && (
          <div style={{ padding: "14px 16px", textAlign: "center", fontSize: 10, borderTop: "1px solid " + T.border, color: limitF > 0 ? col : T.muted }}>
            {limitF > 0
              ? <>Showing first {displayLimit.toLocaleString()} of {filtered.length.toLocaleString()} — change limit to see more</>
              : <>Showing {displayLimit.toLocaleString()} of {filtered.length.toLocaleString()} — scroll to load more</>
            }
          </div>
        )}
      </div>
    </div>
  );
}

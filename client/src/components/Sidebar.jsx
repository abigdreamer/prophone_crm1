import { useState, useRef, useEffect } from "react";
import { List, UserPlus, Users, Flame, Zap, Star, Clock, AlertTriangle, XCircle, SlidersHorizontal, ChevronDown, Cog } from "lucide-react";
import Hi from "./ui/Hi";
import ScoreBar from "./ui/ScoreBar";
import { useTheme } from "../context/ThemeContext";
import { useClientById } from "../context/ClientsContext";
import { useUdfs } from "../context/UdfContext";
import { STAGE_DEF } from "../data/stages";
import { VIEW_MODE, STATUS, STAGE_GROUPS } from "../constants/index";
import fmt from "../utils/format";
import { getCustomSorts, getCustomFilterOpts, getSettings, saveSettings, updateCustomSort, updateCustomFilterOpt, updateUdf } from "../services/api";
import { resolveDisplayName, DEFAULT_DISPLAY_RULES } from "../utils/resolveDisplayName";

const STATIC_CARD_FIELDS = [
  { key: "company",    label: "Company"      },
  { key: "full_name",  label: "Full Name"    },
  { key: "email",      label: "Email"        },
  { key: "phone",      label: "Phone"        },
  { key: "lead_score", label: "Lead Score"   },
  { key: "address",    label: "Address"      },
  { key: "city_state", label: "City / State" },
  { key: "trucks",     label: "Fleet Size"   },
];

const CARD_PREVIEW = {
  company:    "ABC Towing Co.",
  full_name:  "John Doe",
  email:      "john@abctowing.com",
  phone:      "(555) 123-4567",
  address:    "123 Main St",
  city_state: "Houston, TX",
  trucks:     "🚛 8 trucks",
};

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


function UdfFilterControl({ udf, value, onChange, T, col }) {
  const inputStyle = {
    width: "100%", background: T.bg, border: "1px solid " + T.border,
    borderRadius: 6, padding: "5px 8px", color: T.text, fontSize: 11,
    outline: "none", fontFamily: "inherit", boxSizing: "border-box",
  };
  if (udf.type === "DROPDOWN") {
    const opts = Array.isArray(udf.options) ? udf.options : [];
    return (
      <select value={value || ""} onChange={e => onChange(e.target.value)}
        style={{ ...inputStyle, cursor: "pointer" }}>
        <option value="">Any</option>
        {opts.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
      </select>
    );
  }
  if (udf.type === "CHECKBOX") {
    const opts = Array.isArray(udf.options) ? udf.options : [];
    const selected = Array.isArray(value) ? value : [];
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {opts.map(o => {
          const v = o.value ?? o; const l = o.label ?? o;
          const checked = selected.includes(v);
          return (
            <div key={v} onClick={() => onChange(checked ? selected.filter(x => x !== v) : [...selected, v])}
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 7px", borderRadius: 5,
                background: checked ? col + "20" : T.bg, border: "1px solid " + (checked ? col + "60" : T.border),
                cursor: "pointer", fontSize: 10, color: checked ? T.text : T.muted, userSelect: "none" }}>
              {l}
            </div>
          );
        })}
      </div>
    );
  }
  if (udf.type === "NUMBER") {
    const v = value || {};
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input type="number" placeholder="Min" value={v.min ?? ""} onChange={e => onChange({ ...v, min: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
        <span style={{ color: T.muted, fontSize: 13 }}>–</span>
        <input type="number" placeholder="Max" value={v.max ?? ""} onChange={e => onChange({ ...v, max: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
      </div>
    );
  }
  if (udf.type === "DATE") {
    const v = value || {};
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input type="date" value={v.from ?? ""} onChange={e => onChange({ ...v, from: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
        <span style={{ color: T.muted, fontSize: 13 }}>–</span>
        <input type="date" value={v.to ?? ""} onChange={e => onChange({ ...v, to: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
      </div>
    );
  }
  // TEXT (default)
  return <input type="text" placeholder={`Filter by ${udf.label}…`} value={value || ""} onChange={e => onChange(e.target.value)} style={inputStyle} />;
}

function ContactFieldRow({ fieldKey, contact: c, udfs, search, T }) {
  if (fieldKey === "lead_score") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <div style={{ flex: 1 }}><ScoreBar score={c.leadScore} /></div>
        <span style={{ fontSize: 10, fontWeight: 700, color: T.text, flexShrink: 0, minWidth: 16, textAlign: "right" }}>{c.leadScore ?? 0}</span>
      </div>
    );
  }
  if (fieldKey === "trucks") {
    if (!c.trucks || c.trucks <= 0) return null;
    return <span style={{ fontSize: 10, color: T.orange, fontWeight: 600 }}>🚛 {c.trucks}</span>;
  }
  if (fieldKey === "full_name") {
    const name = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
    if (!name) return null;
    return <div style={{ fontSize: 11, color: T.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><Hi text={name} q={search} /></div>;
  }
  if (fieldKey === "city_state") {
    const val = [c.city, c.state].filter(Boolean).join(", ");
    if (!val) return null;
    return <div style={{ fontSize: 11, color: T.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{val}</div>;
  }
  if (fieldKey === "address") {
    if (!c.address) return null;
    return <div style={{ fontSize: 11, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📍 {c.address}</div>;
  }
  // UDF field
  if (fieldKey.startsWith("udf_")) {
    const udf = udfs.find(u => u.sortKey === fieldKey);
    const val = c.udfValues?.[fieldKey];
    if (!val) return null;
    const displayVal = Array.isArray(val) ? val.join(", ") : String(val);
    return <div style={{ fontSize: 11, color: T.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{udf?.label ? `${udf.label}: ` : ""}{displayVal}</div>;
  }
  // Standard string fields: email, phone, company, etc.
  const val = c[fieldKey];
  if (!val) return null;
  return <div style={{ fontSize: 11, color: T.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><Hi text={String(val)} q={search} /></div>;
}

function SkeletonRow({ T }) {
  const s = {
    borderRadius: 4,
    background: `linear-gradient(90deg, ${T.border}, ${T.surface}, ${T.border})`,
    backgroundSize: "400px 100%",
    animation: "crm-shimmer 1.4s ease infinite",
  };
  return (
    <div style={{ padding: "11px 12px", borderBottom: "1px solid " + T.border, display: "flex", flexDirection: "column", gap: 7 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ ...s, height: 11, width: "55%" }} />
        <div style={{ ...s, height: 11, width: "18%", borderRadius: 6 }} />
      </div>
      <div style={{ ...s, height: 9, width: "38%" }} />
      <div style={{ ...s, height: 5, width: "100%", borderRadius: 3 }} />
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ ...s, height: 8, width: "42%" }} />
        <div style={{ ...s, height: 8, width: "14%" }} />
      </div>
    </div>
  );
}

// Kept as thin wrapper — actual logic is in resolveDisplayName util
function contactDisplayName(c, rules, udfs) {
  return resolveDisplayName(c, rules, udfs);
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
  const { udfs, setUdfs } = useUdfs();

  const [checkedModes,    setCheckedModes]    = useState(new Set());
  const [checkedStatuses, setCheckedStatuses] = useState(new Set());
  const [sortF,           setSortF]           = useState("company_az");
  const [scoreFrom,       setScoreFrom]       = useState(0);
  const [scoreTo,         setScoreTo]         = useState(100);
  const [localFilterOpen, setLocalFilterOpen] = useState(false);
  const [udfFilters,      setUdfFilters]      = useState({});
  const [customSortOpts,  setCustomSortOpts]  = useState([]);
  const [customFilterDefs,setCustomFilterDefs]= useState([]);
  const [customFilters,   setCustomFilters]   = useState({});
  const [displayFields,       setDisplayFields]       = useState(["company", "lead_score", "address"]);
  const [displayNameRules,    setDisplayNameRules]    = useState(DEFAULT_DISPLAY_RULES);
  const [showSortDropdown,    setShowSortDropdown]    = useState(false);
  const [showSortGear,        setShowSortGear]        = useState(false);
  const [sortDragOverIdx,     setSortDragOverIdx]     = useState(null);
  const [showFilterGear,      setShowFilterGear]      = useState(false);
  const [filterGearDragOverIdx, setFilterGearDragOverIdx] = useState(null);
  const [showCardGear,        setShowCardGear]        = useState(false);
  const [showSearchGear,      setShowSearchGear]      = useState(false);
  const [searchMethods,       setSearchMethods]       = useState({ firstName: true, lastName: true, company: true, email: true, phone: true, city: true, state: true, address: true, udfs: true });
  const sortDropdownRef        = useRef(null);
  const sortGearContainerRef   = useRef(null);
  const sortDragIdx            = useRef(null);
  const filterGearContainerRef = useRef(null);
  const filterGearDragIdx      = useRef(null);
  const cardGearContainerRef      = useRef(null);
  const displayNameDragIdx        = useRef(null);
  const [displayNameDragOver, setDisplayNameDragOver] = useState(null);
  const displayFieldsLoadedRef = useRef(false);
  const searchGearRef          = useRef(null);
  const searchMethodsLoadedRef = useRef(false);

  const isFilterOpen = filterOpenProp !== undefined ? filterOpenProp : localFilterOpen;
  function toggleFilter() {
    setShowSortDropdown(false);
    setShowFilterGear(false);
    setShowSearchGear(false);
    if (onFilterToggle) onFilterToggle();
    else setLocalFilterOpen(v => !v);
  }
  function closeFilter() {
    if (onFilterToggle && isFilterOpen) onFilterToggle();
    else setLocalFilterOpen(false);
  }

  const [isFocused,    setIsFocused]    = useState(false);
  const [displayLimit, setDisplayLimit] = useState(150);
  const listRef = useRef(null);
  const filteredLenRef = useRef(0);

  const client = useClientById(clientId);
  const col = pool === "prospect" ? T.accent : (client?.color || T.accent);
  const showingCanceled = viewMode === VIEW_MODE.CANCELED;
  const selEnabled = !!onToggleSelect && !showingCanceled;

  function isActiveFilterValue(v) {
    if (v == null || v === "") return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "object") return Object.values(v).some(x => x !== "" && x != null);
    return true;
  }

  const activeUdfFilterCount    = Object.values(udfFilters).filter(isActiveFilterValue).length;
  const activeCustomFilterCount = Object.values(customFilters).filter(isActiveFilterValue).length;

  const activeFilterCount = [
    checkedModes.size > 0,
    checkedStatuses.size > 0,
    scoreFrom > 0 || scoreTo < 100,
    activeUdfFilterCount > 0,
    activeCustomFilterCount > 0,
  ].filter(Boolean).length;

  // Sort options come entirely from DB (built-in + custom, all per-client)
  const activeUdfs    = udfs.filter(u => u.isActive);
  const allCardFields = [
    ...STATIC_CARD_FIELDS,
    ...udfs.map(u => ({ key: u.sortKey, label: u.label })),
  ];
  const sortOpts = [
    ...customSortOpts.filter(o => o.isActive).map(o => ({ value: o.sortValue, label: o.label })),
    ...activeUdfs.flatMap(u => [
      { value: `${u.sortKey}_az`, label: `${u.label} A → Z` },
      { value: `${u.sortKey}_za`, label: `${u.label} Z → A` },
    ]),
  ];

  useEffect(() => {
    const timer = setTimeout(() => { searchRef?.current?.focus(); }, 150);
    return () => clearTimeout(timer);
  }, [searchRef]);

  useEffect(() => {
    displayFieldsLoadedRef.current = false;
    setCustomSortOpts([]);
    setCustomFilterDefs([]);
    getCustomSorts().then(r => setCustomSortOpts(r.data || [])).catch(() => {});
    getCustomFilterOpts().then(r => setCustomFilterDefs(r.data || [])).catch(() => {});
    getSettings(clientId || null, "sidebar_card_display")
      .then(res => { if (res?.config?.fields?.length > 0) setDisplayFields(res.config.fields); })
      .catch(() => {})
      .finally(() => { displayFieldsLoadedRef.current = true; });
    getSettings(clientId || null, "display_name_rules")
      .then(res => { if (Array.isArray(res?.config?.rules)) setDisplayNameRules(res.config.rules); })
      .catch(() => {});
    searchMethodsLoadedRef.current = false;
    getSettings(clientId || null, "search_methods")
      .then(res => { if (res?.config) setSearchMethods(prev => ({ ...prev, ...res.config })); })
      .catch(() => {})
      .finally(() => { searchMethodsLoadedRef.current = true; });
  }, [pool, clientId]); // eslint-disable-line

  const BUILTIN_SORT_VALUES = new Set([
    'company_az', 'company_za', 'name_az', 'name_za',
    'score_desc', 'score_asc', 'recent', 'old',
    'lastname_az', 'lastname_za', 'firstname_az', 'firstname_za',
    'city_az', 'city_za',
  ]);

  useEffect(() => {
    // Only auto-switch if the current sort isn't a built-in AND isn't in the custom list
    if (sortOpts.length > 0 && !sortOpts.find(o => o.value === sortF) && !BUILTIN_SORT_VALUES.has(sortF)) {
      setSortF(sortOpts[0].value);
    }
  }, [sortOpts]); // eslint-disable-line

  // Close sort dropdown on outside click
  useEffect(() => {
    if (!showSortDropdown) return;
    function handler(e) {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target)) setShowSortDropdown(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSortDropdown]);

  // Close sort gear popover on outside click or Escape
  useEffect(() => {
    if (!showSortGear) return;
    function handleClick(e) {
      if (sortGearContainerRef.current && !sortGearContainerRef.current.contains(e.target))
        setShowSortGear(false);
    }
    function handleKey(e) { if (e.key === "Escape") setShowSortGear(false); }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown",   handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown",   handleKey);
    };
  }, [showSortGear]);

  // Drag-reorder sort options inside the gear popover
  function onSortDragStart(idx)      { sortDragIdx.current = idx; }
  function onSortDragOver(e, idx)    { e.preventDefault(); setSortDragOverIdx(idx); }
  function onSortDragLeave()         { setSortDragOverIdx(null); }
  async function onSortDrop(e, idx) {
    e.preventDefault(); setSortDragOverIdx(null);
    const from = sortDragIdx.current; sortDragIdx.current = null;
    if (from == null || from === idx) return;
    const next = [...customSortOpts];
    const [moved] = next.splice(from, 1);
    next.splice(idx, 0, moved);
    setCustomSortOpts(next);
    try { await Promise.all(next.map((o, i) => updateCustomSort(o.id, { displayOrder: i }))); }
    catch { /* silent */ }
  }

  async function handleSortToggle(opt) {
    const optimistic = { ...opt, isActive: !opt.isActive };
    setCustomSortOpts(prev => prev.map(o => o.id === opt.id ? optimistic : o));
    try { await updateCustomSort(opt.id, { isActive: !opt.isActive }); }
    catch { setCustomSortOpts(prev => prev.map(o => o.id === opt.id ? opt : o)); }
  }

  // Close filter gear popover on outside click or Escape
  useEffect(() => {
    if (!showFilterGear) return;
    function handleClick(e) {
      if (filterGearContainerRef.current && !filterGearContainerRef.current.contains(e.target))
        setShowFilterGear(false);
    }
    function handleKey(e) { if (e.key === "Escape") setShowFilterGear(false); }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown",   handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown",   handleKey);
    };
  }, [showFilterGear]);

  function onFilterGearDragStart(idx)   { filterGearDragIdx.current = idx; }
  function onFilterGearDragOver(e, idx) { e.preventDefault(); setFilterGearDragOverIdx(idx); }
  function onFilterGearDragLeave()      { setFilterGearDragOverIdx(null); }
  async function onFilterGearDrop(e, idx) {
    e.preventDefault(); setFilterGearDragOverIdx(null);
    const from = filterGearDragIdx.current; filterGearDragIdx.current = null;
    if (from == null || from === idx) return;
    const next = [...customFilterDefs];
    const [moved] = next.splice(from, 1);
    next.splice(idx, 0, moved);
    setCustomFilterDefs(next);
    try { await Promise.all(next.map((o, i) => updateCustomFilterOpt(o.id, { displayOrder: i }))); }
    catch { /* silent */ }
  }

  async function handleFilterToggle(opt) {
    const optimistic = { ...opt, isActive: !opt.isActive };
    setCustomFilterDefs(prev => prev.map(o => o.id === opt.id ? optimistic : o));
    try { await updateCustomFilterOpt(opt.id, { isActive: !opt.isActive }); }
    catch { setCustomFilterDefs(prev => prev.map(o => o.id === opt.id ? opt : o)); }
  }

  async function handleUdfActiveToggle(udf) {
    const optimistic = { ...udf, isActive: !udf.isActive };
    setUdfs(prev => prev.map(u => u.id === udf.id ? optimistic : u));
    try { await updateUdf(udf.id, { isActive: !udf.isActive }); }
    catch { setUdfs(prev => prev.map(u => u.id === udf.id ? udf : u)); }
  }

  // Close card gear popover on outside click or Escape
  useEffect(() => {
    if (!showCardGear) return;
    function handleClick(e) {
      if (cardGearContainerRef.current && !cardGearContainerRef.current.contains(e.target))
        setShowCardGear(false);
    }
    function handleKey(e) { if (e.key === "Escape") setShowCardGear(false); }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown",   handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown",   handleKey);
    };
  }, [showCardGear]);

  // Close search gear popover on outside click or Escape
  useEffect(() => {
    if (!showSearchGear) return;
    function handleClick(e) {
      if (searchGearRef.current && !searchGearRef.current.contains(e.target))
        setShowSearchGear(false);
    }
    function handleKey(e) { if (e.key === "Escape") setShowSearchGear(false); }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown",   handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown",   handleKey);
    };
  }, [showSearchGear]);

  // Auto-save displayFields whenever they change (after initial load)
  useEffect(() => {
    if (!displayFieldsLoadedRef.current) return;
    const timer = setTimeout(() => {
      saveSettings(clientId || null, "sidebar_card_display", { fields: displayFields }).catch(() => {});
    }, 400);
    return () => clearTimeout(timer);
  }, [displayFields]); // eslint-disable-line

  // Auto-save searchMethods whenever they change
  useEffect(() => {
    if (!searchMethodsLoadedRef.current) return;
    const timer = setTimeout(() => {
      saveSettings(clientId || null, "search_methods", searchMethods).catch(() => {});
    }, 400);
    return () => clearTimeout(timer);
  }, [searchMethods]); // eslint-disable-line

  function toggleCardField(key) {
    setDisplayFields(prev => {
      if (prev.includes(key)) {
        const next = prev.filter(k => k !== key);
        return next.length === 0 ? prev : next;
      }
      if (prev.length >= 5) return prev;
      return [...prev, key];
    });
  }

  useEffect(() => {
    setCheckedModes(new Set());
    setCheckedStatuses(new Set());
    setScoreFrom(0);
    setScoreTo(100);
    setUdfFilters({});
    setCustomFilters({});
    setDisplayLimit(150);
  }, [viewMode]);

  // Reset scroll-based display limit when any filter/sort/limit changes
  useEffect(() => { setDisplayLimit(limitF || 150); }, [viewMode, stageF, statusF, search, sortF, limitF]);

  // Push filter changes to the server via parent callback
  useEffect(() => {
    if (!onFiltersChange) return;
    const viewModeStages = STAGE_GROUPS[viewMode];
    const stages = checkedModes.size > 0
      ? [...checkedModes].flatMap(m => STAGE_GROUPS[m] || [])
      : (viewModeStages?.length > 0 ? viewModeStages : []);
    onFiltersChange({ stages, sortBy: sortF, scoreMin: scoreFrom, scoreMax: scoreTo, udfFilters, customFilters, searchMethods });
  }, [viewMode, checkedModes, sortF, scoreFrom, scoreTo, udfFilters, customFilters, searchMethods]); // eslint-disable-line

  useEffect(() => {
    if (!isFilterOpen) return;
    function handler(e) {
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target)) closeFilter();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isFilterOpen]); // eslint-disable-line

  hasMoreRef.current     = hasMore     ?? false;
  loadMoreRef.current    = loadMore    ?? null;
  loadingMoreRef.current = loadingMore ?? false;

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

  // Search, stages, sort, and score are all handled server-side.
  // Status filter stays client-side (server only supports a single status value).
  const filtered = contacts
    .filter(c => {
      // Filter by viewMode's stage group
      if (viewModeStages !== undefined && viewModeStages.length > 0) {
        if (!viewModeStages.includes(c.lifecycleStage)) return false;
      }
      return true;
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

      {/* ── Search + Filter ──────────────────────────────────────────────────── */}
      <div style={{ padding: "10px 10px 8px", flexShrink: 0, position: "relative" }} ref={filterPanelRef}>
        {/* Row 1: search input full width */}
        <div style={{ position: "relative", marginBottom: 6 }} ref={searchGearRef}>
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
              borderRadius: 7, padding: "7px 50px 7px 28px", color: T.text,
              fontSize: 12, outline: "none", fontFamily: "inherit", boxSizing: "border-box",
            }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ position: "absolute", right: 30, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 12, padding: 0 }}>✕</button>
          )}
          <button
            onClick={() => { setShowSortDropdown(false); setShowSortGear(false); setShowFilterGear(false); setShowCardGear(false); setShowSearchGear(v => !v); }}
            title="Search settings"
            style={{
              position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)",
              background: showSearchGear ? col + "18" : "none", border: "none",
              color: showSearchGear ? col : T.muted, cursor: "pointer", padding: 2, borderRadius: 4,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Cog size={11} strokeWidth={1.8} />
          </button>
          {showSearchGear && (
            <div style={{
              position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 600,
              background: T.card, border: "1px solid " + T.border, borderRadius: 10,
              boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
              padding: "6px 0",
              animation: "crm-fadein 0.12s ease",
            }}>
              <div style={{ padding: "6px 10px 5px", borderBottom: "1px solid " + T.border + "66" }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Search Fields</span>
              </div>
              {[
                { key: "firstName", label: "First Name"    },
                { key: "lastName",  label: "Last Name"     },
                { key: "company",   label: "Company"       },
                { key: "email",     label: "Email"         },
                { key: "phone",     label: "Phone"         },
                { key: "city",      label: "City"          },
                { key: "state",     label: "State"         },
                { key: "address",   label: "Address"       },
                { key: "udfs",      label: "Custom Fields" },
              ].map(({ key, label }) => {
                const isOn = searchMethods[key] !== false;
                return (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px" }}>
                    <span style={{ flex: 1, fontSize: 11, fontWeight: 500, color: T.text }}>{label}</span>
                    <div
                      onClick={() => setSearchMethods(prev => ({ ...prev, [key]: !isOn }))}
                      style={{
                        flexShrink: 0, width: 28, height: 15, borderRadius: 8, cursor: "pointer",
                        background: isOn ? col : T.border,
                        position: "relative", transition: "background 0.2s",
                      }}
                    >
                      <div style={{
                        position: "absolute", top: 2,
                        left: isOn ? 13 : 2,
                        width: 11, height: 11, borderRadius: "50%",
                        background: "#fff", transition: "left 0.2s",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.35)",
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Row 2: sort + filter button */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {/* Sort dropdown with ⚙ gear inside */}
          <div style={{ position: "relative", flex: 1, minWidth: 0 }} ref={sortGearContainerRef}>
            <div style={{ position: "relative" }} ref={sortDropdownRef}>
              {/* Combined sort + gear visual button */}
              <div style={{
                display: "flex", alignItems: "center", height: 30,
                background: T.card,
                border: "1px solid " + ((showSortDropdown || showSortGear) ? col : T.border),
                borderRadius: 7, overflow: "hidden",
                transition: "border-color 0.15s",
              }}>
                {/* Sort label + chevron */}
                <button
                  onClick={() => { closeFilter(); setShowSortGear(false); setShowSortDropdown(v => !v); }}
                  style={{
                    flex: 1, height: "100%", minWidth: 0,
                    display: "flex", alignItems: "center", gap: 4,
                    background: "transparent", border: "none",
                    padding: "0 6px 0 8px",
                    color: T.text, fontSize: 11, fontWeight: 500,
                    outline: "none", fontFamily: "inherit", cursor: "pointer",
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, textAlign: "left" }}>
                    {sortOpts.find(o => o.value === sortF)?.label || "Sort…"}
                  </span>
                  <ChevronDown size={11} style={{ flexShrink: 0, color: T.muted, transform: showSortDropdown ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                </button>
                {/* Divider */}
                <div style={{ width: 1, height: 16, background: T.border, flexShrink: 0 }} />
                {/* ⚙ gear trigger */}
                <button
                  onClick={() => { setShowSortDropdown(false); setShowSearchGear(false); setShowSortGear(v => !v); }}
                  title="Configure sort options"
                  style={{
                    flexShrink: 0, width: 28, height: "100%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: showSortGear ? col + "18" : "transparent",
                    border: "none", outline: "none",
                    color: showSortGear ? col : T.muted,
                    cursor: "pointer", padding: 0,
                    transition: "background 0.15s, color 0.15s",
                  }}
                >
                  <Cog size={12} strokeWidth={1.8} />
                </button>
              </div>

              {/* Sort dropdown panel */}
              {showSortDropdown && sortOpts.length > 0 && (
                <div style={{
                  position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 500,
                  background: T.card, border: "1px solid " + T.border, borderRadius: 10,
                  boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
                  maxHeight: 320, overflowY: "auto",
                  animation: "crm-fadein 0.12s ease",
                }}>
                  {sortOpts.map(({ value, label }) => {
                    const isSel = sortF === value;
                    return (
                      <div
                        key={value}
                        onClick={() => { setSortF(value); setShowSortDropdown(false); }}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "9px 12px", cursor: "pointer",
                          background: isSel ? col + "18" : "transparent",
                          color: isSel ? col : T.text,
                          fontSize: 12, fontWeight: isSel ? 700 : 400,
                          transition: "background 0.1s",
                        }}
                        onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = T.surface; }}
                        onMouseLeave={e => { e.currentTarget.style.background = isSel ? col + "18" : "transparent"; }}
                      >
                        <span>{label}</span>
                        {isSel && (
                          <svg viewBox="0 0 10 8" width={10} height={8} fill="none">
                            <polyline points="1,4 3.5,6.5 9,1" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sort gear popover */}
            {showSortGear && (
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 600,
                background: T.card, border: "1px solid " + T.border, borderRadius: 10,
                boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
                padding: "6px 0",
                animation: "crm-fadein 0.12s ease",
              }}>
                {customSortOpts.length === 0 && udfs.length === 0 && (
                  <div style={{ padding: "10px 12px", fontSize: 11, color: T.muted, textAlign: "center" }}>No sort options</div>
                )}
                {customSortOpts.map((opt, idx) => (
                  <div
                    key={opt.id}
                    draggable
                    onDragStart={() => onSortDragStart(idx)}
                    onDragOver={e => onSortDragOver(e, idx)}
                    onDragLeave={onSortDragLeave}
                    onDrop={e => onSortDrop(e, idx)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "7px 10px", cursor: "grab",
                      background: sortDragOverIdx === idx ? col + "12" : "transparent",
                      borderBottom: idx < customSortOpts.length - 1 ? "1px solid " + T.border + "44" : "none",
                      transition: "background 0.1s",
                    }}
                  >
                    <span style={{ color: T.muted, fontSize: 14, flexShrink: 0, userSelect: "none", opacity: 0.6 }}>⠿</span>
                    <span style={{ flex: 1, fontSize: 11, fontWeight: 500, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {opt.label}
                    </span>
                    <div
                      onClick={e => { e.stopPropagation(); handleSortToggle(opt); }}
                      title={opt.isActive ? "Hide from dropdown" : "Show in dropdown"}
                      style={{
                        flexShrink: 0, width: 28, height: 15, borderRadius: 8, cursor: "pointer",
                        background: opt.isActive ? col : T.border,
                        position: "relative", transition: "background 0.2s",
                      }}
                    >
                      <div style={{
                        position: "absolute", top: 2,
                        left: opt.isActive ? 13 : 2,
                        width: 11, height: 11, borderRadius: "50%",
                        background: "#fff", transition: "left 0.2s",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.35)",
                      }} />
                    </div>
                  </div>
                ))}
                {udfs.length > 0 && (
                  <>
                    {customSortOpts.length > 0 && <div style={{ height: 1, background: T.border + "66", margin: "4px 0" }} />}
                    <div style={{ padding: "5px 10px 2px" }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Custom Fields</span>
                    </div>
                    {udfs.map(udf => (
                      <div key={udf.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px" }}>
                        <span style={{ flex: 1, fontSize: 11, fontWeight: 500, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {udf.label}
                        </span>
                        <div
                          onClick={e => { e.stopPropagation(); handleUdfActiveToggle(udf); }}
                          title={udf.isActive ? "Remove from sort options" : "Add to sort options"}
                          style={{
                            flexShrink: 0, width: 28, height: 15, borderRadius: 8, cursor: "pointer",
                            background: udf.isActive ? col : T.border,
                            position: "relative", transition: "background 0.2s",
                          }}
                        >
                          <div style={{
                            position: "absolute", top: 2,
                            left: udf.isActive ? 13 : 2,
                            width: 11, height: 11, borderRadius: "50%",
                            background: "#fff", transition: "left 0.2s",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.35)",
                          }} />
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Filter + ⚙ gear — combined split button */}
          <div style={{ position: "relative", flexShrink: 0 }} ref={filterGearContainerRef}>
            {/* Badge lives on the outer wrapper so it's never clipped by overflow:hidden */}
            {activeFilterCount > 0 && (
              <span style={{
                position: "absolute", top: -5, right: -5, zIndex: 10,
                minWidth: 14, height: 14, borderRadius: 7, padding: "0 3px",
                background: col, color: "#fff",
                fontSize: 8, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center",
                pointerEvents: "none", boxSizing: "border-box",
              }}>{activeFilterCount}</span>
            )}
            <div style={{
              display: "flex", alignItems: "center", height: 30,
              background: T.card,
              border: "1px solid " + ((isFilterOpen || activeFilterCount > 0 || showFilterGear) ? col : T.border),
              borderRadius: 7, overflow: "hidden",
              transition: "border-color 0.15s",
            }}>
              {/* Filter icon trigger */}
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={toggleFilter}
                title="Filters"
                style={{
                  flexShrink: 0,
                  width: 30, height: "100%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "transparent", border: "none", outline: "none",
                  cursor: "pointer",
                  color: isFilterOpen || activeFilterCount > 0 ? col : T.muted,
                  transition: "color 0.15s",
                }}
              >
                <SlidersHorizontal size={14} strokeWidth={2} />
              </button>
              {/* Divider */}
              <div style={{ width: 1, height: 16, background: T.border, flexShrink: 0 }} />
              {/* ⚙ gear trigger */}
              <button
                onClick={() => { setShowSortDropdown(false); setShowSortGear(false); setShowSearchGear(false); closeFilter(); setShowFilterGear(v => !v); }}
                title="Configure filter options"
                style={{
                  flexShrink: 0, width: 28, height: "100%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: showFilterGear ? col + "18" : "transparent",
                  border: "none", outline: "none",
                  color: showFilterGear ? col : T.muted,
                  cursor: "pointer", padding: 0,
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                <Cog size={12} strokeWidth={1.8} />
              </button>
            </div>

            {/* Filter gear popover */}
            {showFilterGear && (
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", right: 0, width: 240, zIndex: 600,
                background: T.card, border: "1px solid " + T.border, borderRadius: 10,
                boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
                padding: "6px 0",
                animation: "crm-fadein 0.12s ease",
              }}>
                <div style={{ padding: "8px 10px 6px", borderBottom: "1px solid " + T.border + "66" }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Filter Options</span>
                </div>
                {customFilterDefs.length === 0 && udfs.length === 0 && (
                  <div style={{ padding: "10px 12px", fontSize: 11, color: T.muted, textAlign: "center" }}>No filter options configured</div>
                )}
                {customFilterDefs.map((opt, idx) => (
                  <div
                    key={opt.id}
                    draggable
                    onDragStart={() => onFilterGearDragStart(idx)}
                    onDragOver={e => onFilterGearDragOver(e, idx)}
                    onDragLeave={onFilterGearDragLeave}
                    onDrop={e => onFilterGearDrop(e, idx)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "7px 10px", cursor: "grab",
                      background: filterGearDragOverIdx === idx ? col + "12" : "transparent",
                      borderBottom: idx < customFilterDefs.length - 1 ? "1px solid " + T.border + "44" : "none",
                      transition: "background 0.1s",
                    }}
                  >
                    <span style={{ color: T.muted, fontSize: 14, flexShrink: 0, userSelect: "none", opacity: 0.6 }}>⠿</span>
                    <span style={{ flex: 1, fontSize: 11, fontWeight: 500, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {opt.label}
                    </span>
                    <div
                      onClick={e => { e.stopPropagation(); handleFilterToggle(opt); }}
                      title={opt.isActive ? "Hide from filter panel" : "Show in filter panel"}
                      style={{
                        flexShrink: 0, width: 28, height: 15, borderRadius: 8, cursor: "pointer",
                        background: opt.isActive ? col : T.border,
                        position: "relative", transition: "background 0.2s",
                      }}
                    >
                      <div style={{
                        position: "absolute", top: 2,
                        left: opt.isActive ? 13 : 2,
                        width: 11, height: 11, borderRadius: "50%",
                        background: "#fff", transition: "left 0.2s",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.35)",
                      }} />
                    </div>
                  </div>
                ))}
                {udfs.length > 0 && (
                  <>
                    {customFilterDefs.length > 0 && <div style={{ height: 1, background: T.border + "66", margin: "4px 0" }} />}
                    <div style={{ padding: "5px 10px 2px" }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Custom Fields</span>
                    </div>
                    {udfs.map(udf => (
                      <div key={udf.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px" }}>
                        <span style={{ flex: 1, fontSize: 11, fontWeight: 500, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {udf.label}
                        </span>
                        <div
                          onClick={e => { e.stopPropagation(); handleUdfActiveToggle(udf); }}
                          title={udf.isActive ? "Remove from filter panel" : "Show in filter panel"}
                          style={{
                            flexShrink: 0, width: 28, height: 15, borderRadius: 8, cursor: "pointer",
                            background: udf.isActive ? col : T.border,
                            position: "relative", transition: "background 0.2s",
                          }}
                        >
                          <div style={{
                            position: "absolute", top: 2,
                            left: udf.isActive ? 13 : 2,
                            width: 11, height: 11, borderRadius: "50%",
                            background: "#fff", transition: "left 0.2s",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.35)",
                          }} />
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Filter panel */}
        {isFilterOpen && (
          <div style={{
            position: "absolute", top: "calc(100% - 2px)", left: 10, right: 10, zIndex: 300,
            background: T.card, border: "1px solid " + T.border, borderRadius: 12,
            boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
            animation: "crm-fadein 0.15s ease",
            maxHeight: "calc(100vh - 180px)", overflowY: "auto",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "11px 14px 10px", borderBottom: "1px solid " + T.border,
              position: "sticky", top: 0, background: T.card, zIndex: 1,
              borderRadius: "12px 12px 0 0",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <SlidersHorizontal size={13} style={{ color: col }} />
                <span style={{ fontSize: 12, fontWeight: 800, color: T.text }}>Filters</span>
                {activeFilterCount > 0 && (
                  <span style={{ fontSize: 9, fontWeight: 800, background: col + "22", color: col, padding: "2px 7px", borderRadius: 10 }}>{activeFilterCount} active</span>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => { setCheckedModes(new Set()); setCheckedStatuses(new Set()); setSortF("company_az"); setScoreFrom(0); setScoreTo(100); setUdfFilters({}); setCustomFilters({}); }}
                    style={{ background: "none", border: "none", color: T.accent, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", padding: 0 }}
                  >Clear all</button>
                )}
                <button onClick={closeFilter} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", padding: 3, display: "flex", borderRadius: 4, lineHeight: 1 }}>
                  <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            <div style={{ padding: "12px 14px 16px", display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Stage */}
              {(customFilterDefs.length === 0 || customFilterDefs.some(f => f.contactField === 'lifecycleStage' && f.isActive)) && (
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
                          if (isAll) setCheckedModes(new Set());
                          else setCheckedModes(prev => {
                            const next = new Set(prev);
                            if (next.has(mode)) next.delete(mode); else next.add(mode);
                            return next;
                          });
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
                        <span style={{ fontSize: 10, color: checked ? T.text : T.dim, fontWeight: checked ? 700 : 400 }}>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              )}

              {/* Status */}
              {(customFilterDefs.length === 0 || customFilterDefs.some(f => f.contactField === 'status' && f.isActive)) && (
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
                          if (isAll) setCheckedStatuses(new Set());
                          else setCheckedStatuses(prev => {
                            const next = new Set(prev);
                            if (next.has(value)) next.delete(value); else next.add(value);
                            return next;
                          });
                        }}
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "6px 7px", borderRadius: 6, cursor: "pointer",
                          background: checked ? color + "12" : "transparent",
                          transition: "background 0.12s", userSelect: "none",
                        }}
                      >
                        <CbBox checked={checked} color={color} />
                        <span style={{ fontSize: 11, color: checked ? T.text : T.dim, fontWeight: checked ? 600 : 400, flex: 1 }}>{label}</span>
                        {dot && <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, opacity: checked ? 1 : 0.35, flexShrink: 0 }} />}
                      </div>
                    );
                  })}
                </div>
              </div>
              )}

              {/* Lead Score */}
              {(customFilterDefs.length === 0 || customFilterDefs.some(f => f.contactField === 'leadScore' && f.isActive)) && (
              <div>
                  <div style={{ fontSize: 9, fontWeight: 800, color: T.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Lead Score</div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 9, color: T.muted, marginBottom: 4, fontWeight: 600, letterSpacing: "0.05em" }}>FROM</div>
                      <input type="number" min={0} max={100} value={scoreFrom}
                        onChange={e => { const v = Math.min(100, Math.max(0, Number(e.target.value) || 0)); setScoreFrom(v); if (scoreTo < v) setScoreTo(v); }}
                        style={{ width: "100%", background: T.bg, border: "1px solid " + (scoreFrom > 0 ? col : T.border), borderRadius: 6, padding: "6px 8px", color: T.text, fontSize: 12, fontWeight: 600, outline: "none", fontFamily: "inherit", boxSizing: "border-box", transition: "border-color 0.15s" }}
                        onFocus={e => { e.currentTarget.style.borderColor = col; }}
                        onBlur={e => { e.currentTarget.style.borderColor = scoreFrom > 0 ? col : T.border; }}
                      />
                    </div>
                    <div style={{ color: T.muted, fontSize: 15, paddingBottom: 7, flexShrink: 0 }}>→</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 9, color: T.muted, marginBottom: 4, fontWeight: 600, letterSpacing: "0.05em" }}>TO</div>
                      <input type="number" min={0} max={100} value={scoreTo}
                        onChange={e => { const v = Math.min(100, Math.max(0, Number(e.target.value) || 0)); setScoreTo(v); if (scoreFrom > v) setScoreFrom(v); }}
                        style={{ width: "100%", background: T.bg, border: "1px solid " + (scoreTo < 100 ? col : T.border), borderRadius: 6, padding: "6px 8px", color: T.text, fontSize: 12, fontWeight: 600, outline: "none", fontFamily: "inherit", boxSizing: "border-box", transition: "border-color 0.15s" }}
                        onFocus={e => { e.currentTarget.style.borderColor = col; }}
                        onBlur={e => { e.currentTarget.style.borderColor = scoreTo < 100 ? col : T.border; }}
                      />
                    </div>
                  </div>
                  {(scoreFrom > 0 || scoreTo < 100) && (
                    <div style={{ fontSize: 10, color: col, fontWeight: 700, marginTop: 6 }}>Showing score {scoreFrom} – {scoreTo}</div>
                  )}
              </div>
              )}

              {/* Admin-defined custom filters — skip built-in special types rendered above */}
              {customFilterDefs.filter(f => f.isActive && f.filterType !== 'STAGE_SELECT' && f.filterType !== 'STATUS_SELECT' && f.contactField !== 'leadScore').length > 0 && (
                <div>
                  <div style={{ fontSize: 9, fontWeight: 800, color: T.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>More Filters</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {customFilterDefs.filter(f => f.isActive && f.filterType !== 'STAGE_SELECT' && f.filterType !== 'STATUS_SELECT' && f.contactField !== 'leadScore').map(def => (
                      <div key={def.id}>
                        <div style={{ fontSize: 10, color: T.dim, fontWeight: 600, marginBottom: 4 }}>{def.label}</div>
                        {def.filterType === "NUMBER" ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <input type="number" placeholder="Min"
                              value={(customFilters[def.contactField] || {}).min ?? ""}
                              onChange={e => setCustomFilters(prev => ({ ...prev, [def.contactField]: { ...(prev[def.contactField] || {}), min: e.target.value } }))}
                              style={{ flex: 1, background: T.bg, border: "1px solid " + T.border, borderRadius: 6, padding: "5px 8px", color: T.text, fontSize: 11, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                            <span style={{ color: T.muted, fontSize: 13 }}>–</span>
                            <input type="number" placeholder="Max"
                              value={(customFilters[def.contactField] || {}).max ?? ""}
                              onChange={e => setCustomFilters(prev => ({ ...prev, [def.contactField]: { ...(prev[def.contactField] || {}), max: e.target.value } }))}
                              style={{ flex: 1, background: T.bg, border: "1px solid " + T.border, borderRadius: 6, padding: "5px 8px", color: T.text, fontSize: 11, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                          </div>
                        ) : def.filterType === "DROPDOWN" ? (
                          <select value={customFilters[def.contactField] || ""}
                            onChange={e => setCustomFilters(prev => ({ ...prev, [def.contactField]: e.target.value }))}
                            style={{ width: "100%", background: T.bg, border: "1px solid " + T.border, borderRadius: 6, padding: "5px 8px", color: T.text, fontSize: 11, outline: "none", fontFamily: "inherit", boxSizing: "border-box", cursor: "pointer" }}>
                            <option value="">Any</option>
                            {(Array.isArray(def.options) ? def.options : []).map(o => (
                              <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
                            ))}
                          </select>
                        ) : (
                          <input type="text" placeholder={`Filter by ${def.label}…`}
                            value={customFilters[def.contactField] || ""}
                            onChange={e => setCustomFilters(prev => ({ ...prev, [def.contactField]: e.target.value }))}
                            style={{ width: "100%", background: T.bg, border: "1px solid " + T.border, borderRadius: 6, padding: "5px 8px", color: T.text, fontSize: 11, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Fields (UDFs) */}
              {activeUdfs.length > 0 && (
                <div>
                  <div style={{ fontSize: 9, fontWeight: 800, color: T.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Custom Fields</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {activeUdfs.map(udf => (
                      <div key={udf.id}>
                        <div style={{ fontSize: 10, color: T.dim, fontWeight: 600, marginBottom: 4 }}>{udf.label}</div>
                        <UdfFilterControl
                          udf={udf}
                          value={udfFilters[udf.sortKey]}
                          onChange={val => setUdfFilters(prev => ({ ...prev, [udf.sortKey]: val }))}
                          T={T}
                          col={col}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── List header: select-all + count + card display gear ─────────────── */}
      {filtered.length > 0 && !loading && (
        <div style={{ flexShrink: 0, position: "relative" }} ref={cardGearContainerRef}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "5px 8px 5px 12px",
            borderBottom: "1px solid " + T.border,
            background: T.card,
          }}>
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
            <span style={{ fontSize: 10, color: T.muted, flex: 1 }}>
              {filtered.length.toLocaleString()} contact{filtered.length !== 1 ? "s" : ""}
              {total > contacts.length && (
                <span style={{ color: T.dim }}> · {total.toLocaleString()} total</span>
              )}
            </span>
            {selEnabled && (() => {
              const n = filtered.filter(c => selectedIds?.has(c.id)).length;
              return n > 0
                ? <span style={{ fontSize: 10, fontWeight: 700, color: col }}>{n} selected</span>
                : null;
            })()}
            {/* ⚙ card display gear */}
            <button
              onClick={() => { setShowSortDropdown(false); setShowSortGear(false); setShowFilterGear(false); setShowSearchGear(false); setShowCardGear(v => !v); }}
              title="Configure card display"
              style={{
                flexShrink: 0, width: 22, height: 22,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: showCardGear ? col + "18" : "transparent",
                border: "1px solid " + (showCardGear ? col + "50" : "transparent"),
                borderRadius: 5, cursor: "pointer",
                color: showCardGear ? col : T.muted,
                transition: "all 0.15s", padding: 0,
              }}
            >
              <Cog size={11} strokeWidth={1.8} />
            </button>
          </div>

          {/* Card display gear popover */}
          {showCardGear && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0, zIndex: 600,
              background: T.card, border: "1px solid " + T.border, borderRadius: 10,
              boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
              animation: "crm-fadein 0.12s ease",
            }}>
              {/* Header */}
              <div style={{
                padding: "8px 12px 7px",
                borderBottom: "1px solid " + T.border + "66",
              }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Card Display</span>
              </div>

              {/* ── Name Priority ── */}
              <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid " + T.border + "55" }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 7 }}>
                  Name Priority
                </div>
                {displayNameRules.map((rule, idx) => {
                  const label = rule.type === "name" ? "Name" : rule.type === "company" ? "Company" : rule.type === "location" ? "City, State" : rule.type === "email" ? "Email" : rule.type === "phone" ? "Phone" : (udfs.find(u => u.sortKey === rule.key)?.label || rule.key);
                  const isOver = displayNameDragOver === idx;
                  return (
                    <div
                      key={rule.type + (rule.key || "")}
                      draggable
                      onDragStart={() => { displayNameDragIdx.current = idx; }}
                      onDragOver={e => { e.preventDefault(); setDisplayNameDragOver(idx); }}
                      onDragLeave={() => setDisplayNameDragOver(null)}
                      onDrop={e => {
                        e.preventDefault();
                        setDisplayNameDragOver(null);
                        const from = displayNameDragIdx.current;
                        displayNameDragIdx.current = null;
                        if (from == null || from === idx) return;
                        const next = [...displayNameRules];
                        const [moved] = next.splice(from, 1);
                        next.splice(idx, 0, moved);
                        setDisplayNameRules(next);
                        saveSettings(clientId || null, "display_name_rules", { rules: next }).catch(() => {});
                      }}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "4px 6px", borderRadius: 5, cursor: "grab",
                        background: isOver ? col + "14" : "transparent",
                        transition: "background 0.1s",
                      }}
                    >
                      <span style={{ color: T.muted, fontSize: 13, flexShrink: 0, opacity: 0.45, userSelect: "none", lineHeight: 1 }}>⠿</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: T.muted, minWidth: 10, flexShrink: 0 }}>{idx + 1}</span>
                      <span style={{ flex: 1, fontSize: 11, color: T.text, fontWeight: 500 }}>{label}</span>
                    </div>
                  );
                })}
                <div style={{ fontSize: 9, color: T.muted, marginTop: 5, paddingLeft: 6 }}>Drag to reorder</div>
              </div>

              {/* ── Card Fields ── */}
              <div style={{ padding: "10px 12px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: T.muted, letterSpacing: "0.07em", textTransform: "uppercase" }}>Fields</span>
                  <span style={{ fontSize: 9, color: T.muted }}>{displayFields.length} / 5</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {allCardFields.map(({ key, label }) => {
                    const active = displayFields.includes(key);
                    const canAdd = displayFields.length < 5;
                    return (
                      <div
                        key={key}
                        onClick={() => (active || canAdd) && toggleCardField(key)}
                        style={{
                          padding: "4px 10px", borderRadius: 20,
                          border: "1px solid " + (active ? col + "80" : T.border),
                          background: active ? col + "1a" : "transparent",
                          color: active ? T.text : T.muted,
                          fontSize: 11, fontWeight: active ? 600 : 400,
                          cursor: active || canAdd ? "pointer" : "default",
                          userSelect: "none", transition: "all 0.12s",
                          opacity: !active && !canAdd ? 0.35 : 1,
                        }}
                      >
                        {label}
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: 9, color: T.muted, marginTop: 7 }}>Tap to toggle · max 5</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Contact list ─────────────────────────────────────────────────────── */}
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
            const displayName = contactDisplayName(c, displayNameRules, udfs);
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
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                  {/* Name + stage badge — always shown */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: isSel ? col : T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                      <Hi text={displayName} q={search} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: T.text, flexShrink: 0 }}>
                      {c.leadScore}
                    </span>
                  </div>
                )}

                  {/* Configurable display fields */}
                  {displayFields.map(key => (
                    <ContactFieldRow key={key} fieldKey={key} contact={c} udfs={udfs} search={search} T={T} />
                  ))}

                  {/* Last activity — always shown */}
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 9, color: T.muted }}>{fmt.ago(c.lastActivityAt || c.createdAt)}</span>
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

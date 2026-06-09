import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { getContacts, getContactCounts } from "../services/api";
import { usePool } from "../context/PoolContext";

export function useContacts(currentUser, serverFilters = {}) {
  const { pool, clientId } = usePool();
  const [contacts,      setContacts]      = useState([]);
  const [contactCounts, setContactCounts] = useState({ prospect: 0, clients: {} });
  const [loading,       setLoading]       = useState(false);
  const [firstLoad,     setFirstLoad]     = useState(true);
  const [page,          setPage]          = useState(1);
  const [hasMore,       setHasMore]       = useState(false);
  const [total,         setTotal]         = useState(0);
  const [loadingMore,   setLoadingMore]   = useState(false);

  const {
    search        = '',
    stages        = [],
    sortBy        = 'company_az',
    scoreMin      = 0,
    scoreMax      = 100,
    udfFilters    = {},
    customFilters = {},
    searchMethods = {},
  } = serverFilters;

  // Track previous pool:clientId to detect pool switches vs. filter changes
  const prevPoolKeyRef = useRef(null);

  // Stable cache keys so effects only fire when values actually change
  const stagesKey         = stages.join(',');
  const udfFiltersKey     = JSON.stringify(udfFilters);
  const customFiltersKey  = JSON.stringify(customFilters);
  const searchMethodsKey  = JSON.stringify(searchMethods);

  // Load aggregate counts once on login
  useEffect(() => {
    if (!currentUser) return;
    getContactCounts().then(setContactCounts).catch(() => {});
  }, [currentUser]);

  // Keep counts in sync with the currently loaded pool
  useEffect(() => {
    if (!currentUser || loading) return;
    setContactCounts(prev => {
      if (pool === "prospect") return { ...prev, prospect: (contacts || []).length };
      return { ...prev, clients: { ...prev.clients, [clientId]: (contacts || []).length } };
    });
  }, [contacts, pool, clientId, currentUser, loading]);

  // Clear stale contacts before paint when pool/client changes (prevents flicker)
  useLayoutEffect(() => {
    if (!currentUser) return;
    const poolKey = `${pool}:${clientId}`;
    if (prevPoolKeyRef.current !== null && prevPoolKeyRef.current !== poolKey) {
      setContacts([]);
      setTotal(0);
      setLoading(true);
    }
    prevPoolKeyRef.current = poolKey;
  }, [pool, clientId, currentUser]); // eslint-disable-line

  // Re-fetch page 1 whenever pool, client, or any filter changes
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;

    setPage(1);
    setHasMore(false);
    setLoading(true);

    // 200ms debounce: coalesces rapid filter changes that happen immediately after a
    // pool switch (sort options reload, searchMethods settings load) into one API call
    const timer = setTimeout(() => {
      if (cancelled) return;
      getContacts({ page: 1, limit: 1000, search, stages, sortBy, scoreMin, scoreMax, udfFilters, customFilters, searchMethods })
        .then(({ data, total: t, hasMore: more }) => {
          if (!cancelled) {
            setContacts(data);
            setTotal(t);
            setHasMore(more);
          }
        })
        .catch(err => console.error("Failed to load contacts:", err))
        .finally(() => {
          if (!cancelled) { setLoading(false); setFirstLoad(false); }
        });
    }, 200);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [pool, clientId, currentUser, search, stagesKey, sortBy, scoreMin, scoreMax, udfFiltersKey, customFiltersKey, searchMethodsKey]); // eslint-disable-line

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const { data, hasMore: more, total: t } = await getContacts({ page: nextPage, limit: 1000, search, stages, sortBy, scoreMin, scoreMax, udfFilters, customFilters, searchMethods });
      setContacts(prev => [...prev, ...data]);
      setPage(nextPage);
      setHasMore(more);
      setTotal(t);
    } catch (err) {
      console.error("Failed to load more contacts:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, page, search, stagesKey, sortBy, scoreMin, scoreMax, udfFiltersKey, customFiltersKey, searchMethodsKey]); // eslint-disable-line

  return { contacts, setContacts, contactCounts, loading, firstLoad, hasMore, total, loadMore, loadingMore };
}

import { useState, useEffect, useCallback } from "react";
import { getContacts, getContactCounts } from "../services/api";
import { usePool } from "../context/PoolContext";

export function useContacts(currentUser) {
  const { pool, clientId } = usePool();
  const [contacts,      setContacts]      = useState([]);
  const [contactCounts, setContactCounts] = useState({ prospect: 0, clients: {} });
  const [loading,       setLoading]       = useState(false);
  const [firstLoad,     setFirstLoad]     = useState(true);
  const [page,          setPage]          = useState(1);
  const [hasMore,       setHasMore]       = useState(false);
  const [total,         setTotal]         = useState(0);
  const [loadingMore,   setLoadingMore]   = useState(false);

  // Load aggregate counts once on login
  useEffect(() => {
    if (!currentUser) return;
    getContactCounts().then(setContactCounts).catch(() => {});
  }, [currentUser]);

  // Keep counts in sync with server total for the active pool
  useEffect(() => {
    if (!currentUser || loading) return;
    const count = total || contacts.length;
    setContactCounts(prev => {
      if (pool === "prospect") return { ...prev, prospect: count };
      return { ...prev, clients: { ...prev.clients, [clientId]: count } };
    });
  }, [contacts, total, pool, clientId, currentUser, loading]);

  // Re-fetch page 1 whenever pool or client changes
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    setContacts([]);
    setPage(1);
    setHasMore(false);
    setTotal(0);
    setLoading(true);
    getContacts({ page: 1, limit: 100 })
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
    return () => { cancelled = true; };
  }, [pool, clientId, currentUser]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const { data, hasMore: more, total: t } = await getContacts({ page: nextPage, limit: 100 });
      setContacts(prev => [...prev, ...data]);
      setPage(nextPage);
      setHasMore(more);
      setTotal(t);
    } catch (err) {
      console.error("Failed to load more contacts:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, page]);

  return { contacts, setContacts, contactCounts, loading, firstLoad, hasMore, total, loadMore, loadingMore };
}

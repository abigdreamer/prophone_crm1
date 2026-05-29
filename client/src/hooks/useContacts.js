import { useState, useEffect } from "react";
import { getContacts, getContactCounts } from "../services/api";
import { usePool } from "../context/PoolContext";

export function useContacts(currentUser) {
  const { pool, clientId } = usePool();
  const [contacts,      setContacts]      = useState([]);
  const [contactCounts, setContactCounts] = useState({ prospect: 0, clients: {} });
  const [loading,       setLoading]       = useState(false);
  const [firstLoad,     setFirstLoad]     = useState(true);

  // Load aggregate counts once on login
  useEffect(() => {
    if (!currentUser) return;
    getContactCounts().then(setContactCounts).catch(() => {});
  }, [currentUser]);

  // Keep counts in sync with the currently loaded pool
  useEffect(() => {
    if (!currentUser || loading) return;
    setContactCounts(prev => {
      if (pool === "prospect") return { ...prev, prospect: contacts.length };
      return { ...prev, clients: { ...prev.clients, [clientId]: contacts.length } };
    });
  }, [contacts, pool, clientId, currentUser, loading]);

  // Re-fetch whenever pool or client changes — clear immediately to prevent stale selection
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    setContacts([]);   // flush old data synchronously before new fetch arrives
    setLoading(true);
    getContacts()
      .then(data => { if (!cancelled) setContacts(data); })
      .catch(err => console.error("Failed to load contacts:", err))
      .finally(() => {
        if (!cancelled) { setLoading(false); setFirstLoad(false); }
      });
    return () => { cancelled = true; };
  }, [pool, clientId, currentUser]);

  return { contacts, setContacts, contactCounts, loading, firstLoad };
}

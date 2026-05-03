import { useState, useEffect } from "react";
import { getContacts, getContactCounts } from "../services/api";

export function useContacts(currentUser, pool, clientId) {
  const [contacts, setContacts] = useState([]);
  const [contactCounts, setContactCounts] = useState({ prospect: 0, clients: {} });
  const [loading, setLoading] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);

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

  // Re-fetch when pool or client changes
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    setLoading(true);
    getContacts(pool, clientId)
      .then(data => { if (!cancelled) setContacts(data); })
      .catch(err => console.error("Failed to load contacts:", err))
      .finally(() => {
        if (!cancelled) { setLoading(false); setFirstLoad(false); }
      });
    return () => { cancelled = true; };
  }, [pool, clientId, currentUser]);

  return { contacts, setContacts, contactCounts, loading, firstLoad };
}

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as db from "../services/api";

const ClientsCtx = createContext({ clients: [], loading: true, reload: () => {} });

export function ClientsProvider({ children }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const data = await db.getClients(true);
      setClients(data || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return (
    <ClientsCtx.Provider value={{ clients, loading, reload }}>
      {children}
    </ClientsCtx.Provider>
  );
}

export function useClients() {
  return useContext(ClientsCtx);
}

export function useClientById(id) {
  const { clients } = useContext(ClientsCtx);
  return id ? (clients.find(c => c.id === id) || null) : null;
}

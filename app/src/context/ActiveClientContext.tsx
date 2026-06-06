import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { fetchClients } from '../services/api';
import type { Client } from '../types/client';

const STORAGE_KEY = 'prophone_active_client_id';

type ActiveClientCtx = {
  clients: Client[];
  activeClientId: string | null;
  activeClient: Client | undefined;
  setActiveClientId: (id: string | null) => Promise<void>;
  loading: boolean;
};

const Ctx = createContext<ActiveClientCtx>({
  clients: [],
  activeClientId: null,
  activeClient: undefined,
  setActiveClientId: async () => {},
  loading: true,
});

export function ActiveClientProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [activeClientId, setActiveClientIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [saved, cls] = await Promise.all([
        SecureStore.getItemAsync(STORAGE_KEY).catch(() => null),
        fetchClients(),
      ]);
      setClients(cls);
      if (saved && cls.find((c) => c.id === saved)) {
        setActiveClientIdState(saved);
      } else {
        const foxtow = cls.find((c) => c.name.toLowerCase().includes('foxtow'));
        const fallback = foxtow?.id ?? cls[0]?.id ?? null;
        setActiveClientIdState(fallback);
        if (fallback) await SecureStore.setItemAsync(STORAGE_KEY, fallback).catch(() => {});
      }
      setLoading(false);
    })();
  }, []);

  async function setActiveClientId(id: string | null) {
    setActiveClientIdState(id);
    if (id) {
      await SecureStore.setItemAsync(STORAGE_KEY, id).catch(() => {});
    } else {
      await SecureStore.deleteItemAsync(STORAGE_KEY).catch(() => {});
    }
  }

  return (
    <Ctx.Provider value={{
      clients,
      activeClientId,
      activeClient: clients.find((c) => c.id === activeClientId),
      setActiveClientId,
      loading,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useActiveClient() {
  return useContext(Ctx);
}

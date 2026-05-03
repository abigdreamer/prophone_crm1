import { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { setActivePool } from "../services/api";

const PoolContext = createContext(null);
const STORAGE_KEY = "prophone_active_pool";

function loadSaved() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (s?.pool && s?.clientId) return s;
  } catch {}
  return { pool: "client", clientId: "foxtow" };
}

function persist(pool, clientId) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ pool, clientId }));
}

export function PoolProvider({ children }) {
  const init = loadSaved();

  const [pool,     setPoolState]     = useState(init.pool);
  const [clientId, setClientIdState] = useState(init.clientId);

  const poolRef     = useRef(init.pool);
  const clientIdRef = useRef(init.clientId);

  // Initialize singleton with persisted values on mount
  useEffect(() => { setActivePool(init.pool, init.clientId); }, []); // eslint-disable-line

  const setPool = useCallback((p) => {
    poolRef.current = p;
    setActivePool(p, clientIdRef.current);
    persist(p, clientIdRef.current);
    setPoolState(p);
  }, []);

  const setClientId = useCallback((id) => {
    clientIdRef.current = id;
    setActivePool(poolRef.current, id);
    persist(poolRef.current, id);
    setClientIdState(id);
  }, []);

  return (
    <PoolContext.Provider value={{ pool, setPool, clientId, setClientId }}>
      {children}
    </PoolContext.Provider>
  );
}

export function usePool() {
  return useContext(PoolContext);
}

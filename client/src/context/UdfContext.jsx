import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getUdfs } from "../services/api";
import { usePool } from "./PoolContext";

const UdfContext = createContext(null);

export function UdfProvider({ children }) {
  const { pool, clientId } = usePool();
  const [udfs, setUdfs] = useState([]);
  const [udfsLoaded, setUdfsLoaded] = useState(false);

  const refreshUdfs = useCallback(async () => {
    try {
      const res = await getUdfs();
      setUdfs(res.data || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    setUdfsLoaded(false);
    setUdfs([]);
    refreshUdfs().finally(() => setUdfsLoaded(true));
  }, [pool, clientId]); // eslint-disable-line

  return (
    <UdfContext.Provider value={{ udfs, setUdfs, udfsLoaded, refreshUdfs }}>
      {children}
    </UdfContext.Provider>
  );
}

export function useUdfs() {
  const ctx = useContext(UdfContext);
  if (!ctx) throw new Error("useUdfs must be used inside UdfProvider");
  return ctx;
}

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getUdfs, cleanupUdfs, seedUdfs } from "../services/api";
import { usePool } from "./PoolContext";

const UdfContext = createContext(null);

function dedupeByLabel(list) {
  const seen = new Set();
  return list.filter(u => {
    if (seen.has(u.label)) return false;
    seen.add(u.label);
    return true;
  });
}

export function UdfProvider({ children }) {
  const { pool, clientId } = usePool();
  const [udfs, setUdfs] = useState([]);
  const [udfsLoaded, setUdfsLoaded] = useState(false);

  const refreshUdfs = useCallback(async () => {
    try {
      const res = await getUdfs();
      setUdfs(dedupeByLabel(res.data || []));
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    setUdfsLoaded(false);
    setUdfs([]);
    async function load() {
      try {
        // Cleanup duplicates in DB, then seed defaults if empty, then fetch
        await cleanupUdfs(clientId);
        const res = await seedUdfs(clientId);
        setUdfs(dedupeByLabel(res.data || []));
      } catch {
        await refreshUdfs();
      }
    }
    load().finally(() => setUdfsLoaded(true));
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

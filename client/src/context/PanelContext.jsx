import { createContext, useContext, useState, useCallback } from "react";

const PanelCtx = createContext({ panelWidth: 0, setPanelWidth: () => {} });

export const usePanelWidth = () => useContext(PanelCtx);

export function PanelProvider({ children }) {
  const [panelWidth, setPanelWidth] = useState(0);
  const set = useCallback((w) => setPanelWidth(w), []);
  return (
    <PanelCtx.Provider value={{ panelWidth, setPanelWidth: set }}>
      {children}
    </PanelCtx.Provider>
  );
}

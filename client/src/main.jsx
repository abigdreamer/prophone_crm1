import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { initAnalytics } from "./services/analytics";

initAnalytics();
import { ThemeProvider } from "./context/ThemeContext";
import { PoolProvider } from "./context/PoolContext";
import { ToastProvider } from "./context/ToastContext";
import { ConfirmProvider } from "./context/ConfirmContext";
import { ClientsProvider } from "./context/ClientsContext";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <PoolProvider>
          <ClientsProvider>
            <ToastProvider>
              <ConfirmProvider>
                <App />
              </ConfirmProvider>
            </ToastProvider>
          </ClientsProvider>
        </PoolProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { PoolProvider } from "./context/PoolContext";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <PoolProvider>
        <App />
      </PoolProvider>
    </BrowserRouter>
  </React.StrictMode>
);

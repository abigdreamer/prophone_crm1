import React from "react";
import ReactDOM from "react-dom/client";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
    <ToastContainer
      position="bottom-right"
      autoClose={3000}
      hideProgressBar
      closeOnClick
      pauseOnFocusLoss={false}
      draggable={false}
      theme="light"
      toastStyle={{ fontSize: 13, borderRadius: 8 }}
    />
  </React.StrictMode>
);

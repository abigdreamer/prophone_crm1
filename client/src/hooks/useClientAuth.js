import { useState, useEffect } from "react";
import { clientGetMe } from "../services/api";

const TOKEN_KEY = "prophone_client_token";

export function useClientAuth() {
  const [clientUser, setClientUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setLoading(false); return; }
    clientGetMe()
      .then(user => setClientUser({ ...user, userType: "client" }))
      .catch(err => {
        if (
          err.message === "Invalid or expired token" ||
          err.message === "Authorization required"
        ) {
          localStorage.removeItem(TOKEN_KEY);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function clientSignOut() {
    localStorage.removeItem(TOKEN_KEY);
    setClientUser(null);
  }

  return { clientUser, setClientUser, loading, clientSignOut };
}

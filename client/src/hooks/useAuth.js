import { useState, useEffect } from "react";
import { getMe } from "../services/api";

export function useAuth() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("prophone_token");
    if (!token) { setLoading(false); return; }
    getMe()
      .then(setCurrentUser)
      .catch(err => {
        if (
          err.message === "Invalid or expired token" ||
          err.message === "Authorization required"
        ) {
          localStorage.removeItem("prophone_token");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function signOut() {
    localStorage.removeItem("prophone_token");
    setCurrentUser(null);
  }

  return { currentUser, setCurrentUser, loading, signOut };
}

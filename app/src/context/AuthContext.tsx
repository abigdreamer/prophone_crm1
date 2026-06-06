import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useState } from 'react';
import { API_BASE_URL, setAuthToken } from '../config';

const TOKEN_KEY = 'prophone_token';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  color: string;
}

interface AuthContextValue {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY)
      .then(async (saved) => {
        if (!saved) return;
        // Verify token is still valid
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${saved}` },
        });
        if (res.ok) {
          const me = await res.json();
          setAuthToken(saved);
          setToken(saved);
          setUser(me);
        } else {
          await SecureStore.deleteItemAsync(TOKEN_KEY);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.message || 'Login failed');
    }

    await SecureStore.setItemAsync(TOKEN_KEY, data.token);
    setAuthToken(data.token);
    setToken(data.token);
    setUser(data.user);
  }

  async function logout() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setAuthToken('');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

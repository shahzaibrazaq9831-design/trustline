import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api, { setAccessToken, setUnauthorizedHandler } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);

    // On page load, try to silently resume a session using the httpOnly
    // refresh cookie (if the person is still within their 7-day window).
    (async () => {
      try {
        const { data } = await api.post('/auth/refresh');
        setAccessToken(data.accessToken);
        const me = await api.get('/auth/me');
        setUser(me.data);
      } catch {
        clearSession();
      } finally {
        setLoading(false);
      }
    })();
  }, [clearSession]);

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
  }

  async function register(fullName, email, password) {
    const { data } = await api.post('/auth/register', { fullName, email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      clearSession();
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

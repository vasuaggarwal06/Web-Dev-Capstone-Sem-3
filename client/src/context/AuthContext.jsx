import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setAuthFailureHandler, tokenStore } from '../utils/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while restoring a session

  const clearSession = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    setAuthFailureHandler(clearSession);
    const restore = async () => {
      if (!tokenStore.get()) { setLoading(false); return; }
      try {
        const data = await api.get('/auth/me');
        setUser(data.user);
      } catch {
        clearSession();
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, [clearSession]);

  const login = useCallback(async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    tokenStore.set({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (form) => {
    const data = await api.post('/auth/register', form);
    tokenStore.set({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      const tokens = tokenStore.get();
      await api.post('/auth/logout', { refreshToken: tokens?.refreshToken });
    } catch { /* ignore, we clear locally anyway */ }
    clearSession();
  }, [clearSession]);

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};

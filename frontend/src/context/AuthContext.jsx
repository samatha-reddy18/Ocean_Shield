import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/authService.js';

const AuthContext = createContext(null);

const TOKEN_KEY = 'oceanshield_token';
const USER_KEY = 'oceanshield_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
    setLoading(false);
  }, []);

  // Validate token against /api/auth/me on app load (if present)
  const validateToken = useCallback(async () => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (!savedToken) {
      setLoading(false);
      return;
    }
    try {
      const me = await authApi.getMe(savedToken);
      setUser(me);
      localStorage.setItem(USER_KEY, JSON.stringify(me));
    } catch {
      // Expired or invalid token — clear session
      logout();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    validateToken();
  }, [validateToken]);

  const login = (userData, jwt) => {
    setUser(userData);
    setToken(jwt);
    localStorage.setItem(TOKEN_KEY, jwt);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const updateUser = (updated) => {
    setUser((prev) => ({ ...prev, ...updated }));
    localStorage.setItem(USER_KEY, JSON.stringify({ ...user, ...updated }));
  };

  const value = { user, token, loading, login, logout, updateUser, isAuthenticated: !!user };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;

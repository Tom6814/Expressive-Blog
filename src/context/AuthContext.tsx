import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api, USER_TOKEN_KEY } from '../lib/api';

interface User {
  id: string;
  username: string;
  nickname: string;
  email: string;
  avatar: string | null;
  role: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<User>;
  register: (data: { username: string; nickname?: string; email: string; password: string; avatar?: string }) => Promise<User>;
  logout: () => void;
  updateProfile: (data: { nickname?: string; avatar?: string; email?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(USER_TOKEN_KEY);
    if (token) {
      api.getMe().then(setUser).catch(() => {
        localStorage.removeItem(USER_TOKEN_KEY);
        setUser(null);
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.userLogin({ username, password });
    localStorage.setItem(USER_TOKEN_KEY, res.token);
    if (res.user.role === 'admin') {
      localStorage.setItem('admin_token', res.token);
    }
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(async (data: { username: string; nickname?: string; email: string; password: string; avatar?: string }) => {
    const res = await api.register(data);
    localStorage.setItem(USER_TOKEN_KEY, res.token);
    if (res.user.role === 'admin') {
      localStorage.setItem('admin_token', res.token);
    }
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(USER_TOKEN_KEY);
    localStorage.removeItem('admin_token');
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (data: { nickname?: string; avatar?: string; email?: string }) => {
    const updated = (await api.updateProfile(data)) as User;
    setUser(updated);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

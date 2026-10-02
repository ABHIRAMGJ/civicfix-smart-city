import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import type { UserProfile, NotificationItem } from '../types.ts';

interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  lang: 'en' | 'te';
  setLang: (lang: 'en' | 'te') => void;
  toggleLanguage: () => void;
  notifications: NotificationItem[];
  unreadCount: number;
  liveBanner: string | null;
  clearLiveBanner: () => void;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password?: string) => Promise<UserProfile>;
  registerAccount: (data: {
    name: string;
    email: string;
    password: string;
    role: string;
    departmentId?: number | null;
    phone?: string;
  }) => Promise<{ otpDemoCode?: string; user: UserProfile }>;
  switchRolePersona: (
    role: 'citizen' | 'officer' | 'admin',
    departmentId?: number
  ) => Promise<UserProfile | null>;
  logout: () => Promise<void>;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  refreshNotifications: () => Promise<void>;
  markNotificationAsRead: (id: number) => Promise<void>;
  realtimeTick: number;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [lang, setLang] = useState<'en' | 'te'>('en');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [liveBanner, setLiveBanner] = useState<string | null>(null);
  const [realtimeTick, setRealtimeTick] = useState<number>(0);

  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const headers = new Headers(options.headers || {});
      if (!headers.has('Content-Type') && options.body) {
        headers.set('Content-Type', 'application/json');
      }
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return fetch(url, { ...options, headers });
    },
    [token]
  );

  const refreshNotifications = useCallback(async () => {
    try {
      const res = await authFetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setNotifications(data);
        }
      }
    } catch {
      // Ignore transient network errors
    }
  }, [authFetch]);

  useEffect(() => {
    refreshNotifications();
  }, [user, refreshNotifications, realtimeTick]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connectWs() {
      try {
        ws = new WebSocket(wsUrl);
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.event && msg.event !== 'connection:established') {
              setRealtimeTick((t) => t + 1);
              if (msg.payload?.message) {
                setLiveBanner(msg.payload.message);
              }
            }
          } catch {
            // Ignore malformed message
          }
        };
        ws.onclose = () => {
          reconnectTimer = setTimeout(connectWs, 4000);
        };
      } catch {
        // Ignore WS connection error
      }
    }

    connectWs();
    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const credential = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await credential.user.getIdToken();
      const res = await fetch('/api/auth/firebase-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to synchronize Google Sign-In');
      }
      const data = await res.json();
      setUser(data.user);
      setToken(data.token);
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, password?: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Invalid credentials');
    }
    const data = await res.json();
    setUser(data.user);
    setToken(data.token);
    return data.user as UserProfile;
  };

  const registerAccount = async (payload: {
    name: string;
    email: string;
    password: string;
    role: string;
    departmentId?: number | null;
    phone?: string;
  }) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Registration failed');
    }
    const data = await res.json();
    setUser(data.user);
    setToken(data.token);
    return { otpDemoCode: data.otpDemoCode, user: data.user as UserProfile };
  };

  const switchRolePersona = async (
    targetRole: 'citizen' | 'officer' | 'admin',
    departmentId?: number
  ) => {
    const res = await fetch('/api/auth/switch-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetRole, departmentId }),
    });
    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
      setToken(data.token);
      return data.user as UserProfile;
    }
    return null;
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch {
      // Ignore
    }
    setUser(null);
    setToken(null);
  };

  const markNotificationAsRead = async (id: number) => {
    await authFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        lang,
        setLang,
        toggleLanguage: () => setLang((prev) => (prev === 'en' ? 'te' : 'en')),
        notifications,
        unreadCount,
        liveBanner,
        clearLiveBanner: () => setLiveBanner(null),
        loginWithGoogle,
        loginWithEmail,
        registerAccount,
        switchRolePersona,
        logout,
        authFetch,
        refreshNotifications,
        markNotificationAsRead,
        realtimeTick,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

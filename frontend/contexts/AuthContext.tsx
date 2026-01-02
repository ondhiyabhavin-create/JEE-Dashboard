'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';

interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  headerName?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 12 hours in milliseconds
const SESSION_TIMEOUT = 12 * 60 * 60 * 1000; // 43200000 ms

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check if session has expired (12 hours)
  const isSessionExpired = useCallback((): boolean => {
    const loginTimestamp = localStorage.getItem('loginTimestamp');
    if (!loginTimestamp) {
      return true;
    }
    
    const loginTime = parseInt(loginTimestamp, 10);
    const currentTime = Date.now();
    const timeElapsed = currentTime - loginTime;
    
    return timeElapsed >= SESSION_TIMEOUT;
  }, []);

  // Clear session data
  const clearSession = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('loginTimestamp');
    setUser(null);
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      // Check if session has expired (12 hours)
      if (isSessionExpired()) {
        clearSession();
        setLoading(false);
        return;
      }

      const response = await authApi.verify();
      if (response.data.success) {
        setUser({
          ...response.data.user,
          headerName: response.data.user.headerName || 'Spectrum Student Data'
        });
      } else {
        clearSession();
      }
    } catch (error) {
      clearSession();
    } finally {
      setLoading(false);
    }
  }, [isSessionExpired, clearSession]);

  useEffect(() => {
    checkAuth();

    // Check session expiration when app regains focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const token = localStorage.getItem('token');
        if (token && isSessionExpired()) {
          clearSession();
          router.push('/login');
        }
      }
    };

    // Check session expiration periodically (every 5 minutes)
    const sessionCheckInterval = setInterval(() => {
      const token = localStorage.getItem('token');
      if (token && isSessionExpired()) {
        clearSession();
        router.push('/login');
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(sessionCheckInterval);
    };
  }, [checkAuth, isSessionExpired, clearSession, router]);

  const login = async (username: string, password: string) => {
    const response = await authApi.login(username, password);
    if (response.data.success) {
      localStorage.setItem('token', response.data.token);
      // Store login timestamp
      localStorage.setItem('loginTimestamp', Date.now().toString());
      setUser({
        ...response.data.user,
        headerName: response.data.user.headerName || 'Spectrum Student Data'
      });
      router.push('/dashboard');
    }
  };

  const logout = () => {
    clearSession();
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        checkAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


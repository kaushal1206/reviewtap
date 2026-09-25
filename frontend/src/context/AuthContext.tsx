import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthResponse } from '../types';
import { api, setStoredAccessToken, getStoredAccessToken } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getStoredAccessToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data.success) {
        setUser(response.data.data.user);
      }
    } catch {
      setUser(null);
      setToken(null);
      setStoredAccessToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      refreshProfile();
    } else {
      setIsLoading(false);
    }

    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post<{ success: boolean; data: AuthResponse }>('/auth/login', {
      email,
      password,
    });
    const { user: loggedInUser, accessToken } = response.data.data;
    setUser(loggedInUser);
    setToken(accessToken);
    setStoredAccessToken(accessToken);
  };

  const register = async (fullName: string, email: string, password: string) => {
    const response = await api.post<{ success: boolean; data: AuthResponse }>('/auth/register', {
      fullName,
      email,
      password,
    });
    const { user: registeredUser, accessToken } = response.data.data;
    setUser(registeredUser);
    setToken(accessToken);
    setStoredAccessToken(accessToken);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore logout errors
    } finally {
      setUser(null);
      setToken(null);
      setStoredAccessToken(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

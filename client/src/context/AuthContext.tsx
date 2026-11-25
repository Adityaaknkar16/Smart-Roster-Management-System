import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest, getToken, setToken, removeToken } from '../api/client.js';
import { Employee } from '../types/index.js';

interface AuthContextType {
  user: Employee | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => void;
  switchPersona: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Employee | null>(null);
  const [token, setTokenState] = useState<string | null>(getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      const existingToken = getToken();
      if (!existingToken) {
        setIsLoading(false);
        return;
      }

      try {
        const userData = await apiRequest<Employee>('/auth/me');
        setUser(userData);
      } catch (err) {
        console.warn('Session expired or invalid token:', err);
        removeToken();
        setTokenState(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, []);

  const login = async (email: string, password = 'password123') => {
    setIsLoading(true);
    try {
      const data = await apiRequest<{ token: string; user: Employee }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setToken(data.token);
      setTokenState(data.token);
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    removeToken();
    setTokenState(null);
    setUser(null);
  };

  const switchPersona = async (email: string) => {
    await login(email, 'password123');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        switchPersona,
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

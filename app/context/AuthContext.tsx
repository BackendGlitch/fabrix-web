'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'CUSTOMER' | 'ADMIN';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  role: 'OWNER' | 'CUSTOMER' | 'ADMIN';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to transform backend response to frontend User
const transformBackendUser = (backendData: any): User => {
  return {
    id: backendData.id || backendData.userId,
    email: backendData.email,
    name: backendData.name || 'User',
    role: backendData.role,
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    withCredentials: true,
  });

  // Helper function to fetch current user
  const fetchCurrentUser = async () => {
    try {
      const response = await apiClient.get('/auth/me');
      const userData = response.data;
      setUser(transformBackendUser(userData));
    } catch (err) {
      setUser(null);
    }
  };

  // Verify session on mount
  useEffect(() => {
    const verifySession = async () => {
      try {
        await fetchCurrentUser();
      } finally {
        setIsLoading(false);
      }
    };

    verifySession();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      await apiClient.post('/auth/login', {
        email,
        password,
      });
      // After successful login, fetch user data from /auth/me
      await fetchCurrentUser();
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const register = async (data: RegisterData) => {
    try {
      await apiClient.post('/auth/register', data);
      // After successful registration, fetch user data from /auth/me
      await fetchCurrentUser();
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout', {});
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
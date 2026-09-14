'use client';

// frontend/context/AuthContext.tsx
// Contexto para administracion reactiva del estado de sesion del usuario

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, LoginPayload, RegisterPayload, loginUser, registerUser, getCurrentUser, logoutUser } from '../services/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginPayload) => Promise<User>;
  register: (data: RegisterPayload) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Inicializar estado del usuario desde el almacenamiento local y validar con la API
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch (e) {
            // Error al parsear JSON almacenado
          }
        }

        const currentUser = await getCurrentUser();
        if (isMounted) {
          setUser(currentUser);
        }
      } catch (error) {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogin = async (data: LoginPayload): Promise<User> => {
    setIsLoading(true);
    try {
      const response = await loginUser(data);
      setUser(response.user);
      return response.user;
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (data: RegisterPayload): Promise<User> => {
    setIsLoading(true);
    try {
      const response = await registerUser(data);
      setUser(response.user);
      return response.user;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
}

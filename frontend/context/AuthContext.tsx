'use client';

// frontend/context/AuthContext.tsx
// Contexto para administracion reactiva del estado de sesion del usuario

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, LoginPayload, RegisterPayload, RegisterResult, loginUser, registerUser, verifyEmail, getCurrentUser, logoutUser } from '../services/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginPayload) => Promise<User>;
  register: (data: RegisterPayload) => Promise<RegisterResult>;
  verifyEmail: (token: string) => Promise<User>;
  logout: () => void;
  actualizarUsuario: (user: User) => void;
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
          } catch {
            // Error al parsear JSON almacenado
          }
        }

        const currentUser = await getCurrentUser();
        if (isMounted) {
          // Mantener usuario local si la API no pudo responder (red/temporal): getCurrentUser devuelve el guardado.
          // Solo limpiar sesion cuando devolvio null (sin sesion o 401).
          setUser(currentUser);
        }
      } catch {
        // Ante fallos inesperados no forzar logout si todavia hay perfil guardado
        if (isMounted && typeof window !== 'undefined' && !localStorage.getItem('user')) {
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

  // Iniciar sesión y guardar el usuario en el contexto
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

  // Registrar la cuenta: queda pendiente hasta que se confirme el email, así que no inicia sesión
  const handleRegister = async (data: RegisterPayload): Promise<RegisterResult> => {
    setIsLoading(true);
    try {
      return await registerUser(data);
    } finally {
      setIsLoading(false);
    }
  };

  // Confirmar el email con el enlace del mail y dejar la sesión iniciada
  const handleVerifyEmail = async (token: string): Promise<User> => {
    const response = await verifyEmail(token);
    setUser(response.user);
    return response.user;
  };

  // Cerrar sesión y limpiar el usuario actual
  const handleLogout = () => {
    logoutUser();
    setUser(null);
  };

  // Datos editados desde el perfil: se guardan en la sesión sin tener que volver a ingresar
  const handleActualizarUsuario = (nuevo: User) => {
    localStorage.setItem('user', JSON.stringify(nuevo));
    setUser(nuevo);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login: handleLogin,
        register: handleRegister,
        verifyEmail: handleVerifyEmail,
        logout: handleLogout,
        actualizarUsuario: handleActualizarUsuario,
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

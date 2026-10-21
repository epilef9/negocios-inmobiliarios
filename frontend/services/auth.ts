// frontend/services/auth.ts
// Servicio para conexion con los endpoints de autenticacion de la API

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "production" ? "/api" : "http://localhost:4000/api");

export interface User {
  id: string;
  nombre: string;
  apellido: string;
  telefono?: string;
  email: string;
  role: string;
  checklistRequisitos?: string[];
  emailVerificado?: boolean;
  preferencias?: UserPreferences;
  createdAt?: string;
}

export interface UserPreferences {
  tema: "light" | "dark";
  paleta: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterPayload {
  nombre: string;
  apellido: string;
  telefono?: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

// Al registrarse no se inicia sesión: primero hay que confirmar el email
export interface RegisterResult {
  requiereVerificacion: boolean;
  correoEnviado: boolean;
  // Solo en desarrollo y sin mails configurados: el enlace de verificación, para probar sin correo
  enlaceDev?: string;
  user: User;
}

export class AuthRequestError extends Error {
  status: number;
  code?: string;
  // Segundos que faltan para poder pedir otro enlace (respuesta 429)
  segundos?: number;

  constructor(message: string, status: number, code?: string, segundos?: number) {
    super(message);
    this.name = "AuthRequestError";
    this.status = status;
    this.code = code;
    this.segundos = segundos;
  }
}

// Peticion HTTP generica para autenticacion
async function authRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = body.message || (Array.isArray(body.errors) ? body.errors[0] : "Ocurrio un error en la solicitud");
    throw new AuthRequestError(errorMessage, response.status, typeof body.code === "string" ? body.code : undefined, typeof body.segundos === "number" ? body.segundos : undefined);
  }

  // Devolver body.data si existe (segun patron del backend) o body directamente
  return (body.data !== undefined ? body.data : body) as T;
}

// Iniciar sesión y guardar los datos recibidos
export async function loginUser(payload: LoginPayload): Promise<AuthResponse> {
  const data = await authRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (typeof window !== "undefined" && data.token) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
  }

  return data;
}

// Registrar un usuario: la cuenta queda pendiente hasta confirmar el email
export async function registerUser(payload: RegisterPayload): Promise<RegisterResult> {
  return authRequest<RegisterResult>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Confirmar el email con el enlace recibido; deja la sesión iniciada
export async function verifyEmail(token: string): Promise<AuthResponse> {
  const data = await authRequest<AuthResponse>("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });

  if (typeof window !== "undefined" && data.token) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
  }

  return data;
}

// Pedir que se vuelva a mandar el enlace de confirmación
export async function resendVerification(email: string): Promise<{ segundos: number; enlaceDev?: string }> {
  return authRequest<{ segundos: number; enlaceDev?: string }>("/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

function readStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const storedUser = localStorage.getItem("user");
  if (!storedUser) return null;
  try {
    return JSON.parse(storedUser) as User;
  } catch {
    return null;
  }
}

// Obtener datos del usuario actual
export async function getCurrentUser(): Promise<User | null> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (!token) return null;

  try {
    const user = await authRequest<User>("/auth/me");
    if (typeof window !== "undefined" && user) {
      localStorage.setItem("user", JSON.stringify(user));
    }
    return user;
  } catch (error) {
    // Solo cerrar sesion si el backend rechaza el token (401).
    // Errores de red o temporales no deben borrar la cuenta al recargar (F5).
    if (error instanceof AuthRequestError && error.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
      return null;
    }

    return readStoredUser();
  }
}

// Obtener checklist de requisitos del usuario autenticado
export async function getUserChecklist(): Promise<string[]> {
  try {
    const data = await authRequest<string[]>("/auth/checklist");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn("No se pudo obtener el checklist remoto:", error);
    return [];
  }
}

export async function getUserPreferences(): Promise<UserPreferences | null> {
  try {
    return await authRequest<UserPreferences>("/auth/preferences");
  } catch {
    return null;
  }
}

export async function saveUserPreferences(preferences: UserPreferences): Promise<UserPreferences | null> {
  try {
    return await authRequest<UserPreferences>("/auth/preferences", {
      method: "PUT",
      body: JSON.stringify(preferences),
    });
  } catch {
    return null;
  }
}

// Guardar checklist de requisitos del usuario autenticado
export async function saveUserChecklist(items: string[]): Promise<string[]> {
  try {
    const data = await authRequest<string[]>("/auth/checklist", {
      method: "PUT",
      body: JSON.stringify({ checklist: items }),
    });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn("No se pudo guardar el checklist remoto:", error);
    return items;
  }
}

// Cerrar sesion
export function logoutUser(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }
}

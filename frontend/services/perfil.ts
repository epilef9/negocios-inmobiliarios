// Servicio del perfil propio: datos de la cuenta y cambio de contraseña
import { API_URL } from './api';
import type { User } from './auth';

// Error con el detalle por campo que devuelve el backend, para marcar cada campo del formulario
export class ErrorPerfil extends Error {
  errores: Record<string, string>;

  constructor(mensaje: string, errores: Record<string, string> = {}) {
    super(mensaje);
    this.name = 'ErrorPerfil';
    this.errores = errores;
  }
}

async function pedir<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      ...opciones,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
  } catch {
    throw new ErrorPerfil('No pudimos conectarnos con el servidor. Probá de nuevo en un momento.');
  }
  const cuerpo = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new ErrorPerfil(cuerpo.message || 'No se pudo completar la operación', cuerpo.errores || {});
  return cuerpo.data as T;
}

export type DatosPerfil = {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  passwordActual?: string;
};

export const getPerfil = () => pedir<User & { updatedAt?: string }>('/users/me');

export async function guardarPerfil(datos: DatosPerfil) {
  const resultado = await pedir<{ user: User; token: string }>('/users/me', { method: 'PUT', body: JSON.stringify(datos) });
  if (resultado.token) localStorage.setItem('token', resultado.token);
  return resultado.user;
}

export const cambiarPassword = (passwordActual: string, passwordNueva: string) =>
  pedir<void>('/users/me/password', { method: 'PUT', body: JSON.stringify({ passwordActual, passwordNueva }) });

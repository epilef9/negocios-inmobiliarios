// Servicio del perfil propio: datos de la cuenta. La contraseña se cambia con la actual (o, si no se acuerda,
// con un enlace por mail) y el email se confirma con un enlace a la casilla nueva.
import { API_URL } from './api';
import type { User } from './auth';
import { conSesion } from './sesion';

// Error con el detalle por campo que devuelve el backend, para marcar cada campo del formulario
export class ErrorPerfil extends Error {
  errores: Record<string, string>;
  status: number;

  constructor(mensaje: string, errores: Record<string, string> = {}, status = 0) {
    super(mensaje);
    this.name = 'ErrorPerfil';
    this.errores = errores;
    this.status = status;
  }
}

async function pedir<T>(ruta: string, opciones: RequestInit = {}): Promise<{ data: T; message: string }> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      ...opciones,
      ...conSesion(opciones, { 'Content-Type': 'application/json' }),
    });
  } catch {
    throw new ErrorPerfil('No pudimos conectarnos con el servidor. Probá de nuevo en un momento.');
  }
  const cuerpo = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new ErrorPerfil(cuerpo.message || 'No se pudo completar la operación', cuerpo.errores || {}, respuesta.status);
  return { data: cuerpo.data as T, message: cuerpo.message || '' };
}

export type DatosPerfil = {
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  telefono: string;
  passwordActual?: string;
};

export type Perfil = User & { emailPendiente?: string; updatedAt?: string };

export const getPerfil = async () => (await pedir<Perfil>('/users/me')).data;

// Guarda los datos. Si cambió el email, queda pendiente hasta confirmarlo desde el mail que llega a esa casilla.
export async function guardarPerfil(datos: DatosPerfil) {
  const { data, message } = await pedir<{ user: Perfil; emailPendiente?: string; enlaceDev?: string }>('/users/me', {
    method: 'PUT',
    body: JSON.stringify(datos),
  });
  return { ...data, mensaje: message };
}

// HU-31: cambia la contraseña escribiendo la actual. Las otras sesiones se cierran; esta sigue (el backend renueva la cookie).
export async function cambiarPassword(actual: string, nueva: string) {
  const { data, message } = await pedir<{ user: Perfil }>('/users/me/password', { method: 'PUT', body: JSON.stringify({ actual, nueva }) });
  return { user: data?.user, mensaje: message };
}

// Manda al email de la cuenta el enlace para elegir una contraseña nueva
export async function pedirCambioPassword() {
  const { data, message } = await pedir<{ enlaceDev?: string }>('/users/me/password', { method: 'POST' });
  return { enlaceDev: data?.enlaceDev, mensaje: message };
}

// Cierra la sesión en todos los dispositivos. El actual queda con una sesión nueva (el backend cambia la cookie).
export async function cerrarSesionesEnTodos() {
  const { data, message } = await pedir<{ user: Perfil }>('/auth/cerrar-sesiones', { method: 'POST' });
  return { user: data?.user, mensaje: message };
}

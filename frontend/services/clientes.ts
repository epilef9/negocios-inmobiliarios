import { conSesion } from './sesion';
// Panel de clientes del administrador: propietarios e inquilinos vinculados a propiedades

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:4000/api');

// La propiedad ya tiene a alguien en ese rol: hay que confirmar antes de reemplazarlo
export class YaAsignadoError extends Error {
  actual: string;

  constructor(mensaje: string, actual: string) {
    super(mensaje);
    this.name = 'YaAsignadoError';
    this.actual = actual;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    ...conSesion(options, { 'Content-Type': 'application/json', ...(options.headers as Record<string, string> | undefined) }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (body.code === 'YA_ASIGNADO') throw new YaAsignadoError(body.message, body.actual ?? '');
    throw new Error(body.message ?? 'No se pudo completar la operación');
  }
  return body.data as T;
}

export type RolCliente = 'propietario' | 'inquilino';

export interface PropiedadDeCliente {
  id: string;
  titulo: string;
  direccion: string;
  estado: string;
  operacion: string | null;
  imagen: string | null;
  // Solo en las propiedades de las que es dueño: quién la alquila
  inquilino?: { nombre: string; telefono: string; email: string } | null;
  // Solo en las que alquila: si el dato salió de la propiedad o de un contrato vigente
  origen?: 'propiedad' | 'contrato';
}

export interface ClientePanel {
  id: string;
  usuarioId: string | null;
  registrado: boolean;
  nombre: string;
  email: string;
  telefono: string;
  propietarioDe: PropiedadDeCliente[];
  alquilaEn: PropiedadDeCliente[];
}

export interface PropiedadParaAsignar {
  id: string;
  titulo: string;
  direccion: string;
  estado: string;
  propietario: string | null;
  propietarioUsuarioId: string | null;
  propietarioNombre: string | null;
  propietarioDni: string;
  inquilino: string | null;
}

export interface UsuarioRegistrado {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  dni: string;
  emailVerificado: boolean;
  creadoEn: string | null;
}

export interface PanelClientes {
  clientes: ClientePanel[];
  propiedades: PropiedadParaAsignar[];
  usuarios: UsuarioRegistrado[];
  resumen: { cuentas: number; propietarios: number; inquilinos: number; registrados: number; propiedadesSinPropietario: number };
}

// Quién es: alguien con cuenta (usuarioId) o una persona cargada a mano; null quita la asignación
export type PersonaAsignada = { usuarioId: string } | { nombre: string; email?: string; telefono?: string } | null;

export const getPanelClientes = () => request<PanelClientes>('/clients/panel');

export const asignarPersona = (propiedadId: string, rol: RolCliente, persona: PersonaAsignada, reemplazar = false) =>
  request<{ estado: string }>(`/clients/propiedades/${encodeURIComponent(propiedadId)}/${rol}`, {
    method: 'PUT',
    body: JSON.stringify({ persona, reemplazar }),
  });

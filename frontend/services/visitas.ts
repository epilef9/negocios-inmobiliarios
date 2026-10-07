import { request } from './api';

export type EstadoVisita = 'pendiente' | 'confirmada' | 'reprogramada' | 'rechazada';

export interface Visita {
  id: string;
  _id?: string;
  cliente: {
    nombre: string;
    telefono: string;
    email?: string;
    iniciales: string;
  };
  propiedad: {
    id?: string;
    titulo: string;
    direccion?: string;
    precio?: string;
  };
  fecha: string; // formato "DD/MM/YYYY" o "YYYY-MM-DD"
  horario: string; // formato "10:30 h"
  estado: EstadoVisita;
  notaAdicional?: string;
  motivoRechazo?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface VisitaFiltros {
  estado?: string;
  fecha?: string;
  search?: string;
}

function normalizeVisita(raw: any): Visita {
  const id = raw.id || raw._id || '';
  const iniciales =
    raw.cliente?.iniciales ||
    raw.cliente?.nombre
      ?.split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w: string) => w[0]?.toUpperCase() || '')
      .join('') ||
    'CL';

  return {
    id,
    _id: id,
    cliente: {
      nombre: raw.cliente?.nombre || '',
      telefono: raw.cliente?.telefono || '',
      email: raw.cliente?.email || '',
      iniciales,
    },
    propiedad: {
      id: raw.propiedad?.id || '',
      titulo: raw.propiedad?.titulo || '',
      direccion: raw.propiedad?.direccion || '',
      precio: raw.propiedad?.precio || '',
    },
    fecha: raw.fecha || '',
    horario: raw.horario || '',
    estado: (raw.estado as EstadoVisita) || 'pendiente',
    notaAdicional: raw.notaAdicional || '',
    motivoRechazo: raw.motivoRechazo || '',
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

/**
 * Obtiene todas las visitas desde la base de datos (con soporte de filtros opcionales)
 */
export async function getVisitas(filtros: VisitaFiltros = {}): Promise<Visita[]> {
  const params = new URLSearchParams();
  if (filtros.estado && filtros.estado !== 'todos') {
    params.set('estado', filtros.estado);
  }
  if (filtros.fecha && filtros.fecha !== 'todas') {
    params.set('fecha', filtros.fecha);
  }
  if (filtros.search?.trim()) {
    params.set('search', filtros.search.trim());
  }

  const query = params.toString() ? `?${params.toString()}` : '';
  const data = await request<any[]>(`/visitas${query}`);
  return Array.isArray(data) ? data.map(normalizeVisita) : [];
}

/**
 * Obtiene una visita específica por su ID
 */
export async function getVisitaById(id: string): Promise<Visita> {
  const data = await request<any>(`/visitas/${id}`);
  return normalizeVisita(data);
}

/**
 * Crea una nueva visita en la base de datos
 */
export async function createVisita(nueva: Omit<Visita, 'id' | '_id' | 'createdAt' | 'updatedAt'>): Promise<Visita> {
  const data = await request<any>('/visitas', {
    method: 'POST',
    body: JSON.stringify(nueva),
  });
  return normalizeVisita(data);
}

/**
 * Actualiza una visita existente
 */
export async function updateVisita(id: string, actualizacion: Partial<Visita>): Promise<Visita> {
  const data = await request<any>(`/visitas/${id}`, {
    method: 'PUT',
    body: JSON.stringify(actualizacion),
  });
  return normalizeVisita(data);
}

/**
 * Actualiza el estado de una visita (confirmar, reprogramar, rechazar)
 */
export async function updateVisitaEstado(
  id: string,
  estado: EstadoVisita,
  extra?: { nuevaFecha?: string; nuevoHorario?: string; motivo?: string }
): Promise<Visita> {
  const data = await request<any>(`/visitas/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({
      estado,
      ...(extra?.nuevaFecha ? { nuevaFecha: extra.nuevaFecha } : {}),
      ...(extra?.nuevoHorario ? { nuevoHorario: extra.nuevoHorario } : {}),
      ...(extra?.motivo !== undefined ? { motivo: extra.motivo } : {}),
    }),
  });
  return normalizeVisita(data);
}

/**
 * Elimina una visita de la base de datos
 */
export async function deleteVisita(id: string): Promise<void> {
  await request<void>(`/visitas/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Restablece las visitas en la base de datos con los datos de ejemplo iniciales
 */
export async function resetVisitasToDefault(): Promise<Visita[]> {
  const data = await request<any[]>('/visitas/reset', {
    method: 'POST',
  });
  return Array.isArray(data) ? data.map(normalizeVisita) : [];
}

// Aliases para compatibilidad
export const addVisita = createVisita;
export const getStoredVisitas = getVisitas;

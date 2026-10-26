import { request } from './api';

// Disponibilidad de propiedades de alquiler temporario. Cada rango marca noches no disponibles:
// `desde` es la primera noche y `hasta` el día de salida (no se cuenta).

export type TipoRango = 'bloqueo' | 'ocupada' | 'reserva';

export interface RangoDisponibilidad {
  id: string;
  propiedad: string;
  desde: string; // "AAAA-MM-DD"
  hasta: string; // "AAAA-MM-DD"
  tipo: TipoRango;
  motivo: string;
  // Reserva del sitio que retiene o ocupa estas noches (HU-20): no se borra desde Disponibilidad
  reserva: string | null;
  // Solo en las retenciones por confirmar
  venceEn: string | null;
}

// Lo que ve el público: solo qué noches están tomadas, y cuáles todavía esperan confirmación
export interface DisponibilidadPublica {
  ocupadas: { desde: string; hasta: string; porConfirmar?: boolean }[];
  minimoNoches: number;
  precioPorNocheUSD: number | null;
  // Horas que tiene la inmobiliaria para confirmar una reserva (o hasta las 12 del día de entrada)
  plazoConfirmacionHoras?: number;
  hoy: string;
  hasta: string;
}

// Como llega del servidor (puede traer _id en vez de id)
type RangoCrudo = Partial<RangoDisponibilidad> & { _id?: string };

function normalizeRango(raw: RangoCrudo): RangoDisponibilidad {
  return {
    id: raw.id || raw._id || '',
    propiedad: String(raw.propiedad || ''),
    desde: raw.desde || '',
    hasta: raw.hasta || '',
    tipo: (raw.tipo as TipoRango) || 'bloqueo',
    motivo: raw.motivo || '',
    reserva: raw.reserva ? String(raw.reserva) : null,
    venceEn: raw.venceEn || null,
  };
}

/**
 * Noches ocupadas, estadía mínima y precio por noche de una propiedad (público)
 */
export function getDisponibilidad(propiedadId: string): Promise<DisponibilidadPublica> {
  return request<DisponibilidadPublica>(`/disponibilidad/${propiedadId}`);
}

/**
 * Rangos completos (con tipo y motivo) de una propiedad, para el panel
 */
export async function getRangos(propiedadId: string): Promise<RangoDisponibilidad[]> {
  const data = await request<RangoCrudo[]>(`/disponibilidad/${propiedadId}/rangos`);
  return Array.isArray(data) ? data.map(normalizeRango) : [];
}

/**
 * Marca un rango de noches como bloqueado u ocupado
 */
export async function createRango(nuevo: Omit<RangoDisponibilidad, 'id' | 'reserva' | 'venceEn'>): Promise<RangoDisponibilidad> {
  const data = await request<RangoCrudo>('/disponibilidad', {
    method: 'POST',
    body: JSON.stringify(nuevo),
  });
  return normalizeRango(data);
}

/**
 * Libera un rango
 */
export async function deleteRango(id: string): Promise<void> {
  await request<void>(`/disponibilidad/${id}`, { method: 'DELETE' });
}

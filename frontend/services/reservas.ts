import { request } from './api';

// Reservas de estadías en alquiler temporario (HU-20). Fechas como texto "AAAA-MM-DD":
// `entrada` es la primera noche y `salida` el día en que se va (no se cuenta).

export type EstadoReserva = 'pendiente' | 'confirmada' | 'rechazada' | 'vencida' | 'cancelada';

export interface CambioReserva {
  estado: EstadoReserva;
  fecha: string;
  por: 'cliente' | 'admin' | 'sistema';
  nota: string;
}

export interface Reserva {
  id: string;
  // En Mi cuenta llega con la foto y el título actuales; en el panel, solo el id
  propiedad: string | { _id: string; title?: string; images?: string[]; ciudad?: string; location?: string } | null;
  tituloPropiedad: string;
  cliente?: { nombre: string; email: string; telefono: string };
  entrada: string;
  salida: string;
  noches: number;
  huespedes: number;
  precioPorNocheUSD: number;
  limpiezaUSD: number;
  totalUSD: number;
  estado: EstadoReserva;
  venceEn: string;
  motivoRechazo: string;
  historial: CambioReserva[];
  createdAt: string;
  // Solo en las vencidas del panel: si las noches siguen libres y se puede confirmar igual
  sePuedeReactivar?: boolean;
}

type ReservaCruda = Partial<Reserva> & { _id?: string };

function normalizar(raw: ReservaCruda): Reserva {
  return {
    id: raw.id || raw._id || '',
    propiedad: raw.propiedad ?? null,
    tituloPropiedad: raw.tituloPropiedad || '',
    cliente: raw.cliente,
    entrada: raw.entrada || '',
    salida: raw.salida || '',
    noches: raw.noches || 0,
    huespedes: raw.huespedes || 0,
    precioPorNocheUSD: raw.precioPorNocheUSD || 0,
    limpiezaUSD: raw.limpiezaUSD || 0,
    totalUSD: raw.totalUSD || 0,
    estado: raw.estado || 'pendiente',
    venceEn: raw.venceEn || '',
    motivoRechazo: raw.motivoRechazo || '',
    historial: raw.historial || [],
    createdAt: raw.createdAt || '',
    sePuedeReactivar: raw.sePuedeReactivar,
  };
}

const lista = (data: unknown) => (Array.isArray(data) ? (data as ReservaCruda[]).map(normalizar) : []);

// Id de la propiedad, venga como texto o con sus datos
export const idPropiedad = (r: Reserva) => (typeof r.propiedad === 'string' ? r.propiedad : r.propiedad?._id || '');

/**
 * Pide una estadía (cliente con sesión). Queda pendiente hasta que la confirme la inmobiliaria.
 */
export async function crearReserva(pedido: { propiedad: string; entrada: string; salida: string; huespedes: number }): Promise<Reserva> {
  return normalizar(await request<ReservaCruda>('/reservas', { method: 'POST', body: JSON.stringify(pedido) }));
}

/**
 * Las reservas del cliente con sesión (Mi cuenta)
 */
export async function getMisReservas(): Promise<Reserva[]> {
  return lista(await request<unknown>('/reservas/mias'));
}

/**
 * El cliente cancela una reserva suya que todavía está pendiente
 */
export async function cancelarReserva(id: string): Promise<Reserva> {
  return normalizar(await request<ReservaCruda>(`/reservas/${id}/cancelar`, { method: 'PATCH' }));
}

/**
 * Todas las reservas, para el panel (opcionalmente de un estado)
 */
export async function getReservas(estado?: EstadoReserva): Promise<Reserva[]> {
  return lista(await request<unknown>(`/reservas${estado ? `?estado=${estado}` : ''}`));
}

/**
 * Cantidad de reservas esperando confirmación (contador de la barra lateral)
 */
export async function getCantidadPendientes(): Promise<number> {
  const data = await request<{ pendientes: number }>('/reservas/pendientes/cantidad');
  return data?.pendientes ?? 0;
}

export async function confirmarReserva(id: string): Promise<Reserva> {
  return normalizar(await request<ReservaCruda>(`/reservas/${id}/confirmar`, { method: 'PATCH' }));
}

export async function rechazarReserva(id: string, motivo: string): Promise<Reserva> {
  return normalizar(await request<ReservaCruda>(`/reservas/${id}/rechazar`, { method: 'PATCH', body: JSON.stringify({ motivo }) }));
}

// Evento de ventana que avisa a la barra lateral del panel que cambió la cantidad de pendientes
export const EVENTO_RESERVAS = 'reservas-cambiaron';

// Total de una estadía, con la misma regla que el servidor: noches × precio + limpieza (si tiene costo)
export function calcularTotal(noches: number, precioPorNocheUSD: number, costoLimpiezaUSD?: number | null) {
  const redondear = (n: number) => Math.round(n * 100) / 100;
  const alojamiento = redondear(noches * precioPorNocheUSD);
  const limpieza = costoLimpiezaUSD && costoLimpiezaUSD > 0 ? redondear(costoLimpiezaUSD) : 0;
  return { alojamiento, limpieza, total: redondear(alojamiento + limpieza) };
}

// "USD 1.250" (sin decimales si no hacen falta)
export const usd = (n: number) => `USD ${n.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;

// Horas que faltan para el vencimiento (negativo si ya pasó)
export const horasRestantes = (venceEn: string, ahora = Date.now()) => (Date.parse(venceEn) - ahora) / 3600000;

// "jueves 24 de octubre, 12:00 h" en hora de Argentina
export const fechaHoraArgentina = (iso: string) =>
  new Date(iso).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }) + ' h';

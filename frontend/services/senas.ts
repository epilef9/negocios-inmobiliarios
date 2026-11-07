import { request, type ApiProperty } from './api';
import { avisarPendientes } from './panel';

// Después de cada cambio se actualiza el número del menú del panel
const yAvisar = <T,>(p: Promise<T>) => p.then((r) => (avisarPendientes(), r));

// HU-13: reservas con seña de propiedades en venta o alquiler (las registra el administrador)

export type EstadoSena = 'activa' | 'concretada' | 'cancelada' | 'vencida';

export type Sena = {
  _id: string;
  propiedad: (Pick<ApiProperty, '_id' | 'titulo' | 'fotos' | 'estado' | 'categoriaOperacion' | 'operaciones' | 'precio' | 'moneda'>) | string | null;
  tituloPropiedad: string;
  operacion: 'venta' | 'alquiler';
  cliente: { nombre: string; email?: string; telefono?: string };
  sena: { monto: number; moneda: 'USD' | 'ARS'; recibidaEl: string };
  fechaLimite: string;
  estado: EstadoSena;
  notas?: string;
  cierre?: string;
  cerradaEl?: string | null;
  // Estado de la propiedad antes de la reserva: «alquilado» si es la venta de una propiedad con inquilino (HU-28)
  estadoAnterior?: 'disponible' | 'alquilado';
  createdAt: string;
};

export type NuevaSena = {
  propiedad: string;
  // HU-25: con venta y alquiler hay que decir cuál se reserva
  operacion?: 'venta' | 'alquiler';
  cliente: { nombre: string; email?: string; telefono?: string };
  sena: { monto: number; moneda: 'USD' | 'ARS' };
  fechaLimite: string;
  notas?: string;
};

export const getSenas = (estado?: EstadoSena) => request<Sena[]>(`/senas${estado ? `?estado=${estado}` : ''}`);
export const crearSena = (datos: NuevaSena) => yAvisar(request<Sena>('/senas', { method: 'POST', body: JSON.stringify(datos) }));
export const concretarSena = (id: string, cierre = '') => yAvisar(request<Sena>(`/senas/${id}/concretar`, { method: 'PATCH', body: JSON.stringify({ cierre }) }));
export const cancelarSena = (id: string, cierre = '') => yAvisar(request<Sena>(`/senas/${id}/cancelar`, { method: 'PATCH', body: JSON.stringify({ cierre }) }));
export const extenderSena = (id: string, fechaLimite: string) => yAvisar(request<Sena>(`/senas/${id}/extender`, { method: 'PATCH', body: JSON.stringify({ fechaLimite }) }));

export const montoSena = (s: Pick<Sena, 'sena'>) => `${s.sena.moneda} ${Math.round(s.sena.monto).toLocaleString('es-AR')}`;

// "AAAA-MM-DD" del formulario → fin de ese día en Argentina (UTC-3), para que la reserva dure el día entero
export const finDelDiaArgentina = (iso: string) => `${iso}T23:59:00-03:00`;

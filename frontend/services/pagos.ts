import { API_URL, request } from './api';
import type { Banco } from './ajustes';
import { avisarPendientes } from './panel';

// HU-41: pago de reservas con Mercado Pago o transferencia. El monto lo calcula el servidor.

export type EstadoPago = 'pendiente' | 'en_revision' | 'aprobado' | 'rechazado' | 'cancelado';
export type Pago = { id: string; reserva: string; metodo: 'mercadopago' | 'transferencia'; estado: EstadoPago; montoARS: number; montoUSD: number; nota?: string; createdAt: string };
export type PagoAdmin = Pago & { tieneComprobante: boolean; mpEstado?: string };
export type OpcionesPago = { montoUSD: number; cotizacion: number; montoARS: number; mercadoPago: boolean; transferencia: Banco | null; pagoActual: Pago | null };

export const getMisPagos = () => request<Pago[]>('/pagos/mios');
export const getOpcionesPago = (reservaId: string) => request<OpcionesPago>(`/pagos/reserva/${reservaId}`);
export const pagarConMercadoPago = (reservaId: string) => request<{ url: string }>(`/pagos/reserva/${reservaId}/mercadopago`, { method: 'POST', body: JSON.stringify({}) });
export function subirComprobante(reservaId: string, archivo: File) {
  const datos = new FormData();
  datos.append('comprobante', archivo);
  return request<Pago>(`/pagos/reserva/${reservaId}/comprobante`, { method: 'POST', body: datos });
}

export const getPagosAdmin = () => request<PagoAdmin[]>('/pagos');
export const urlComprobante = (pagoId: string) => `${API_URL}/pagos/${pagoId}/comprobante`;
export const aprobarPago = (id: string, nota = '') =>
  request<Pago>(`/pagos/${id}/aprobar`, { method: 'PATCH', body: JSON.stringify({ nota }) }).then((p) => (avisarPendientes(), p));
export const rechazarPago = (id: string, nota = '') =>
  request<Pago>(`/pagos/${id}/rechazar`, { method: 'PATCH', body: JSON.stringify({ nota }) }).then((p) => (avisarPendientes(), p));

export const ESTADO_PAGO: Record<EstadoPago, string> = {
  pendiente: 'Pago iniciado',
  en_revision: 'Comprobante en revisión',
  aprobado: 'Pagada',
  rechazado: 'Pago rechazado',
  cancelado: 'Pago cancelado',
};

export const pesos = (n: number) => `ARS ${Math.round(n).toLocaleString('es-AR')}`;

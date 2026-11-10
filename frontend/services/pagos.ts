import { API_URL, request } from './api';
import type { Banco } from './ajustes';
import { avisarPendientes } from './panel';

// HU-41: pago de estadías con Mercado Pago o transferencia. Se paga una seña (para reservar los días) o el total;
// con la seña pagada queda el saldo. Los montos los calcula el servidor. En los dos casos el cliente sube la foto
// del comprobante, que llega a Panel → Cobros → Pagos de estadías.

export type EstadoPago = 'pendiente' | 'en_revision' | 'aprobado' | 'rechazado' | 'cancelado';
export type TipoPago = 'sena' | 'total' | 'saldo';
export type Pago = {
  id: string;
  reserva: string;
  metodo: 'mercadopago' | 'transferencia';
  tipo: TipoPago;
  estado: EstadoPago;
  montoARS: number;
  montoUSD: number;
  nota?: string;
  tieneComprobante: boolean;
  informadoPorMP: boolean;
  createdAt: string;
};
export type EstadiaDelPago = { titulo: string; cliente: string; email: string; telefono: string; entrada: string; salida: string; noches: number; totalUSD: number; estado: string };
export type PagoAdmin = Pago & { mpEstado?: string; mpPago?: string; aprobadoEn?: string; estadia: EstadiaDelPago | null };
export type MontoAPagar = { tipo: TipoPago; montoUSD: number; montoARS: number };
export type OpcionesPago = {
  totalUSD: number;
  pagadoUSD: number;
  restanteUSD: number;
  senaPorcentaje: number;
  cotizacion: number;
  montos: MontoAPagar[];
  mercadoPago: boolean;
  transferencia: Banco | null;
  pagoActual: Pago | null;
};

export const getMisPagos = () => request<Pago[]>('/pagos/mios');
export const getOpcionesPago = (reservaId: string) => request<OpcionesPago>(`/pagos/reserva/${reservaId}`);
export const pagarConMercadoPago = (reservaId: string, tipo: TipoPago) =>
  request<{ url: string; pago: string }>(`/pagos/reserva/${reservaId}/mercadopago`, { method: 'POST', body: JSON.stringify({ tipo }) });
export function subirComprobante(reservaId: string, archivo: File, tipo: TipoPago) {
  const datos = new FormData();
  datos.append('tipo', tipo);
  datos.append('comprobante', archivo);
  return request<Pago>(`/pagos/reserva/${reservaId}/comprobante`, { method: 'POST', body: datos });
}
// Al volver de Mercado Pago: el servidor consulta el pago a Mercado Pago con el número que trae la dirección
export const verificarPagoMP = (pagoId: string, paymentId: string) =>
  request<Pago>(`/pagos/${pagoId}/verificar`, { method: 'POST', body: JSON.stringify({ paymentId }) });
export function subirComprobanteMP(pagoId: string, archivo: File) {
  const datos = new FormData();
  datos.append('comprobante', archivo);
  return request<Pago>(`/pagos/${pagoId}/comprobante`, { method: 'POST', body: datos });
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
  aprobado: 'Acreditado',
  rechazado: 'Pago rechazado',
  cancelado: 'Pago cancelado',
};

export const TIPO_PAGO: Record<TipoPago, string> = { sena: 'Seña', total: 'Total', saldo: 'Saldo' };
export const METODO_PAGO: Record<Pago['metodo'], string> = { mercadopago: 'Mercado Pago', transferencia: 'Transferencia' };

// Cuánto se pagó de una reserva (pagos acreditados) y el último pago que no se canceló
export function cuentaDeReserva(pagos: Pago[], reservaId: string, totalUSD: number) {
  const deLaReserva = pagos.filter((p) => p.reserva === reservaId);
  const pagadoUSD = Math.round(deLaReserva.filter((p) => p.estado === 'aprobado').reduce((s, p) => s + p.montoUSD, 0) * 100) / 100;
  return { pagadoUSD, restanteUSD: Math.max(0, Math.round((totalUSD - pagadoUSD) * 100) / 100), pagos: deLaReserva };
}

// Pagos con Mercado Pago a los que les falta la foto del comprobante
export const faltaComprobanteMP = (p: Pago) => p.metodo === 'mercadopago' && !p.tieneComprobante && (p.estado === 'aprobado' || p.estado === 'pendiente');

export const pesos = (n: number) => `ARS ${Math.round(n).toLocaleString('es-AR')}`;
export const dolares = (n: number) => `USD ${n.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;

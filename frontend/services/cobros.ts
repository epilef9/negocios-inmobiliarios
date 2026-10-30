import { request } from './api';
import { avisarPendientes } from './panel';

// Cobro mensual de alquileres: qué inquilinos pagaron cada mes, los atrasados y el recibo de cada pago

const yAvisar = <T,>(p: Promise<T>) => p.then((r) => (avisarPendientes(), r));

export type EstadoCobro = 'pagado' | 'pendiente' | 'atrasado';
export type MedioPago = 'efectivo' | 'transferencia' | 'otro';
export type Moneda = 'ARS' | 'USD';

export type Cobro = {
  id: string;
  estado: 'pendiente' | 'pagado';
  monto?: number;
  moneda: Moneda;
  pagadoEl: string | null;
  medio: MedioPago | null;
  nota: string;
  numeroRecibo: number | null;
  avisadoEl: string | null;
};

export type FilaCobro = {
  contrato: {
    id: string;
    numero: string;
    propiedad: string;
    direccion: string;
    inquilino: string;
    email: string;
    telefono: string;
    ajuste: string;
    diaVencimiento: number;
    montoContrato: string;
  };
  periodo: string;
  monto: number | null;
  moneda: Moneda;
  actualizadoDesde: string | null;
  actualiza: boolean;
  estado: EstadoCobro;
  cobro: Cobro | null;
  mesesAdeudados: string[];
};

export type ListaCobros = { periodo: string; hoy: string; filas: FilaCobro[] };

export type Recibo = {
  id: string;
  numeroRecibo: number;
  periodo: string;
  monto: number;
  moneda: Moneda;
  pagadoEl: string;
  medio: MedioPago;
  nota: string;
  numeroContrato: string;
  inquilino: string;
  propietario: string;
  propiedad: { titulo: string; direccion: string };
};

export const getCobros = (periodo: string) => request<ListaCobros>(`/cobros?periodo=${encodeURIComponent(periodo)}`);
export const getRecibo = (id: string) => request<Recibo>(`/cobros/recibo/${id}`);

export const registrarPago = (contrato: string, periodo: string, datos: { pagadoEl: string; medio: MedioPago; monto?: number; nota?: string }) =>
  yAvisar(request<Cobro>(`/cobros/${contrato}/${periodo}/pago`, { method: 'POST', body: JSON.stringify(datos) }));
export const anularPago = (contrato: string, periodo: string) =>
  yAvisar(request<Cobro>(`/cobros/${contrato}/${periodo}/pago`, { method: 'DELETE' }));
export const avisarAtraso = (contrato: string, periodo: string) => request<Cobro>(`/cobros/${contrato}/${periodo}/aviso`, { method: 'POST' });
export const actualizarMonto = (contrato: string, datos: { desde: string; porcentaje?: number; monto?: number; indice?: string }) =>
  yAvisar(request<{ desde: string; monto: number; anterior: number | null }>(`/cobros/actualizaciones/${contrato}`, { method: 'POST', body: JSON.stringify(datos) }));

export const MEDIOS: Record<MedioPago, string> = { efectivo: 'Efectivo', transferencia: 'Transferencia', otro: 'Otro' };

export const dinero = (monto: number | null | undefined, moneda: Moneda) =>
  monto === null || monto === undefined ? '—' : `${moneda} ${monto.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;

// «2026-11» → «noviembre de 2026»
export const nombreMes = (periodo: string) =>
  new Date(`${periodo}-15T12:00:00Z`).toLocaleDateString('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export const moverMes = (periodo: string, meses: number) => {
  const [a, m] = periodo.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1 + meses, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

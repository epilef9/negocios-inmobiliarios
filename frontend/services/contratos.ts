import { conSesion } from './sesion';
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:4000/api');

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    ...conSesion(options, { 'Content-Type': 'application/json', ...(options.headers as Record<string, string> | undefined) }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message ?? 'No se pudo completar la operación');
  }
  return body.data as T;
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type EstadoContrato = 'activo' | 'firmado' | 'finalizado' | 'cancelado' | 'por_vencer' | 'vencido' | 'borrador';

export type PersonaContrato = {
  nombre?: string;
  apellido?: string;
  dni?: string;
  cuil?: string;
  domicilio?: string;
  localidad?: string;
  provincia?: string;
  telefono?: string;
  email?: string;
};

export type PropietarioContrato = {
  nombre?: string;
  apellido?: string;
  dni?: string;
  domicilio?: string;
  telefono?: string;
  email?: string;
};

export interface Contrato {
  _id: string;
  numeroContrato: string;
  codigoId?: string;
  cliente: {
    usuario?: string;
    nombre: string;
    apellido?: string;
    dni?: string;
    cuil?: string;
    domicilio?: string;
    localidad?: string;
    provincia?: string;
    telefono: string;
    email?: string;
  };
  cotitular?: PersonaContrato | null;
  garante?: PersonaContrato | null;
  tipoGarantia?: 'propietaria' | 'caucion';
  propietario?: PropietarioContrato | null;
  solicitud?: string | null;
  publicacion?: string | null;
  propiedad: {
    id?: string;
    titulo: string;
    direccion: string;
  };
  fechaInicio: string;
  fechaFin: string;
  montoMensual: string;
  estado: EstadoContrato;
  tipoContrato?: string;
  plantilla?: string;
  duracionMeses?: number;
  depositoGarantia?: string;
  ajuste?: string;
  comision?: string;
  incluyeGarante?: boolean;
  permitirEdicionManual?: boolean;
  observaciones?: string;
  locadora?: string;
  locadoraUsuario?: string;
  locadoraDni?: string;
  ultimaActualizacion?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ContratoInput = Omit<Contrato, '_id' | 'createdAt' | 'updatedAt'>;

export type PersonaDesdeSolicitud = {
  nombre: string;
  apellido: string;
  dni: string;
  cuil: string;
  fechaNacimiento: string;
  email: string;
  telefono: string;
  domicilio: string;
  localidad: string;
  provincia: string;
  ocupacion: string;
  ingresosMensuales: string;
};

export type SolicitudParaContrato = {
  id: string;
  estado: 'pendiente' | 'aprobada';
  operacion: 'alquiler' | 'compra';
  createdAt: string;
  titular: { nombre: string; apellido: string; email?: string; telefono?: string };
  propiedad: { id: string; titulo: string; ciudad?: string } | null;
};

export type DatosSolicitudParaContrato = {
  solicitud: {
    id: string;
    operacion: 'alquiler' | 'compra';
    estado: 'pendiente' | 'aprobada' | 'rechazada';
    createdAt: string;
    usuarioId: string;
  };
  // true cuando los datos cifrados de la solicitud no se pudieron leer y hay que completarlos a mano
  datosIlegibles: boolean;
  titular: PersonaDesdeSolicitud;
  cotitular: PersonaDesdeSolicitud | null;
  garantia: {
    tipo: 'propietaria' | 'caucion';
    localidadPropiedad: string;
    garante: PersonaDesdeSolicitud | null;
  } | null;
  propiedad: {
    id: string;
    titulo: string;
    direccion: string;
    ciudad: string;
    tipoInmueble: string;
    operacion: string;
    precio: number | null;
    moneda: 'ARS' | 'USD' | null;
  } | null;
  propietario: {
    usuarioId: string;
    nombre: string;
    apellido: string;
    dni: string;
    domicilio: string;
    telefono: string;
    email: string;
  } | null;
  publicacionId: string;
  origenPropietario: 'publicacion' | 'propiedad' | null;
};

// ─── API Functions ────────────────────────────────────────────────────────────

export const getContratos = (estado?: string): Promise<Contrato[]> => {
  const query = estado && estado !== 'todos' ? `?estado=${encodeURIComponent(estado)}` : '';
  return request<Contrato[]>(`/contratos${query}`);
};

export const getContratoById = (id: string): Promise<Contrato> =>
  request<Contrato>(`/contratos/${id}`);

// Solicitudes aprobadas (primero) y pendientes para precargar un contrato desde el panel
export const getSolicitudesParaContrato = (): Promise<SolicitudParaContrato[]> =>
  request<SolicitudParaContrato[]>('/contratos/solicitudes');

export const getDatosDeSolicitud = (id: string): Promise<DatosSolicitudParaContrato> =>
  request<DatosSolicitudParaContrato>(`/contratos/datos-de-solicitud/${encodeURIComponent(id)}`);

export const createContrato = (data: ContratoInput): Promise<Contrato> =>
  request<Contrato>('/contratos', { method: 'POST', body: JSON.stringify(data) });

export const updateContrato = (id: string, data: Partial<ContratoInput>): Promise<Contrato> =>
  request<Contrato>(`/contratos/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteContrato = (id: string): Promise<void> =>
  request<void>(`/contratos/${id}`, { method: 'DELETE' });

// ─── Helper: generar número de contrato único ─────────────────────────────────

export function generarNumeroContrato(): string {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `CT-${num}`;
}

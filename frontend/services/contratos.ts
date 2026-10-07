const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message ?? 'No se pudo completar la operación');
  }
  return body.data as T;
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type EstadoContrato = 'activo' | 'finalizado' | 'cancelado' | 'por_vencer' | 'borrador';

export interface Contrato {
  _id: string;
  numeroContrato: string;
  codigoId?: string;
  cliente: {
    nombre: string;
    telefono: string;
    email?: string;
  };
  propiedad: {
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
  ultimaActualizacion?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ContratoInput = Omit<Contrato, '_id' | 'createdAt' | 'updatedAt'>;

// ─── API Functions ────────────────────────────────────────────────────────────

export const getContratos = (estado?: string): Promise<Contrato[]> => {
  const query = estado && estado !== 'todos' ? `?estado=${encodeURIComponent(estado)}` : '';
  return request<Contrato[]>(`/contratos${query}`);
};

export const getContratoById = (id: string): Promise<Contrato> =>
  request<Contrato>(`/contratos/${id}`);

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

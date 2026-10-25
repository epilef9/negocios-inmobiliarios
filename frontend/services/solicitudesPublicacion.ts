import { request } from './api';

export type EstadoSolicitudPublicacion = 'pendiente' | 'aprobada' | 'rechazada';
export type DocumentosPublicacion = {
  dni: string;
  escritura: string;
  impuestos: string;
  planos: string;
  reglamento: string;
};

export interface SolicitudPublicacion {
  _id: string;
  cliente: {
    _id: string;
    nombre?: string;
    apellido?: string;
    email?: string;
    telefono?: string;
    dni?: string;
  } | string;
  contacto: {
    nombre?: string;
    apellido?: string;
    email?: string;
    telefono?: string;
    dni?: string;
  };
  tipoPropiedad: 'casa' | 'departamento' | 'terreno' | 'local' | 'monoambiente' | 'oficina' | 'cochera' | 'otro';
  operacion: 'venta' | 'alquiler' | 'temporario';
  titulo?: string;
  direccion: string;
  ciudad?: string;
  provincia?: string;
  referenciasUbicacion?: string;
  expensas?: string;
  montoExpensas?: number;
  cochera?: string;
  pisoUnidad?: string;
  comodidades?: string[];
  otrasComodidades?: string;
  ambientes?: number;
  dormitorios?: number;
  banos?: number;
  superficieTotal?: number;
  superficieCubierta?: number;
  precioPretendido: {
    monto: number;
    moneda: 'ARS' | 'USD';
  };
  descripcion?: string;
  fotos?: string[];
  documentos: DocumentosPublicacion;
  estado: EstadoSolicitudPublicacion;
  motivoRechazo?: string;
  propiedadCreada?: {
    _id: string;
    title: string;
    price: number;
    location: string;
  } | string;
  createdAt: string;
  updatedAt: string;
}

export interface CrearSolicitudPayload {
  tipoPropiedad: string;
  operacion: string;
  titulo?: string;
  direccion: string;
  ciudad?: string;
  provincia?: string;
  referenciasUbicacion?: string;
  expensas?: string;
  montoExpensas?: number;
  cochera?: string;
  pisoUnidad?: string;
  comodidades?: string[];
  otrasComodidades?: string;
  ambientes?: number;
  dormitorios?: number;
  banos?: number;
  superficieTotal?: number;
  superficieCubierta?: number;
  precioPretendido: {
    monto: number;
    moneda: 'ARS' | 'USD';
  };
  descripcion?: string;
  fotos?: string[];
  documentos: DocumentosPublicacion;
  contacto?: {
    nombre?: string;
    apellido?: string;
    email?: string;
    telefono?: string;
    dni?: string;
  };
}

export async function enviarSolicitudPublicacion(payload: CrearSolicitudPayload): Promise<SolicitudPublicacion> {
  return request<SolicitudPublicacion>('/solicitudes-publicacion', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getMisSolicitudesPublicacion(): Promise<SolicitudPublicacion[]> {
  return request<SolicitudPublicacion[]>('/solicitudes-publicacion/mis-solicitudes');
}

export async function getSolicitudesPublicacionAdmin(estado?: string): Promise<SolicitudPublicacion[]> {
  const query = estado && estado !== 'todas' ? `?estado=${encodeURIComponent(estado)}` : '';
  return request<SolicitudPublicacion[]>(`/solicitudes-publicacion${query}`);
}

export async function aprobarSolicitudPublicacion(id: string): Promise<{ data: SolicitudPublicacion; propiedadId: string }> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:4000/api');
  const res = await fetch(`${API_URL}/solicitudes-publicacion/${id}/aprobar`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.message || 'No se pudo aprobar la solicitud');
  }
  return { data: body.data, propiedadId: body.propiedadId };
}

export async function rechazarSolicitudPublicacion(id: string, motivo: string): Promise<SolicitudPublicacion> {
  return request<SolicitudPublicacion>(`/solicitudes-publicacion/${id}/rechazar`, {
    method: 'PUT',
    body: JSON.stringify({ motivo }),
  });
}

export async function subirFotosPublicacion(archivos: File[]): Promise<string[]> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const formData = new FormData();
  archivos.forEach((file) => formData.append('fotos', file));

  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:4000/api');
  const response = await fetch(`${API_URL}/solicitudes-publicacion/fotos`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || 'No se pudieron subir las fotos.');
  }

  return body.data as string[];
}

export async function subirDocumentosPublicacion(archivos: File[]): Promise<string[]> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const formData = new FormData();
    archivos.forEach((file) => formData.append('documentos', file));
    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:4000/api');
    const response = await fetch(`${API_URL}/solicitudes-publicacion/documentos`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || 'No se pudieron subir los documentos.');
    return body.data as string[];
}

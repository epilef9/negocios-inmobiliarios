import { API_URL, request } from './api';
import { conSesion } from './sesion';
import { avisarPendientes } from './panel';

export type EstadoSolicitudPublicacion = 'pendiente' | 'aprobada' | 'rechazada';
// Planos y reglamento son opcionales
export type DocumentosPublicacion = {
  dni: string;
  escritura: string;
  impuestos: string;
  planos?: string;
  reglamento?: string;
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

// Con la cookie de sesión y el token CSRF (antes usaba un token de localStorage que ya no existe y el servidor
// rechazaba el pedido). La respuesta trae además el id de la propiedad creada, por eso no usa request().
export async function aprobarSolicitudPublicacion(id: string): Promise<{ data: SolicitudPublicacion; propiedadId: string }> {
  const res = await fetch(`${API_URL}/solicitudes-publicacion/${id}/aprobar`, conSesion({ method: 'PUT' }, { 'Content-Type': 'application/json' }));
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.message || 'No se pudo aprobar la solicitud');
  }
  avisarPendientes();
  return { data: body.data, propiedadId: body.propiedadId };
}

export async function rechazarSolicitudPublicacion(id: string, motivo: string): Promise<SolicitudPublicacion> {
  return request<SolicitudPublicacion>(`/solicitudes-publicacion/${id}/rechazar`, {
    method: 'PUT',
    body: JSON.stringify({ motivo }),
  }).then((s) => {
    avisarPendientes();
    return s;
  });
}

// Usan request(), que manda la cookie de sesión y el token CSRF (con FormData no fija Content-Type)
export async function subirFotosPublicacion(archivos: File[]): Promise<string[]> {
  const formData = new FormData();
  archivos.forEach((file) => formData.append('fotos', file));
  return request<string[]>('/solicitudes-publicacion/fotos', { method: 'POST', body: formData });
}

// Los documentos se suben de a uno (Vercel no acepta pedidos de más de ~4,5 MB); el backend los guarda cifrados
export async function subirDocumentosPublicacion(archivos: File[]): Promise<string[]> {
  const referencias: string[] = [];
  for (const archivo of archivos) {
    const formData = new FormData();
    formData.append('documentos', archivo);
    const [referencia] = await request<string[]>('/solicitudes-publicacion/documentos', { method: 'POST', body: formData });
    referencias.push(referencia);
  }
  return referencias;
}

// Dirección para abrir un documento privado (solo el admin o quien lo subió pueden verlo)
export const urlDocumentoPublicacion = (referencia: string) =>
  `${API_URL}/solicitudes-publicacion/documentos/${encodeURIComponent(referencia.replace(/^privado:/, ''))}`;

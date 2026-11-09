import { request } from './api';

export type EntidadActividad = 'visita' | 'reserva' | 'sena' | 'solicitud' | 'propiedad' | 'publicacion' | 'empleado';

export type RegistroActividad = {
  id: string;
  accion: string;
  entidad: EntidadActividad;
  entidadId: string | null;
  detalle: string;
  por: string;
  rol: string;
  fecha: string;
};

export const getActividadDe = (entidad: EntidadActividad, id: string) => request<RegistroActividad[]>(`/actividad/${entidad}/${encodeURIComponent(id)}`);
export const getActividadReciente = (entidad?: EntidadActividad) => request<RegistroActividad[]>(`/actividad${entidad ? `?entidad=${entidad}` : ''}`);

// «Confirmada por Araceli el 27/10 a las 10:15» (hora de Argentina)
export function textoActividad(r: Pick<RegistroActividad, 'accion' | 'por' | 'fecha'>) {
  const fecha = new Date(r.fecha);
  const opciones = { timeZone: 'America/Argentina/Buenos_Aires' } as const;
  const dia = fecha.toLocaleDateString('es-AR', { ...opciones, day: '2-digit', month: '2-digit' });
  const hora = fecha.toLocaleTimeString('es-AR', { ...opciones, hour: '2-digit', minute: '2-digit', hour12: false });
  return `${r.accion} por ${r.por} el ${dia} a las ${hora}`;
}

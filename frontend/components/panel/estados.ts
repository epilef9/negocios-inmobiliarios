import type { Tono } from './ui';

// Etiqueta y color de cada estado, iguales en todo el panel

export const ESTADO_VISITA: Record<string, { texto: string; tono: Tono }> = {
  pendiente: { texto: 'Pendiente', tono: 'aviso' },
  confirmada: { texto: 'Confirmada', tono: 'exito' },
  reprogramada: { texto: 'Reprogramada', tono: 'info' },
  rechazada: { texto: 'Rechazada', tono: 'neutro' },
};

export const ESTADO_RESERVA: Record<string, { texto: string; tono: Tono }> = {
  pendiente: { texto: 'Por confirmar', tono: 'aviso' },
  confirmada: { texto: 'Confirmada', tono: 'exito' },
  vencida: { texto: 'Vencida', tono: 'neutro' },
  rechazada: { texto: 'Rechazada', tono: 'peligro' },
  cancelada: { texto: 'Cancelada', tono: 'neutro' },
};

export const ESTADO_CONTRATO: Record<string, { texto: string; tono: Tono }> = {
  activo: { texto: 'Activo', tono: 'exito' },
  firmado: { texto: 'Firmado', tono: 'exito' },
  por_vencer: { texto: 'Por vencer', tono: 'aviso' },
  vencido: { texto: 'Vencido', tono: 'peligro' },
  borrador: { texto: 'Borrador', tono: 'neutro' },
  finalizado: { texto: 'Finalizado', tono: 'neutro' },
  cancelado: { texto: 'Cancelado', tono: 'peligro' },
};

export const ESTADO_PROPIEDAD: Record<string, { texto: string; tono: Tono }> = {
  disponible: { texto: 'Disponible', tono: 'exito' },
  reservado: { texto: 'Reservada', tono: 'aviso' },
  alquilado: { texto: 'Alquilada', tono: 'info' },
  vendido: { texto: 'Vendida', tono: 'neutro' },
};

export const estadoDe = (mapa: Record<string, { texto: string; tono: Tono }>, valor?: string | null) =>
  mapa[(valor ?? '').toLowerCase()] ?? { texto: valor || 'Sin estado', tono: 'neutro' as Tono };

// Las visitas guardan la fecha como "DD/MM/YYYY" o "YYYY-MM-DD" y el horario como "10:30 h"
export function fechaDeVisita(fecha?: string, horario?: string): Date | null {
  if (!fecha) return null;
  let anio: number, mes: number, dia: number;
  const latina = fecha.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const iso = fecha.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (latina) [dia, mes, anio] = [Number(latina[1]), Number(latina[2]), Number(latina[3])];
  else if (iso) [anio, mes, dia] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else return null;
  const hora = horario?.match(/(\d{1,2}):(\d{2})/);
  return new Date(anio, mes - 1, dia, hora ? Number(hora[1]) : 0, hora ? Number(hora[2]) : 0);
}

const DIA = new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });

// "mar 27 oct · 17:30", o "Hoy · 17:30" / "Mañana · 9:00"
export function cuandoEs(fecha: Date | null, horario?: string) {
  if (!fecha) return 'Sin fecha';
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const dias = Math.round((new Date(fecha).setHours(0, 0, 0, 0) - hoy.getTime()) / 86400000);
  const dia = dias === 0 ? 'Hoy' : dias === 1 ? 'Mañana' : DIA.format(fecha).replace(/[.,]/g, '');
  const hora = horario?.match(/\d{1,2}:\d{2}/)?.[0];
  return hora ? `${dia} · ${hora}` : dia;
}

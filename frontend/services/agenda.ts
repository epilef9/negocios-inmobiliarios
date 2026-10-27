import { request } from './api';

// Horario de visitas de la oficina (HU-19). Horas "HH:MM"; días 0 = domingo … 6 = sábado;
// días cerrados con `hasta` inclusive (un feriado es desde = hasta).

export type Tramo = { desde: string; hasta: string };
export type DiaCerrado = { desde: string; hasta: string; motivo: string };

export interface HorarioVisitas {
  semana: { tramos: Tramo[] }[];
  duracionMinutos: number;
  cerrados: DiaCerrado[];
  texto: string;
}

export type VisitaFueraDeHorario = { id: string; cliente: string; propiedad: string; fecha: string; hora: string; estado: string };

export function getHorario(): Promise<HorarioVisitas> {
  return request<HorarioVisitas>('/agenda/horario');
}

/**
 * Guarda el horario (solo administrador). Devuelve también las visitas ya pedidas que quedaron fuera.
 */
export function guardarHorario(horario: Omit<HorarioVisitas, 'texto'>): Promise<HorarioVisitas & { fueraDeHorario: VisitaFueraDeHorario[] }> {
  return request('/agenda/horario', { method: 'PUT', body: JSON.stringify(horario) });
}

// Desde las 13:00 ya es la tarde (lo usan la ficha y la vista previa del panel)
export const TARDE_DESDE = '13:00';
export function separarTurnos(turnos: string[]) {
  return { manana: turnos.filter((t) => t < TARDE_DESDE), tarde: turnos.filter((t) => t >= TARDE_DESDE) };
}

// Inicio de cada turno de un día, con la misma regla que el servidor (el último termina dentro del tramo)
export function turnosDelDia(tramos: Tramo[], duracion: number) {
  const min = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
  const hora = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  return [...tramos]
    .sort((a, b) => a.desde.localeCompare(b.desde))
    .flatMap((t) => {
      const turnos: string[] = [];
      for (let m = min(t.desde); m + duracion <= min(t.hasta); m += duracion) turnos.push(hora(m));
      return turnos;
    });
}

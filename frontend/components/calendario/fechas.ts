// Funciones de fecha para los calendarios de estadías (panel y ficha pública).
// Las fechas viajan como texto "AAAA-MM-DD" para no depender de la zona horaria del navegador.
// Copiadas de CalendarioVisita.tsx, que se deja como está.

export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
export const SEMANA = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

const dos = (n: number) => String(n).padStart(2, '0');
export const isoDe = (anio: number, mes: number, dia: number) => `${anio}-${dos(mes + 1)}-${dos(dia)}`;
export const diasDelMes = (anio: number, mes: number) => new Date(anio, mes + 1, 0).getDate();
// Lunes = 0 … domingo = 6 (la semana arranca el lunes)
export const primerDia = (anio: number, mes: number) => (new Date(anio, mes, 1).getDay() + 6) % 7;

export const hoyIso = () => {
  const d = new Date();
  return isoDe(d.getFullYear(), d.getMonth(), d.getDate());
};

export const sumarDias = (iso: string, dias: number) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
};

export const nochesEntre = (desde: string, hasta: string) =>
  Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86400000);

export const fechaLarga = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
export const fechaCorta = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });

export type Rango = { desde: string; hasta: string };

// El rango que ocupa la noche de `iso` (desde incluido, hasta = día de salida, no se cuenta)
export const rangoDeLaNoche = <T extends Rango>(iso: string, rangos: T[]) => rangos.find((r) => r.desde <= iso && iso < r.hasta);

// Celdas de un mes: null para los huecos antes del día 1
export const celdasDelMes = (anio: number, mes: number) => [
  ...Array.from({ length: primerDia(anio, mes) }, () => null),
  ...Array.from({ length: diasDelMes(anio, mes) }, (_, i) => isoDe(anio, mes, i + 1)),
];

export const mesSiguiente = ({ anio, mes }: { anio: number; mes: number }, salto = 1) => {
  const total = anio * 12 + mes + salto;
  return { anio: Math.floor(total / 12), mes: total % 12 };
};

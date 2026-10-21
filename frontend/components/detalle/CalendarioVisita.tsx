'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getDisponibilidad, type Agenda, type DiaAgenda } from '@/services/visitas';
import { WHATSAPP_URL } from '@/components/sitio/SiteFooter';

// Calendario para elegir día y horario de una visita: muestra qué días hay lugar, cuáles están completos
// y en cuáles no se atiende; al tocar un día aparecen abajo sus horarios libres.
// Los datos salen del servidor, que es el que sabe qué horarios ya pidió otra persona.

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const SEMANA = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

const dos = (n: number) => String(n).padStart(2, '0');
const isoDe = (anio: number, mes: number, dia: number) => `${anio}-${dos(mes + 1)}-${dos(dia)}`;
const diasDelMes = (anio: number, mes: number) => new Date(anio, mes + 1, 0).getDate();
// Lunes = 0 … domingo = 6 (la semana arranca el lunes)
const primerDia = (anio: number, mes: number) => (new Date(anio, mes, 1).getDay() + 6) % 7;
const fechaLarga = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

type Props = {
  fecha: string;
  horario: string;
  onCambiar: (valor: { fecha: string; horario: string }) => void;
};

export default function CalendarioVisita({ fecha, horario, onCambiar }: Props) {
  const hoy = new Date();
  const [vista, setVista] = useState({ anio: hoy.getFullYear(), mes: hoy.getMonth() });
  const [agendas, setAgendas] = useState<Record<string, Agenda | 'error'>>({});
  const clave = `${vista.anio}-${vista.mes}`;
  const agenda: Agenda | 'error' | undefined = agendas[clave];
  const avanzoSolo = useRef(false);

  useEffect(() => {
    if (agendas[clave]) return;
    let activo = true;
    const ultimo = diasDelMes(vista.anio, vista.mes);
    getDisponibilidad(isoDe(vista.anio, vista.mes, 1), isoDe(vista.anio, vista.mes, ultimo))
      .then((datos) => {
        if (!activo) return;
        setAgendas((a) => ({ ...a, [clave]: datos }));
        // Si en lo que queda del primer mes no hay ningún día libre, se pasa solo al siguiente (una vez)
        if (!avanzoSolo.current) {
          avanzoSolo.current = true;
          if (!datos.dias.some((d) => d.estado === 'disponible')) {
            setVista((v) => (v.mes === 11 ? { anio: v.anio + 1, mes: 0 } : { anio: v.anio, mes: v.mes + 1 }));
          }
        }
      })
      .catch(() => activo && setAgendas((a) => ({ ...a, [clave]: 'error' })));
    return () => {
      activo = false;
    };
  }, [clave, vista.anio, vista.mes, agendas]);

  const porFecha = useMemo(() => {
    const mapa = new Map<string, DiaAgenda>();
    if (agenda && agenda !== 'error') agenda.dias.forEach((d) => mapa.set(d.fecha, d));
    return mapa;
  }, [agenda]);

  const esMesActual = vista.anio === hoy.getFullYear() && vista.mes === hoy.getMonth();
  const limite = agenda && agenda !== 'error' ? agenda.hasta : null;
  const hayMasAdelante = !limite || isoDe(vista.anio, vista.mes, diasDelMes(vista.anio, vista.mes)) < limite;
  const mover = (paso: number) =>
    setVista((v) => {
      const total = v.anio * 12 + v.mes + paso;
      return { anio: Math.floor(total / 12), mes: total % 12 };
    });

  const diaElegido = fecha ? porFecha.get(fecha) : undefined;
  const turnos = diaElegido?.turnos ?? [];
  const manana = turnos.filter((t) => t < '14:00');
  const tarde = turnos.filter((t) => t >= '14:00');

  const huecos = primerDia(vista.anio, vista.mes);
  const total = diasDelMes(vista.anio, vista.mes);

  const flecha = 'flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#efe9df]/20 transition-colors duration-300 hover:border-[#efe9df]/70 hover:bg-[#efe9df]/5 disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:border-[#efe9df]/20 disabled:hover:bg-transparent';

  const turno = (t: string) => {
    const elegido = horario === t;
    return (
      <button
        key={t}
        type="button"
        aria-pressed={elegido}
        onClick={() => onCambiar({ fecha, horario: t })}
        className={`tabular cursor-pointer rounded-full border px-4 py-2 text-[15px] transition-colors duration-300 ${
          elegido ? 'border-[#efe9df] bg-[#efe9df] text-[#071733]' : 'border-[#efe9df]/25 text-[#efe9df] hover:border-[#efe9df] hover:bg-[#efe9df]/5'
        }`}
      >
        {t} h
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <button type="button" onClick={() => mover(-1)} disabled={esMesActual} aria-label="Mes anterior" className={flecha}>
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5l-5 5 5 5" />
          </svg>
        </button>
        <p className="font-display m-0 text-[26px] leading-none" aria-live="polite">
          {MESES[vista.mes]} <span className="text-[#efe9df]/50">{vista.anio}</span>
        </p>
        <button type="button" onClick={() => mover(1)} disabled={!hayMasAdelante} aria-label="Mes siguiente" className={flecha}>
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 5l5 5-5 5" />
          </svg>
        </button>
      </div>

      {agenda === 'error' ? (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-[#efe9df]/15 p-5">
          <p className="m-0 text-[15px] text-[#ffb4ad]">No pudimos consultar la agenda en este momento.</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setAgendas((a) => Object.fromEntries(Object.entries(a).filter(([k]) => k !== clave)))} className="calma-micro cursor-pointer rounded-full border border-[#efe9df]/40 px-5 py-3 text-[11px] hover:border-[#efe9df]">
              Reintentar
            </button>
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="calma-micro rounded-full border border-[#efe9df]/40 px-5 py-3 text-[11px] hover:border-[#efe9df]">
              Coordinar por WhatsApp
            </a>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-2 grid grid-cols-7 gap-1.5" aria-hidden="true">
            {SEMANA.map((d) => (
              <span key={d} className="calma-micro text-center text-[10.5px] text-[#efe9df]/45">
                {d}
              </span>
            ))}
          </div>
          <div role="grid" aria-label={`${MESES[vista.mes]} ${vista.anio}`} aria-busy={!agenda} className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: huecos }, (_, i) => (
              <span key={`h${i}`} aria-hidden="true" />
            ))}
            {Array.from({ length: total }, (_, i) => {
              const dia = i + 1;
              const iso = isoDe(vista.anio, vista.mes, dia);
              const info = porFecha.get(iso);
              const estado = info?.estado;
              const elegido = fecha === iso;
              if (!agenda) {
                return <span key={iso} aria-hidden="true" className="aspect-square animate-pulse rounded-xl bg-[#efe9df]/[0.04]" />;
              }
              const esHoy = agenda.hoy === iso;
              const etiqueta = `${fechaLarga(iso)}: ${estado === 'disponible' ? `${info?.turnos.length} horarios libres` : estado === 'completo' ? 'sin horarios libres' : 'no se atiende'}`;
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={estado !== 'disponible'}
                  aria-pressed={elegido}
                  aria-label={etiqueta}
                  title={estado === 'completo' ? 'Sin horarios libres' : estado === 'cerrado' ? 'No se atiende' : undefined}
                  onClick={() => onCambiar({ fecha: iso, horario: '' })}
                  className={`tabular relative flex aspect-square items-center justify-center rounded-xl text-[15px] transition-colors duration-300 ${
                    elegido
                      ? 'cursor-pointer bg-[#efe9df] font-medium text-[#071733]'
                      : estado === 'disponible'
                        ? 'cursor-pointer border border-[#efe9df]/25 text-[#efe9df] hover:border-[#efe9df] hover:bg-[#efe9df]/[0.06]'
                        : estado === 'completo'
                          ? 'cursor-not-allowed text-[#efe9df]/35 line-through decoration-[#d9382b] decoration-1'
                          : 'cursor-not-allowed text-[#efe9df]/18'
                  }`}
                >
                  {dia}
                  {esHoy && !elegido && <span aria-hidden="true" className="absolute bottom-1.5 h-1 w-1 rounded-full bg-[#d9382b]" />}
                </button>
              );
            })}
          </div>
          <ul className="m-0 mt-4 flex list-none flex-wrap gap-x-5 gap-y-2 p-0 text-[12.5px] text-[#efe9df]/60">
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="h-3 w-3 rounded border border-[#efe9df]/50" />
              Con horarios libres
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="text-[#efe9df]/40 line-through decoration-[#d9382b]">12</span>
              Completo
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="text-[#efe9df]/25">12</span>
              No se atiende
            </li>
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-[#efe9df]/15 pt-5" aria-live="polite">
        {!fecha ? (
          <p className="m-0 text-[15px] text-[#efe9df]/60">Elegí un día para ver los horarios libres.</p>
        ) : turnos.length === 0 ? (
          <p className="m-0 text-[15px] text-[#efe9df]/60">Ese día ya no quedan horarios. Probá con otro.</p>
        ) : (
          <>
            <p className="calma-micro m-0 text-[#efe9df]/70 first-letter:uppercase">Horarios del {fechaLarga(fecha)}</p>
            {manana.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[13px] text-[#efe9df]/50">Mañana</span>
                <div className="flex flex-wrap gap-2">{manana.map(turno)}</div>
              </div>
            )}
            {tarde.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[13px] text-[#efe9df]/50">Tarde</span>
                <div className="flex flex-wrap gap-2">{tarde.map(turno)}</div>
              </div>
            )}
          </>
        )}
        {agenda && agenda !== 'error' && <p className="m-0 text-[12.5px] text-[#efe9df]/45">Atención: {agenda.horario}.</p>}
      </div>
    </div>
  );
}

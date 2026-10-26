'use client';

import { useEffect, useMemo, useState } from 'react';
import { getDisponibilidad, type DisponibilidadPublica } from '@/services/disponibilidad';
import { MESES, SEMANA, celdasDelMes, diasDelMes, fechaLarga, isoDe, mesSiguiente, rangoDeLaNoche, sumarDias } from '@/components/calendario/fechas';

// Calendario de alquiler temporario: qué noches están libres.
// Cada día es una baldosa partida en diagonal: la mitad de arriba es la mañana (la noche anterior) y la
// de abajo, la tarde (la noche de ese día). Un día ocupado entero va todo en rojo suave; el día en que
// alguien sale o entra queda pintado a medias, y la mitad libre dice que ese día se puede salir o entrar.
// Las noches de una reserva que todavía no se confirmó van rayadas: están tomadas, pero pueden liberarse.
//
// Con `alElegirDia` los días se vuelven botones (HU-20): el componente que reserva decide qué días se
// pueden tocar (`diaHabilitado`) y pinta la estadía elegida con `seleccion`.

type Props = {
  propiedadId: string;
  alElegirDia?: (iso: string) => void;
  diaHabilitado?: (iso: string) => boolean;
  seleccion?: { entrada: string | null; salida: string | null };
  // Cambiarlo vuelve a pedir las fechas (por ejemplo, después de enviar una reserva)
  version?: number;
  alCargar?: (datos: DisponibilidadPublica) => void;
};

// Cómo está una mitad de la baldosa
type Mitad = 'libre' | 'ocupada' | 'porConfirmar';

const ROJO_SUAVE = 'rgb(217 56 43 / 0.32)';
const BORDE_ROJO = 'rgb(217 56 43 / 0.55)';
const RAYADO = `repeating-linear-gradient(135deg, ${ROJO_SUAVE} 0 3px, transparent 3px 7px)`;
// La mañana es el triángulo de arriba a la izquierda; la tarde, el de abajo a la derecha
const TRIANGULO = { manana: 'polygon(0 0, 100% 0, 0 100%)', tarde: 'polygon(100% 0, 100% 100%, 0 100%)' };

function capa(mitad: Mitad, lado: 'manana' | 'tarde') {
  if (mitad === 'libre') return null;
  return <span key={lado} className="absolute inset-0" style={{ background: mitad === 'ocupada' ? ROJO_SUAVE : RAYADO, clipPath: TRIANGULO[lado] }} />;
}

// Una baldosa: la misma en el calendario y en la leyenda, para que se reconozca sin leer
function Baldosa({ manana, tarde, apagado, children }: { manana: Mitad; tarde: Mitad; apagado?: boolean; children: React.ReactNode }) {
  const libre = manana === 'libre' && tarde === 'libre';
  const llena = manana !== 'libre' && tarde !== 'libre';
  const borde = llena ? (manana === 'ocupada' && tarde === 'ocupada' ? BORDE_ROJO : 'rgb(217 56 43 / 0.4)') : undefined;
  return (
    <span
      aria-hidden="true"
      style={borde ? { boxShadow: `inset 0 0 0 1px ${borde}` } : undefined}
      // Libre y medio día llevan un borde crema tenue: se ven como baldosas disponibles
      className={`absolute inset-[3px] flex items-center justify-center overflow-hidden rounded-lg ${
        apagado ? 'text-[#efe9df]/18' : llena ? 'text-[#efe9df]/55' : `text-[#efe9df] ring-1 ring-inset ${libre ? 'ring-[#efe9df]/15' : 'ring-[#efe9df]/25'}`
      }`}
    >
      {capa(manana, 'manana')}
      {capa(tarde, 'tarde')}
      <span className="relative">{children}</span>
    </span>
  );
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

const mitadDe = (rango?: { porConfirmar?: boolean }): Mitad => (!rango ? 'libre' : rango.porConfirmar ? 'porConfirmar' : 'ocupada');

// Primer día desde `desde` en el que entra una estadía mínima completa antes del límite
function primeraEstadiaLibre(datos: DisponibilidadPublica, desde: string) {
  const minimo = Math.max(1, datos.minimoNoches);
  for (let entrada = desde; sumarDias(entrada, minimo) <= datos.hasta; entrada = sumarDias(entrada, 1)) {
    const salida = sumarDias(entrada, minimo);
    if (!datos.ocupadas.some((r) => r.desde < salida && entrada < r.hasta)) return entrada;
  }
  return null;
}

export default function CalendarioEstadia({ propiedadId, alElegirDia, diaHabilitado, seleccion, version = 0, alCargar }: Props) {
  const [datos, setDatos] = useState<DisponibilidadPublica | 'error' | null>(null);
  const [intento, setIntento] = useState(0);
  // Día bajo el puntero mientras se elige la salida: adelanta cómo quedaría la estadía
  const [apuntado, setApuntado] = useState<string | null>(null);
  const [vista, setVista] = useState(() => {
    const d = new Date();
    return { anio: d.getFullYear(), mes: d.getMonth() };
  });

  useEffect(() => {
    let activo = true;
    getDisponibilidad(propiedadId)
      .then((d) => {
        if (!activo) return;
        setDatos(d);
        alCargar?.(d);
      })
      .catch(() => activo && setDatos('error'));
    return () => {
      activo = false;
    };
    // alCargar puede cambiar en cada render del padre: solo se vuelve a pedir por propiedad, reintento o versión
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propiedadId, intento, version]);

  const listos = datos && datos !== 'error' ? datos : null;
  // Para reservar, la entrada es desde mañana
  const primeraLibre = useMemo(() => (listos ? primeraEstadiaLibre(listos, alElegirDia ? sumarDias(listos.hoy, 1) : listos.hoy) : null), [listos, alElegirDia]);

  if (datos === 'error') {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-2xl border border-[#efe9df]/15 p-5">
        <p className="m-0 text-[15px] leading-relaxed text-[#efe9df]/85">No pudimos cargar las fechas libres. Probá de nuevo en un momento.</p>
        <button
          type="button"
          onClick={() => {
            setDatos(null);
            setIntento((n) => n + 1);
          }}
          className="calma-micro cursor-pointer rounded-full border border-[#efe9df]/40 px-5 py-3 text-[11px] hover:border-[#efe9df]"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const hoy = listos?.hoy ?? '';
  const limite = listos?.hasta ?? '';
  const fueraDeRango = (iso: string) => !listos || iso < hoy || iso > limite;

  const entrada = seleccion?.entrada ?? null;
  // Sin salida elegida, el día apuntado hace de salida provisoria (solo si no hay noches tomadas en el medio)
  const apuntadoSirve = Boolean(
    listos && entrada && apuntado && apuntado > entrada && !listos.ocupadas.some((r) => r.desde < apuntado && entrada < r.hasta)
  );
  const salida = seleccion?.salida ?? (apuntadoSirve ? apuntado : null);
  const provisoria = !seleccion?.salida && Boolean(salida);

  const esMesActual = (() => {
    const d = new Date();
    return vista.anio === d.getFullYear() && vista.mes === d.getMonth();
  })();
  const ultimoVisible = mesSiguiente(vista);
  const hayMasAdelante = !limite || isoDe(ultimoVisible.anio, ultimoVisible.mes, diasDelMes(ultimoVisible.anio, ultimoVisible.mes)) < limite;

  const flecha =
    'flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#efe9df]/20 transition-colors duration-300 hover:border-[#efe9df]/70 hover:bg-[#efe9df]/5 disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:border-[#efe9df]/20 disabled:hover:bg-transparent';

  const dia = (iso: string | null, i: number) => {
    // Con días que se pueden tocar, la grilla es de botones; si no, una lista de días
    const Hueco = alElegirDia ? 'span' : 'li';
    if (!iso) return <Hueco key={`h${i}`} aria-hidden="true" />;
    if (!listos) return <Hueco key={iso} aria-hidden="true" className="aspect-square animate-pulse rounded-xl bg-[#efe9df]/[0.04] motion-reduce:animate-none" />;

    const fuera = fueraDeRango(iso);
    // Mitad izquierda: la noche anterior (llega un huésped que sale hoy). Mitad derecha: la noche de hoy.
    const ayer = sumarDias(iso, -1);
    const rangoAyer = !fuera && ayer >= hoy ? rangoDeLaNoche(ayer, listos.ocupadas) : undefined;
    const rangoHoy = !fuera ? rangoDeLaNoche(iso, listos.ocupadas) : undefined;
    const manana = mitadDe(rangoAyer);
    const tarde = mitadDe(rangoHoy);
    const sufijo = (m: Mitad) => (m === 'porConfirmar' ? ' (reservado, por confirmar)' : '');
    const etiqueta = fuera
      ? `${fechaLarga(iso)}: sin fechas para reservar`
      : manana !== 'libre' && tarde !== 'libre'
        ? `${fechaLarga(iso)}: ocupado${sufijo(tarde)}`
        : manana !== 'libre'
          ? `${fechaLarga(iso)}: medio día libre, se puede entrar a la tarde`
          : tarde !== 'libre'
            ? `${fechaLarga(iso)}: medio día libre, se puede salir a la mañana${sufijo(tarde)}`
            : `${fechaLarga(iso)}: libre`;

    const esEntrada = iso === entrada;
    const esSalida = iso === salida;
    const enMedio = Boolean(entrada && salida && iso > entrada && iso < salida);
    // La estadía elegida va en crema: los extremos llenos, las noches del medio con un velo
    const marca = esEntrada || (esSalida && !provisoria)
      ? 'bg-[#efe9df] text-[#071733]'
      : esSalida
        ? 'ring-1 ring-inset ring-[#efe9df]'
        : enMedio
          ? provisoria
            ? 'bg-[#efe9df]/[0.08]'
            : 'bg-[#efe9df]/[0.16]'
          : '';

    const contenido = (
      <>
        <Baldosa manana={manana} tarde={tarde} apagado={fuera}>
          {Number(iso.slice(8))}
        </Baldosa>
        {marca && (
          <span
            aria-hidden="true"
            className={`absolute inset-[3px] flex items-center justify-center rounded-lg transition-colors duration-200 ease-out motion-reduce:transition-none ${marca}`}
          >
            {(esEntrada || (esSalida && !provisoria)) && Number(iso.slice(8))}
          </span>
        )}
        {/* Hoy: un subrayado crema. El rojo queda solo para lo que no está disponible */}
        {iso === hoy && <span aria-hidden="true" className="absolute bottom-[20%] h-px w-3.5 bg-[#efe9df]" />}
        {!alElegirDia && <span className="sr-only">{etiqueta}</span>}
      </>
    );
    const clases = 'tabular relative flex aspect-square items-center justify-center text-[15px]';

    if (alElegirDia) {
      const habilitado = !fuera && (diaHabilitado ? diaHabilitado(iso) : true);
      // Un día libre que no se puede tocar (hoy, por ejemplo) se ve más tenue que uno que sí
      const tenue = !habilitado && !fuera && !marca && manana === 'libre' && tarde === 'libre';
      const estado = esEntrada ? ', elegido como entrada' : esSalida && !provisoria ? ', elegido como salida' : enMedio && !provisoria ? ', dentro de tu estadía' : '';
      return (
        <button
          key={iso}
          type="button"
          disabled={!habilitado}
          aria-label={`${etiqueta}${estado}`}
          aria-pressed={esEntrada || (esSalida && !provisoria)}
          onClick={() => alElegirDia(iso)}
          onMouseEnter={() => setApuntado(iso)}
          onFocus={() => setApuntado(iso)}
          className={`${clases} group cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#efe9df] disabled:cursor-not-allowed ${tenue ? 'opacity-45' : ''}`}
        >
          {contenido}
          {habilitado && !marca && (
            <span aria-hidden="true" className="absolute inset-[3px] rounded-lg opacity-0 ring-1 ring-inset ring-[#efe9df]/70 transition-opacity duration-150 group-hover:opacity-100 motion-reduce:transition-none" />
          )}
        </button>
      );
    }
    return (
      <li key={iso} className={clases}>
        {contenido}
      </li>
    );
  };

  const leyenda: { manana: Mitad; tarde: Mitad; titulo: string; texto: string }[] = [
    { manana: 'libre', tarde: 'libre', titulo: 'Libre', texto: 'Se puede reservar' },
    { manana: 'ocupada', tarde: 'ocupada', titulo: 'Ocupado', texto: 'No disponible' },
    { manana: 'porConfirmar', tarde: 'porConfirmar', titulo: 'Por confirmar', texto: 'Reservado, esperando confirmación' },
    { manana: 'ocupada', tarde: 'libre', titulo: 'Medio día', texto: 'Se sale o se entra ese día' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5" aria-live="polite">
        {listos ? (
          <>
            <p className="m-0 text-[17px] leading-relaxed text-[#efe9df]/85">
              {primeraLibre ? (
                <>
                  Próxima fecha libre: <span className="text-[#efe9df]">{fechaLarga(primeraLibre)}</span>.
                </>
              ) : (
                'No quedan fechas libres en los próximos doce meses.'
              )}
            </p>
            <p className="m-0 text-[14px] text-[#efe9df]/60">
              Mínimo {plural(Math.max(1, listos.minimoNoches), 'noche', 'noches')}
              {listos.precioPorNocheUSD ? ` · USD ${listos.precioPorNocheUSD.toLocaleString('es-AR')} por noche` : ''}
            </p>
          </>
        ) : (
          <span aria-hidden="true" className="calma-brillo h-6 w-3/4" />
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <button type="button" onClick={() => setVista((v) => mesSiguiente(v, -1))} disabled={esMesActual} aria-label="Mes anterior" className={flecha}>
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5l-5 5 5 5" />
          </svg>
        </button>
        <button type="button" onClick={() => setVista((v) => mesSiguiente(v))} disabled={!hayMasAdelante} aria-label="Mes siguiente" className={flecha}>
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 5l5 5-5 5" />
          </svg>
        </button>
      </div>

      {/* Dos meses solo con lugar de sobra: así cada día mide al menos 40 px */}
      <div className="grid gap-10 xl:grid-cols-2 xl:gap-8" onMouseLeave={() => setApuntado(null)}>
        {[vista, mesSiguiente(vista)].map(({ anio, mes }, indice) => (
          <div key={`${anio}-${mes}`} className={indice === 1 ? 'hidden xl:block' : ''}>
            <p className="font-display m-0 mb-4 text-[26px] leading-none" aria-live={indice === 0 ? 'polite' : undefined}>
              {MESES[mes]} <span className="text-[#efe9df]/50">{anio}</span>
            </p>
            <div className="mb-2 grid grid-cols-7" aria-hidden="true">
              {SEMANA.map((d) => (
                <span key={d} className="calma-micro text-center text-[10.5px] text-[#efe9df]/65">
                  {d}
                </span>
              ))}
            </div>
            {alElegirDia ? (
              <div role="group" aria-label={`${MESES[mes]} ${anio}`} aria-busy={!listos} className="grid grid-cols-7">
                {celdasDelMes(anio, mes).map(dia)}
              </div>
            ) : (
              <ol aria-label={`${MESES[mes]} ${anio}`} aria-busy={!listos} className="m-0 grid list-none grid-cols-7 p-0">
                {celdasDelMes(anio, mes).map(dia)}
              </ol>
            )}
          </div>
        ))}
      </div>

      {/* Leyenda: la misma baldosa del calendario, con una frase corta de qué significa */}
      <ul className="m-0 grid list-none gap-3 border-t border-[#efe9df]/15 p-0 pt-5 text-[14px] sm:grid-cols-2">
        {leyenda.map((m) => (
          <li key={m.titulo} className="flex items-center gap-3">
            <span className="tabular relative h-11 w-11 shrink-0 text-[15px]">
              <Baldosa manana={m.manana} tarde={m.tarde}>
                12
              </Baldosa>
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-[#efe9df]">{m.titulo}</span>
              <span className="text-[13px] text-[#efe9df]/60">{m.texto}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

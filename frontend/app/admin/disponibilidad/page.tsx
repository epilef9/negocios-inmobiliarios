'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { getProperties, type ApiProperty } from '@/services/api';
import { createRango, deleteRango, getRangos, type RangoDisponibilidad, type TipoRango } from '@/services/disponibilidad';
import Icono, { type NombreIcono } from '@/components/panel/Icono';
import { Alerta, Boton, BotonLink, Campo, Dialogo, Encabezado, Esqueleto, EstadoVacio, Insignia, Tarjeta, areaTexto, control, useAviso, useConfirmar } from '@/components/panel/ui';
import { MESES, SEMANA, celdasDelMes, fechaCorta, fechaLarga, hoyIso, mesSiguiente, nochesEntre, rangoDeLaNoche, sumarDias } from '@/components/calendario/fechas';

// Disponibilidad del alquiler temporario: el administrador marca en el calendario las noches que no se
// alquilan (bloqueo) o que ya están alquiladas por fuera (ocupada). La ficha pública muestra el resto como libres.
// La unidad es la noche: la franja de arriba muestra las próximas semanas noche por noche, y la lista es una
// línea de tiempo que también muestra los huecos libres entre estadías.

const TIPOS: Record<TipoRango, { texto: string; icono: NombreIcono; ayuda: string; leyenda: string }> = {
  bloqueo: { texto: 'Bloqueada', icono: 'candado', ayuda: 'El dueño no la alquila esas noches: uso propio, arreglos.', leyenda: 'el dueño no la alquila' },
  ocupada: { texto: 'Ocupada', icono: 'maleta', ayuda: 'Ya está alquilada por fuera del sitio.', leyenda: 'alquilada por fuera del sitio' },
  reserva: { texto: 'Reserva', icono: 'estrella', ayuda: 'Reserva hecha desde el sitio.', leyenda: 'hecha desde el sitio' },
};
// Cada tipo tiene su textura, que se distingue de un vistazo aunque la casilla sea chica:
// ocupada es sólida, reserva es un tinte suave del mismo color con una base firme abajo y bloqueo va rayado
// en gris. El acento queda solo para la selección.
const COLOR_NOCHE: Record<TipoRango, { fondo: string; texto: string }> = {
  bloqueo: { fondo: 'bg-panel-borde-fuerte', texto: 'text-panel-texto' },
  ocupada: { fondo: 'bg-panel-marca', texto: 'text-panel-marca-texto' },
  // El tinte es opaco: con uno transparente, las casillas que se pisan un píxel dejaban costuras más oscuras
  reserva: { fondo: 'bg-[color-mix(in_srgb,var(--p-marca)_14%,var(--p-superficie))]', texto: 'text-panel-texto' },
};
// Fijas a la ventana para que las rayas sigan derecho de una casilla a la otra
const RAYAS = {
  backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 5px, color-mix(in srgb, currentColor 32%, transparent) 5px 8px)',
  backgroundAttachment: 'fixed',
};
// La base de la reserva: una franja firme abajo que corre de punta a punta de la estadía
const BASE = { backgroundImage: 'linear-gradient(to top, var(--p-marca) 0 3px, transparent 3px)' };
const rayasDe = (tipo: TipoRango) => (tipo === 'bloqueo' ? RAYAS : tipo === 'reserva' ? BASE : undefined);
// Largo de la franja de temporada
const SEMANAS_FRANJA = 16;

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
const mesDe = (iso: string) => ({ anio: Number(iso.slice(0, 4)), mes: Number(iso.slice(5, 7)) - 1 });

type Seleccion = { desde: string; hasta: string | null };
type Tramo = { clase: 'estadia'; rango: RangoDisponibilidad } | { clase: 'libre'; desde: string; hasta: string | null };

export default function DisponibilidadAdminPage() {
  const id = useId();
  const [propiedades, setPropiedades] = useState<ApiProperty[] | null>(null);
  const [propiedadId, setPropiedadId] = useState('');
  const [rangos, setRangos] = useState<RangoDisponibilidad[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const hoy = hoyIso();
  const [vista, setVista] = useState(() => mesDe(hoyIso()));
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null);
  const [encima, setEncima] = useState<string | null>(null);
  // Estadía tocada en el calendario y estadía apuntada en la lista o la franja (se resaltan en todos lados)
  const [fijo, setFijo] = useState<string | null>(null);
  const [apuntado, setApuntado] = useState<string | null>(null);
  const [tipo, setTipo] = useState<TipoRango>('bloqueo');
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorDialogo, setErrorDialogo] = useState<string | null>(null);
  const { mostrar, aviso } = useAviso();
  const { confirmar, dialogoConfirmar } = useConfirmar();
  const calendarioRef = useRef<HTMLDivElement>(null);

  // Solo las propiedades de alquiler temporario
  useEffect(() => {
    getProperties()
      .then((todas) => {
        const temporarias = (todas ?? []).filter((p) => p.categoria_operacion === 'temporario');
        setPropiedades(temporarias);
        if (temporarias[0]) setPropiedadId(temporarias[0]._id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudieron cargar las propiedades'));
  }, [intento]);

  useEffect(() => {
    if (!propiedadId) return;
    let activo = true;
    getRangos(propiedadId)
      .then((datos) => {
        if (!activo) return;
        setRangos(datos);
        setError(null);
      })
      .catch((e) => {
        if (!activo) return;
        setError(e instanceof Error ? e.message : 'No se pudieron cargar las fechas');
        setRangos([]);
      });
    return () => {
      activo = false;
    };
  }, [propiedadId, intento]);

  const cambiarPropiedad = (nueva: string) => {
    setPropiedadId(nueva);
    setRangos(null);
    setSeleccion(null);
    setFijo(null);
  };

  const propiedad = propiedades?.find((p) => p._id === propiedadId);
  const minimo = Math.max(1, propiedad?.minimoNoches || 1);
  const lista = useMemo(() => rangos ?? [], [rangos]);

  // Con la entrada elegida, la salida no puede pasar el próximo rango cargado (sería pisarlo)
  const salidaMaxima = useMemo(() => {
    if (!seleccion || seleccion.hasta) return null;
    const siguiente = lista.filter((r) => r.desde > seleccion.desde).sort((a, b) => a.desde.localeCompare(b.desde))[0];
    return siguiente?.desde ?? null;
  }, [seleccion, lista]);

  // Noches que se verían marcadas: la selección hecha o la que se está por hacer
  const nochesElegidas = useMemo(() => {
    if (!seleccion) return null;
    const hasta = seleccion.hasta ?? (encima && encima > seleccion.desde && (!salidaMaxima || encima <= salidaMaxima) ? encima : null);
    return { desde: seleccion.desde, hasta: hasta ?? null };
  }, [seleccion, encima, salidaMaxima]);

  const empezarSeleccion = (iso: string) => {
    setSeleccion({ desde: iso, hasta: null });
    setFijo(null);
  };

  const elegirDia = (iso: string) => {
    if (!seleccion || seleccion.hasta) {
      if (!rangoDeLaNoche(iso, lista)) empezarSeleccion(iso);
      return;
    }
    if (iso <= seleccion.desde) {
      // Tocar un día anterior cambia la entrada
      if (!rangoDeLaNoche(iso, lista)) empezarSeleccion(iso);
      return;
    }
    if (salidaMaxima && iso > salidaMaxima) return;
    setSeleccion({ desde: seleccion.desde, hasta: iso });
    setTipo('bloqueo');
    setMotivo('');
    setErrorDialogo(null);
  };

  const cancelarSeleccion = () => {
    setSeleccion(null);
    setErrorDialogo(null);
  };

  const guardar = async () => {
    if (!seleccion?.hasta || !propiedadId) return;
    setGuardando(true);
    setErrorDialogo(null);
    try {
      const nuevo = await createRango({ propiedad: propiedadId, desde: seleccion.desde, hasta: seleccion.hasta, tipo, motivo: motivo.trim() });
      setRangos((r) => [...(r ?? []), nuevo].sort((a, b) => a.desde.localeCompare(b.desde)));
      setSeleccion(null);
      mostrar(`${TIPOS[tipo].texto}: ${plural(nochesEntre(nuevo.desde, nuevo.hasta), 'noche', 'noches')} desde el ${fechaCorta(nuevo.desde)}`);
    } catch (e) {
      setErrorDialogo(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  const liberar = async (rango: RangoDisponibilidad) => {
    const ok = await confirmar('¿Liberar estas noches?', {
      texto: `Del ${fechaLarga(rango.desde)} al ${fechaLarga(rango.hasta)} vuelven a figurar como libres en el sitio.`,
      accion: 'Liberar noches',
    });
    if (!ok) return;
    try {
      await deleteRango(rango.id);
      setRangos((r) => (r ?? []).filter((x) => x.id !== rango.id));
      if (fijo === rango.id) setFijo(null);
      mostrar('Noches liberadas');
    } catch (e) {
      mostrar(e instanceof Error ? e.message : 'No se pudieron liberar las noches', 'peligro');
    }
  };

  const meses = [vista, mesSiguiente(vista)];
  const pendienteSalida = Boolean(seleccion && !seleccion.hasta);

  // Estadía resaltada: la que se apunta en la lista o la franja, o la que se tocó en el calendario.
  // Pasar el mouse por el calendario no apaga el resto: con tantas casillas, parpadeaba.
  const activoId = apuntado ?? fijo;
  const activo = fijo ? lista.find((r) => r.id === fijo) : undefined;

  // El detalle aparece arriba del calendario; no se desplaza la página para no perder el calendario de vista
  const tocarEstadia = (rango: RangoDisponibilidad) => setFijo(fijo === rango.id ? null : rango.id);

  // Desde la lista: deja elegida la entrada y lleva al calendario, que en pantallas chicas queda fuera de vista
  const marcarDesde = (iso: string) => {
    empezarSeleccion(iso);
    setVista(mesDe(iso));
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    calendarioRef.current?.scrollIntoView({ behavior: quieto ? 'auto' : 'smooth', block: 'start' });
  };

  // ---------- Franja de temporada: una barra por noche desde hoy ----------
  const noches = useMemo(() => Array.from({ length: SEMANAS_FRANJA * 7 }, (_, i) => sumarDias(hoy, i)), [hoy]);
  const libresEnFranja = noches.filter((n) => !rangoDeLaNoche(n, lista)).length;
  const proximaEntrada = lista.find((r) => r.desde >= hoy);
  const enCurso = rangoDeLaNoche(hoy, lista);
  const proximaSalida = enCurso ?? lista.find((r) => r.hasta > hoy);

  // ---------- Línea de tiempo: estadías que vienen y los huecos libres entre ellas ----------
  const tramos = useMemo(() => {
    const salida: Tramo[] = [];
    let cursor = hoy;
    lista
      .filter((r) => r.hasta > hoy)
      .forEach((r) => {
        if (r.desde > cursor) salida.push({ clase: 'libre', desde: cursor, hasta: r.desde });
        salida.push({ clase: 'estadia', rango: r });
        if (r.hasta > cursor) cursor = r.hasta;
      });
    salida.push({ clase: 'libre', desde: cursor, hasta: null });
    return salida;
  }, [lista, hoy]);
  const pasados = lista.filter((r) => r.hasta <= hoy);

  // Los dos pasos de la selección: el que toca ahora se marca con el acento y el hecho muestra su fecha
  const paso = (n: number, etiqueta: string, valor: string | null | undefined, actual: boolean) => (
    <li
      className={`flex h-9 items-center gap-2 rounded-full py-1 pl-1 pr-3.5 text-[13px] ring-1 ring-inset transition-colors ${
        actual ? 'bg-panel-acento-suave text-panel-texto ring-panel-acento' : 'text-panel-suave ring-panel-borde'
      }`}
    >
      <span
        aria-hidden="true"
        className={`tabular flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold ${
          // Tilde oscuro sobre el acento: el blanco no se lee sobre paletas de acento claro (dorado)
          valor ? 'bg-panel-acento text-panel-texto dark:text-panel-fondo' : actual ? 'bg-panel-superficie text-panel-texto' : 'bg-panel-hundido'
        }`}
      >
        {valor ? <Icono nombre="check" className="h-3.5 w-3.5" /> : n}
      </span>
      <span>
        {etiqueta}
        {valor ? <span className="font-medium text-panel-texto">: {fechaCorta(valor)}</span> : actual ? <span className="text-panel-suave">: tocá un día</span> : ''}
      </span>
    </li>
  );

  const instruccion =
    activo && !pendienteSalida ? (
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3">
        <p className="m-0 min-w-0 text-[13.5px] text-panel-suave">
          <Icono nombre={TIPOS[activo.tipo].icono} className="mr-1.5 inline h-4 w-4 align-[-3px] text-panel-texto" />
          <span className="font-medium text-panel-texto">{TIPOS[activo.tipo].texto}</span> del {fechaCorta(activo.desde)} al {fechaCorta(activo.hasta)},{' '}
          {plural(nochesEntre(activo.desde, activo.hasta), 'noche', 'noches')}.{activo.motivo ? ` ${activo.motivo}` : ''}
        </p>
        <span className="flex gap-1">
          <Boton tamano="sm" variante="fantasma" onClick={() => setFijo(null)} className="max-sm:h-10">
            Cerrar
          </Boton>
          <Boton tamano="sm" icono="borrar" onClick={() => liberar(activo)} className="max-sm:h-10">
            Liberar noches
          </Boton>
        </span>
      </div>
    ) : (
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3">
        <ol className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label="Pasos para marcar noches">
          {paso(1, 'Entrada', seleccion?.desde, !seleccion)}
          {paso(2, 'Salida', seleccion?.hasta, pendienteSalida)}
        </ol>
        {pendienteSalida && (
          <Boton tamano="sm" variante="fantasma" onClick={cancelarSeleccion} className="max-sm:h-10">
            Cancelar
          </Boton>
        )}
      </div>
    );

  const celda = (iso: string | null, i: number) => {
    if (!iso) return <span key={`h${i}`} aria-hidden="true" />;
    const tomado = rangoDeLaNoche(iso, lista);
    const enSeleccion = nochesElegidas && iso >= nochesElegidas.desde && (nochesElegidas.hasta ? iso < nochesElegidas.hasta : iso === nochesElegidas.desde);
    const esSalida = nochesElegidas?.hasta === iso;
    const fueraDeAlcance = Boolean(pendienteSalida && seleccion && iso > seleccion.desde && salidaMaxima !== null && iso > salidaMaxima);
    // Una noche pasada no se puede empezar a marcar (las estadías pasadas sí se pueden tocar para verlas)
    const pasada = iso < hoy && !tomado;
    const terminaSeleccion = pendienteSalida && iso === salidaMaxima;

    // La estadía se dibuja como una pieza: puntas redondeadas y separadas de la estadía vecina
    const empieza = tomado?.desde === iso;
    const manana = sumarDias(iso, 1);
    const termina = tomado?.hasta === manana;
    const cortaIzquierda = tomado && (empieza || i % 7 === 0 || iso.endsWith('-01'));
    const cortaDerecha = tomado && (termina || i % 7 === 6 || manana.endsWith('-01'));
    const atenuado = tomado && activoId && activoId !== tomado.id;

    let clases = 'text-panel-texto hover:bg-panel-hundido';
    if (tomado) clases = COLOR_NOCHE[tomado.tipo].texto;
    else if (enSeleccion) clases = 'bg-panel-acento-suave text-panel-texto ring-1 ring-inset ring-panel-acento';
    else if (esSalida) clases = 'border border-dashed border-panel-acento text-panel-texto';
    else if (fueraDeAlcance) clases = 'text-panel-tenue';

    const etiqueta = tomado
      ? `${fechaLarga(iso)}: ${TIPOS[tomado.tipo].texto.toLowerCase()} del ${fechaCorta(tomado.desde)} al ${fechaCorta(tomado.hasta)}`
      : `${fechaLarga(iso)}: ${pasada ? 'ya pasó' : 'libre'}`;
    return (
      <button
        key={iso}
        type="button"
        onClick={() => (tomado && !terminaSeleccion ? tocarEstadia(tomado) : elegirDia(iso))}
        onMouseEnter={() => setEncima(iso)}
        onFocus={() => setEncima(iso)}
        disabled={fueraDeAlcance || pasada}
        aria-label={etiqueta}
        aria-pressed={enSeleccion || (tomado ? fijo === tomado.id : undefined) || undefined}
        className={`tabular relative flex h-11 items-center justify-center rounded-lg text-[13.5px] transition-[background-color,opacity] duration-150 disabled:cursor-not-allowed ${clases} ${pasada ? 'opacity-40 hover:bg-transparent' : ''} ${atenuado ? 'opacity-30' : ''}`}
      >
        {tomado && (
          <span
            aria-hidden="true"
            className={`absolute inset-y-0.5 ${COLOR_NOCHE[tomado.tipo].fondo} ${cortaIzquierda ? 'left-[3px] rounded-l-lg' : atenuado ? 'left-0' : '-left-px'} ${cortaDerecha ? 'right-[3px] rounded-r-lg' : atenuado ? 'right-0' : '-right-px'}`}
            style={rayasDe(tomado.tipo)}
          />
        )}
        {/* Dentro de una estadía, una línea fina separa cada noche de la anterior */}
        {tomado && !cortaIzquierda && <span aria-hidden="true" className="absolute inset-y-0.5 left-0 z-10 w-px bg-current opacity-20" />}
        <span className="relative z-10">{Number(iso.slice(8))}</span>
        {iso === hoy && <span aria-hidden="true" className="absolute bottom-1 z-10 h-1 w-1 rounded-full bg-current" />}
      </button>
    );
  };

  // ---------- Partes de la pantalla ----------
  const franja = (
    <Tarjeta titulo={`Las próximas ${SEMANAS_FRANJA} semanas`} descripcion="Cada barra es una noche. Tocá un mes para verlo en el calendario.">
      {rangos === null ? (
        <Esqueleto className="h-24 w-full" />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="relative">
            {/* Las barras son solo para mirar; para moverse están los meses de abajo, que se pueden tocar */}
            <div className="flex h-12 items-end gap-px sm:h-14" aria-hidden="true" onMouseLeave={() => setApuntado(null)}>
              {noches.map((n) => {
                const r = rangoDeLaNoche(n, lista);
                const atenuada = r && activoId && activoId !== r.id;
                const elegida = nochesElegidas && n >= nochesElegidas.desde && (nochesElegidas.hasta ? n < nochesElegidas.hasta : n === nochesElegidas.desde);
                return (
                  <span
                    key={n}
                    title={r ? `${fechaCorta(n)}: ${TIPOS[r.tipo].texto.toLowerCase()}` : `${fechaCorta(n)}: libre`}
                    onMouseEnter={() => setApuntado(r ? r.id : null)}
                    className={`min-w-0 flex-1 rounded-[2px] transition-[height,opacity] duration-200 ${
                      r ? `h-full ${COLOR_NOCHE[r.tipo].fondo} ${COLOR_NOCHE[r.tipo].texto} ${atenuada ? 'opacity-30' : ''}` : elegida ? 'h-8 bg-panel-acento' : 'h-3 bg-panel-borde'
                    } ${n.endsWith('-01') ? 'ml-1' : r && r.desde === n && n !== hoy ? 'ml-[3px]' : ''}`}
                    style={r ? rayasDe(r.tipo) : undefined}
                  />
                );
              })}
            </div>
            {/* Meses debajo de la franja, donde empieza cada uno: llevan a ese mes en el calendario */}
            <div className="relative mt-1 h-10 text-[12px]">
              {noches.map((n, i) => {
                // Un mes que empieza a menos de 12 noches de hoy se taparía con "Hoy"; ese mes ya se ve junto al actual
                if (i !== 0 && !(n.endsWith('-01') && i >= 12)) return null;
                const mes = mesDe(n);
                const visible = meses.some((m) => m.anio === mes.anio && m.mes === mes.mes);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setVista(mes)}
                    aria-label={`Ver ${MESES[mes.mes].toLowerCase()} ${mes.anio} en el calendario`}
                    aria-pressed={visible}
                    className={`absolute top-0 flex h-10 min-w-10 -translate-x-1.5 items-center justify-center rounded-md px-1.5 whitespace-nowrap transition-colors hover:bg-panel-hundido ${
                      i === 0 ? 'font-medium text-panel-texto' : visible ? 'font-medium text-panel-texto' : 'text-panel-tenue'
                    }`}
                    // El último mes puede caer contra el borde: no lo dejamos salirse de la tarjeta
                    style={{ left: i === 0 ? 0 : `min(${((i / noches.length) * 100).toFixed(2)}%, calc(100% - 2.5rem))` }}
                  >
                    {i === 0 ? 'Hoy' : MESES[mes.mes].slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>

          <ul className="m-0 flex list-none flex-wrap gap-x-6 gap-y-2.5 p-0 text-[13.5px] text-panel-suave">
            <li className="flex items-center gap-2">
              <Icono nombre="luna" className="h-4 w-4 text-panel-texto" />
              <span>
                <span className="tabular font-medium text-panel-texto">{libresEnFranja}</span> de {noches.length} noches libres
              </span>
            </li>
            <li className="flex items-center gap-2">
              <Icono nombre="entrar" className="h-4 w-4 text-panel-texto" />
              {proximaEntrada ? (
                <span>
                  Próxima entrada el <span className="font-medium text-panel-texto">{fechaCorta(proximaEntrada.desde)}</span>
                </span>
              ) : (
                'Sin entradas cargadas'
              )}
            </li>
            {proximaSalida && (
              <li className="flex items-center gap-2">
                <Icono nombre="salir" className="h-4 w-4 text-panel-texto" />
                <span>
                  {enCurso ? 'Hoy está tomada, se libera el ' : 'Próxima salida el '}
                  <span className="font-medium text-panel-texto">{fechaCorta(proximaSalida.hasta)}</span>
                </span>
              </li>
            )}
          </ul>
        </div>
      )}
    </Tarjeta>
  );

  const calendario = (
    <Tarjeta
      titulo="Calendario"
      descripcion={
        propiedad && (
          <>
            {propiedad.precioPorNocheUSD ? `USD ${propiedad.precioPorNocheUSD} por noche. ` : ''}
            Estadía mínima: {plural(minimo, 'noche', 'noches')}.
          </>
        )
      }
      acciones={
        <div className="flex items-center gap-1">
          <Boton variante="fantasma" tamano="sm" aria-label="Mes anterior" onClick={() => setVista((v) => mesSiguiente(v, -1))} className="max-sm:h-10 max-sm:w-10">
            <Icono nombre="atras" className="h-4 w-4" />
          </Boton>
          <Boton variante="fantasma" tamano="sm" onClick={() => setVista(mesDe(hoy))} className="max-sm:h-10">
            Hoy
          </Boton>
          <Boton variante="fantasma" tamano="sm" aria-label="Mes siguiente" onClick={() => setVista((v) => mesSiguiente(v))} className="max-sm:h-10 max-sm:w-10">
            <Icono nombre="flecha" className="h-4 w-4" />
          </Boton>
        </div>
      }
    >
      <div className="mb-5 flex min-h-10 items-center" aria-live="polite">
        {instruccion}
      </div>

      {rangos === null ? (
        <Esqueleto className="h-72 w-full" />
      ) : (
        <div className="grid gap-8 md:grid-cols-2" onMouseLeave={() => setEncima(null)}>
          {meses.map(({ anio, mes }) => (
            <div key={`${anio}-${mes}`}>
              <p className="font-display m-0 mb-3 text-[22px] leading-none">
                {MESES[mes]} <span className="text-panel-tenue">{anio}</span>
              </p>
              <div className="grid grid-cols-7 gap-y-1">
                {SEMANA.map((d) => (
                  <span key={d} className="pb-1 text-center text-[12px] text-panel-tenue">
                    {d}
                  </span>
                ))}
                {celdasDelMes(anio, mes).map(celda)}
              </div>
            </div>
          ))}
        </div>
      )}

      <ul className="m-0 mt-5 flex list-none flex-wrap gap-x-5 gap-y-2.5 border-t border-panel-borde p-0 pt-4 text-[12.5px] text-panel-suave">
        {(['ocupada', 'reserva', 'bloqueo'] as const).map((t) => (
          <li key={t} className="flex items-center gap-2">
            {/* La muestra es una casilla como las del calendario, con su textura */}
            <span aria-hidden="true" className={`tabular flex h-6 w-8 items-center justify-center rounded-md text-[11.5px] ${COLOR_NOCHE[t].fondo} ${COLOR_NOCHE[t].texto}`} style={rayasDe(t)}>
              12
            </span>
            <span>
              <span className="text-panel-texto">{TIPOS[t].texto}</span>: {TIPOS[t].leyenda}
            </span>
          </li>
        ))}
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="tabular flex h-6 w-8 items-center justify-center rounded-md bg-panel-acento-suave text-[11.5px] ring-1 ring-inset ring-panel-acento">
            12
          </span>
          <span className="text-panel-texto">Tu selección</span>
        </li>
        <li className="w-full text-panel-tenue">Cada casilla es una noche. El día de salida queda libre para el próximo huésped.</li>
      </ul>
    </Tarjeta>
  );

  // Una parada de la línea de tiempo: el círculo sobre la línea y su contenido al costado
  const parada = (clave: string, marca: React.ReactNode, contenido: React.ReactNode, extra?: { activo?: boolean; alEntrar?: () => void; alSalir?: () => void }) => (
    <li
      key={clave}
      onMouseEnter={extra?.alEntrar}
      onMouseLeave={extra?.alSalir}
      className={`relative flex gap-3.5 py-3 pl-1 pr-2 transition-colors ${extra?.activo ? 'rounded-lg bg-panel-hundido' : ''}`}
    >
      <span className="relative z-10 flex w-8 shrink-0 justify-center">{marca}</span>
      <div className="flex min-w-0 flex-1 items-start gap-2">{contenido}</div>
    </li>
  );

  const lineaDeTiempo = (
    <Tarjeta titulo="Temporada" descripcion="Estadías y huecos libres, desde hoy.">
      {rangos === null ? (
        <div className="flex flex-col gap-3">
          <Esqueleto className="h-12 w-full" />
          <Esqueleto className="h-12 w-full" />
        </div>
      ) : lista.length === 0 ? (
        <EstadoVacio icono="luna" titulo="Todas las noches están libres" texto="Elegí un rango en el calendario para bloquearlo o marcarlo como ocupado." />
      ) : (
        <div className="flex flex-col gap-4">
          <ol className="relative m-0 list-none p-0">
            {/* La línea que une las paradas */}
            <span aria-hidden="true" className="absolute bottom-6 left-[21px] top-6 w-px bg-panel-borde-fuerte" />
            {tramos.map((t) => {
              if (t.clase === 'estadia') {
                const r = t.rango;
                const enCursoAhora = r.desde <= hoy;
                return parada(
                  r.id,
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full ring-4 ring-panel-superficie ${COLOR_NOCHE[r.tipo].fondo} ${COLOR_NOCHE[r.tipo].texto}`}
                    style={rayasDe(r.tipo)}
                  >
                    <Icono nombre={TIPOS[r.tipo].icono} className="h-4 w-4" />
                  </span>,
                  <>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex flex-wrap items-center gap-2 text-[12px] text-panel-tenue">
                        {TIPOS[r.tipo].texto}
                        {enCursoAhora && <Insignia tono="acento">En curso</Insignia>}
                      </span>
                      <span className="tabular text-[14px] font-medium">
                        {fechaCorta(r.desde)} al {fechaCorta(r.hasta)}
                      </span>
                      <span className="text-[13px] text-panel-suave">
                        {plural(nochesEntre(r.desde, r.hasta), 'noche', 'noches')}
                        {r.motivo ? `. ${r.motivo}` : ''}
                      </span>
                    </div>
                    <Boton variante="fantasma" tamano="sm" icono="borrar" aria-label={`Liberar del ${fechaCorta(r.desde)} al ${fechaCorta(r.hasta)}`} onClick={() => liberar(r)} className="max-sm:h-10 max-sm:w-10" />
                  </>,
                  { activo: activoId === r.id, alEntrar: () => setApuntado(r.id), alSalir: () => setApuntado(null) }
                );
              }
              const largo = t.hasta ? nochesEntre(t.desde, t.hasta) : null;
              const noAlcanza = largo !== null && largo < minimo;
              return parada(
                `libre-${t.desde}`,
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-panel-borde-fuerte bg-panel-superficie text-panel-tenue">
                  <Icono nombre="luna" className="h-4 w-4" />
                </span>,
                <>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[13.5px] text-panel-suave">
                      {largo === null ? (
                        <>Libre desde el {fechaCorta(t.desde)} en adelante</>
                      ) : (
                        <>
                          <span className="font-medium text-panel-texto">{plural(largo, 'noche libre', 'noches libres')}</span> desde el {fechaCorta(t.desde)}
                        </>
                      )}
                    </span>
                    {noAlcanza && (
                      <span className="mt-1">
                        <Insignia tono="aviso">
                          <Icono nombre="alerta" className="h-3.5 w-3.5" />
                          Menos que la estadía mínima de {plural(minimo, 'noche', 'noches')}
                        </Insignia>
                      </span>
                    )}
                  </div>
                  <Boton variante="fantasma" tamano="sm" icono="candado" onClick={() => marcarDesde(t.desde < hoy ? hoy : t.desde)} className="max-sm:h-10">
                    Marcar
                  </Boton>
                </>
              );
            })}
          </ol>

          {pasados.length > 0 && (
            <details className="group border-t border-panel-borde pt-3">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-[13px] text-panel-suave hover:text-panel-texto">
                <Icono nombre="flecha" className="h-4 w-4 transition-transform group-open:rotate-90" />
                {plural(pasados.length, 'estadía que ya pasó', 'estadías que ya pasaron')}
              </summary>
              <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0 pl-6">
                {pasados.map((r) => (
                  <li key={r.id} className="flex items-center gap-2 text-[13px] text-panel-tenue">
                    <Icono nombre={TIPOS[r.tipo].icono} className="h-3.5 w-3.5" />
                    <span className="tabular flex-1">
                      {fechaCorta(r.desde)} al {fechaCorta(r.hasta)}
                    </span>
                    <Boton variante="fantasma" tamano="sm" icono="borrar" aria-label={`Borrar del ${fechaCorta(r.desde)} al ${fechaCorta(r.hasta)}`} onClick={() => liberar(r)} className="max-sm:h-10 max-sm:w-10" />
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </Tarjeta>
  );

  return (
    <div>
      <Encabezado
        titulo="Disponibilidad"
        descripcion="Marcá las noches en que una propiedad de alquiler temporario no se puede alquilar. En el sitio, el resto aparece como libre."
      />

      {error && (
        <div className="mb-5">
          <Alerta
            tono="peligro"
            titulo="No pudimos cargar las fechas"
            accion={
              <Boton
                tamano="sm"
                onClick={() => {
                  setError(null);
                  setIntento((n) => n + 1);
                }}
              >
                Reintentar
              </Boton>
            }
          >
            {error.replace(/\.$/, '')}. Revisá la conexión y probá de nuevo.
          </Alerta>
        </div>
      )}

      {propiedades === null ? (
        <div className="flex flex-col gap-3">
          <Esqueleto className="h-10 w-80" />
          <Esqueleto className="h-80 w-full" />
        </div>
      ) : propiedades.length === 0 ? (
        <Tarjeta>
          <EstadoVacio
            icono="calendario"
            titulo="No hay propiedades de alquiler temporario"
            texto="Cargá una propiedad con la operación “Alquiler temporario” y después marcá acá sus fechas."
            accion={
              <BotonLink href="/admin/propiedades/nueva" variante="principal" icono="mas">
                Nueva propiedad
              </BotonLink>
            }
          />
        </Tarjeta>
      ) : (
        <div className="flex flex-col gap-5">
          <Campo etiqueta="Propiedad" htmlFor={`${id}-propiedad`} className="max-w-md">
            <select id={`${id}-propiedad`} className={control} value={propiedadId} onChange={(e) => cambiarPropiedad(e.target.value)}>
              {propiedades.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.codigoInterno ? `${p.codigoInterno}: ` : ''}
                  {p.title}
                </option>
              ))}
            </select>
          </Campo>

          {franja}

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
            <div ref={calendarioRef} className="min-w-0 scroll-mt-20">
              {calendario}
            </div>
            {lineaDeTiempo}
          </div>
        </div>
      )}

      <Dialogo
        abierto={Boolean(seleccion?.hasta)}
        alCerrar={cancelarSeleccion}
        titulo="Marcar noches"
        descripcion={
          seleccion?.hasta && (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="flex items-center gap-1.5">
                <Icono nombre="entrar" className="h-4 w-4" />
                {fechaCorta(seleccion.desde)}
              </span>
              <span className="flex items-center gap-1.5">
                <Icono nombre="salir" className="h-4 w-4" />
                {fechaCorta(seleccion.hasta)}
              </span>
              <span className="flex items-center gap-1.5">
                <Icono nombre="luna" className="h-4 w-4" />
                {plural(nochesEntre(seleccion.desde, seleccion.hasta), 'noche', 'noches')}
              </span>
            </span>
          )
        }
        acciones={
          <>
            <Boton onClick={cancelarSeleccion}>Cancelar</Boton>
            <Boton variante="principal" cargando={guardando} onClick={guardar}>
              Guardar noches
            </Boton>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <fieldset className="m-0 grid grid-cols-2 gap-2.5 border-0 p-0">
            <legend className="mb-2 p-0 text-[13px] font-medium text-panel-suave">Por qué no está disponible</legend>
            {(['bloqueo', 'ocupada'] as const).map((t) => (
              <label
                key={t}
                className={`relative flex cursor-pointer flex-col gap-2.5 rounded-xl border p-3.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-panel-acento ${
                  tipo === t ? 'border-panel-acento bg-panel-acento-suave' : 'border-panel-borde hover:bg-panel-hundido'
                }`}
              >
                <input type="radio" name={`${id}-tipo`} value={t} checked={tipo === t} onChange={() => setTipo(t)} className="sr-only" />
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${COLOR_NOCHE[t].fondo} ${COLOR_NOCHE[t].texto}`} style={rayasDe(t)}>
                  <Icono nombre={TIPOS[t].icono} className="h-[18px] w-[18px]" />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-[14px] font-medium">{TIPOS[t].texto}</span>
                  <span className="text-[12.5px] leading-snug text-panel-suave">{TIPOS[t].ayuda}</span>
                </span>
                {tipo === t && <Icono nombre="check" className="absolute right-3 top-3 h-4 w-4 text-panel-acento" />}
              </label>
            ))}
          </fieldset>
          <Campo etiqueta="Nota interna (opcional)" htmlFor={`${id}-motivo`} ayuda="Solo la ve el equipo. No aparece en el sitio.">
            <textarea id={`${id}-motivo`} className={areaTexto} maxLength={200} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej.: familia Pérez, alquilada por Airbnb" />
          </Campo>
          {errorDialogo && <Alerta tono="peligro">{errorDialogo}</Alerta>}
        </div>
      </Dialogo>

      {aviso}
      {dialogoConfirmar}
    </div>
  );
}

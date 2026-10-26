'use client';

import { useEffect, useId, useState, type FormEvent } from 'react';
import Link from 'next/link';
import Icono from '@/components/panel/Icono';
import { getHorario, turnosDelDia, guardarHorario, type DiaCerrado, type HorarioVisitas, type Tramo, type VisitaFueraDeHorario } from '@/services/agenda';
import { Alerta, Boton, Campo, Encabezado, Esqueleto, EstadoVacio, Insignia, Tarjeta, control, useAviso } from '@/components/panel/ui';
import { fechaCorta, hoyIso, sumarDias } from '@/components/calendario/fechas';

// Horario de visitas (HU-19): en qué días y franjas la oficina recibe visitas, cada cuánto empieza un turno
// y qué días cierra. El calendario de "Agendar una visita" de las fichas toma los turnos de acá.

type Editable = Omit<HorarioVisitas, 'texto'>;

// Se muestra de lunes a domingo; en los datos el 0 es el domingo
const ORDEN = [1, 2, 3, 4, 5, 6, 0];
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DIAS_PLURAL = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];
const DURACIONES = [15, 30, 45, 60];
const TRAMOS_POR_DIA = 4;
const minutosDe = (hora: string) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));
const aHora = (minutos: number) => `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
const ULTIMO_MINUTO = 23 * 60 + 59;

// Regla de las franjas (la misma que valida el servidor): duran un número entero de turnos, así el final
// coincide con el final de un turno y no queda un pedazo sin usar.

// Franja nueva: desde las 9, con tantos turnos completos como entren hasta las 13
const tramoNuevo = (duracion: number): Tramo => ({ desde: '09:00', hasta: aHora(9 * 60 + Math.floor(240 / duracion) * duracion) });

// La franja nueva arranca donde termina la última (unas dos horas de turnos completos), para no pisarla
function franjaSiguiente(tramos: Tramo[], duracion: number): Tramo {
  const ultima = tramos[tramos.length - 1];
  if (!ultima) return tramoNuevo(duracion);
  const inicio = minutosDe(ultima.hasta);
  const turnos = Math.max(1, Math.min(Math.round(120 / duracion), Math.floor((ULTIMO_MINUTO - inicio) / duracion)));
  return { desde: ultima.hasta, hasta: aHora(inicio + turnos * duracion) };
}

// Recorta el final para que la franja termine justo en un turno; null si no entra ninguno
function ajustarFranja(t: Tramo, duracion: number): Tramo | null {
  const turnos = Math.floor((minutosDe(t.hasta) - minutosDe(t.desde)) / duracion);
  return turnos >= 1 ? { desde: t.desde, hasta: aHora(minutosDe(t.desde) + turnos * duracion) } : null;
}

// Por qué una franja no sirve (con las horas que sí sirven), o null si está bien. `campo` es lo que se cambió.
function problemaFranja(t: Tramo, duracion: number, campo: 'desde' | 'hasta'): string | null {
  const a = minutosDe(t.desde);
  const b = minutosDe(t.hasta);
  if (b <= a) return `La franja tiene que terminar después de las ${t.desde}.`;
  if (b - a >= duracion && (b - a) % duracion === 0) return null;
  if (campo === 'hasta') {
    const antes = a + Math.max(1, Math.floor((b - a) / duracion)) * duracion;
    const opciones = [antes, antes + duracion].filter((m) => m <= ULTIMO_MINUTO && m !== b).map(aHora);
    return `Con turnos de ${duracion} min, si empieza a las ${t.desde} tiene que terminar a las ${opciones.join(' o ')}.`;
  }
  const despues = b - Math.max(1, Math.floor((b - a) / duracion)) * duracion;
  const opciones = [despues - duracion, despues].filter((m) => m >= 0 && m !== a).map(aHora);
  return `Con turnos de ${duracion} min, si termina a las ${t.hasta} tiene que empezar a las ${opciones.join(' o ')}.`;
}

// Agrega o quita un turno [desde, desde + duración) en las franjas de un día. Al quitar, un pedazo que ya no
// da para un turno se descarta. Al agregar sobre el final de una franja, se le suma un turno entero al final
// (así nunca queda una "media franja"); las franjas que se tocan se unen en una sola.
function alternarTurno(tramos: Tramo[], inicio: number, duracion: number, quitar: boolean): Tramo[] {
  const pisada = quitar ? undefined : tramos.find((x) => minutosDe(x.desde) < inicio + duracion && inicio < minutosDe(x.hasta));
  const desde = pisada ? minutosDe(pisada.hasta) : inicio;
  const hasta = Math.min(desde + duracion, ULTIMO_MINUTO);
  let tramosMin = tramos.map((x) => [minutosDe(x.desde), minutosDe(x.hasta)]);
  tramosMin = quitar
    ? tramosMin.flatMap(([a, b]) => [[a, Math.min(b, desde)], [Math.max(a, hasta), b]]).filter(([a, b]) => b - a >= duracion)
    : [...tramosMin, [desde, hasta]];
  const unidos: number[][] = [];
  for (const [a, b] of tramosMin.sort((x, y) => x[0] - y[0])) {
    const ultimo = unidos[unidos.length - 1];
    if (ultimo && a <= ultimo[1]) ultimo[1] = Math.max(ultimo[1], b);
    else unidos.push([a, b]);
  }
  return unidos.map(([a, b]) => ({ desde: aHora(a), hasta: aHora(b) }));
}

// Lo que se escribe en un campo de hora → "HH:MM", o null si no es una hora: "9" → 09:00, "905" → 09:05,
// "9:5" → 09:05, "1730" → 17:30
function leerHora(texto: string) {
  const limpio = texto.trim();
  let h: number;
  let m: number;
  if (limpio.includes(':')) [h, m] = limpio.split(':').map((x) => Number(x || 0));
  else {
    const digitos = limpio.replace(/\D/g, '');
    if (!digitos || digitos.length > 4) return null;
    h = Number(digitos.length <= 2 ? digitos : digitos.slice(0, -2));
    m = digitos.length <= 2 ? 0 : Number(digitos.slice(-2));
  }
  if (!Number.isInteger(h) || !Number.isInteger(m) || h > 23 || m > 59 || h < 0 || m < 0) return null;
  return aHora(h * 60 + m);
}

// Una hora que se escribe a mano (cualquier minuto). Se confirma al salir o con Enter; si lo escrito no es una
// hora, vuelve al valor anterior. Se monta con key={valor}, así se actualiza desde afuera.
// `alCambiar` devuelve false si la hora no se acepta (el aviso lo da la página): entonces vuelve a la anterior.
function CampoHora({ etiqueta, valor, alCambiar }: { etiqueta: string; valor: string; alCambiar: (hora: string) => boolean }) {
  const [texto, setTexto] = useState(valor);
  const confirmar = (escrito: string) => {
    const hora = leerHora(escrito);
    setTexto(hora ?? valor);
    if (hora && hora !== valor && !alCambiar(hora)) setTexto(valor);
  };
  return (
    <input
      type="text"
      inputMode="numeric"
      maxLength={5}
      aria-label={etiqueta}
      title="Escribí la hora, por ejemplo 9:05"
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={(e) => confirmar(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && confirmar(texto)}
      className="tabular w-[3.75rem] rounded-md bg-transparent px-1.5 py-1 text-center text-[14px] font-medium text-panel-texto outline-none transition-colors hover:bg-panel-superficie focus:bg-panel-superficie focus:ring-2 focus:ring-panel-acento"
    />
  );
}

// Eje de horas para toda la semana: de la primera franja a la última, en horas enteras (8 a 20 sin franjas).
// `marcas` es el inicio de cada barra, una por turno posible.
function ejeDe(semana: Editable['semana'], duracion: number) {
  const tramos = semana.flatMap((d) => d.tramos).filter((t) => t.desde < t.hasta);
  let inicio = tramos.length ? Math.floor(Math.min(...tramos.map((t) => minutosDe(t.desde))) / 60) * 60 : 8 * 60;
  let fin = tramos.length ? Math.ceil(Math.max(...tramos.map((t) => minutosDe(t.hasta))) / 60) * 60 : 20 * 60;
  // Al menos 6 horas, para que un solo tramo corto no se vea como una pared
  if (fin - inicio < 360) [inicio, fin] = [Math.max(0, inicio - 60), Math.min(24 * 60, Math.max(fin, inicio + 360))];
  const paso = fin - inicio > 10 * 60 ? 2 : 1;
  const horas: number[] = [];
  for (let h = inicio / 60; h <= fin / 60; h += paso) horas.push(h);
  const marcas: number[] = [];
  for (let t = inicio; t < fin; t += duracion) marcas.push(t);
  return { inicio, fin, horas, marcas };
}

// El próximo día de esta semana o la siguiente que cae en un cierre (para avisarlo junto al día)
function proximoCierre(dia: number, cerrados: DiaCerrado[], hoy: string) {
  for (let i = 0; i < 14; i += 1) {
    const fecha = sumarDias(hoy, i);
    if (new Date(`${fecha}T12:00:00`).getDay() !== dia) continue;
    const c = cerrados.find((x) => x.desde <= fecha && fecha <= x.hasta);
    if (c) return { fecha, motivo: c.motivo };
  }
  return null;
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
const rango = (c: DiaCerrado) => (c.desde === c.hasta ? fechaCorta(c.desde) : `${fechaCorta(c.desde)} al ${fechaCorta(c.hasta)}`);

export default function HorarioVisitasPage() {
  const id = useId();
  const [horario, setHorario] = useState<Editable | null>(null);
  // Lo último guardado, para saber si hay cambios y poder deshacerlos
  const [guardado, setGuardado] = useState<string>('');
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [fuera, setFuera] = useState<VisitaFueraDeHorario[]>([]);
  const [cierre, setCierre] = useState({ desde: '', hasta: '', motivo: '' });
  // Franja apuntada o en edición: se resalta en el mapa de la semana
  const [editando, setEditando] = useState<string | null>(null);
  // Barra bajo el mouse ("dia-minutos"): muestra su horario
  const [barra, setBarra] = useState<string | null>(null);
  // Cuál de los próximos 7 días muestra la vista previa (0 = hoy)
  const [vista, setVista] = useState(0);
  const { mostrar, aviso } = useAviso();

  const cargar = () => {
    getHorario()
      .then((datos) => {
        setHorario(datos);
        setGuardado(JSON.stringify(datos));
      })
      .catch((e: Error) => setErrorCarga(e.message || 'No se pudo cargar el horario'));
  };

  useEffect(() => {
    cargar();
  }, []);

  const cambiado = Boolean(horario) && JSON.stringify(horario) !== guardado;

  const cambiarTramos = (dia: number, cambio: (tramos: Tramo[]) => Tramo[]) => {
    setErrorGuardar(null);
    setHorario((h) => h && { ...h, semana: h.semana.map((d, i) => (i === dia ? { tramos: cambio(d.tramos) } : d)) });
  };

  // Clic en una barra del mapa: agrega ese turno o lo quita (si queda en el medio, la franja se parte en dos)
  const alternar = (dia: number, desde: number, quitar: boolean) => {
    if (!horario) return;
    const nuevos = alternarTurno(horario.semana[dia].tramos, desde, horario.duracionMinutos, quitar);
    if (nuevos.length > TRAMOS_POR_DIA) {
      mostrar(`Cada día admite hasta ${TRAMOS_POR_DIA} franjas. Uní o quitá alguna antes de partirla.`, 'peligro');
      return;
    }
    // Al unirse con la franja siguiente puede quedar un largo que no da turnos enteros: se avisa y no se aplica
    const problema = nuevos.map((t) => problemaFranja(t, horario.duracionMinutos, 'hasta')).find(Boolean);
    if (problema) {
      mostrar(`No se puede agregar ese turno: se uniría con la franja siguiente. ${problema}`, 'peligro');
      return;
    }
    cambiarTramos(dia, () => nuevos);
  };

  // Hora escrita en una franja: si no da turnos enteros, no se acepta y se dice qué horas sirven
  const cambiarHora = (dia: number, i: number, campo: 'desde' | 'hasta', valor: string) => {
    if (!horario) return false;
    const nueva = { ...horario.semana[dia].tramos[i], [campo]: valor };
    const problema = problemaFranja(nueva, horario.duracionMinutos, campo);
    if (problema) {
      mostrar(problema, 'peligro');
      return false;
    }
    cambiarTramos(dia, (ts) => ts.map((x, j) => (j === i ? nueva : x)));
    return true;
  };

  // Cambiar la duración recorta cada franja hasta el último turno completo que entra (y avisa cuántas cambió)
  const cambiarDuracion = (duracion: number) => {
    if (!horario) return;
    let ajustadas = 0;
    const semana = horario.semana.map((d) => ({
      tramos: d.tramos.flatMap((t) => {
        const ajustada = ajustarFranja(t, duracion);
        if (!ajustada || ajustada.hasta !== t.hasta) ajustadas += 1;
        return ajustada ? [ajustada] : [];
      }),
    }));
    setErrorGuardar(null);
    setHorario({ ...horario, duracionMinutos: duracion, semana });
    if (ajustadas) mostrar(`Con turnos de ${duracion} min, ajusté el final de ${plural(ajustadas, 'franja', 'franjas')} para que termine${ajustadas === 1 ? '' : 'n'} justo en un turno.`, 'info');
  };

  const guardar = async () => {
    if (!horario) return;
    setGuardando(true);
    setErrorGuardar(null);
    try {
      const { fueraDeHorario, ...datos } = await guardarHorario(horario);
      setHorario(datos);
      setGuardado(JSON.stringify(datos));
      setFuera(fueraDeHorario);
      mostrar('Horario guardado. El calendario de visitas ya usa el nuevo.');
    } catch (e) {
      setErrorGuardar(e instanceof Error ? e.message : 'No se pudo guardar el horario');
    } finally {
      setGuardando(false);
    }
  };

  const agregarCierre = (e: FormEvent) => {
    e.preventDefault();
    if (!horario || !cierre.desde) return;
    const hasta = cierre.hasta && cierre.hasta >= cierre.desde ? cierre.hasta : cierre.desde;
    setErrorGuardar(null);
    setHorario({ ...horario, cerrados: [...horario.cerrados, { desde: cierre.desde, hasta, motivo: cierre.motivo.trim() }].sort((a, b) => a.desde.localeCompare(b.desde)) });
    setCierre({ desde: '', hasta: '', motivo: '' });
  };

  const hoy = hoyIso();
  const diaDeHoy = new Date(`${hoy}T12:00:00`).getDay();
  const eje = ejeDe(horario?.semana ?? [], horario?.duracionMinutos ?? 30);

  return (
    <>
      <Encabezado
        titulo="Horario de visitas"
        descripcion="Los días y horarios en que la oficina recibe visitas. El calendario de “Agendar una visita” de cada ficha toma los turnos de acá."
      />

      {errorCarga && (
        <Alerta tono="peligro" titulo="No se pudo cargar el horario" accion={<Boton tamano="sm" onClick={() => { setErrorCarga(null); cargar(); }}>Reintentar</Boton>}>
          {errorCarga}
        </Alerta>
      )}

      {!horario && !errorCarga ? (
        <Tarjeta>
          <div className="flex flex-col gap-4">
            {ORDEN.map((d) => (
              <Esqueleto key={d} className="h-9 w-full" />
            ))}
          </div>
        </Tarjeta>
      ) : horario ? (
        <div className="flex flex-col gap-5 pb-24">
          {fuera.length > 0 && (
            <Alerta tono="aviso" titulo={`${plural(fuera.length, 'visita ya pedida queda', 'visitas ya pedidas quedan')} fuera del nuevo horario`}>
              <p className="m-0">Siguen agendadas: coordinalas con cada cliente desde <Link href="/admin/visitas" className="font-medium underline underline-offset-2">Visitas</Link>.</p>
              <ul className="m-0 mt-1.5 flex list-none flex-col gap-0.5 p-0">
                {fuera.slice(0, 8).map((v) => (
                  <li key={v.id} className="tabular">
                    {fechaCorta(v.fecha)}, {v.hora} h · {v.cliente || 'Sin nombre'}
                    {v.propiedad ? ` · ${v.propiedad}` : ''}
                  </li>
                ))}
                {fuera.length > 8 && <li>y {fuera.length - 8} más.</li>}
              </ul>
            </Alerta>
          )}

          {/* Vista previa: lo que ofrece la ficha de una propiedad el día elegido, con los cambios sin guardar incluidos */}
          {(() => {
            // Fechas reales de los próximos 7 días (no días de la semana sueltos): así un feriado se ve cerrado,
            // como lo ve el cliente en la ficha
            const fechas = Array.from({ length: 7 }, (_, i) => sumarDias(hoy, i));
            const datosDe = (fecha: string) => {
              const dia = new Date(`${fecha}T12:00:00`).getDay();
              const cierre = horario.cerrados.find((c) => c.desde <= fecha && fecha <= c.hasta) ?? null;
              return { dia, cierre, turnos: cierre ? [] : turnosDelDia(horario.semana[dia].tramos, horario.duracionMinutos) };
            };
            const fechaVista = fechas[vista];
            const { dia: diaVista, cierre: cierreVista, turnos: turnosVista } = datosDe(fechaVista);
            const nombreFecha = `${DIAS[diaVista].toLowerCase()} ${Number(fechaVista.slice(8))}`;
            // Igual que en la ficha: desde las 13:00 ya es la tarde
            const grupos = [
              { nombre: 'Mañana', turnos: turnosVista.filter((h) => h < '13:00') },
              { nombre: 'Tarde', turnos: turnosVista.filter((h) => h >= '13:00') },
            ].filter((g) => g.turnos.length);
            return (
              <Tarjeta
                titulo="Vista previa: lo que ve un cliente"
                descripcion="Son los horarios que aparecen esta semana cuando alguien toca “Agendar una visita” en una propiedad. Quitar un horario lo quita de todas las semanas."
                relleno={false}
              >
                <div role="tablist" aria-label="Día de la vista previa" className="grid grid-cols-7 border-b border-panel-borde">
                  {fechas.map((f, i) => {
                    const { dia, cierre, turnos: t } = datosDe(f);
                    const activa = i === vista;
                    const estado = cierre ? 'cerrado' : t.length ? plural(t.length, 'horario', 'horarios') : 'no abre';
                    return (
                      <button
                        key={f}
                        type="button"
                        role="tab"
                        aria-selected={activa}
                        aria-label={`${DIAS[dia]} ${Number(f.slice(8))}${i === 0 ? ' (hoy)' : ''}: ${estado}${cierre?.motivo ? `, ${cierre.motivo}` : ''}`}
                        onClick={() => setVista(i)}
                        className={`relative flex flex-col items-center gap-0.5 pb-2.5 pt-1.5 transition-colors ${activa ? 'text-panel-texto' : 'text-panel-suave hover:bg-panel-hundido hover:text-panel-texto'}`}
                      >
                        {/* "Hoy" sobre el día de hoy; en los demás, el mismo alto vacío para que todo quede alineado */}
                        <span aria-hidden="true" className="flex h-4 items-center">
                          {i === 0 && <span className="rounded-full bg-panel-acento px-1.5 text-[10px] font-semibold leading-4 text-white">Hoy</span>}
                        </span>
                        <span className="text-[13px] font-medium">
                          {DIAS[dia].slice(0, 3)} <span className="tabular">{Number(f.slice(8))}</span>
                        </span>
                        <span className={`tabular text-[11.5px] ${cierre ? 'font-medium text-amber-700 dark:text-amber-400' : t.length ? '' : 'text-panel-tenue'}`}>{estado}</span>
                        {activa && <span aria-hidden="true" className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-panel-acento" />}
                      </button>
                    );
                  })}
                </div>
                <div role="tabpanel" className="flex flex-col gap-3 p-5">
                  {cierreVista ? (
                    <Alerta tono="aviso" titulo={`El ${nombreFecha} la oficina está cerrada${cierreVista.motivo ? `: ${cierreVista.motivo}` : ''}`}>
                      Un cliente no encuentra horarios ese día, aunque los {DIAS_PLURAL[diaVista]} se atienda. Para abrirlo, quitalo de Días cerrados.
                    </Alerta>
                  ) : (
                    <p className="m-0 text-[13.5px] text-panel-suave">
                      Un cliente que elige el <span className="font-medium text-panel-texto">{nombreFecha}</span>
                      {turnosVista.length ? ` puede pedir visita en ${plural(turnosVista.length, 'horario', 'horarios')} de ${horario.duracionMinutos} min:` : ' no encuentra horarios: ese día de la semana la oficina no recibe visitas.'}
                    </p>
                  )}
                  {grupos.length > 0 ? (
                    grupos.map((g) => (
                      <div key={g.nombre} className="flex flex-col gap-1.5">
                        <span className="text-[12.5px] text-panel-tenue">{g.nombre}</span>
                        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                          {g.turnos.map((h) => (
                            <li key={h}>
                              <button
                                type="button"
                                title="Quitar este horario"
                                aria-label={`Quitar el horario de las ${h} del ${DIAS[diaVista].toLowerCase()}`}
                                onClick={() => alternar(diaVista, minutosDe(h), true)}
                                className="tabular group flex items-center gap-1 rounded-full border border-panel-borde-fuerte px-3 py-1 text-[13px] transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:hover:border-red-900 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                              >
                                {h} h
                                <Icono nombre="cerrar" className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))
                  ) : (
                    !cierreVista && (
                      <Boton tamano="sm" icono="mas" className="self-start" onClick={() => cambiarTramos(diaVista, () => [tramoNuevo(horario.duracionMinutos)])}>
                        Abrir los {DIAS_PLURAL[diaVista]} a la mañana
                      </Boton>
                    )
                  )}
                </div>
              </Tarjeta>
            );
          })()}

          <Tarjeta
            titulo="Días y franjas"
            descripcion="Tocá las barras para agregar o quitar turnos, o escribí la hora en cada franja (9:05, 1730…)."
            acciones={
              <label className="flex items-center gap-2 whitespace-nowrap text-[13px] text-panel-suave">
                Turnos de
                <select
                  value={horario.duracionMinutos}
                  onChange={(e) => cambiarDuracion(Number(e.target.value))}
                  className={`${control} max-w-[6.5rem]`}
                >
                  {DURACIONES.map((m) => (
                    <option key={m} value={m}>
                      {m} min
                    </option>
                  ))}
                </select>
              </label>
            }
            relleno={false}
          >
            <ul className="m-0 list-none divide-y divide-panel-borde p-0">
              {/* Eje de horas, común a los siete días: así las filas se alinean y se lee la forma de la semana */}
              <li aria-hidden="true" className="hidden px-5 pb-1 pt-4 md:grid md:grid-cols-[180px_minmax(0,1fr)_88px] md:gap-x-4">
                <span className="tabular col-start-2 relative h-4 text-[11.5px] text-panel-tenue">
                  {eje.horas.map((h) => (
                    <span key={h} className="absolute -translate-x-1/2 first:translate-x-0 last:-translate-x-full" style={{ left: `${((h * 60 - eje.inicio) / (eje.fin - eje.inicio)) * 100}%` }}>
                      {h}
                    </span>
                  ))}
                </span>
              </li>
              {ORDEN.map((dia) => {
                const { tramos } = horario.semana[dia];
                const atiende = tramos.length > 0;
                const turnos = turnosDelDia(tramos, horario.duracionMinutos).length;
                const cierreProximo = proximoCierre(dia, horario.cerrados, hoy);
                return (
                  <li key={dia} className="grid gap-x-4 gap-y-3 px-5 py-4 md:grid-cols-[180px_minmax(0,1fr)_88px] md:items-center">
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <div className="flex items-center gap-3">
                        {/* Ficha de almanaque con las dos primeras letras: marca el día sin competir con las barras.
                            Hoy va con el acento; un día cerrado, punteado. */}
                        <span
                          aria-hidden="true"
                          className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg border ${
                            dia === diaDeHoy
                              ? 'border-panel-acento bg-panel-acento-suave text-panel-acento'
                              : atiende
                                ? 'border-panel-borde-fuerte bg-panel-superficie text-panel-texto'
                                : 'border-dashed border-panel-borde-fuerte text-panel-tenue'
                          }`}
                        >
                          <span className="font-display text-[20px] leading-none">{DIAS[dia].slice(0, 2)}</span>
                          {dia === diaDeHoy && <span className="mt-0.5 text-[9.5px] font-semibold leading-none">hoy</span>}
                        </span>
                        <span className="flex min-w-0 flex-col gap-1">
                          <span className="text-[14px] font-medium leading-tight">{DIAS[dia]}</span>
                          {/* Llave abierto/cerrado: verde de "abierto", distinto del color de las barras */}
                          <button
                            type="button"
                            role="switch"
                            aria-checked={atiende}
                            aria-label={`Recibe visitas el ${DIAS[dia].toLowerCase()}`}
                            onClick={() => cambiarTramos(dia, () => (atiende ? [] : [tramoNuevo(horario.duracionMinutos)]))}
                            className="-ml-0.5 flex items-center gap-1.5 whitespace-nowrap rounded-full py-0.5 pl-0.5 pr-1.5 text-[12px] text-panel-suave transition-colors hover:text-panel-texto focus-visible:outline-2 focus-visible:outline-panel-acento"
                          >
                            <span className={`relative h-4 w-7 shrink-0 rounded-full transition-colors duration-150 ${atiende ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-panel-borde-fuerte'}`}>
                              <span
                                className={`absolute left-0 top-0.5 h-3 w-3 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition-transform duration-150 motion-reduce:transition-none ${
                                  atiende ? 'translate-x-3.5' : 'translate-x-0.5'
                                }`}
                              />
                            </span>
                            {/* La llave es la regla de todas las semanas; un feriado es una excepción y va aparte */}
                            {atiende ? 'Abre' : 'No abre'}
                          </button>
                        </span>
                      </div>
                      {cierreProximo && (
                        <Insignia tono="aviso" className="max-w-full self-start whitespace-normal! leading-snug">
                          <Icono nombre="alerta" className="h-3.5 w-3.5 shrink-0" />
                          Cerrado {cierreProximo.fecha === hoy ? 'hoy' : `el ${Number(cierreProximo.fecha.slice(8))}/${Number(cierreProximo.fecha.slice(5, 7))}`}
                          {cierreProximo.motivo ? ` · ${cierreProximo.motivo}` : ''}
                        </Insignia>
                      )}
                    </div>

                    {/* Cada barra es un turno, como en la franja de Disponibilidad cada barra es una noche. Con el mouse
                        se agrega o se quita un turno; el teclado y el lector de pantalla usan los campos de abajo. */}
                    <div aria-hidden="true" className="flex h-9 items-stretch gap-px" onMouseLeave={() => setBarra(null)}>
                      {eje.marcas.map((t) => {
                        // Barra alta si en ella empieza un turno; baja si cae en una franja que ya no da para otro
                        const dur = horario.duracionMinutos;
                        let inicioTurno = t;
                        const conTurno = tramos.findIndex((x) => {
                          const desde = minutosDe(x.desde);
                          const primero = desde + Math.max(0, Math.ceil((t - desde) / dur)) * dur;
                          if (primero >= t + dur || primero + dur > minutosDe(x.hasta)) return false;
                          inicioTurno = primero;
                          return true;
                        });
                        const i = conTurno >= 0 ? conTurno : tramos.findIndex((x) => minutosDe(x.desde) < t + dur && t < minutosDe(x.hasta));
                        const entero = conTurno >= 0;
                        const editada = i >= 0 && editando === `${dia}-${i}`;
                        // Sobre el final de una franja, agregar suma un turno entero después de su cierre
                        const agregaDesde = i >= 0 ? minutosDe(tramos[i].hasta) : t;
                        const apuntada = barra === `${dia}-${t}`;
                        return (
                          <button
                            key={t}
                            type="button"
                            tabIndex={-1}
                            onMouseEnter={() => setBarra(`${dia}-${t}`)}
                            onClick={() => alternar(dia, entero ? inicioTurno : t, entero)}
                            className="group relative flex min-w-0 flex-1 cursor-pointer items-end"
                          >
                            <span
                              className={`w-full rounded-[2px] transition-[height,background-color,opacity] duration-150 motion-reduce:transition-none ${
                                entero
                                  ? `h-full ${editada ? 'bg-panel-acento' : 'bg-panel-marca'} group-hover:opacity-60`
                                  : i >= 0
                                    ? `h-3 ${editada ? 'bg-panel-acento' : 'bg-panel-borde-fuerte'} group-hover:h-2/3 group-hover:bg-panel-acento/50`
                                    : 'h-1.5 bg-panel-borde group-hover:h-2/3 group-hover:bg-panel-acento/50'
                              }`}
                            />
                            {apuntada && (
                              <span className="tabular pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-panel-texto px-2 py-1 text-[12px] font-medium text-panel-superficie shadow-[0_4px_12px_-2px_rgba(10,20,40,0.35)]">
                                {aHora(entero ? inicioTurno : agregaDesde)} a {aHora(Math.min((entero ? inicioTurno : agregaDesde) + dur, ULTIMO_MINUTO))}
                                <span className="font-normal opacity-75"> · {entero ? 'clic para quitar' : 'clic para agregar'}</span>
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <span className={`tabular text-[13px] md:text-right ${atiende ? 'text-panel-suave' : 'text-panel-tenue'}`}>
                      {atiende ? plural(turnos, 'turno', 'turnos') : 'Sin turnos'}
                    </span>

                    {atiende && (
                      // Cada franja es una ficha "09:00 – 13:00 ×": se lee como un rango y se edita en el lugar
                      <div className="flex flex-wrap items-center gap-2 md:col-span-2 md:col-start-2">
                        {tramos.map((t, i) => (
                          <div
                            key={i}
                            role="group"
                            aria-label={`${DIAS[dia]}, franja ${i + 1}`}
                            onFocus={() => setEditando(`${dia}-${i}`)}
                            onBlur={() => setEditando(null)}
                            onMouseEnter={() => setEditando(`${dia}-${i}`)}
                            onMouseLeave={() => setEditando(null)}
                            className={`flex items-center gap-0.5 rounded-lg border bg-panel-hundido py-0.5 pl-1 pr-0.5 transition-colors duration-150 ${
                              editando === `${dia}-${i}` ? 'border-panel-acento' : 'border-panel-borde'
                            }`}
                          >
                            <CampoHora key={`d${t.desde}`} etiqueta="Desde" valor={t.desde} alCambiar={(v) => cambiarHora(dia, i, 'desde', v)} />
                            <span aria-hidden="true" className="text-panel-tenue">
                              –
                            </span>
                            <CampoHora key={`h${t.hasta}`} etiqueta="Hasta" valor={t.hasta} alCambiar={(v) => cambiarHora(dia, i, 'hasta', v)} />
                            <button
                              type="button"
                              aria-label={`Quitar la franja de ${t.desde} a ${t.hasta} del ${DIAS[dia].toLowerCase()}`}
                              title="Quitar franja"
                              onClick={() => cambiarTramos(dia, (ts) => ts.filter((_, j) => j !== i))}
                              className="ml-0.5 rounded-md p-1.5 text-panel-tenue transition-colors hover:bg-panel-superficie hover:text-red-600 dark:hover:text-red-400"
                            >
                              <Icono nombre="cerrar" className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                        {tramos.length < TRAMOS_POR_DIA && (
                          <button
                            type="button"
                            onClick={() => cambiarTramos(dia, (ts) => [...ts, franjaSiguiente(ts, horario.duracionMinutos)])}
                            className="flex items-center gap-1.5 rounded-lg border border-dashed border-panel-borde-fuerte px-3 py-1.5 text-[13px] text-panel-suave transition-colors hover:bg-panel-hundido hover:text-panel-texto"
                          >
                            <Icono nombre="mas" className="h-4 w-4" />
                            Franja
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Tarjeta>

          <Tarjeta titulo="Días cerrados" descripcion="Feriados y vacaciones: esos días no se ofrecen turnos aunque sean de atención.">
            <form onSubmit={agregarCierre} className="grid gap-3 sm:grid-cols-[repeat(2,minmax(0,10rem))_minmax(0,1fr)_auto] sm:items-end">
              <Campo etiqueta="Desde" htmlFor={`${id}-desde`}>
                <input id={`${id}-desde`} type="date" required min={hoy} value={cierre.desde} onChange={(e) => setCierre({ ...cierre, desde: e.target.value })} className={control} />
              </Campo>
              <Campo etiqueta="Hasta" htmlFor={`${id}-hasta`}>
                <input id={`${id}-hasta`} type="date" min={cierre.desde || hoy} value={cierre.hasta} onChange={(e) => setCierre({ ...cierre, hasta: e.target.value })} className={control} />
              </Campo>
              <Campo etiqueta="Motivo (opcional)" htmlFor={`${id}-motivo`}>
                <input id={`${id}-motivo`} type="text" maxLength={100} placeholder="Feriado, vacaciones…" value={cierre.motivo} onChange={(e) => setCierre({ ...cierre, motivo: e.target.value })} className={control} />
              </Campo>
              <Boton type="submit" icono="mas">
                Agregar
              </Boton>
            </form>
            <p className="m-0 mt-2 text-[12.5px] text-panel-tenue">Si es un solo día, dejá &quot;Hasta&quot; vacío.</p>

            {horario.cerrados.length === 0 ? (
              <EstadoVacio icono="calendario" titulo="Sin días cerrados" texto="Todos los días de atención ofrecen turnos." />
            ) : (
              <ul className="m-0 mt-4 list-none divide-y divide-panel-borde rounded-lg border border-panel-borde p-0">
                {horario.cerrados.map((c, i) => {
                  const paso = c.hasta < hoy;
                  return (
                    <li key={`${c.desde}-${i}`} className={`flex items-center gap-3 px-4 py-2.5 ${paso ? 'text-panel-tenue' : ''}`}>
                      <span className="min-w-0 flex-1 text-[13.5px]">
                        <span className="tabular font-medium">{rango(c)}</span>
                        {c.motivo && <span className="text-panel-suave"> · {c.motivo}</span>}
                      </span>
                      {paso && <Insignia>Ya pasó</Insignia>}
                      <Boton
                        variante="fantasma"
                        tamano="sm"
                        icono="borrar"
                        aria-label={`Quitar el cierre del ${rango(c)}`}
                        onClick={() => {
                          setErrorGuardar(null);
                          setHorario({ ...horario, cerrados: horario.cerrados.filter((_, j) => j !== i) });
                        }}
                        className="max-sm:h-10 max-sm:w-10"
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </Tarjeta>

          {/* Barra de guardado: aparece solo con cambios, siempre a mano aunque la página sea larga. Va en el azul
              oscuro del menú (no en el blanco de las tarjetas) y el botón en el acento, para que no pase desapercibida. */}
          {(cambiado || errorGuardar) && (
            <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-xl bg-panel-menu px-4 py-3 text-white shadow-[0_12px_32px_-8px_rgba(5,12,30,0.55)] ring-1 ring-white/10 dark:ring-white/25 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-start gap-2.5 text-[13.5px]" role={errorGuardar ? 'alert' : 'status'}>
                <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${errorGuardar ? 'bg-red-400' : 'bg-amber-400'}`} />
                {errorGuardar ? (
                  <span className="text-red-200">{errorGuardar}</span>
                ) : (
                  <span>
                    <span className="font-semibold">Tenés cambios sin guardar.</span> <span className="text-white/70">Los clientes siguen viendo el horario anterior.</span>
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={guardando}
                  onClick={() => {
                    setHorario(JSON.parse(guardado));
                    setErrorGuardar(null);
                  }}
                  className="h-10 rounded-lg px-4 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
                >
                  Deshacer
                </button>
                <Boton variante="acento" icono="check" cargando={guardando} disabled={!cambiado} onClick={guardar}>
                  Guardar horario
                </Boton>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {aviso}
    </>
  );
}

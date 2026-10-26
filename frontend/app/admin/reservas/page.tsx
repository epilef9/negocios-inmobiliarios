'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  EVENTO_RESERVAS,
  confirmarReserva,
  fechaHoraArgentina,
  getReservas,
  horasRestantes,
  idPropiedad,
  rechazarReserva,
  usd,
  type EstadoReserva,
  type Reserva,
} from '@/services/reservas';
import Icono, { type NombreIcono } from '@/components/panel/Icono';
import { Alerta, Boton, Campo, Dialogo, Encabezado, Esqueleto, EstadoVacio, Insignia, areaTexto, control, useAviso } from '@/components/panel/ui';
import { ESTADO_RESERVA, estadoDe } from '@/components/panel/estados';

// Reservas de estadías hechas desde el sitio (HU-20). Las pendientes retienen las noches hasta que vencen:
// se confirman (pasan a ocupadas) o se rechazan (se liberan). Una vencida se puede confirmar igual si
// nadie tomó esas noches; si las tomó otro cliente, el panel lo dice y no deja confirmarla.

type Pestana = 'pendientes' | 'confirmadas' | 'vencidas' | 'cerradas' | 'todas';

const PESTANAS: { id: Pestana; texto: string; estados?: EstadoReserva[] }[] = [
  { id: 'pendientes', texto: 'Por confirmar', estados: ['pendiente'] },
  { id: 'confirmadas', texto: 'Confirmadas', estados: ['confirmada'] },
  { id: 'vencidas', texto: 'Vencidas', estados: ['vencida'] },
  { id: 'cerradas', texto: 'Rechazadas y canceladas', estados: ['rechazada', 'cancelada'] },
  { id: 'todas', texto: 'Todas' },
];

// Menos de esto para vencer: la pendiente se destaca
const HORAS_URGENTE = 12;

const diaCorto = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
const diaLargo = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

// "vence en 5 h" / "vence en menos de 1 h"
function plazoTexto(horas: number) {
  if (horas <= 0) return 'Plazo vencido';
  if (horas < 1) return 'Vence en menos de 1 h';
  return `Vence en ${Math.floor(horas)} h`;
}

const POR: Record<string, string> = { cliente: 'el cliente', admin: 'la inmobiliaria', sistema: 'automático' };

function enlaceWhatsApp(r: Reserva) {
  let numero = (r.cliente?.telefono ?? '').replace(/\D/g, '');
  if (!numero) return null;
  if (!numero.startsWith('54')) numero = `549${numero.replace(/^0/, '')}`;
  const texto = `Hola ${r.cliente?.nombre ?? ''}, te escribimos de Negocios Inmobiliarios por tu reserva en "${r.tituloPropiedad}" del ${diaCorto(r.entrada)} al ${diaCorto(r.salida)}.`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

function Accion({ icono, texto, onClick, href, tono }: { icono: NombreIcono; texto: string; onClick?: () => void; href?: string | null; tono?: 'exito' | 'peligro' }) {
  const clases = `rounded-md p-2 text-panel-tenue transition-colors hover:bg-panel-hundido ${
    tono === 'exito' ? 'hover:text-emerald-700 dark:hover:text-emerald-400' : tono === 'peligro' ? 'hover:text-red-600 dark:hover:text-red-400' : 'hover:text-panel-texto'
  }`;
  if (href !== undefined) {
    if (!href) return null;
    return (
      <a href={href} target="_blank" rel="noreferrer" title={texto} aria-label={texto} className={clases}>
        <Icono nombre={icono} className="h-[18px] w-[18px]" />
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} title={texto} aria-label={texto} className={clases}>
      <Icono nombre={icono} className="h-[18px] w-[18px]" />
    </button>
  );
}

// Plazo de una pendiente: tenue si sobra tiempo, destacado cuando quedan menos de 12 h
function Plazo({ reserva, ahora }: { reserva: Reserva; ahora: number }) {
  const horas = horasRestantes(reserva.venceEn, ahora);
  if (horas < HORAS_URGENTE) {
    return (
      <Insignia tono="peligro">
        <Icono nombre="reloj" className="h-3.5 w-3.5" />
        {plazoTexto(horas)}
      </Insignia>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-[12.5px] text-panel-suave">
      <Icono nombre="reloj" className="h-3.5 w-3.5" />
      {plazoTexto(horas)}
    </span>
  );
}

export default function ReservasAdminPage() {
  const id = useId();
  const [reservas, setReservas] = useState<Reserva[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pestana, setPestana] = useState<Pestana | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [ahora, setAhora] = useState(0);
  const [detalle, setDetalle] = useState<Reserva | null>(null);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);
  const [aRechazar, setARechazar] = useState<Reserva | null>(null);
  const [motivo, setMotivo] = useState('');
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const { mostrar, aviso } = useAviso();

  const cargar = useCallback(() => {
    getReservas()
      .then((lista) => {
        setReservas(lista);
        setAhora(Date.now());
        setError(null);
        // Se abre en "Por confirmar" si hay alguna esperando
        setPestana((actual) => actual ?? (lista.some((r) => r.estado === 'pendiente') ? 'pendientes' : 'todas'));
        window.dispatchEvent(new Event(EVENTO_RESERVAS));
      })
      .catch((e: Error) => setError(e.message || 'No se pudieron cargar las reservas'));
  }, []);

  useEffect(() => {
    cargar();
    // El plazo se recalcula cada minuto; cada 5 se vuelve a pedir la lista (ahí el servidor marca las vencidas)
    const reloj = setInterval(() => setAhora(Date.now()), 60000);
    const recarga = setInterval(cargar, 300000);
    return () => {
      clearInterval(reloj);
      clearInterval(recarga);
    };
  }, [cargar]);

  const reemplazar = (actualizada: Reserva) => {
    setReservas((lista) => lista?.map((r) => (r.id === actualizada.id ? { ...actualizada, sePuedeReactivar: undefined } : r)) ?? null);
    window.dispatchEvent(new Event(EVENTO_RESERVAS));
  };

  const confirmar = async (reserva: Reserva) => {
    setTrabajando(reserva.id);
    setErrorDetalle(null);
    try {
      const confirmada = await confirmarReserva(reserva.id);
      reemplazar(confirmada);
      mostrar(`Confirmaste la reserva de ${reserva.cliente?.nombre ?? 'el cliente'}: las noches quedaron ocupadas.`);
      setDetalle(null);
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'No se pudo confirmar la reserva';
      // Desde la lista, el motivo se ve en el detalle
      setDetalle(reserva);
      setErrorDetalle(mensaje);
      cargar();
    } finally {
      setTrabajando(null);
    }
  };

  const rechazar = async () => {
    if (!aRechazar) return;
    setTrabajando(aRechazar.id);
    try {
      reemplazar(await rechazarReserva(aRechazar.id, motivo.trim()));
      mostrar(`Rechazaste la reserva de ${aRechazar.cliente?.nombre ?? 'el cliente'}. Las noches quedaron libres.`, 'info');
      setARechazar(null);
      setDetalle(null);
    } catch (e) {
      mostrar(e instanceof Error ? e.message : 'No se pudo rechazar la reserva', 'peligro');
      cargar();
    } finally {
      setTrabajando(null);
    }
  };

  const abrirRechazo = (r: Reserva) => {
    setMotivo('');
    setARechazar(r);
  };

  const lista = useMemo(() => reservas ?? [], [reservas]);
  const cuenta = Object.fromEntries(PESTANAS.map((p) => [p.id, p.estados ? lista.filter((r) => p.estados!.includes(r.estado)).length : lista.length])) as Record<Pestana, number>;
  const urgentes = lista.filter((r) => r.estado === 'pendiente' && horasRestantes(r.venceEn, ahora) < HORAS_URGENTE).length;

  const texto = busqueda.trim().toLowerCase();
  const estadosPestana = PESTANAS.find((p) => p.id === pestana)?.estados;
  const visibles = lista
    .filter((r) => (!estadosPestana || estadosPestana.includes(r.estado)) && (!texto || [r.cliente?.nombre, r.cliente?.email, r.cliente?.telefono, r.tituloPropiedad].some((c) => c?.toLowerCase().includes(texto))))
    // Las pendientes, la que vence antes arriba; el resto, la más nueva arriba
    .sort((a, b) =>
      a.estado === 'pendiente' && b.estado === 'pendiente' ? Date.parse(a.venceEn) - Date.parse(b.venceEn) : a.estado === 'pendiente' ? -1 : b.estado === 'pendiente' ? 1 : Date.parse(b.createdAt) - Date.parse(a.createdAt)
    );

  const descripcion = reservas
    ? cuenta.pendientes
      ? `${plural(cuenta.pendientes, 'reserva espera', 'reservas esperan')} confirmación${urgentes ? `, ${urgentes} con menos de ${HORAS_URGENTE} h` : ''}.`
      : `Todas respondidas · ${cuenta.todas} en total`
    : 'Pedidos de estadía del sitio en las propiedades de alquiler temporario.';

  const acciones = (r: Reserva) => (
    <>
      {/* Confirmar no va de un clic desde la lista: abre el detalle, donde se ve todo y está el botón */}
      {(r.estado === 'pendiente' || (r.estado === 'vencida' && r.sePuedeReactivar)) && (
        <Accion icono="check" texto={`Revisar y confirmar la reserva de ${r.cliente?.nombre} (${diaCorto(r.entrada)} – ${diaCorto(r.salida)})`} onClick={() => { setErrorDetalle(null); setDetalle(r); }} tono="exito" />
      )}
      {r.estado === 'pendiente' && <Accion icono="cerrar" texto={`Rechazar la reserva de ${r.cliente?.nombre} (${diaCorto(r.entrada)} – ${diaCorto(r.salida)})`} onClick={() => abrirRechazo(r)} tono="peligro" />}
      <Accion icono="telefono" texto={`Escribirle a ${r.cliente?.nombre} por WhatsApp`} href={enlaceWhatsApp(r)} />
      <Accion icono="ojo" texto={`Ver el detalle de la reserva de ${r.cliente?.nombre} (${diaCorto(r.entrada)} – ${diaCorto(r.salida)})`} onClick={() => { setErrorDetalle(null); setDetalle(r); }} />
    </>
  );

  // Segunda línea de la columna de estado: el plazo de las pendientes o qué pasa con una vencida
  const situacion = (r: Reserva) => {
    if (r.estado === 'pendiente') return <Plazo reserva={r} ahora={ahora} />;
    if (r.estado === 'vencida' && r.sePuedeReactivar !== undefined) {
      return <span className="text-[12.5px] text-panel-suave">{r.sePuedeReactivar ? 'Noches libres: se puede confirmar' : 'Otro cliente tomó esas noches'}</span>;
    }
    return null;
  };

  const d = detalle ? lista.find((r) => r.id === detalle.id) ?? detalle : null;
  const estadoDetalle = d ? estadoDe(ESTADO_RESERVA, d.estado) : null;

  return (
    <>
      <Encabezado titulo="Reservas" descripcion={descripcion} />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div role="tablist" aria-label="Estado de las reservas" className="flex shrink-0 gap-1 overflow-x-auto rounded-lg bg-panel-hundido p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {PESTANAS.map((p) => {
              const activa = pestana === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={activa}
                  onClick={() => setPestana(p.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-[13.5px] transition-colors ${activa ? 'bg-panel-superficie font-medium shadow-sm ring-1 ring-panel-borde' : 'text-panel-suave hover:text-panel-texto'}`}
                >
                  {p.texto}
                  <span className={`tabular rounded px-1.5 text-[12px] ${p.id === 'pendientes' && cuenta.pendientes ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'text-panel-tenue'}`}>{cuenta[p.id]}</span>
                </button>
              );
            })}
          </div>
          <label className="relative sm:w-72">
            <span className="sr-only">Buscar</span>
            <Icono nombre="buscar" className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-panel-tenue" />
            <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Cliente, email o propiedad" className={`${control} pl-10`} />
          </label>
        </div>

        {error && (
          <Alerta tono="peligro" titulo="No se pudieron cargar las reservas" accion={<Boton tamano="sm" onClick={() => { setError(null); setReservas(null); cargar(); }}>Reintentar</Boton>}>
            {error}
          </Alerta>
        )}

        <div className="overflow-hidden rounded-xl border border-panel-borde bg-panel-superficie">
          {!reservas && !error ? (
            <div className="flex flex-col divide-y divide-panel-borde">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-4">
                  <Esqueleto className="h-4 w-28" />
                  <Esqueleto className="h-4 w-1/4" />
                  <Esqueleto className="h-4 w-1/3" />
                </div>
              ))}
            </div>
          ) : reservas && visibles.length === 0 ? (
            <EstadoVacio
              icono="maleta"
              titulo={lista.length === 0 ? 'Todavía no hay reservas' : pestana === 'pendientes' && !texto ? 'No hay reservas por confirmar' : 'Ninguna reserva coincide'}
              texto={lista.length === 0 ? 'Cuando un cliente reserve una estadía desde el sitio, aparece acá.' : undefined}
            />
          ) : reservas ? (
            <ul className="m-0 list-none divide-y divide-panel-borde p-0">
              {visibles.map((r) => {
                const estado = estadoDe(ESTADO_RESERVA, r.estado);
                const urgente = r.estado === 'pendiente' && horasRestantes(r.venceEn, ahora) < HORAS_URGENTE;
                return (
                  <li
                    key={r.id}
                    // Seis columnas recién con pantalla ancha; antes, de a dos, para que cliente y propiedad no se corten
                    className={`grid gap-x-4 gap-y-2 px-4 py-3.5 md:grid-cols-2 xl:grid-cols-[150px_minmax(0,1fr)_minmax(0,1fr)_170px_96px_auto] xl:items-center ${
                      urgente ? 'bg-red-50/60 dark:bg-red-950/20' : ''
                    } ${['rechazada', 'cancelada'].includes(r.estado) ? 'text-panel-suave' : ''}`}
                  >
                    <span className="flex flex-col">
                      <span className="tabular whitespace-nowrap text-[13.5px] font-medium">
                        {diaCorto(r.entrada)} – {diaCorto(r.salida)}
                      </span>
                      <span className="text-[12.5px] text-panel-suave">
                        {plural(r.noches, 'noche', 'noches')} · {plural(r.huespedes, 'huésped', 'huéspedes')}
                      </span>
                    </span>
                    <button type="button" onClick={() => { setErrorDetalle(null); setDetalle(r); }} className="min-w-0 text-left">
                      <span className="block truncate text-[14px] font-medium hover:underline">{r.cliente?.nombre || 'Sin nombre'}</span>
                      <span className="block truncate text-[13px] text-panel-suave">{r.cliente?.telefono || r.cliente?.email}</span>
                    </button>
                    <span className="min-w-0 truncate text-[13.5px] text-panel-suave">{r.tituloPropiedad || 'Propiedad sin título'}</span>
                    <span className="flex flex-wrap items-center gap-2 xl:flex-col xl:items-start xl:gap-1">
                      <Insignia tono={estado.tono}>{estado.texto}</Insignia>
                      {situacion(r)}
                    </span>
                    <span className="tabular text-[13.5px] font-medium xl:text-right">{usd(r.totalUSD)}</span>
                    <div className="-ml-2 flex items-center xl:ml-0 xl:justify-end">{trabajando === r.id ? <span className="px-2 text-[13px] text-panel-tenue">Guardando…</span> : acciones(r)}</div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </div>

      {/* Detalle */}
      <Dialogo
        abierto={Boolean(d)}
        alCerrar={() => setDetalle(null)}
        ancho="lg"
        titulo={d ? `Reserva de ${d.cliente?.nombre || 'cliente'}` : ''}
        descripcion={d && estadoDetalle && (
          <span className="flex flex-wrap items-center gap-2">
            <Insignia tono={estadoDetalle.tono}>{estadoDetalle.texto}</Insignia>
            {d.estado === 'pendiente' && <Plazo reserva={d} ahora={ahora} />}
          </span>
        )}
        acciones={
          d && (
            <>
              {d.estado === 'pendiente' && (
                <Boton variante="peligro" icono="cerrar" onClick={() => abrirRechazo(d)} className="mr-auto">
                  Rechazar
                </Boton>
              )}
              <Boton onClick={() => setDetalle(null)}>Cerrar</Boton>
              {(d.estado === 'pendiente' || (d.estado === 'vencida' && d.sePuedeReactivar)) && (
                <Boton variante="principal" icono="check" cargando={trabajando === d.id} onClick={() => confirmar(d)}>
                  {d.estado === 'vencida' ? 'Confirmar igual' : 'Confirmar'}
                </Boton>
              )}
            </>
          )
        }
      >
        {d && (
          <div className="flex flex-col gap-5">
            {errorDetalle && (
              <Alerta tono="peligro" titulo="No se pudo confirmar">
                {errorDetalle}
              </Alerta>
            )}
            {d.estado === 'vencida' && d.sePuedeReactivar === true && (
              <Alerta tono="info" titulo="Venció sin respuesta, pero las noches siguen libres">
                Si la confirmás ahora, se reactiva y las noches pasan a ocupadas. Conviene avisarle al cliente.
              </Alerta>
            )}
            {d.estado === 'vencida' && d.sePuedeReactivar === false && (
              <Alerta tono="aviso" titulo="Ya no se puede confirmar">
                Venció el plazo y otro cliente reservó alguna de esas noches. Podés escribirle para ofrecerle otras fechas.
              </Alerta>
            )}

            <dl className="m-0 grid grid-cols-[120px_1fr] gap-x-4 gap-y-3 text-sm">
              <dt className="text-panel-suave">Estadía</dt>
              <dd className="m-0 font-medium">
                {diaLargo(d.entrada)} → {diaLargo(d.salida)}
                <span className="block font-normal text-panel-suave">
                  {plural(d.noches, 'noche', 'noches')} · {plural(d.huespedes, 'huésped', 'huéspedes')}
                </span>
              </dd>
              <dt className="text-panel-suave">Propiedad</dt>
              <dd className="m-0">
                {idPropiedad(d) ? (
                  <Link href={`/propiedades/${idPropiedad(d)}`} target="_blank" className="underline-offset-2 hover:underline">
                    {d.tituloPropiedad}
                  </Link>
                ) : (
                  d.tituloPropiedad || 'Sin título'
                )}
                {idPropiedad(d) && (
                  <Link href={`/admin/disponibilidad?propiedad=${idPropiedad(d)}`} className="ml-3 text-panel-acento underline-offset-2 hover:underline">
                    Ver disponibilidad
                  </Link>
                )}
              </dd>
              <dt className="text-panel-suave">Cliente</dt>
              <dd className="m-0 flex flex-col gap-0.5">
                <span>{d.cliente?.nombre}</span>
                {d.cliente?.email && (
                  <a href={`mailto:${d.cliente.email}`} className="text-panel-suave hover:underline">
                    {d.cliente.email}
                  </a>
                )}
                {d.cliente?.telefono && (
                  <span className="flex flex-wrap gap-x-3">
                    <a href={`tel:${d.cliente.telefono.replace(/[^\d+]/g, '')}`} className="tabular hover:underline">
                      {d.cliente.telefono}
                    </a>
                    {enlaceWhatsApp(d) && (
                      <a href={enlaceWhatsApp(d) as string} target="_blank" rel="noreferrer" className="text-panel-acento hover:underline">
                        WhatsApp
                      </a>
                    )}
                  </span>
                )}
              </dd>
              <dt className="text-panel-suave">Importe</dt>
              <dd className="tabular m-0 flex flex-col gap-0.5">
                <span className="flex justify-between gap-4 sm:max-w-72">
                  <span className="text-panel-suave">
                    {plural(d.noches, 'noche', 'noches')} × {usd(d.precioPorNocheUSD)}
                  </span>
                  {usd(d.noches * d.precioPorNocheUSD)}
                </span>
                {d.limpiezaUSD > 0 && (
                  <span className="flex justify-between gap-4 sm:max-w-72">
                    <span className="text-panel-suave">Limpieza</span>
                    {usd(d.limpiezaUSD)}
                  </span>
                )}
                <span className="flex justify-between gap-4 border-t border-panel-borde pt-1 font-semibold sm:max-w-72">
                  <span>Total</span>
                  {usd(d.totalUSD)}
                </span>
              </dd>
              {(d.estado === 'pendiente' || d.estado === 'vencida') && (
                <>
                  <dt className="text-panel-suave">Plazo</dt>
                  <dd className="m-0">{d.estado === 'pendiente' ? 'Confirmar antes del' : 'Venció el'} {fechaHoraArgentina(d.venceEn)}</dd>
                </>
              )}
              {d.motivoRechazo && (
                <>
                  <dt className="text-panel-suave">Motivo</dt>
                  <dd className="m-0">{d.motivoRechazo}</dd>
                </>
              )}
            </dl>

            <div className="flex flex-col gap-2 border-t border-panel-borde pt-4">
              <h3 className="m-0 text-[13px] font-semibold text-panel-suave">Historial</h3>
              <ol className="m-0 flex list-none flex-col gap-2 p-0 text-[13px]">
                {d.historial.map((cambio, i) => (
                  <li key={i} className="flex flex-wrap items-baseline gap-x-2">
                    <Insignia tono={estadoDe(ESTADO_RESERVA, cambio.estado).tono}>{estadoDe(ESTADO_RESERVA, cambio.estado).texto}</Insignia>
                    <span className="text-panel-suave">
                      {fechaHoraArgentina(cambio.fecha)} · {POR[cambio.por] ?? cambio.por}
                    </span>
                    {cambio.nota && <span className="basis-full pl-1 text-panel-suave">{cambio.nota}</span>}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </Dialogo>

      {/* Rechazo con motivo opcional (el cliente lo ve en Mi cuenta) */}
      <Dialogo
        abierto={Boolean(aRechazar)}
        alCerrar={() => setARechazar(null)}
        titulo="Rechazar la reserva"
        descripcion={aRechazar && `${aRechazar.cliente?.nombre} · ${diaCorto(aRechazar.entrada)} – ${diaCorto(aRechazar.salida)} · las noches quedan libres`}
        acciones={
          <>
            <Boton onClick={() => setARechazar(null)}>Cancelar</Boton>
            <Boton variante="peligro" icono="cerrar" cargando={Boolean(aRechazar && trabajando === aRechazar.id)} onClick={rechazar}>
              Rechazar reserva
            </Boton>
          </>
        }
      >
        <Campo etiqueta="Motivo (opcional)" htmlFor={`${id}-motivo`} ayuda="El cliente lo ve en Mi cuenta.">
          <textarea id={`${id}-motivo`} value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={300} className={areaTexto} placeholder="Por ejemplo: la propiedad está en mantenimiento esas fechas." />
        </Campo>
      </Dialogo>

      {aviso}
    </>
  );
}

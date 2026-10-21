'use client';

import { useCallback, useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { createVisita, deleteVisita, getVisitas, resetVisitasToDefault, updateVisitaEstado, type Visita } from '@/services/visitas';
import { getProperties, type ApiProperty } from '@/services/api';
import Icono, { type NombreIcono } from '@/components/panel/Icono';
import { Alerta, Boton, Campo, Dialogo, Encabezado, Esqueleto, EstadoVacio, Insignia, areaTexto, control, useAviso, useConfirmar } from '@/components/panel/ui';
import { ESTADO_VISITA, cuandoEs, estadoDe, fechaDeVisita } from '@/components/panel/estados';
import OpcionesPropiedad, { propiedadOfrecida } from '@/components/panel/OpcionesPropiedad';

// Hoy en formato AAAA-MM-DD (hora local), para no ofrecer días que ya pasaron
const hoyIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const miles = (n: number) => Math.round(n).toLocaleString('es-AR');
// Precio tal como se publica (por noche, por mes o total)
const precioTexto = (p: ApiProperty) => {
  if (p.categoria_operacion === 'temporario' && p.precioPorNocheUSD) return `USD ${miles(p.precioPorNocheUSD)} por noche`;
  const sufijo = p.categoria_operacion === 'alquiler' ? ' por mes' : '';
  return p.moneda === 'ARS' ? `ARS ${miles(p.priceARS ?? p.price)}${sufijo}` : `USD ${miles(p.price)}${sufijo}`;
};

type Pestana = 'pendientes' | 'confirmadas' | 'rechazadas' | 'todas';

const MOTIVOS_RECHAZO = [
  'Horario no disponible',
  'Propiedad reservada con seña',
  'Propietario de viaje / sin llaves',
  'Sin respuesta al contacto telefónico',
  'Otro motivo',
];

const FORMULARIO_VACIO = { nombre: '', telefono: '', email: '', propiedad: '', fecha: '', horario: '10:00', nota: '' };

// "2026-10-27" → "27/10/2026" y "17:30" → "17:30 h", como guarda el backend
const fechaParaGuardar = (iso: string) => {
  const [anio, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${anio}`;
};
const horarioParaGuardar = (hora: string) => (hora.includes('h') ? hora : `${hora} h`);

// Link de WhatsApp: agrega el código de Argentina si el teléfono no lo trae
function enlaceWhatsApp(visita: Visita) {
  let numero = visita.cliente.telefono.replace(/\D/g, '');
  if (!numero) return null;
  if (!numero.startsWith('54')) numero = `549${numero.replace(/^0/, '')}`;
  const texto = `Hola ${visita.cliente.nombre}, te escribimos de Negocios Inmobiliarios por tu visita a "${visita.propiedad.titulo}" el ${visita.fecha} a las ${visita.horario}.`;
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

export default function VisitasAdminPage() {
  const id = useId();
  const [visitas, setVisitas] = useState<Visita[] | null>(null);
  const [propiedades, setPropiedades] = useState<ApiProperty[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pestana, setPestana] = useState<Pestana | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [fecha, setFecha] = useState('');

  const [detalle, setDetalle] = useState<Visita | null>(null);
  const [aReprogramar, setAReprogramar] = useState<Visita | null>(null);
  const [reprogramacion, setReprogramacion] = useState({ fecha: '', hora: '', nota: '' });
  const [aRechazar, setARechazar] = useState<Visita | null>(null);
  const [motivo, setMotivo] = useState(MOTIVOS_RECHAZO[0]);
  const [nuevaAbierta, setNuevaAbierta] = useState(false);
  const [nueva, setNueva] = useState(FORMULARIO_VACIO);
  const [faltaEnNueva, setFaltaEnNueva] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  const { mostrar, aviso } = useAviso();
  const { confirmar, dialogoConfirmar } = useConfirmar();

  const cargar = useCallback(() => {
    Promise.all([getVisitas(), getProperties().catch(() => [] as ApiProperty[])])
      .then(([lista, props]) => {
        setVisitas(lista);
        setPropiedades(props ?? []);
        setError(null);
        // Se abre en "Pendientes" si hay alguna por responder
        setPestana((actual) => actual ?? (lista.some((v) => v.estado === 'pendiente') ? 'pendientes' : 'todas'));
      })
      .catch((e: Error) => setError(e.message || 'No se pudieron cargar las visitas'));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const reemplazar = (actualizada: Visita) => setVisitas((lista) => lista?.map((v) => (v.id === actualizada.id ? actualizada : v)) ?? null);

  const confirmarVisita = async (visita: Visita) => {
    try {
      reemplazar(await updateVisitaEstado(visita.id, 'confirmada'));
      mostrar(`Confirmaste la visita de ${visita.cliente.nombre}.`);
      setDetalle(null);
    } catch (e) {
      mostrar(e instanceof Error ? e.message : 'No se pudo confirmar la visita', 'peligro');
    }
  };

  const rechazar = async () => {
    if (!aRechazar) return;
    setTrabajando(true);
    try {
      reemplazar(await updateVisitaEstado(aRechazar.id, 'rechazada', { motivo }));
      mostrar(`Rechazaste la visita de ${aRechazar.cliente.nombre}.`, 'info');
      setARechazar(null);
      setDetalle(null);
    } catch (e) {
      mostrar(e instanceof Error ? e.message : 'No se pudo rechazar la visita', 'peligro');
    } finally {
      setTrabajando(false);
    }
  };

  const reprogramar = async (e: FormEvent) => {
    e.preventDefault();
    if (!aReprogramar || !reprogramacion.fecha || !reprogramacion.hora) return;
    setTrabajando(true);
    const nuevaFecha = fechaParaGuardar(reprogramacion.fecha);
    const nuevoHorario = horarioParaGuardar(reprogramacion.hora);
    try {
      reemplazar(await updateVisitaEstado(aReprogramar.id, 'reprogramada', { nuevaFecha, nuevoHorario, motivo: reprogramacion.nota }));
      mostrar(`Visita reprogramada para el ${nuevaFecha} a las ${nuevoHorario}.`);
      setAReprogramar(null);
      setDetalle(null);
    } catch (err) {
      mostrar(err instanceof Error ? err.message : 'No se pudo reprogramar la visita', 'peligro');
    } finally {
      setTrabajando(false);
    }
  };

  const borrar = async (visita: Visita) => {
    const ok = await confirmar(`¿Borrar la visita de ${visita.cliente.nombre}?`, { texto: 'Se elimina del registro y no se puede recuperar.', accion: 'Borrar visita' });
    if (!ok) return;
    try {
      await deleteVisita(visita.id);
      setVisitas((lista) => lista?.filter((v) => v.id !== visita.id) ?? null);
      setDetalle(null);
      mostrar('Visita borrada.');
    } catch (e) {
      mostrar(e instanceof Error ? e.message : 'No se pudo borrar la visita', 'peligro');
    }
  };

  const agendar = async (e: FormEvent) => {
    e.preventDefault();
    if (!nueva.nombre.trim()) return setFaltaEnNueva('nombre');
    // El backend exige el teléfono del cliente en cada visita
    if (!nueva.telefono.trim()) return setFaltaEnNueva('telefono');
    if (!nueva.propiedad) return setFaltaEnNueva('propiedad');
    if (!nueva.fecha) return setFaltaEnNueva('fecha');
    setFaltaEnNueva(null);
    const propiedad = propiedades.find((p) => p._id === nueva.propiedad);
    setTrabajando(true);
    try {
      const creada = await createVisita({
        cliente: {
          nombre: nueva.nombre.trim(),
          telefono: nueva.telefono.trim(),
          email: nueva.email.trim(),
          iniciales: nueva.nombre.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || 'CL',
        },
        propiedad: {
          id: propiedad?._id || '',
          titulo: propiedad?.title || nueva.propiedad,
          direccion: propiedad?.location || '',
          precio: propiedad ? precioTexto(propiedad) : '',
        },
        fecha: fechaParaGuardar(nueva.fecha),
        horario: horarioParaGuardar(nueva.horario || '10:00'),
        estado: 'pendiente',
        notaAdicional: nueva.nota.trim(),
      });
      setVisitas((lista) => [creada, ...(lista ?? [])]);
      setNuevaAbierta(false);
      setNueva(FORMULARIO_VACIO);
      mostrar('Visita agendada.');
    } catch (err) {
      mostrar(err instanceof Error ? err.message : 'No se pudo agendar la visita', 'peligro');
    } finally {
      setTrabajando(false);
    }
  };

  const cargarPrueba = async () => {
    const ok = await confirmar('¿Cargar las visitas de prueba?', { texto: 'Se borran todas las visitas actuales y se reemplazan por las de ejemplo. Solo funciona en desarrollo.', accion: 'Reemplazar visitas' });
    if (!ok) return;
    try {
      setVisitas(await resetVisitasToDefault());
      mostrar('Se cargaron las visitas de prueba.');
    } catch (e) {
      mostrar(e instanceof Error ? e.message : 'No se pudieron cargar las visitas de prueba', 'peligro');
    }
  };

  const lista = useMemo(() => visitas ?? [], [visitas]);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const cuenta = {
    pendientes: lista.filter((v) => v.estado === 'pendiente').length,
    confirmadas: lista.filter((v) => v.estado === 'confirmada' || v.estado === 'reprogramada').length,
    rechazadas: lista.filter((v) => v.estado === 'rechazada').length,
    todas: lista.length,
  };

  const fechas = useMemo(
    () => [...new Set(lista.map((v) => v.fecha))].sort((a, b) => (fechaDeVisita(a)?.getTime() ?? 0) - (fechaDeVisita(b)?.getTime() ?? 0)),
    [lista]
  );

  const texto = busqueda.trim().toLowerCase();
  const visibles = lista
    .filter((v) => {
      const enPestana =
        pestana === 'pendientes' ? v.estado === 'pendiente' : pestana === 'confirmadas' ? v.estado === 'confirmada' || v.estado === 'reprogramada' : pestana === 'rechazadas' ? v.estado === 'rechazada' : true;
      const enTexto = !texto || [v.cliente.nombre, v.cliente.telefono, v.propiedad.titulo].some((c) => c?.toLowerCase().includes(texto));
      return enPestana && enTexto && (!fecha || v.fecha === fecha);
    })
    .map((v) => ({ v, cuando: fechaDeVisita(v.fecha, v.horario) }))
    .sort((a, b) => (a.cuando?.getTime() ?? Infinity) - (b.cuando?.getTime() ?? Infinity));

  const PESTANAS: { id: Pestana; texto: string }[] = [
    { id: 'pendientes', texto: 'Por confirmar' },
    { id: 'confirmadas', texto: 'Confirmadas' },
    { id: 'rechazadas', texto: 'Rechazadas' },
    { id: 'todas', texto: 'Todas' },
  ];

  const abrirReprogramar = (visita: Visita) => {
    setReprogramacion({ fecha: '', hora: visita.horario?.match(/\d{1,2}:\d{2}/)?.[0]?.padStart(5, '0') ?? '', nota: '' });
    setAReprogramar(visita);
  };

  const acciones = (v: Visita) => (
    <>
      {v.estado === 'pendiente' && <Accion icono="check" texto={`Confirmar la visita de ${v.cliente.nombre}`} onClick={() => confirmarVisita(v)} tono="exito" />}
      {v.estado !== 'rechazada' && <Accion icono="reloj" texto={`Reprogramar la visita de ${v.cliente.nombre}`} onClick={() => abrirReprogramar(v)} />}
      {v.estado !== 'rechazada' && <Accion icono="cerrar" texto={`Rechazar la visita de ${v.cliente.nombre}`} onClick={() => { setMotivo(MOTIVOS_RECHAZO[0]); setARechazar(v); }} tono="peligro" />}
      <Accion icono="telefono" texto={`Escribirle a ${v.cliente.nombre} por WhatsApp`} href={enlaceWhatsApp(v)} />
      <Accion icono="ojo" texto={`Ver el detalle de la visita de ${v.cliente.nombre}`} onClick={() => setDetalle(v)} />
    </>
  );

  return (
    <>
      <Encabezado
        titulo="Visitas"
        descripcion={visitas ? (cuenta.pendientes ? `${cuenta.pendientes} por confirmar · ${cuenta.todas} en total` : `Todas respondidas · ${cuenta.todas} en total`) : 'Pedidos de visita del sitio y los que agendás a mano.'}
        acciones={
          <>
            {process.env.NODE_ENV !== 'production' && (
              <Boton variante="fantasma" onClick={cargarPrueba}>
                Cargar visitas de prueba
              </Boton>
            )}
            <Boton variante="principal" icono="mas" onClick={() => { setFaltaEnNueva(null); setNuevaAbierta(true); }}>
              Agendar visita
            </Boton>
          </>
        }
      />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div role="tablist" aria-label="Estado de las visitas" className="flex shrink-0 gap-1 overflow-x-auto rounded-lg bg-panel-hundido p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative sm:w-64">
              <span className="sr-only">Buscar</span>
              <Icono nombre="buscar" className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-panel-tenue" />
              <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Cliente, teléfono o propiedad" className={`${control} pl-10`} />
            </label>
            <select value={fecha} onChange={(e) => setFecha(e.target.value)} aria-label="Fecha" className={`${control} sm:w-44`}>
              <option value="">Cualquier fecha</option>
              {fechas.map((f) => (
                <option key={f} value={f}>
                  {cuandoEs(fechaDeVisita(f))}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <Alerta tono="peligro" titulo="No se pudieron cargar las visitas" accion={<Boton tamano="sm" onClick={() => { setError(null); setVisitas(null); cargar(); }}>Reintentar</Boton>}>
            {error}
          </Alerta>
        )}

        <div className="overflow-hidden rounded-xl border border-panel-borde bg-panel-superficie">
          {!visitas && !error ? (
            <div className="flex flex-col divide-y divide-panel-borde">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-4">
                  <Esqueleto className="h-4 w-24" />
                  <Esqueleto className="h-4 w-1/4" />
                  <Esqueleto className="h-4 w-1/3" />
                </div>
              ))}
            </div>
          ) : visitas && visibles.length === 0 ? (
            <EstadoVacio
              icono="visitas"
              titulo={lista.length === 0 ? 'Todavía no hay visitas' : pestana === 'pendientes' && !texto && !fecha ? 'No hay visitas por confirmar' : 'Ninguna visita coincide'}
              texto={lista.length === 0 ? 'Cuando alguien pida una visita desde el sitio, aparece acá.' : undefined}
            />
          ) : visitas ? (
            <ul className="m-0 list-none divide-y divide-panel-borde p-0">
              {visibles.map(({ v, cuando }) => {
                const estado = estadoDe(ESTADO_VISITA, v.estado);
                const pasada = cuando ? cuando < hoy : false;
                return (
                  <li key={v.id} className={`grid gap-x-4 gap-y-2 px-4 py-3.5 md:grid-cols-[150px_minmax(0,1fr)_minmax(0,1fr)_auto_auto] md:items-center ${pasada ? 'opacity-60' : ''}`}>
                    <span className="flex flex-col">
                      <span className="tabular whitespace-nowrap text-[13.5px] font-medium">{cuandoEs(cuando, v.horario)}</span>
                      {pasada && <span className="text-[12px] text-panel-tenue">Ya pasó</span>}
                    </span>
                    <button type="button" onClick={() => setDetalle(v)} className="min-w-0 text-left">
                      <span className="block truncate text-[14px] font-medium hover:underline">{v.cliente.nombre || 'Sin nombre'}</span>
                      <span className="tabular block truncate text-[13px] text-panel-suave">{v.cliente.telefono || 'Sin teléfono'}</span>
                    </button>
                    <span className="min-w-0 truncate text-[13.5px] text-panel-suave">{v.propiedad.titulo || 'Propiedad sin título'}</span>
                    <span>
                      <Insignia tono={estado.tono}>{estado.texto}</Insignia>
                    </span>
                    <div className="-ml-2 flex items-center md:ml-0 md:justify-end">{acciones(v)}</div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </div>

      {/* Detalle */}
      <Dialogo
        abierto={Boolean(detalle)}
        alCerrar={() => setDetalle(null)}
        titulo={detalle ? `Visita de ${detalle.cliente.nombre}` : ''}
        descripcion={detalle && <Insignia tono={estadoDe(ESTADO_VISITA, detalle.estado).tono}>{estadoDe(ESTADO_VISITA, detalle.estado).texto}</Insignia>}
        acciones={
          detalle && (
            <>
              <Boton variante="fantasma" icono="borrar" onClick={() => borrar(detalle)} className="mr-auto text-red-700 dark:text-red-400">
                Borrar
              </Boton>
              {detalle.estado !== 'rechazada' && (
                <Boton icono="reloj" onClick={() => abrirReprogramar(detalle)}>
                  Reprogramar
                </Boton>
              )}
              {detalle.estado === 'pendiente' && (
                <Boton variante="principal" icono="check" onClick={() => confirmarVisita(detalle)}>
                  Confirmar
                </Boton>
              )}
            </>
          )
        }
      >
        {detalle && (
          <dl className="m-0 grid grid-cols-[110px_1fr] gap-x-4 gap-y-3 text-sm">
            <dt className="text-panel-suave">Cuándo</dt>
            <dd className="m-0 font-medium">{cuandoEs(fechaDeVisita(detalle.fecha, detalle.horario), detalle.horario)} <span className="font-normal text-panel-tenue">({detalle.fecha})</span></dd>
            <dt className="text-panel-suave">Propiedad</dt>
            <dd className="m-0">
              {detalle.propiedad.id ? (
                <Link href={`/propiedades/${detalle.propiedad.id}`} target="_blank" className="underline-offset-2 hover:underline">
                  {detalle.propiedad.titulo}
                </Link>
              ) : (
                detalle.propiedad.titulo || 'Sin título'
              )}
            </dd>
            <dt className="text-panel-suave">Teléfono</dt>
            <dd className="m-0 flex flex-wrap gap-x-3">
              {detalle.cliente.telefono ? (
                <>
                  <a href={`tel:${detalle.cliente.telefono.replace(/[^\d+]/g, '')}`} className="tabular hover:underline">{detalle.cliente.telefono}</a>
                  {enlaceWhatsApp(detalle) && <a href={enlaceWhatsApp(detalle) as string} target="_blank" rel="noreferrer" className="text-panel-acento hover:underline">WhatsApp</a>}
                </>
              ) : 'Sin teléfono'}
            </dd>
            <dt className="text-panel-suave">Email</dt>
            <dd className="m-0">{detalle.cliente.email ? <a href={`mailto:${detalle.cliente.email}`} className="hover:underline">{detalle.cliente.email}</a> : 'Sin email'}</dd>
            {detalle.notaAdicional && (
              <>
                <dt className="text-panel-suave">Nota</dt>
                <dd className="m-0 whitespace-pre-line">{detalle.notaAdicional}</dd>
              </>
            )}
            {detalle.motivoRechazo && (
              <>
                <dt className="text-panel-suave">Motivo</dt>
                <dd className="m-0">{detalle.motivoRechazo}</dd>
              </>
            )}
          </dl>
        )}
      </Dialogo>

      {/* Reprogramar */}
      <Dialogo
        abierto={Boolean(aReprogramar)}
        alCerrar={() => setAReprogramar(null)}
        titulo="Reprogramar visita"
        descripcion={aReprogramar && `${aReprogramar.cliente.nombre} · ${aReprogramar.propiedad.titulo}`}
        acciones={
          <>
            <Boton onClick={() => setAReprogramar(null)}>Cancelar</Boton>
            <Boton variante="principal" type="submit" form={`${id}-reprogramar`} cargando={trabajando} disabled={!reprogramacion.fecha || !reprogramacion.hora}>
              Reprogramar
            </Boton>
          </>
        }
      >
        <form id={`${id}-reprogramar`} onSubmit={reprogramar} className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Nueva fecha" htmlFor={`${id}-rep-fecha`}>
            <input id={`${id}-rep-fecha`} type="date" required min={hoyIso()} value={reprogramacion.fecha} onChange={(e) => setReprogramacion((r) => ({ ...r, fecha: e.target.value }))} className={control} />
          </Campo>
          <Campo etiqueta="Nuevo horario" htmlFor={`${id}-rep-hora`}>
            <input id={`${id}-rep-hora`} type="time" required value={reprogramacion.hora} onChange={(e) => setReprogramacion((r) => ({ ...r, hora: e.target.value }))} className={control} />
          </Campo>
          <Campo etiqueta="Nota para el registro" htmlFor={`${id}-rep-nota`} ayuda="Opcional." className="sm:col-span-2">
            <input id={`${id}-rep-nota`} type="text" value={reprogramacion.nota} onChange={(e) => setReprogramacion((r) => ({ ...r, nota: e.target.value }))} placeholder="Ej.: Pidió pasarla a la tarde" className={control} />
          </Campo>
        </form>
      </Dialogo>

      {/* Rechazar */}
      <Dialogo
        abierto={Boolean(aRechazar)}
        alCerrar={() => setARechazar(null)}
        titulo="Rechazar visita"
        descripcion={aRechazar && `${aRechazar.cliente.nombre} · ${aRechazar.propiedad.titulo}`}
        acciones={
          <>
            <Boton onClick={() => setARechazar(null)}>Cancelar</Boton>
            <Boton variante="peligro" onClick={rechazar} cargando={trabajando}>
              Rechazar visita
            </Boton>
          </>
        }
      >
        <Campo etiqueta="Motivo" htmlFor={`${id}-motivo`} ayuda="Queda registrado en la visita.">
          <select id={`${id}-motivo`} value={motivo} onChange={(e) => setMotivo(e.target.value)} className={control}>
            {MOTIVOS_RECHAZO.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Campo>
      </Dialogo>

      {/* Agendar */}
      <Dialogo
        abierto={nuevaAbierta}
        alCerrar={() => setNuevaAbierta(false)}
        titulo="Agendar visita"
        descripcion="Para visitas que llegan por teléfono o en la oficina."
        ancho="lg"
        acciones={
          <>
            <Boton onClick={() => setNuevaAbierta(false)}>Cancelar</Boton>
            <Boton variante="principal" type="submit" form={`${id}-nueva`} cargando={trabajando}>
              Agendar
            </Boton>
          </>
        }
      >
        <form id={`${id}-nueva`} noValidate onSubmit={agendar} className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Nombre del cliente *" htmlFor={`${id}-n-nombre`} error={faltaEnNueva === 'nombre' ? 'Escribí el nombre.' : null} className="sm:col-span-2">
            <input id={`${id}-n-nombre`} type="text" value={nueva.nombre} aria-invalid={faltaEnNueva === 'nombre'} onChange={(e) => setNueva((n) => ({ ...n, nombre: e.target.value }))} className={control} />
          </Campo>
          <Campo etiqueta="Teléfono *" htmlFor={`${id}-n-tel`} error={faltaEnNueva === 'telefono' ? 'Escribí el teléfono.' : null}>
            <input id={`${id}-n-tel`} type="tel" value={nueva.telefono} aria-invalid={faltaEnNueva === 'telefono'} onChange={(e) => setNueva((n) => ({ ...n, telefono: e.target.value }))} placeholder="Ej.: 343 444 4444" className={control} />
          </Campo>
          <Campo etiqueta="Email" htmlFor={`${id}-n-email`}>
            <input id={`${id}-n-email`} type="email" value={nueva.email} onChange={(e) => setNueva((n) => ({ ...n, email: e.target.value }))} className={control} />
          </Campo>
          <Campo etiqueta="Propiedad *" htmlFor={`${id}-n-prop`} error={faltaEnNueva === 'propiedad' ? 'Elegí la propiedad.' : null} className="sm:col-span-2">
            <select id={`${id}-n-prop`} value={nueva.propiedad} aria-invalid={faltaEnNueva === 'propiedad'} onChange={(e) => setNueva((n) => ({ ...n, propiedad: e.target.value }))} className={control}>
              <option value="">Elegí una propiedad</option>
              <OpcionesPropiedad propiedades={propiedades.filter(propiedadOfrecida)} />
            </select>
          </Campo>
          <Campo etiqueta="Fecha *" htmlFor={`${id}-n-fecha`} error={faltaEnNueva === 'fecha' ? 'Elegí la fecha.' : null}>
            <input id={`${id}-n-fecha`} type="date" min={hoyIso()} value={nueva.fecha} aria-invalid={faltaEnNueva === 'fecha'} onChange={(e) => setNueva((n) => ({ ...n, fecha: e.target.value }))} className={control} />
          </Campo>
          <Campo etiqueta="Horario" htmlFor={`${id}-n-hora`}>
            <input id={`${id}-n-hora`} type="time" value={nueva.horario} onChange={(e) => setNueva((n) => ({ ...n, horario: e.target.value }))} className={control} />
          </Campo>
          <Campo etiqueta="Nota" htmlFor={`${id}-n-nota`} ayuda="Opcional." className="sm:col-span-2">
            <textarea id={`${id}-n-nota`} rows={2} value={nueva.nota} onChange={(e) => setNueva((n) => ({ ...n, nota: e.target.value }))} className={areaTexto} />
          </Campo>
        </form>
      </Dialogo>

      {aviso}
      {dialogoConfirmar}
    </>
  );
}

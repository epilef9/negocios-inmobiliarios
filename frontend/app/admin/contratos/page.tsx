'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { deleteContrato, getContratos, updateContrato, type Contrato, type EstadoContrato } from '@/services/contratos';
import Icono from '@/components/panel/Icono';
import { Alerta, Boton, BotonLink, Dialogo, Encabezado, Esqueleto, EstadoVacio, Insignia, control, useAviso, useConfirmar } from '@/components/panel/ui';
import { ESTADO_CONTRATO, estadoDe } from '@/components/panel/estados';

type Pestana = 'activos' | 'por_vencer' | 'firmados' | 'borradores' | 'cerrados' | 'todos';

const PESTANAS: { id: Pestana; texto: string; incluye: (e: string) => boolean }[] = [
  { id: 'activos', texto: 'Activos', incluye: (e) => e === 'activo' },
  { id: 'por_vencer', texto: 'Por vencer', incluye: (e) => e === 'por_vencer' },
  { id: 'firmados', texto: 'Firmados', incluye: (e) => e === 'firmado' },
  { id: 'borradores', texto: 'Borradores', incluye: (e) => e === 'borrador' },
  { id: 'cerrados', texto: 'Vencidos y cancelados', incluye: (e) => e === 'finalizado' || e === 'cancelado' || e === 'vencido' },
  { id: 'todos', texto: 'Todos', incluye: () => true },
];

// Los contratos guardan las fechas como "DD/MM/AAAA" (o "AAAA-MM-DD" en los más viejos)
function leerFecha(texto?: string): Date | null {
  if (!texto) return null;
  const latina = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (latina) return new Date(Number(latina[3]), Number(latina[2]) - 1, Number(latina[1]));
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  return null;
}
const FECHA = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
const mostrarFecha = (texto?: string) => {
  const fecha = leerFecha(texto);
  return fecha ? FECHA.format(fecha).replace('.', '') : texto || '—';
};
const diasHasta = (texto?: string) => {
  const fecha = leerFecha(texto);
  if (!fecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((fecha.getTime() - hoy.getTime()) / 86400000);
};
// "350000" → "$ 350.000"; si ya viene con formato se deja como está
const mostrarMonto = (monto?: string) => (monto && /^\d+(\.\d+)?$/.test(monto.trim()) ? `$ ${Number(monto).toLocaleString('es-AR')}` : monto || '—');

function Vencimiento({ contrato }: { contrato: Contrato }) {
  // Una compraventa no vence: su fecha es la de posesión
  if (contrato.tipoContrato === 'Compraventa') return null;
  const dias = diasHasta(contrato.fechaFin);
  if (dias === null || !['activo', 'firmado', 'por_vencer'].includes(contrato.estado)) return null;
  if (dias < 0) return <span className="text-[12.5px] text-red-600 dark:text-red-400">Venció hace {-dias} {dias === -1 ? 'día' : 'días'}</span>;
  if (dias <= 30) return <span className="text-[12.5px] text-amber-700 dark:text-amber-400">Vence en {dias} {dias === 1 ? 'día' : 'días'}</span>;
  return null;
}

export default function ContratosAdminPage() {
  const [contratos, setContratos] = useState<Contrato[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pestana, setPestana] = useState<Pestana>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [anio, setAnio] = useState('');
  const [detalle, setDetalle] = useState<Contrato | null>(null);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const { mostrar, aviso } = useAviso();
  const { confirmar, dialogoConfirmar } = useConfirmar();

  const cargar = useCallback(() => {
    getContratos()
      .then((lista) => {
        setContratos(lista);
        setError(null);
      })
      .catch((e: Error) => setError(e.message || 'No se pudieron cargar los contratos'));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const lista = useMemo(() => contratos ?? [], [contratos]);

  const anios = useMemo(() => {
    const todos = new Set<number>();
    lista.forEach((c) => [c.fechaInicio, c.fechaFin].forEach((f) => { const d = leerFecha(f); if (d) todos.add(d.getFullYear()); }));
    return [...todos].sort((a, b) => b - a);
  }, [lista]);

  const texto = busqueda.trim().toLowerCase();
  const filtro = PESTANAS.find((p) => p.id === pestana) ?? PESTANAS[4];
  const visibles = lista.filter((c) => {
    const enTexto =
      !texto ||
      [c.numeroContrato, c.codigoId, c.cliente?.nombre, c.cliente?.telefono, c.propiedad?.titulo, c.propiedad?.direccion].some((v) => v?.toLowerCase().includes(texto));
    const enAnio = !anio || [c.fechaInicio, c.fechaFin].some((f) => leerFecha(f)?.getFullYear() === Number(anio));
    return filtro.incluye(c.estado) && enTexto && enAnio;
  });

  const borrar = async (contrato: Contrato) => {
    const ok = await confirmar(`¿Borrar el contrato ${contrato.numeroContrato}?`, { texto: 'Se elimina del registro y no se puede recuperar.', accion: 'Borrar contrato' });
    if (!ok) return;
    try {
      await deleteContrato(contrato._id);
      setContratos((l) => l?.filter((c) => c._id !== contrato._id) ?? null);
      setDetalle(null);
      mostrar(`Se borró el contrato ${contrato.numeroContrato}.`);
    } catch (e) {
      mostrar(e instanceof Error ? e.message : 'No se pudo borrar el contrato', 'peligro');
    }
  };

  const cambiarEstado = async (contrato: Contrato, estado: EstadoContrato) => {
    setCambiandoEstado(true);
    try {
      const actualizado = await updateContrato(contrato._id, { estado });
      const nuevo = { ...contrato, ...actualizado, _id: contrato._id, estado };
      setContratos((l) => l?.map((c) => (c._id === contrato._id ? nuevo : c)) ?? null);
      setDetalle(nuevo);
      mostrar(`El contrato ${contrato.numeroContrato} ahora está ${estadoDe(ESTADO_CONTRATO, estado).texto.toLowerCase()}.`);
    } catch (e) {
      mostrar(e instanceof Error ? e.message : 'No se pudo cambiar el estado', 'peligro');
    } finally {
      setCambiandoEstado(false);
    }
  };

  const activos = lista.filter((c) => c.estado === 'activo').length;
  const porVencer = lista.filter((c) => c.estado === 'por_vencer').length;

  return (
    <>
      <Encabezado
        titulo="Contratos"
        descripcion={contratos ? `${activos} activos${porVencer ? ` · ${porVencer} por vencer` : ''} · ${lista.length} en total` : 'Contratos de alquiler y venta generados desde el panel.'}
        acciones={
          <BotonLink href="/admin/contratos/generar" variante="principal" icono="mas">
            Generar contrato
          </BotonLink>
        }
      />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div role="tablist" aria-label="Estado de los contratos" className="flex shrink-0 gap-1 overflow-x-auto rounded-lg bg-panel-hundido p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {PESTANAS.map((p) => {
              const activa = pestana === p.id;
              const cantidad = lista.filter((c) => p.incluye(c.estado)).length;
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
                  <span className={`tabular rounded px-1.5 text-[12px] ${p.id === 'por_vencer' && cantidad ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'text-panel-tenue'}`}>{cantidad}</span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative sm:w-72">
              <span className="sr-only">Buscar</span>
              <Icono nombre="buscar" className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-panel-tenue" />
              <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Número, cliente o propiedad" className={`${control} pl-10`} />
            </label>
            <select value={anio} onChange={(e) => setAnio(e.target.value)} aria-label="Año" className={`${control} sm:w-36`}>
              <option value="">Cualquier año</option>
              {anios.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <Alerta tono="peligro" titulo="No se pudieron cargar los contratos" accion={<Boton tamano="sm" onClick={() => { setError(null); setContratos(null); cargar(); }}>Reintentar</Boton>}>
            {error}
          </Alerta>
        )}

        <div className="overflow-hidden rounded-xl border border-panel-borde bg-panel-superficie">
          {!contratos && !error ? (
            <div className="flex flex-col divide-y divide-panel-borde">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-4">
                  <Esqueleto className="h-4 w-20" />
                  <Esqueleto className="h-4 w-1/4" />
                  <Esqueleto className="h-4 w-1/3" />
                </div>
              ))}
            </div>
          ) : contratos && lista.length === 0 ? (
            <EstadoVacio
              icono="contratos"
              titulo="Todavía no hay contratos"
              texto="Generá el primero con los datos del cliente y la propiedad."
              accion={<BotonLink href="/admin/contratos/generar" variante="principal" icono="mas">Generar contrato</BotonLink>}
            />
          ) : contratos && visibles.length === 0 ? (
            <EstadoVacio icono="buscar" titulo="Ningún contrato coincide" accion={<Boton onClick={() => { setBusqueda(''); setAnio(''); setPestana('todos'); }}>Ver todos</Boton>} />
          ) : contratos ? (
            <ul className="m-0 list-none divide-y divide-panel-borde p-0">
              {visibles.map((c) => {
                const estado = estadoDe(ESTADO_CONTRATO, c.estado);
                return (
                  <li key={c._id} className="grid gap-x-4 gap-y-2 px-4 py-3.5 lg:grid-cols-[120px_minmax(0,1fr)_minmax(0,1fr)_170px_120px_auto_auto] lg:items-center">
                    <button type="button" onClick={() => setDetalle(c)} className="flex flex-col text-left">
                      <span className="tabular text-[13.5px] font-semibold hover:underline">{c.numeroContrato}</span>
                      {c.tipoContrato && <span className="text-[12.5px] text-panel-tenue">{c.tipoContrato}</span>}
                    </button>
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-medium">{c.cliente?.nombre || 'Sin cliente'}</span>
                      <span className="tabular block truncate text-[13px] text-panel-suave">{c.cliente?.telefono || 'Sin teléfono'}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px]">{c.propiedad?.titulo || 'Sin propiedad'}</span>
                      <span className="block truncate text-[13px] text-panel-suave">{c.propiedad?.direccion}</span>
                    </span>
                    <span className="flex flex-col">
                      <span className="whitespace-nowrap text-[13px] text-panel-suave">
                        {c.tipoContrato === 'Compraventa' ? `Posesión ${mostrarFecha(c.fechaInicio)}` : `${mostrarFecha(c.fechaInicio)} → ${mostrarFecha(c.fechaFin)}`}
                      </span>
                      <Vencimiento contrato={c} />
                    </span>
                    <span className="tabular text-[13.5px] font-medium lg:text-right">{mostrarMonto(c.montoMensual)}</span>
                    <span>
                      <Insignia tono={estado.tono}>{estado.texto}</Insignia>
                    </span>
                    <div className="-ml-2 flex items-center lg:ml-0 lg:justify-end">
                      <button type="button" onClick={() => setDetalle(c)} title="Ver detalle" aria-label={`Ver el contrato ${c.numeroContrato}`} className="rounded-md p-2 text-panel-tenue hover:bg-panel-hundido hover:text-panel-texto">
                        <Icono nombre="ojo" className="h-[18px] w-[18px]" />
                      </button>
                      <Link href={`/admin/contratos/generar?id=${c._id}`} title="Editar" aria-label={`Editar el contrato ${c.numeroContrato}`} className="rounded-md p-2 text-panel-tenue hover:bg-panel-hundido hover:text-panel-texto">
                        <Icono nombre="editar" className="h-[18px] w-[18px]" />
                      </Link>
                      <button type="button" onClick={() => borrar(c)} title="Borrar" aria-label={`Borrar el contrato ${c.numeroContrato}`} className="rounded-md p-2 text-panel-tenue hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400">
                        <Icono nombre="borrar" className="h-[18px] w-[18px]" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </div>

      <Dialogo
        abierto={Boolean(detalle)}
        alCerrar={() => setDetalle(null)}
        titulo={detalle ? `Contrato ${detalle.numeroContrato}` : ''}
        descripcion={detalle?.tipoContrato ? <span>{detalle.tipoContrato}</span> : undefined}
        ancho="lg"
        acciones={
          detalle && (
            <>
              <Boton variante="fantasma" icono="borrar" onClick={() => borrar(detalle)} className="mr-auto text-red-700 dark:text-red-400">
                Borrar
              </Boton>
              <BotonLink href={`/admin/contratos/generar?id=${detalle._id}`} variante="principal" icono="editar">
                Abrir y editar
              </BotonLink>
            </>
          )
        }
      >
        {detalle && (
          <div className="flex flex-col gap-5">
            <label className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-panel-suave">Estado</span>
              <select
                value={detalle.estado}
                disabled={cambiandoEstado}
                onChange={(e) => cambiarEstado(detalle, e.target.value as EstadoContrato)}
                className={`${control} w-auto`}
              >
                {Object.entries(ESTADO_CONTRATO).map(([valor, { texto }]) => (
                  <option key={valor} value={valor}>
                    {texto}
                  </option>
                ))}
              </select>
              <Vencimiento contrato={detalle} />
            </label>
            <dl className="m-0 grid grid-cols-[130px_1fr] gap-x-4 gap-y-3 text-sm">
              <dt className="text-panel-suave">Cliente</dt>
              <dd className="m-0 font-medium">{detalle.cliente?.nombre}</dd>
              <dt className="text-panel-suave">Teléfono</dt>
              <dd className="m-0">{detalle.cliente?.telefono ? <a href={`tel:${detalle.cliente.telefono.replace(/[^\d+]/g, '')}`} className="tabular hover:underline">{detalle.cliente.telefono}</a> : '—'}</dd>
              {detalle.cliente?.email && (
                <>
                  <dt className="text-panel-suave">Email</dt>
                  <dd className="m-0"><a href={`mailto:${detalle.cliente.email}`} className="hover:underline">{detalle.cliente.email}</a></dd>
                </>
              )}
              <dt className="text-panel-suave">Propiedad</dt>
              <dd className="m-0">{detalle.propiedad?.titulo}<span className="block text-panel-suave">{detalle.propiedad?.direccion}</span></dd>
              <dt className="text-panel-suave">{detalle.tipoContrato === 'Compraventa' ? 'Posesión' : 'Vigencia'}</dt>
              <dd className="m-0">
                {detalle.tipoContrato === 'Compraventa'
                  ? mostrarFecha(detalle.fechaInicio)
                  : `${mostrarFecha(detalle.fechaInicio)} al ${mostrarFecha(detalle.fechaFin)}${detalle.duracionMeses ? ` · ${detalle.duracionMeses} ${detalle.duracionMeses === 1 ? 'mes' : 'meses'}` : ''}`}
              </dd>
              <dt className="text-panel-suave">{detalle.tipoContrato === 'Compraventa' ? 'Precio' : detalle.tipoContrato === 'Alquiler temporario' ? 'Precio' : 'Monto mensual'}</dt>
              <dd className="tabular m-0 font-medium">{mostrarMonto(detalle.montoMensual)}</dd>
              {detalle.depositoGarantia && (
                <>
                  <dt className="text-panel-suave">Depósito</dt>
                  <dd className="m-0">{mostrarMonto(detalle.depositoGarantia)}</dd>
                </>
              )}
              {detalle.ajuste && detalle.ajuste !== 'Sin ajuste' && detalle.tipoContrato !== 'Compraventa' && (
                <>
                  <dt className="text-panel-suave">Ajuste</dt>
                  <dd className="m-0">{detalle.ajuste}</dd>
                </>
              )}
              {detalle.comision && (
                <>
                  <dt className="text-panel-suave">Comisión</dt>
                  <dd className="m-0">{detalle.comision}</dd>
                </>
              )}
              {detalle.incluyeGarante !== undefined && detalle.tipoContrato !== 'Compraventa' && (
                <>
                  <dt className="text-panel-suave">Garante</dt>
                  <dd className="m-0">{detalle.incluyeGarante ? 'Sí' : 'No'}</dd>
                </>
              )}
              {detalle.observaciones && (
                <>
                  <dt className="text-panel-suave">Observaciones</dt>
                  <dd className="m-0 whitespace-pre-line">{detalle.observaciones}</dd>
                </>
              )}
            </dl>
          </div>
        )}
      </Dialogo>

      {aviso}
      {dialogoConfirmar}
    </>
  );
}

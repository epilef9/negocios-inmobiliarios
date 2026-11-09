'use client';

import { useCallback, useEffect, useId, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Alerta, Boton, Campo, Dialogo, Encabezado, Esqueleto, EstadoVacio, Insignia, Pestanas, Tarjeta, areaTexto, useAviso, useConfirmar, type Tono } from '@/components/panel/ui';
import { fechaLarga } from '@/components/calendario/fechas';
import { fechaHoraArgentina } from '@/services/reservas';
import { ESTADO_PAGO, METODO_PAGO, TIPO_PAGO, aprobarPago, dolares, getPagosAdmin, pesos, rechazarPago, urlComprobante, type EstadoPago, type PagoAdmin } from '@/services/pagos';

// Cobros → Pagos de estadías (HU-41): las señas, totales y saldos de alquileres temporarios que pagan los clientes
// desde el sitio, con Mercado Pago o por transferencia. Cada pago trae la foto del comprobante que sube el cliente.
// Mercado Pago acredita solo (y la reserva se confirma sola); lo que queda «para revisar» se confirma acá mirando
// el comprobante. Al confirmar, la reserva queda confirmada y esos días reservados.

const ESTADO: Record<EstadoPago, { texto: string; tono: Tono }> = {
  en_revision: { texto: 'Para revisar', tono: 'aviso' },
  aprobado: { texto: ESTADO_PAGO.aprobado, tono: 'exito' },
  pendiente: { texto: 'Iniciado', tono: 'neutro' },
  rechazado: { texto: 'Rechazado', tono: 'peligro' },
  cancelado: { texto: 'Cancelado', tono: 'neutro' },
};

const FILTROS: { id: EstadoPago | 'todos'; texto: string }[] = [
  { id: 'en_revision', texto: 'Para revisar' },
  { id: 'aprobado', texto: 'Acreditados' },
  { id: 'pendiente', texto: 'Iniciados' },
  { id: 'rechazado', texto: 'Rechazados' },
  { id: 'todos', texto: 'Todos' },
];

const mesDe = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).slice(0, 7) : '');

export default function PagosEstadias({ selector }: { selector?: ReactNode }) {
  const id = useId();
  const { mostrar, aviso } = useAviso();
  const { confirmar, dialogoConfirmar } = useConfirmar();
  const [pagos, setPagos] = useState<PagoAdmin[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState(0);
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [rechazando, setRechazando] = useState<PagoAdmin | null>(null);
  const [motivo, setMotivo] = useState('');
  const [errorRechazo, setErrorRechazo] = useState<string | null>(null);

  const cargar = useCallback(() => {
    getPagosAdmin()
      .then((lista) => {
        setPagos(lista);
        setError(null);
      })
      .catch((e: Error) => setError(e.message || 'No se pudieron cargar los pagos'));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const lista = pagos ?? [];
  const cuantos = (estado: (typeof FILTROS)[number]['id']) => (estado === 'todos' ? lista.length : lista.filter((p) => p.estado === estado).length);
  const visibles = FILTROS[filtro].id === 'todos' ? lista : lista.filter((p) => p.estado === FILTROS[filtro].id);
  const esteMes = mesDe(new Date().toISOString());
  const acreditadoEsteMes = lista.filter((p) => p.estado === 'aprobado' && mesDe(p.aprobadoEn || p.createdAt) === esteMes).reduce((s, p) => s + p.montoARS, 0);

  const aprobar = async (p: PagoAdmin) => {
    const ok = await confirmar('¿Confirmar el pago?', {
      texto: `${TIPO_PAGO[p.tipo]} de ${p.estadia?.cliente || 'el cliente'} por ${pesos(p.montoARS)}. Fijate en el comprobante que el monto y la fecha coincidan. La reserva queda confirmada y le avisamos al cliente.`,
      accion: 'Confirmar pago',
      variante: 'principal',
    });
    if (!ok) return;
    setTrabajando(p.id);
    try {
      await aprobarPago(p.id);
      mostrar('Pago confirmado. La reserva quedó confirmada.');
      cargar();
    } catch (e) {
      mostrar(e instanceof Error ? e.message : 'No se pudo confirmar el pago', 'peligro');
    } finally {
      setTrabajando(null);
    }
  };

  const rechazar = async () => {
    if (!rechazando) return;
    if (!motivo.trim()) return setErrorRechazo('Contale al cliente por qué no se pudo validar.');
    setTrabajando('rechazo');
    try {
      await rechazarPago(rechazando.id, motivo.trim());
      setRechazando(null);
      mostrar('Comprobante rechazado. Le avisamos al cliente por mail.');
      cargar();
    } catch (e) {
      setErrorRechazo(e instanceof Error ? e.message : 'No se pudo rechazar');
    } finally {
      setTrabajando(null);
    }
  };

  return (
    <>
      <Encabezado
        guia="cobros-estadias"
        titulo="Cobros"
        descripcion="Las señas y pagos de estadías que hacen los clientes desde el sitio, con Mercado Pago o por transferencia. Cada uno trae la foto del comprobante: revisala y confirmá el pago para que esos días queden reservados."
      />
      {selector}

      {error ? (
        <Alerta tono="peligro" titulo="No se pudieron cargar los pagos" accion={<Boton tamano="sm" onClick={() => { setError(null); cargar(); }}>Reintentar</Boton>}>
          {error}
        </Alerta>
      ) : !pagos ? (
        <div className="flex flex-col gap-4">
          <Esqueleto className="h-20 w-full" />
          <Esqueleto className="h-56 w-full" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <dl data-guia="resumen" className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-panel-borde bg-panel-superficie p-4">
              <dt className="text-[12.5px] text-panel-suave">Para revisar</dt>
              <dd className="tabular m-0 mt-1 text-[20px] font-semibold leading-tight">{cuantos('en_revision')}</dd>
            </div>
            <div className="rounded-xl border border-panel-borde bg-panel-superficie p-4">
              <dt className="text-[12.5px] text-panel-suave">Acreditado este mes</dt>
              <dd className="tabular m-0 mt-1 text-[20px] font-semibold leading-tight">{acreditadoEsteMes ? pesos(acreditadoEsteMes) : '—'}</dd>
            </div>
            <div className="col-span-2 rounded-xl border border-panel-borde bg-panel-superficie p-4 sm:col-span-1">
              <dt className="text-[12.5px] text-panel-suave">Faltan comprobantes</dt>
              <dd className="tabular m-0 mt-1 text-[20px] font-semibold leading-tight">{lista.filter((p) => p.estado === 'aprobado' && !p.tieneComprobante).length}</dd>
            </div>
          </dl>

          <Tarjeta guia="lista" relleno={false}>
            <div data-guia="pestanas" className="border-b border-panel-borde px-4 pt-3">
              <Pestanas
                etiqueta="Filtrar pagos"
                className="flex gap-6 overflow-x-auto border-b-0"
                activa={filtro}
                alCambiar={setFiltro}
                pestanas={FILTROS.map((f) => ({ id: f.id, contenido: <span className="whitespace-nowrap">{`${f.texto} (${cuantos(f.id)})`}</span> }))}
              />
            </div>
            {visibles.length === 0 ? (
              <EstadoVacio
                icono="dinero"
                titulo={lista.length ? 'No hay pagos en este filtro' : 'Todavía no hay pagos de estadías'}
                texto={lista.length ? undefined : 'Cuando un cliente pague la seña o el total de una estadía desde Mi cuenta, aparece acá con su comprobante.'}
              />
            ) : (
              <ul className="m-0 grid list-none grid-cols-[minmax(0,1fr)] divide-y divide-panel-borde p-0">
                {visibles.map((p) => {
                  const estado = ESTADO[p.estado];
                  const e = p.estadia;
                  return (
                    <li key={p.id} className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{e?.cliente || 'Cliente'}</span>
                          <Insignia tono={estado.tono}>{estado.texto}</Insignia>
                          <Insignia tono={p.tipo === 'sena' ? 'info' : 'neutro'}>{TIPO_PAGO[p.tipo]}</Insignia>
                        </div>
                        {e ? (
                          <p className="m-0 text-[13.5px] text-panel-suave">
                            {e.titulo} · {fechaLarga(e.entrada)} al {fechaLarga(e.salida)} ({e.noches} {e.noches === 1 ? 'noche' : 'noches'}, total {dolares(e.totalUSD)})
                            {e.telefono || e.email ? ` · ${e.telefono || e.email}` : ''}
                          </p>
                        ) : (
                          <p className="m-0 text-[13.5px] text-panel-suave">La reserva ya no existe.</p>
                        )}
                        <p className="tabular m-0 text-[13.5px]">
                          {pesos(p.montoARS)} <span className="text-panel-suave">({dolares(p.montoUSD)})</span> · {METODO_PAGO[p.metodo]}
                          <span className="text-panel-suave"> · {fechaHoraArgentina(p.createdAt)}</span>
                        </p>
                        {p.metodo === 'mercadopago' && p.mpPago && (
                          <p className="m-0 text-[12.5px] text-panel-suave">
                            Mercado Pago: operación n.º {p.mpPago}
                            {p.mpEstado ? ` (${p.mpEstado === 'approved' ? 'aprobada' : p.mpEstado === 'in_process' || p.mpEstado === 'pending' ? 'en proceso' : p.mpEstado})` : ''}
                          </p>
                        )}
                        {p.nota && <p className="m-0 text-[12.5px] text-panel-suave">Nota: {p.nota}</p>}
                        {p.estado === 'aprobado' && !p.tieneComprobante && <p className="m-0 text-[13px] font-medium text-amber-700 dark:text-amber-400">Acreditado, pero el cliente todavía no subió la foto del comprobante.</p>}
                      </div>
                      <div data-guia="acciones-fila" className="flex shrink-0 flex-wrap items-center gap-2">
                        {p.tieneComprobante ? (
                          <a href={urlComprobante(p.id)} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center rounded-lg px-3 text-[13px] font-medium text-panel-acento ring-1 ring-inset ring-panel-borde hover:bg-panel-hundido">
                            Ver comprobante
                          </a>
                        ) : (
                          <span className="text-[13px] text-panel-tenue">Sin comprobante</span>
                        )}
                        {p.estado === 'en_revision' && (
                          <>
                            <Boton tamano="sm" variante="principal" icono="check" cargando={trabajando === p.id} onClick={() => aprobar(p)}>
                              Confirmar pago
                            </Boton>
                            <Boton
                              tamano="sm"
                              variante="peligro"
                              onClick={() => {
                                setMotivo('');
                                setErrorRechazo(null);
                                setRechazando(p);
                              }}
                            >
                              Rechazar
                            </Boton>
                          </>
                        )}
                        {e && (
                          <Link href="/admin/reservas" className="px-1 text-[13px] text-panel-suave hover:text-panel-texto hover:underline">
                            Ver la reserva
                          </Link>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Tarjeta>
        </div>
      )}

      <Dialogo
        abierto={Boolean(rechazando)}
        alCerrar={() => setRechazando(null)}
        titulo="Rechazar el comprobante"
        descripcion={rechazando ? `${TIPO_PAGO[rechazando.tipo]} de ${rechazando.estadia?.cliente || 'el cliente'} por ${pesos(rechazando.montoARS)}. Al cliente le llega un mail con el motivo y puede subir otro comprobante.` : undefined}
        acciones={
          <>
            <Boton onClick={() => setRechazando(null)}>Cancelar</Boton>
            <Boton variante="peligro" cargando={trabajando === 'rechazo'} onClick={rechazar}>
              Rechazar
            </Boton>
          </>
        }
      >
        <Campo etiqueta="Motivo (lo ve el cliente)" htmlFor={`${id}-motivo`} error={errorRechazo}>
          <textarea id={`${id}-motivo`} value={motivo} maxLength={300} onChange={(ev) => setMotivo(ev.target.value)} placeholder="Ej.: el monto del comprobante no coincide con la seña." className={areaTexto} />
        </Campo>
      </Dialogo>

      {dialogoConfirmar}
      {aviso}
    </>
  );
}

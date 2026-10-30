'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { hoyIso } from '@/components/calendario/fechas';
import { Alerta, Boton, BotonLink, Campo, Dialogo, Encabezado, Esqueleto, EstadoVacio, Insignia, Pestanas, SelectorFecha, Tarjeta, control, useAviso, useConfirmar, type Tono } from '@/components/panel/ui';
import {
  actualizarMonto,
  anularPago,
  avisarAtraso,
  dinero,
  getCobros,
  MEDIOS,
  moverMes,
  nombreMes,
  registrarPago,
  type EstadoCobro,
  type FilaCobro,
  type ListaCobros,
  type MedioPago,
  type Moneda,
} from '@/services/cobros';

// Cobro mensual de alquileres: a partir de los contratos vigentes, quién pagó cada mes, quién está atrasado
// (pasado el día de vencimiento del contrato) y el recibo de cada pago para imprimir o guardar en PDF.
// Cuando a un contrato le toca actualizar por índice, el monto nuevo se carga acá.

const ESTADO: Record<EstadoCobro, { texto: string; tono: Tono }> = {
  atrasado: { texto: 'Atrasado', tono: 'peligro' },
  pendiente: { texto: 'Pendiente', tono: 'aviso' },
  pagado: { texto: 'Pagado', tono: 'exito' },
};

const FILTROS: { id: 'todos' | EstadoCobro; texto: string }[] = [
  { id: 'todos', texto: 'Todos' },
  { id: 'atrasado', texto: 'Atrasados' },
  { id: 'pendiente', texto: 'Pendientes' },
  { id: 'pagado', texto: 'Pagados' },
];

const INDICES = ['ICL', 'IPC', 'CAC', 'Casa Propia', 'Otro'];

const fechaCorta = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const mayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);
const numero = (texto: string) => Number(texto.trim().replace(/\./g, '').replace(',', '.'));

// Suma por moneda: «ARS 700.000 · USD 500»
const totales = (filas: FilaCobro[], monto: (f: FilaCobro) => number | null | undefined) => {
  const suma = new Map<Moneda, number>();
  for (const f of filas) {
    const m = monto(f);
    if (m) suma.set(f.moneda, (suma.get(f.moneda) ?? 0) + m);
  }
  return suma.size ? [...suma].map(([moneda, total]) => dinero(total, moneda)).join(' · ') : '—';
};

export default function CobrosPage() {
  const { mostrar, aviso } = useAviso();
  const { confirmar, dialogoConfirmar } = useConfirmar();
  const [periodo, setPeriodo] = useState(() => hoyIso().slice(0, 7));
  const [datos, setDatos] = useState<ListaCobros | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState(0);
  const [trabajando, setTrabajando] = useState<string | null>(null);

  const [pagando, setPagando] = useState<FilaCobro | null>(null);
  const [pago, setPago] = useState({ pagadoEl: '', medio: 'transferencia' as MedioPago, monto: '', nota: '' });
  const [errorPago, setErrorPago] = useState<string | null>(null);

  const [actualizando, setActualizando] = useState<FilaCobro | null>(null);
  const [indice, setIndice] = useState({ indice: 'ICL', modo: 'porcentaje' as 'porcentaje' | 'monto', valor: '' });
  const [errorIndice, setErrorIndice] = useState<string | null>(null);

  const cargar = useCallback((mes: string) => {
    getCobros(mes)
      .then((d) => {
        setDatos(d);
        setError(null);
      })
      .catch((e: Error) => setError(e.message || 'No se pudieron cargar los cobros'));
  }, []);

  useEffect(() => {
    cargar(periodo);
  }, [cargar, periodo]);

  const irA = (mes: string) => {
    setDatos(null);
    setPeriodo(mes);
  };

  const filas = datos?.filas ?? [];
  const visibles = FILTROS[filtro].id === 'todos' ? filas : filas.filter((f) => f.estado === FILTROS[filtro].id);
  const mesActual = hoyIso().slice(0, 7);

  const abrirPago = (f: FilaCobro) => {
    setErrorPago(null);
    setPago({ pagadoEl: hoyIso(), medio: 'transferencia', monto: f.monto ? String(f.monto) : '', nota: '' });
    setPagando(f);
  };

  const guardarPago = async (e: FormEvent) => {
    e.preventDefault();
    if (!pagando) return;
    const monto = numero(pago.monto);
    if (!Number.isFinite(monto) || monto <= 0) return setErrorPago('Indicá el monto que pagó.');
    setTrabajando('pago');
    try {
      await registrarPago(pagando.contrato.id, pagando.periodo, { pagadoEl: pago.pagadoEl, medio: pago.medio, monto, nota: pago.nota.trim() });
      setPagando(null);
      mostrar('Pago registrado. Ya podés imprimir el recibo.');
      cargar(periodo);
    } catch (err) {
      setErrorPago(err instanceof Error ? err.message : 'No se pudo registrar el pago');
    } finally {
      setTrabajando(null);
    }
  };

  const anular = async (f: FilaCobro) => {
    const ok = await confirmar('¿Anular el pago?', { texto: `${f.contrato.propiedad}, ${nombreMes(f.periodo)}. Vuelve a figurar sin pagar y el recibo n.º ${f.cobro?.numeroRecibo} deja de valer.`, accion: 'Anular pago' });
    if (!ok) return;
    setTrabajando(`anular-${f.contrato.id}`);
    try {
      await anularPago(f.contrato.id, f.periodo);
      mostrar('Pago anulado.');
      cargar(periodo);
    } catch (err) {
      mostrar(err instanceof Error ? err.message : 'No se pudo anular el pago', 'peligro');
    } finally {
      setTrabajando(null);
    }
  };

  const avisar = async (f: FilaCobro) => {
    const ok = await confirmar(`¿Avisarle a ${f.contrato.inquilino || 'el inquilino'}?`, {
      texto: `Le llega un mail a ${f.contrato.email} con el monto de ${nombreMes(f.periodo)} y los datos para transferir.${f.cobro?.avisadoEl ? ` Ya se le avisó el ${fechaCorta(f.cobro.avisadoEl)}.` : ''}`,
      accion: 'Mandar aviso',
      variante: 'principal',
    });
    if (!ok) return;
    setTrabajando(`avisar-${f.contrato.id}`);
    try {
      await avisarAtraso(f.contrato.id, f.periodo);
      mostrar('Aviso enviado.');
      cargar(periodo);
    } catch (err) {
      mostrar(err instanceof Error ? err.message : 'No se pudo mandar el aviso', 'peligro');
    } finally {
      setTrabajando(null);
    }
  };

  const abrirIndice = (f: FilaCobro) => {
    setErrorIndice(null);
    setIndice({ indice: 'ICL', modo: 'porcentaje', valor: '' });
    setActualizando(f);
  };

  const valorIndice = numero(indice.valor);
  const montoNuevo = !actualizando || !indice.valor.trim() || !Number.isFinite(valorIndice)
    ? null
    : indice.modo === 'monto'
      ? valorIndice
      : actualizando.monto
        ? Math.round(actualizando.monto * (1 + valorIndice / 100))
        : null;

  const guardarIndice = async (e: FormEvent) => {
    e.preventDefault();
    if (!actualizando) return;
    if (!montoNuevo || montoNuevo <= 0) return setErrorIndice(indice.modo === 'porcentaje' ? 'Escribí el porcentaje del índice.' : 'Escribí el monto nuevo.');
    setTrabajando('indice');
    try {
      await actualizarMonto(actualizando.contrato.id, {
        desde: actualizando.periodo,
        indice: indice.indice,
        ...(indice.modo === 'porcentaje' ? { porcentaje: valorIndice } : { monto: valorIndice }),
      });
      setActualizando(null);
      mostrar(`Monto actualizado: ${dinero(montoNuevo, actualizando.moneda)} desde ${nombreMes(actualizando.periodo)}.`);
      cargar(periodo);
    } catch (err) {
      setErrorIndice(err instanceof Error ? err.message : 'No se pudo guardar el monto nuevo');
    } finally {
      setTrabajando(null);
    }
  };

  return (
    <>
      <Encabezado
        titulo="Cobros"
        descripcion="Los alquileres de cada mes según los contratos vigentes. Registrá cada pago para generar el recibo; pasado el día de vencimiento, los que no pagaron figuran atrasados y les podés mandar un aviso."
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Boton tamano="sm" icono="atras" aria-label="Mes anterior" onClick={() => irA(moverMes(periodo, -1))} />
        <h2 className="m-0 min-w-44 text-center text-[17px] font-semibold" aria-live="polite">
          {mayuscula(nombreMes(periodo))}
        </h2>
        <Boton tamano="sm" icono="flecha" aria-label="Mes siguiente" onClick={() => irA(moverMes(periodo, 1))} />
        {periodo !== mesActual && (
          <Boton tamano="sm" onClick={() => irA(mesActual)}>
            Este mes
          </Boton>
        )}
      </div>

      {error ? (
        <Alerta tono="peligro" titulo="No se pudieron cargar los cobros" accion={<Boton tamano="sm" onClick={() => { setError(null); cargar(periodo); }}>Reintentar</Boton>}>
          {error}
        </Alerta>
      ) : !datos ? (
        <div className="flex flex-col gap-4">
          <Esqueleto className="h-20 w-full" />
          <Esqueleto className="h-56 w-full" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <dl className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-panel-borde bg-panel-superficie p-4">
              <dt className="text-[12.5px] text-panel-suave">Cobrado</dt>
              <dd className="tabular m-0 mt-1 text-[20px] font-semibold leading-tight">{totales(filas, (f) => (f.estado === 'pagado' ? f.cobro?.monto : null))}</dd>
            </div>
            <div className="rounded-xl border border-panel-borde bg-panel-superficie p-4">
              <dt className="text-[12.5px] text-panel-suave">Falta cobrar</dt>
              <dd className="tabular m-0 mt-1 text-[20px] font-semibold leading-tight">{totales(filas, (f) => (f.estado !== 'pagado' ? f.monto : null))}</dd>
            </div>
            <div className="col-span-2 rounded-xl border border-panel-borde bg-panel-superficie p-4 sm:col-span-1">
              <dt className="text-[12.5px] text-panel-suave">Pagaron</dt>
              <dd className="tabular m-0 mt-1 text-[20px] font-semibold leading-tight">
                {filas.filter((f) => f.estado === 'pagado').length} de {filas.length}
              </dd>
            </div>
          </dl>

          <Tarjeta relleno={false}>
            <div className="border-b border-panel-borde px-4 pt-3">
              <Pestanas
                etiqueta="Filtrar cobros"
                className="flex gap-6 overflow-x-auto border-b-0"
                activa={filtro}
                alCambiar={setFiltro}
                pestanas={FILTROS.map((f) => ({ id: f.id, contenido: <span className="whitespace-nowrap">{`${f.texto} (${f.id === 'todos' ? filas.length : filas.filter((x) => x.estado === f.id).length})`}</span> }))}
              />
            </div>
            {visibles.length === 0 ? (
              <EstadoVacio
                icono="documento"
                titulo={filas.length ? 'No hay cobros en este filtro' : 'No hay alquileres para cobrar este mes'}
                texto={filas.length ? undefined : 'Aparecen los contratos de alquiler permanente o comercial que no son borradores ni están cancelados, y cuyas fechas incluyen este mes.'}
              />
            ) : (
              <ul className="m-0 grid list-none grid-cols-[minmax(0,1fr)] divide-y divide-panel-borde p-0">
                {visibles.map((f) => {
                  const estado = ESTADO[f.estado];
                  return (
                    <li key={f.contrato.id} className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{f.contrato.propiedad}</span>
                          <Insignia tono={estado.tono}>{estado.texto}</Insignia>
                          {f.mesesAdeudados.length > 0 && (
                            <Insignia tono="peligro">
                              Debe {f.mesesAdeudados.length === 1 ? nombreMes(f.mesesAdeudados[0]) : `${f.mesesAdeudados.length} meses anteriores`}
                            </Insignia>
                          )}
                        </div>
                        <p className="m-0 text-[13.5px] text-panel-suave">
                          {f.contrato.inquilino || 'Sin inquilino'}
                          {f.contrato.telefono ? ` · ${f.contrato.telefono}` : ''} · Contrato n.º {f.contrato.numero}
                        </p>
                        <p className="tabular m-0 text-[13.5px]">
                          {f.estado === 'pagado' && f.cobro ? (
                            <>
                              {dinero(f.cobro.monto, f.cobro.moneda)} · pagó el {fechaCorta(f.cobro.pagadoEl ?? '')} ({MEDIOS[f.cobro.medio ?? 'otro'].toLowerCase()}) · recibo n.º {f.cobro.numeroRecibo}
                            </>
                          ) : (
                            <>
                              {f.monto ? dinero(f.monto, f.moneda) : `Monto del contrato: «${f.contrato.montoContrato}»`}
                              <span className="text-panel-suave">
                                {' '}
                                · vence el {f.contrato.diaVencimiento}
                                {f.cobro?.avisadoEl ? ` · avisado el ${fechaCorta(f.cobro.avisadoEl)}` : ''}
                              </span>
                            </>
                          )}
                        </p>
                        {f.actualizadoDesde && (
                          <p className="m-0 text-[12.5px] text-panel-suave">Monto actualizado por índice desde {nombreMes(f.actualizadoDesde)}.</p>
                        )}
                        {f.actualiza && f.estado !== 'pagado' && (
                          <p className="m-0 text-[13px] font-medium text-amber-700 dark:text-amber-400">
                            Este mes actualiza por índice ({f.contrato.ajuste.toLowerCase()}). Cargá el monto nuevo antes de cobrar.
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        {f.estado === 'pagado' && f.cobro ? (
                          <>
                            <BotonLink tamano="sm" variante="principal" icono="imprimir" href={`/admin/cobros/recibo/${f.cobro.id}`} target="_blank">
                              Recibo
                            </BotonLink>
                            <Boton tamano="sm" cargando={trabajando === `anular-${f.contrato.id}`} onClick={() => anular(f)}>
                              Anular
                            </Boton>
                          </>
                        ) : (
                          <>
                            {f.actualiza && (
                              <Boton tamano="sm" icono="arriba" onClick={() => abrirIndice(f)}>
                                Cargar monto nuevo
                              </Boton>
                            )}
                            <Boton tamano="sm" variante="principal" icono="check" onClick={() => abrirPago(f)}>
                              Registrar pago
                            </Boton>
                            {f.estado === 'atrasado' && (
                              <Boton
                                tamano="sm"
                                icono="email"
                                disabled={!f.contrato.email}
                                title={f.contrato.email ? undefined : 'El contrato no tiene el email del inquilino'}
                                cargando={trabajando === `avisar-${f.contrato.id}`}
                                onClick={() => avisar(f)}
                              >
                                {f.cobro?.avisadoEl ? 'Avisar de nuevo' : 'Avisar'}
                              </Boton>
                            )}
                          </>
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
        abierto={Boolean(pagando)}
        alCerrar={() => setPagando(null)}
        titulo="Registrar pago"
        descripcion={pagando ? `${pagando.contrato.propiedad} · ${mayuscula(nombreMes(pagando.periodo))}` : undefined}
        acciones={
          <>
            <Boton onClick={() => setPagando(null)}>Cancelar</Boton>
            <Boton variante="principal" type="submit" form="form-pago" cargando={trabajando === 'pago'}>
              Registrar
            </Boton>
          </>
        }
      >
        <form id="form-pago" onSubmit={guardarPago} className="grid gap-4">
          {errorPago && <Alerta tono="peligro">{errorPago}</Alerta>}
          {pagando?.actualiza && (
            <Alerta tono="aviso">Este mes actualiza por índice y todavía no se cargó el monto nuevo. Revisá el monto antes de registrar.</Alerta>
          )}
          <Campo etiqueta={`Monto (${pagando?.moneda ?? 'ARS'}) *`} htmlFor="pago-monto">
            <input id="pago-monto" required inputMode="decimal" value={pago.monto} onChange={(e) => setPago({ ...pago, monto: e.target.value })} className={`${control} tabular`} />
          </Campo>
          <Campo etiqueta="Fecha de pago *" htmlFor="pago-fecha">
            <SelectorFecha id="pago-fecha" valor={pago.pagadoEl} alCambiar={(iso) => setPago({ ...pago, pagadoEl: iso })} />
          </Campo>
          <Campo etiqueta="Cómo pagó *" htmlFor="pago-medio">
            <select id="pago-medio" value={pago.medio} onChange={(e) => setPago({ ...pago, medio: e.target.value as MedioPago })} className={control}>
              {Object.entries(MEDIOS).map(([valor, texto]) => (
                <option key={valor} value={valor}>
                  {texto}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Nota" htmlFor="pago-nota" ayuda="Opcional. Sale en el recibo.">
            <input id="pago-nota" maxLength={300} value={pago.nota} onChange={(e) => setPago({ ...pago, nota: e.target.value })} placeholder="Ej.: Incluye expensas de octubre." className={control} />
          </Campo>
        </form>
      </Dialogo>

      <Dialogo
        abierto={Boolean(actualizando)}
        alCerrar={() => setActualizando(null)}
        titulo="Actualizar el monto por índice"
        descripcion={actualizando ? `${actualizando.contrato.propiedad} · rige desde ${nombreMes(actualizando.periodo)}` : undefined}
        acciones={
          <>
            <Boton onClick={() => setActualizando(null)}>Cancelar</Boton>
            <Boton variante="principal" type="submit" form="form-indice" cargando={trabajando === 'indice'}>
              Guardar monto
            </Boton>
          </>
        }
      >
        <form id="form-indice" onSubmit={guardarIndice} className="grid gap-4">
          {errorIndice && <Alerta tono="peligro">{errorIndice}</Alerta>}
          <p className="m-0 text-sm">
            Monto actual: <span className="tabular font-medium">{actualizando ? dinero(actualizando.monto, actualizando.moneda) : ''}</span>
          </p>
          <Campo etiqueta="Índice" htmlFor="indice-nombre">
            <select id="indice-nombre" value={indice.indice} onChange={(e) => setIndice({ ...indice, indice: e.target.value })} className={control}>
              {INDICES.map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
          </Campo>
          <Pestanas
            etiqueta="Cómo cargar el aumento"
            className="flex gap-6"
            activa={indice.modo === 'porcentaje' ? 0 : 1}
            alCambiar={(i) => setIndice({ ...indice, modo: i === 0 ? 'porcentaje' : 'monto', valor: '' })}
            pestanas={[
              { id: 'porcentaje', contenido: 'Con el porcentaje' },
              { id: 'monto', contenido: 'Con el monto final' },
            ]}
          />
          <Campo
            etiqueta={indice.modo === 'porcentaje' ? 'Aumento del período (%) *' : `Monto nuevo (${actualizando?.moneda ?? 'ARS'}) *`}
            htmlFor="indice-valor"
            ayuda={indice.modo === 'porcentaje' ? 'El porcentaje que da la calculadora del índice para el período (por ejemplo, la del BCRA para el ICL).' : undefined}
          >
            <input id="indice-valor" required inputMode="decimal" value={indice.valor} onChange={(e) => setIndice({ ...indice, valor: e.target.value })} placeholder={indice.modo === 'porcentaje' ? 'Ej.: 12,5' : ''} className={`${control} tabular`} />
          </Campo>
          {montoNuevo !== null && actualizando && (
            <p className="m-0 text-sm">
              Monto nuevo: <span className="tabular font-semibold">{dinero(montoNuevo, actualizando.moneda)}</span>
            </p>
          )}
        </form>
      </Dialogo>
      {dialogoConfirmar}
      {aviso}
    </>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { getProperties, type ApiProperty } from '@/services/api';
import { cancelarSena, concretarSena, crearSena, extenderSena, finDelDiaArgentina, getSenas, montoSena, type EstadoSena, type Sena } from '@/services/senas';
import { hoyIso, sumarDias } from '@/components/calendario/fechas';
import { Alerta, Boton, Campo, Dialogo, Encabezado, Esqueleto, EstadoVacio, Insignia, Pestanas, SelectorFecha, Tarjeta, areaTexto, control, useAviso, type Tono } from '@/components/panel/ui';

// HU-13 / RF-11: reservas con seña de propiedades en venta o alquiler. Mientras está activa, la propiedad
// figura «Reservada» en el sitio con la fecha límite; si llega ese día sin concretarse, vuelve a «Disponible» sola.

const ESTADO: Record<EstadoSena, { texto: string; tono: Tono }> = {
  activa: { texto: 'Activa', tono: 'aviso' },
  concretada: { texto: 'Concretada', tono: 'exito' },
  cancelada: { texto: 'Cancelada', tono: 'neutro' },
  vencida: { texto: 'Vencida', tono: 'peligro' },
};

const PESTANAS: { id: 'activas' | 'cerradas'; texto: string }[] = [
  { id: 'activas', texto: 'Activas' },
  { id: 'cerradas', texto: 'Historial' },
];

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' });
const diasHasta = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);

const VACIO = { propiedad: '', nombre: '', email: '', telefono: '', monto: '', moneda: 'USD' as 'USD' | 'ARS', fechaLimite: '', notas: '' };

export default function SenasPage() {
  const { mostrar, aviso } = useAviso();
  const [senas, setSenas] = useState<Sena[] | null>(null);
  const [propiedades, setPropiedades] = useState<ApiProperty[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pestana, setPestana] = useState(0);
  const [nueva, setNueva] = useState(false);
  const [form, setForm] = useState(VACIO);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [cerrando, setCerrando] = useState<{ sena: Sena; accion: 'concretar' | 'cancelar' } | null>(null);
  const [cierre, setCierre] = useState('');
  const [extendiendo, setExtendiendo] = useState<Sena | null>(null);
  const [nuevaFecha, setNuevaFecha] = useState('');

  const cargar = useCallback(() => {
    Promise.all([getSenas(), getProperties().catch(() => [] as ApiProperty[])])
      .then(([lista, props]) => {
        setSenas(lista);
        setPropiedades(props);
        setError(null);
      })
      .catch((e: Error) => setError(e.message || 'No se pudieron cargar las reservas con seña'));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Solo se pueden reservar las disponibles de venta o alquiler (las temporarias se reservan por noches)
  const reservables = useMemo(
    () => propiedades.filter((p) => (!p.estado || p.estado === 'disponible') && p.categoria_operacion !== 'temporario').sort((a, b) => a.title.localeCompare(b.title)),
    [propiedades]
  );

  const visibles = (senas ?? []).filter((s) => (pestana === 0 ? s.estado === 'activa' : s.estado !== 'activa'));

  const reemplazar = (s: Sena) => setSenas((lista) => lista?.map((x) => (x._id === s._id ? { ...s, propiedad: x.propiedad } : x)) ?? null);

  const crear = async (e: FormEvent) => {
    e.preventDefault();
    setErrorForm(null);
    if (!form.propiedad) return setErrorForm('Elegí la propiedad.');
    if (!form.fechaLimite) return setErrorForm('Elegí hasta cuándo dura la reserva.');
    setTrabajando(true);
    try {
      await crearSena({
        propiedad: form.propiedad,
        cliente: { nombre: form.nombre.trim(), email: form.email.trim(), telefono: form.telefono.trim() },
        sena: { monto: Number(form.monto), moneda: form.moneda },
        fechaLimite: finDelDiaArgentina(form.fechaLimite),
        notas: form.notas.trim(),
      });
      setNueva(false);
      setForm(VACIO);
      mostrar('Reserva registrada. La propiedad figura como reservada en el sitio.');
      cargar();
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'No se pudo registrar la reserva');
    } finally {
      setTrabajando(false);
    }
  };

  const cerrar = async () => {
    if (!cerrando) return;
    setTrabajando(true);
    try {
      const hecho = cerrando.accion === 'concretar' ? await concretarSena(cerrando.sena._id, cierre) : await cancelarSena(cerrando.sena._id, cierre);
      reemplazar(hecho);
      mostrar(cerrando.accion === 'concretar' ? `Operación concretada: la propiedad pasó a ${hecho.operacion === 'alquiler' ? 'alquilada' : 'vendida'}.` : 'Reserva cancelada: la propiedad volvió a estar disponible.');
      setCerrando(null);
      setCierre('');
    } catch (err) {
      mostrar(err instanceof Error ? err.message : 'No se pudo actualizar la reserva', 'peligro');
    } finally {
      setTrabajando(false);
    }
  };

  const extender = async () => {
    if (!extendiendo || !nuevaFecha) return;
    setTrabajando(true);
    try {
      reemplazar(await extenderSena(extendiendo._id, finDelDiaArgentina(nuevaFecha)));
      mostrar('Fecha límite actualizada.');
      setExtendiendo(null);
    } catch (err) {
      mostrar(err instanceof Error ? err.message : 'No se pudo cambiar la fecha', 'peligro');
    } finally {
      setTrabajando(false);
    }
  };

  const titulo = (s: Sena) => (s.propiedad && typeof s.propiedad === 'object' ? s.propiedad.title : s.tituloPropiedad);
  const idProp = (s: Sena) => (s.propiedad && typeof s.propiedad === 'object' ? s.propiedad._id : typeof s.propiedad === 'string' ? s.propiedad : '');

  return (
    <>
      <Encabezado
        titulo="Reservas con seña"
        descripcion="Propiedades en venta o alquiler reservadas con seña. Mientras la reserva está activa se ven «Reservadas» en el sitio; si llega la fecha límite sin concretarse, vuelven a estar disponibles solas."
        acciones={
          <Boton variante="principal" icono="mas" onClick={() => { setErrorForm(null); setNueva(true); }}>
            Registrar reserva
          </Boton>
        }
      />

      {error ? (
        <Alerta tono="peligro" titulo="No se pudieron cargar las reservas" accion={<Boton tamano="sm" onClick={() => { setError(null); setSenas(null); cargar(); }}>Reintentar</Boton>}>
          {error}
        </Alerta>
      ) : (
        <Tarjeta relleno={false}>
          <div className="border-b border-panel-borde px-4 pt-3">
            <Pestanas
              etiqueta="Filtrar reservas"
              className="flex gap-6 border-b-0"
              activa={pestana}
              alCambiar={setPestana}
              pestanas={PESTANAS.map((p, i) => ({
                id: p.id,
                contenido: `${p.texto}${senas ? ` (${senas.filter((s) => (i === 0 ? s.estado === 'activa' : s.estado !== 'activa')).length})` : ''}`,
              }))}
            />
          </div>
          {!senas ? (
            <div className="flex flex-col gap-3 p-4">
              <Esqueleto className="h-14 w-full" />
              <Esqueleto className="h-14 w-full" />
            </div>
          ) : visibles.length === 0 ? (
            <EstadoVacio
              icono="candado"
              titulo={pestana === 0 ? 'No hay reservas activas' : 'Todavía no hay historial'}
              texto={pestana === 0 ? 'Cuando un interesado deje una seña, registrala acá y la propiedad pasa a «Reservada».' : undefined}
            />
          ) : (
            <ul className="m-0 list-none divide-y divide-panel-borde p-0">
              {visibles.map((s) => {
                const estado = ESTADO[s.estado];
                const dias = diasHasta(s.fechaLimite);
                return (
                  <li key={s._id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {idProp(s) ? (
                          <Link href={`/propiedades/${idProp(s)}`} target="_blank" className="font-medium hover:underline">
                            {titulo(s)}
                          </Link>
                        ) : (
                          <span className="font-medium">{titulo(s)}</span>
                        )}
                        <Insignia tono={estado.tono}>{estado.texto}</Insignia>
                        <Insignia>{s.operacion === 'alquiler' ? 'Alquiler' : 'Venta'}</Insignia>
                      </div>
                      <p className="m-0 text-[13.5px] text-panel-suave">
                        {s.cliente.nombre}
                        {s.cliente.telefono ? ` · ${s.cliente.telefono}` : ''}
                        {s.cliente.email ? ` · ${s.cliente.email}` : ''}
                      </p>
                      <p className="tabular m-0 text-[13.5px]">
                        Seña {montoSena(s)} · {s.estado === 'activa' ? `hasta el ${fecha(s.fechaLimite)}` : `límite ${fecha(s.fechaLimite)}`}
                        {s.estado === 'activa' && (
                          <span className={dias <= 3 ? ' font-medium text-amber-700 dark:text-amber-400' : ' text-panel-suave'}>
                            {' '}
                            · {dias <= 0 ? 'vence hoy' : `quedan ${dias} ${dias === 1 ? 'día' : 'días'}`}
                          </span>
                        )}
                      </p>
                      {s.notas && <p className="m-0 text-[13px] text-panel-suave">{s.notas}</p>}
                      {s.cierre && <p className="m-0 text-[13px] text-panel-suave">Cierre: {s.cierre}</p>}
                    </div>
                    {s.estado === 'activa' && (
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Boton tamano="sm" variante="principal" icono="check" onClick={() => { setCierre(''); setCerrando({ sena: s, accion: 'concretar' }); }}>
                          Concretar
                        </Boton>
                        <Boton tamano="sm" icono="calendario" onClick={() => { setNuevaFecha(new Date(s.fechaLimite).toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })); setExtendiendo(s); }}>
                          Cambiar fecha
                        </Boton>
                        <Boton tamano="sm" variante="peligro" icono="cerrar" onClick={() => { setCierre(''); setCerrando({ sena: s, accion: 'cancelar' }); }}>
                          Cancelar
                        </Boton>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Tarjeta>
      )}

      <Dialogo
        abierto={nueva}
        alCerrar={() => setNueva(false)}
        titulo="Registrar reserva con seña"
        descripcion="La propiedad pasa a «Reservada» hasta la fecha límite."
        ancho="lg"
        acciones={
          <>
            <Boton onClick={() => setNueva(false)}>Cancelar</Boton>
            <Boton variante="principal" type="submit" form="form-sena" cargando={trabajando}>
              Registrar
            </Boton>
          </>
        }
      >
        <form id="form-sena" onSubmit={crear} className="grid gap-4 sm:grid-cols-2">
          {errorForm && (
            <div className="sm:col-span-2">
              <Alerta tono="peligro">{errorForm}</Alerta>
            </div>
          )}
          <Campo etiqueta="Propiedad *" htmlFor="sena-propiedad" className="sm:col-span-2" ayuda={reservables.length ? undefined : 'No hay propiedades disponibles de venta o alquiler.'}>
            <select id="sena-propiedad" required value={form.propiedad} onChange={(e) => setForm({ ...form, propiedad: e.target.value })} className={control}>
              <option value="">Elegí una propiedad</option>
              {reservables.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.title} · {p.categoria_operacion === 'alquiler' ? 'Alquiler' : 'Venta'}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Quién reserva *" htmlFor="sena-nombre" className="sm:col-span-2">
            <input id="sena-nombre" required maxLength={120} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={control} />
          </Campo>
          <Campo etiqueta="Teléfono" htmlFor="sena-telefono">
            <input id="sena-telefono" type="tel" maxLength={40} value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className={control} />
          </Campo>
          <Campo etiqueta="Email" htmlFor="sena-email">
            <input id="sena-email" type="email" maxLength={150} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={control} />
          </Campo>
          <Campo etiqueta="Seña *" htmlFor="sena-monto">
            <div className="flex gap-2">
              <select aria-label="Moneda de la seña" value={form.moneda} onChange={(e) => setForm({ ...form, moneda: e.target.value as 'USD' | 'ARS' })} className={`${control} w-24`}>
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
              </select>
              <input id="sena-monto" required type="number" min="1" inputMode="decimal" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} className={`${control} tabular flex-1`} />
            </div>
          </Campo>
          <Campo etiqueta="Fecha límite *" htmlFor="sena-limite" ayuda="Si no se concreta antes, vuelve a disponible.">
            <SelectorFecha id="sena-limite" valor={form.fechaLimite} min={sumarDias(hoyIso(), 1)} alCambiar={(iso) => setForm({ ...form, fechaLimite: iso })} />
          </Campo>
          <Campo etiqueta="Notas" htmlFor="sena-notas" className="sm:col-span-2">
            <textarea id="sena-notas" rows={3} maxLength={1000} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Ej.: Recibo n.º 123, la seña se descuenta del precio." className={areaTexto} />
          </Campo>
        </form>
      </Dialogo>

      <Dialogo
        abierto={Boolean(cerrando)}
        alCerrar={() => setCerrando(null)}
        titulo={cerrando?.accion === 'concretar' ? 'Concretar la operación' : 'Cancelar la reserva'}
        descripcion={
          cerrando?.accion === 'concretar'
            ? `La propiedad pasa a ${cerrando.sena.operacion === 'alquiler' ? 'alquilada' : 'vendida'} y deja de mostrarse como disponible.`
            : 'La propiedad vuelve a estar disponible en el sitio.'
        }
        acciones={
          <>
            <Boton onClick={() => setCerrando(null)}>Volver</Boton>
            <Boton variante={cerrando?.accion === 'concretar' ? 'principal' : 'peligro'} cargando={trabajando} onClick={cerrar}>
              {cerrando?.accion === 'concretar' ? 'Concretar' : 'Cancelar reserva'}
            </Boton>
          </>
        }
      >
        <Campo etiqueta="¿Qué pasa con la seña?" htmlFor="sena-cierre" ayuda="Opcional. Queda en el historial.">
          <textarea id="sena-cierre" rows={3} maxLength={500} value={cierre} onChange={(e) => setCierre(e.target.value)} placeholder={cerrando?.accion === 'concretar' ? 'Ej.: Se toma como parte de pago.' : 'Ej.: Se devolvió la seña el 12/11.'} className={areaTexto} />
        </Campo>
      </Dialogo>

      <Dialogo
        abierto={Boolean(extendiendo)}
        alCerrar={() => setExtendiendo(null)}
        titulo="Cambiar la fecha límite"
        acciones={
          <>
            <Boton onClick={() => setExtendiendo(null)}>Volver</Boton>
            <Boton variante="principal" cargando={trabajando} disabled={!nuevaFecha} onClick={extender}>
              Guardar
            </Boton>
          </>
        }
      >
        <Campo etiqueta="Nueva fecha límite" htmlFor="sena-extender">
          <SelectorFecha id="sena-extender" valor={nuevaFecha} min={sumarDias(hoyIso(), 1)} alCambiar={setNuevaFecha} />
        </Campo>
      </Dialogo>
      {aviso}
    </>
  );
}

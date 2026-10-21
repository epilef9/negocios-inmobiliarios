'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alerta,
  Boton,
  Campo,
  Dialogo,
  Encabezado,
  Esqueleto,
  EstadoVacio,
  Insignia,
  Tarjeta,
  control,
  useAviso,
  useConfirmar,
} from '@/components/panel/ui';
import Icono from '@/components/panel/Icono';
import { ESTADO_PROPIEDAD, estadoDe } from '@/components/panel/estados';
import {
  asignarPersona,
  getPanelClientes,
  type ClientePanel,
  type PanelClientes,
  type PersonaAsignada,
  type PropiedadDeCliente,
  type RolCliente,
  YaAsignadoError,
} from '@/services/clientes';

type Filtro = 'todos' | 'propietarios' | 'inquilinos' | 'clientes';

const FILTROS: { valor: Filtro; texto: string }[] = [
  { valor: 'todos', texto: 'Todos' },
  { valor: 'propietarios', texto: 'Propietarios' },
  { valor: 'inquilinos', texto: 'Inquilinos' },
];
// Aparte de los anteriores: todas las cuentas creadas en el sitio, tengan o no una propiedad
const FILTRO_CUENTAS: { valor: Filtro; texto: string } = { valor: 'clientes', texto: 'Clientes' };

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const iniciales = (nombre: string) =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('') || '?';

type Formulario = {
  propiedadId: string;
  rol: RolCliente;
  modo: 'registrado' | 'manual';
  usuarioId: string;
  nombre: string;
  email: string;
  telefono: string;
};

const FORMULARIO_VACIO: Formulario = { propiedadId: '', rol: 'propietario', modo: 'registrado', usuarioId: '', nombre: '', email: '', telefono: '' };

function FilaPropiedad({
  propiedad,
  rol,
  onQuitar,
}: {
  propiedad: PropiedadDeCliente;
  rol: RolCliente;
  onQuitar: () => void;
}) {
  const estado = estadoDe(ESTADO_PROPIEDAD, propiedad.estado);
  return (
    <li className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0">
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="m-0 flex flex-wrap items-center gap-2 text-sm font-medium">
          {propiedad.titulo}
          <Insignia tono={estado.tono}>{estado.texto}</Insignia>
          {propiedad.origen === 'contrato' && <Insignia tono="neutro">Por contrato</Insignia>}
        </p>
        {propiedad.direccion && <p className="m-0 text-[13px] text-panel-suave">{propiedad.direccion}</p>}
        {rol === 'propietario' && propiedad.inquilino && (
          <p className="m-0 mt-1 flex flex-wrap items-center gap-1.5 text-[13px] text-panel-suave">
            <Icono nombre="clientes" className="h-4 w-4" />
            Inquilino: <span className="font-medium text-panel-texto">{propiedad.inquilino.nombre}</span>
            {propiedad.inquilino.telefono && (
              <a href={`tel:${propiedad.inquilino.telefono}`} className="hover:text-panel-texto hover:underline">
                · {propiedad.inquilino.telefono}
              </a>
            )}
          </p>
        )}
      </div>
      {propiedad.origen !== 'contrato' && (
        <Boton tamano="sm" variante="fantasma" icono="borrar" onClick={onQuitar} aria-label={`Quitar a este cliente de ${propiedad.titulo}`}>
          Quitar
        </Boton>
      )}
    </li>
  );
}

export default function ClientesPage() {
  const [panel, setPanel] = useState<PanelClientes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [dialogo, setDialogo] = useState<Formulario | null>(null);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const { mostrar, aviso } = useAviso();
  const { confirmar, dialogoConfirmar } = useConfirmar();

  const cargar = useCallback(
    () =>
      getPanelClientes()
        .then((datos) => {
          setPanel(datos);
          setError(null);
        })
        .catch((err: Error) => setError(err.message || 'No se pudo cargar el panel de clientes'))
        .finally(() => setCargando(false)),
    [],
  );

  useEffect(() => {
    cargar();
  }, [cargar]);

  const visibles = useMemo(() => {
    if (!panel) return [];
    const q = busqueda.trim().toLowerCase();
    return panel.clientes.filter((c) => {
      if (filtro === 'propietarios' && !c.propietarioDe.length) return false;
      if (filtro === 'inquilinos' && !c.alquilaEn.length) return false;
      if (!q) return true;
      const propiedades = [...c.propietarioDe, ...c.alquilaEn].map((p) => p.titulo).join(' ');
      return `${c.nombre} ${c.email} ${c.telefono} ${propiedades}`.toLowerCase().includes(q);
    });
  }, [panel, filtro, busqueda]);

  // Todas las cuentas creadas, con lo que cada una tiene vinculado
  const cuentas = useMemo(() => {
    if (!panel) return [];
    const q = busqueda.trim().toLowerCase();
    const vinculados = new Map(panel.clientes.filter((c) => c.usuarioId).map((c) => [c.usuarioId as string, c]));
    return panel.usuarios
      .map((u) => ({ ...u, vinculo: vinculados.get(u.id) }))
      .filter((u) => !q || `${u.nombre} ${u.email} ${u.telefono}`.toLowerCase().includes(q));
  }, [panel, busqueda]);

  const abrirAsignar = (cliente?: ClientePanel, rol: RolCliente = 'propietario') => {
    setErrorForm(null);
    setDialogo({
      ...FORMULARIO_VACIO,
      rol,
      ...(cliente
        ? cliente.usuarioId
          ? { modo: 'registrado' as const, usuarioId: cliente.usuarioId }
          : { modo: 'manual' as const, nombre: cliente.nombre, email: cliente.email, telefono: cliente.telefono }
        : {}),
    });
  };

  const cambiar = (cambios: Partial<Formulario>) => {
    setDialogo((actual) => (actual ? { ...actual, ...cambios } : actual));
    setErrorForm(null);
  };

  const guardar = async () => {
    if (!dialogo) return;
    if (!dialogo.propiedadId) return setErrorForm('Elegí la propiedad.');
    let persona: PersonaAsignada;
    if (dialogo.modo === 'registrado') {
      if (!dialogo.usuarioId) return setErrorForm('Elegí al cliente registrado.');
      persona = { usuarioId: dialogo.usuarioId };
    } else {
      if (!dialogo.nombre.trim()) return setErrorForm('Escribí el nombre.');
      if (dialogo.email.trim() && !EMAIL_VALIDO.test(dialogo.email.trim())) return setErrorForm('El email no es válido.');
      persona = { nombre: dialogo.nombre.trim(), email: dialogo.email.trim(), telefono: dialogo.telefono.trim() };
    }
    setGuardando(true);
    try {
      let resultado;
      try {
        resultado = await asignarPersona(dialogo.propiedadId, dialogo.rol, persona);
      } catch (err) {
        if (!(err instanceof YaAsignadoError)) throw err;
        // Ya hay alguien en ese rol: no se pisa sin confirmar
        const continuar = await confirmar(
          `¿Cambiar ${dialogo.rol === 'propietario' ? 'el propietario' : 'el inquilino'}?`,
          {
            texto: `Esta propiedad ya tiene ${dialogo.rol === 'propietario' ? 'propietario' : 'inquilino'}${err.actual ? `: ${err.actual}` : ''}. Si continuás, deja de figurar y lo reemplaza la persona nueva.`,
            accion: 'Continuar',
          },
        );
        if (!continuar) {
          setGuardando(false);
          return;
        }
        resultado = await asignarPersona(dialogo.propiedadId, dialogo.rol, persona, true);
      }
      setDialogo(null);
      mostrar(
        dialogo.rol === 'propietario'
          ? 'Propietario guardado'
          : resultado.estado === 'alquilado'
            ? 'Inquilino guardado. La propiedad figura como Alquilada.'
            : 'Inquilino guardado',
      );
      await cargar();
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  const quitar = async (propiedad: PropiedadDeCliente, rol: RolCliente) => {
    const ok = await confirmar(`¿Quitar ${rol === 'propietario' ? 'al propietario' : 'al inquilino'}?`, {
      texto:
        rol === 'inquilino'
          ? `Se desvincula de "${propiedad.titulo}", que vuelve a figurar como Disponible. El cliente no se borra de la cuenta.`
          : `Se desvincula de "${propiedad.titulo}". El cliente no se borra de la cuenta.`,
      accion: 'Quitar',
    });
    if (!ok) return;
    try {
      await asignarPersona(propiedad.id, rol, null);
      mostrar('Se quitó la asignación');
      await cargar();
    } catch (err) {
      mostrar(err instanceof Error ? err.message : 'No se pudo quitar', 'peligro');
    }
  };

  const propiedadesElegibles = panel?.propiedades ?? [];

  return (
    <>
      <Encabezado
        titulo="Clientes"
        descripcion="Dueños de las propiedades publicadas e inquilinos que las alquilan. Quienes tienen cuenta figuran como registrados."
        acciones={
          <Boton variante="principal" icono="mas" onClick={() => abrirAsignar()} disabled={!panel}>
            Asignar a una propiedad
          </Boton>
        }
      />

      {error && (
        <Alerta tono="peligro" titulo="No pudimos cargar los clientes" accion={<Boton tamano="sm" onClick={cargar}>Reintentar</Boton>}>
          {error}
        </Alerta>
      )}

      {cargando && !error && (
        <div className="flex flex-col gap-3" aria-busy="true">
          <Esqueleto className="h-20 w-full" />
          <Esqueleto className="h-40 w-full" />
          <Esqueleto className="h-40 w-full" />
        </div>
      )}

      {panel && (
        <div className="flex flex-col gap-5">
          <dl className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { texto: 'Propietarios', valor: panel.resumen.propietarios },
              { texto: 'Inquilinos', valor: panel.resumen.inquilinos },
              { texto: 'Con cuenta', valor: panel.resumen.registrados },
              { texto: 'Propiedades sin dueño', valor: panel.resumen.propiedadesSinPropietario },
            ].map((dato) => (
              <div key={dato.texto} className="rounded-xl border border-panel-borde bg-panel-superficie px-4 py-3">
                <dt className="text-[12.5px] text-panel-suave">{dato.texto}</dt>
                <dd className="font-display m-0 text-[30px] leading-tight">{dato.valor}</dd>
              </div>
            ))}
          </dl>

          {panel.resumen.propiedadesSinPropietario > 0 && (
            <Alerta
              tono="aviso"
              titulo={`${panel.resumen.propiedadesSinPropietario} ${panel.resumen.propiedadesSinPropietario === 1 ? 'propiedad no tiene' : 'propiedades no tienen'} propietario cargado`}
              accion={<Boton tamano="sm" onClick={() => abrirAsignar()}>Asignar</Boton>}
            >
              Hasta que se cargue, su dueño no aparece en esta lista.
            </Alerta>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div role="group" aria-label="Filtrar clientes" className="flex gap-1.5">
              {FILTROS.map((f) => (
                <Boton key={f.valor} tamano="sm" variante={filtro === f.valor ? 'principal' : 'secundario'} aria-pressed={filtro === f.valor} onClick={() => setFiltro(f.valor)}>
                  {f.texto}
                </Boton>
              ))}
              <span aria-hidden="true" className="mx-2 w-px self-stretch bg-panel-borde" />
              <Boton tamano="sm" variante={filtro === 'clientes' ? 'principal' : 'secundario'} aria-pressed={filtro === 'clientes'} onClick={() => setFiltro('clientes')}>
                {FILTRO_CUENTAS.texto} ({panel.resumen.cuentas})
              </Boton>
            </div>
            <div className="relative w-full sm:w-72">
              <Icono nombre="buscar" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-panel-tenue" />
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, email o propiedad"
                aria-label="Buscar clientes"
                className={`${control} pl-9`}
              />
            </div>
          </div>

          {filtro === 'clientes' ? (
            cuentas.length === 0 ? (
              <Tarjeta relleno={false}>
                <EstadoVacio icono="clientes" titulo="Ninguna cuenta coincide" texto="Probá con otra búsqueda." />
              </Tarjeta>
            ) : (
              <Tarjeta relleno={false}>
                <ul className="m-0 flex list-none flex-col divide-y divide-panel-borde p-0">
                  {cuentas.map((u) => (
                    <li key={u.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-panel-acento-suave text-[13px] font-semibold text-panel-acento">
                          {iniciales(u.nombre)}
                        </span>
                        <div className="flex min-w-0 flex-col">
                          <p className="m-0 flex flex-wrap items-center gap-2 text-sm font-medium">
                            {u.nombre}
                            {u.vinculo?.propietarioDe.length ? <Insignia tono="acento">Propietario</Insignia> : null}
                            {u.vinculo?.alquilaEn.length ? <Insignia tono="info">Inquilino</Insignia> : null}
                            {!u.vinculo && <Insignia>Sin propiedades</Insignia>}
                            {!u.emailVerificado && <Insignia tono="aviso">Email sin confirmar</Insignia>}
                          </p>
                          <p className="m-0 flex flex-wrap gap-x-4 text-[13px] text-panel-suave">
                            <a href={`mailto:${u.email}`} className="break-all hover:text-panel-texto hover:underline">
                              {u.email}
                            </a>
                            {u.telefono && (
                              <a href={`tel:${u.telefono}`} className="hover:text-panel-texto hover:underline">
                                {u.telefono}
                              </a>
                            )}
                            {u.creadoEn && <span>Alta: {new Date(u.creadoEn).toLocaleDateString('es-AR')}</span>}
                          </p>
                        </div>
                      </div>
                      <Boton tamano="sm" icono="mas" onClick={() => setDialogo({ ...FORMULARIO_VACIO, modo: 'registrado', usuarioId: u.id })}>
                        Asignar a una propiedad
                      </Boton>
                    </li>
                  ))}
                </ul>
              </Tarjeta>
            )
          ) : visibles.length === 0 ? (
            <Tarjeta relleno={false}>
              <EstadoVacio
                icono="clientes"
                titulo={panel.clientes.length === 0 ? 'Todavía no hay clientes cargados' : 'Ningún cliente coincide'}
                texto={
                  panel.clientes.length === 0
                    ? 'Asigná el propietario de cada propiedad y los inquilinos de las alquiladas, y van a aparecer acá.'
                    : 'Probá con otra búsqueda o cambiá el filtro.'
                }
                accion={panel.clientes.length === 0 ? <Boton variante="principal" onClick={() => abrirAsignar()}>Asignar a una propiedad</Boton> : undefined}
              />
            </Tarjeta>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-4 p-0">
              {visibles.map((cliente) => (
                <li key={cliente.id}>
                  <Tarjeta>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-panel-acento-suave text-sm font-semibold text-panel-acento">
                          {iniciales(cliente.nombre)}
                        </span>
                        <div className="flex min-w-0 flex-col gap-1">
                          <h3 className="m-0 flex flex-wrap items-center gap-2 text-[16px] font-semibold">
                            {cliente.nombre || 'Sin nombre'}
                            {cliente.propietarioDe.length > 0 && <Insignia tono="acento">Propietario</Insignia>}
                            {cliente.alquilaEn.length > 0 && <Insignia tono="info">Inquilino</Insignia>}
                            {cliente.registrado ? <Insignia tono="exito">Con cuenta</Insignia> : <Insignia>Sin cuenta</Insignia>}
                          </h3>
                          <p className="m-0 flex flex-wrap gap-x-4 gap-y-0.5 text-[13px] text-panel-suave">
                            {cliente.email && (
                              <a href={`mailto:${cliente.email}`} className="break-all hover:text-panel-texto hover:underline">
                                {cliente.email}
                              </a>
                            )}
                            {cliente.telefono && (
                              <a href={`tel:${cliente.telefono}`} className="hover:text-panel-texto hover:underline">
                                {cliente.telefono}
                              </a>
                            )}
                            {!cliente.email && !cliente.telefono && <span>Sin datos de contacto</span>}
                          </p>
                        </div>
                      </div>
                      <Boton tamano="sm" icono="mas" onClick={() => abrirAsignar(cliente, cliente.alquilaEn.length && !cliente.propietarioDe.length ? 'inquilino' : 'propietario')}>
                        Asignar otra propiedad
                      </Boton>
                    </div>

                    {cliente.propietarioDe.length > 0 && (
                      <div className="mt-5 border-t border-panel-borde pt-4">
                        <h4 className="m-0 mb-3 text-[12.5px] font-semibold uppercase tracking-wide text-panel-suave">Propietario de</h4>
                        <ul className="m-0 flex list-none flex-col divide-y divide-panel-borde p-0">
                          {cliente.propietarioDe.map((p) => (
                            <FilaPropiedad key={p.id} propiedad={p} rol="propietario" onQuitar={() => quitar(p, 'propietario')} />
                          ))}
                        </ul>
                      </div>
                    )}

                    {cliente.alquilaEn.length > 0 && (
                      <div className="mt-5 border-t border-panel-borde pt-4">
                        <h4 className="m-0 mb-3 text-[12.5px] font-semibold uppercase tracking-wide text-panel-suave">Alquila</h4>
                        <ul className="m-0 flex list-none flex-col divide-y divide-panel-borde p-0">
                          {cliente.alquilaEn.map((p) => (
                            <FilaPropiedad key={p.id} propiedad={p} rol="inquilino" onQuitar={() => quitar(p, 'inquilino')} />
                          ))}
                        </ul>
                      </div>
                    )}
                  </Tarjeta>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Dialogo
        abierto={dialogo !== null}
        alCerrar={() => setDialogo(null)}
        titulo="Asignar a una propiedad"
        descripcion="Elegí la propiedad y quién es: su dueño o quien la alquila. Si cargás un inquilino, la propiedad pasa a figurar como Alquilada."
        ancho="lg"
        acciones={
          <>
            <Boton onClick={() => setDialogo(null)}>Cancelar</Boton>
            <Boton variante="principal" icono="check" onClick={guardar} cargando={guardando}>
              Guardar
            </Boton>
          </>
        }
      >
        {dialogo && (
          <div className="flex flex-col gap-4">
            <Campo etiqueta="Propiedad" htmlFor="asignar-propiedad">
              <select id="asignar-propiedad" value={dialogo.propiedadId} onChange={(e) => cambiar({ propiedadId: e.target.value })} className={control}>
                <option value="">Elegí una propiedad</option>
                {propiedadesElegibles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.titulo}
                    {p.direccion ? ` · ${p.direccion}` : ''}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo etiqueta="Es su…" htmlFor="asignar-rol">
              <select id="asignar-rol" value={dialogo.rol} onChange={(e) => cambiar({ rol: e.target.value as RolCliente })} className={control}>
                <option value="propietario">Propietario (dueño)</option>
                <option value="inquilino">Inquilino (la alquila)</option>
              </select>
            </Campo>

            <div role="group" aria-label="Quién es" className="flex gap-1.5">
              <Boton tamano="sm" variante={dialogo.modo === 'registrado' ? 'principal' : 'secundario'} aria-pressed={dialogo.modo === 'registrado'} onClick={() => cambiar({ modo: 'registrado' })}>
                Cliente registrado
              </Boton>
              <Boton tamano="sm" variante={dialogo.modo === 'manual' ? 'principal' : 'secundario'} aria-pressed={dialogo.modo === 'manual'} onClick={() => cambiar({ modo: 'manual' })}>
                Otra persona
              </Boton>
            </div>

            {dialogo.modo === 'registrado' ? (
              <Campo etiqueta="Cliente" htmlFor="asignar-usuario" ayuda="Son las personas que crearon una cuenta en el sitio.">
                <select id="asignar-usuario" value={dialogo.usuarioId} onChange={(e) => cambiar({ usuarioId: e.target.value })} className={control}>
                  <option value="">Elegí un cliente</option>
                  {panel?.usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre} · {u.email}
                    </option>
                  ))}
                </select>
              </Campo>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo etiqueta="Nombre y apellido" htmlFor="asignar-nombre" className="sm:col-span-2">
                  <input id="asignar-nombre" value={dialogo.nombre} onChange={(e) => cambiar({ nombre: e.target.value })} className={control} autoComplete="off" />
                </Campo>
                <Campo etiqueta="Email (opcional)" htmlFor="asignar-email">
                  <input id="asignar-email" type="email" value={dialogo.email} onChange={(e) => cambiar({ email: e.target.value })} className={control} autoComplete="off" />
                </Campo>
                <Campo etiqueta="Teléfono (opcional)" htmlFor="asignar-telefono">
                  <input id="asignar-telefono" type="tel" value={dialogo.telefono} onChange={(e) => cambiar({ telefono: e.target.value })} className={control} autoComplete="off" />
                </Campo>
              </div>
            )}

            {errorForm && (
              <p role="alert" className="m-0 text-[13.5px] text-red-600 dark:text-red-400">
                {errorForm}
              </p>
            )}
          </div>
        )}
      </Dialogo>

      {dialogoConfirmar}
      {aviso}
    </>
  );
}

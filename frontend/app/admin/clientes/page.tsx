'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Alerta, Boton, Campo, Dialogo, Encabezado, Esqueleto, EstadoVacio, Insignia, Tarjeta, control, useAviso, useConfirmar } from '@/components/panel/ui';
import Icono, { type NombreIcono } from '@/components/panel/Icono';
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

// Clientes del panel: dueños de las propiedades, inquilinos y las cuentas creadas en el sitio.
// Rediseño de la página de Pato con el mismo estilo que Visitas y Contratos; la lógica es la suya.

type Pestana = 'todos' | 'propietarios' | 'inquilinos' | 'cuentas';

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const iniciales = (nombre: string) =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('') || '?';

// WhatsApp con el número argentino armado (549 + característica sin el 0)
const enlaceWhatsApp = (telefono: string, nombre: string) => {
  let numero = telefono.replace(/\D/g, '');
  if (!numero) return null;
  if (!numero.startsWith('54')) numero = `549${numero.replace(/^0/, '')}`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(`Hola ${nombre.split(' ')[0] || ''}, te escribimos de Negocios Inmobiliarios.`)}`;
};

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

// Botón redondo de acción rápida (WhatsApp, email, asignar)
function Accion({ icono, texto, href, onClick, externo }: { icono: NombreIcono; texto: string; href?: string | null; onClick?: () => void; externo?: boolean }) {
  const clase = 'flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-panel-tenue transition-colors hover:bg-panel-hundido hover:text-panel-texto';
  if (href) {
    return (
      <a href={href} title={texto} aria-label={texto} className={clase} {...(externo ? { target: '_blank', rel: 'noreferrer' } : {})}>
        <Icono nombre={icono} className="h-[18px] w-[18px]" />
      </a>
    );
  }
  return (
    <button type="button" title={texto} aria-label={texto} onClick={onClick} className={clase}>
      <Icono nombre={icono} className="h-[18px] w-[18px]" />
    </button>
  );
}

function Avatar({ nombre, grande }: { nombre: string; grande?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-panel-acento-suave font-semibold text-panel-acento ${grande ? 'h-11 w-11 text-sm' : 'h-9 w-9 text-[13px]'}`}
    >
      {iniciales(nombre)}
    </span>
  );
}

// Una propiedad dentro de la ficha del cliente: foto, título, rol, estado y (si es dueño) quién la alquila
function PropiedadVinculada({ propiedad, rol, onQuitar }: { propiedad: PropiedadDeCliente; rol: RolCliente; onQuitar: () => void }) {
  const estado = estadoDe(ESTADO_PROPIEDAD, propiedad.estado);
  return (
    <li className="flex items-center gap-3 rounded-lg border border-panel-borde bg-panel-fondo/40 p-2 pr-1">
      <span className="h-11 w-14 shrink-0 overflow-hidden rounded-md bg-panel-hundido">
        {propiedad.imagen ? (
          // eslint-disable-next-line @next/next/no-img-element -- fotos de Cloudinary/Unsplash, sin optimizar
          <img src={propiedad.imagen} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-panel-tenue">
            <Icono nombre="imagen" className="h-4 w-4" />
          </span>
        )}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-1.5">
          <Link href={`/propiedades/${propiedad.id}`} target="_blank" className="truncate text-[13.5px] font-medium hover:underline">
            {propiedad.titulo}
          </Link>
        </span>
        <span className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-panel-suave">
          <span className={`font-medium ${rol === 'propietario' ? 'text-panel-acento' : 'text-sky-700 dark:text-sky-300'}`}>{rol === 'propietario' ? 'Dueño' : 'Alquila'}</span>
          <span aria-hidden="true">·</span>
          <Insignia tono={estado.tono}>{estado.texto}</Insignia>
          {propiedad.origen === 'contrato' && <Insignia tono="neutro">Según contrato</Insignia>}
        </span>
        {rol === 'propietario' && propiedad.inquilino && (
          <span className="truncate text-[12.5px] text-panel-suave">
            Inquilino: <span className="text-panel-texto">{propiedad.inquilino.nombre}</span>
            {propiedad.inquilino.telefono && ` · ${propiedad.inquilino.telefono}`}
          </span>
        )}
      </div>
      {propiedad.origen !== 'contrato' && (
        <button
          type="button"
          onClick={onQuitar}
          title={rol === 'propietario' ? 'Quitar como dueño' : 'Quitar como inquilino'}
          aria-label={`Quitar de ${propiedad.titulo}`}
          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-panel-tenue transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
        >
          <Icono nombre="cerrar" className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}

export default function ClientesPage() {
  const [panel, setPanel] = useState<PanelClientes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [pestana, setPestana] = useState<Pestana>('todos');
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

  const texto = busqueda.trim().toLowerCase();

  const clientesVisibles = useMemo(() => {
    if (!panel) return [];
    return panel.clientes.filter((c) => {
      if (pestana === 'propietarios' && !c.propietarioDe.length) return false;
      if (pestana === 'inquilinos' && !c.alquilaEn.length) return false;
      if (!texto) return true;
      const propiedades = [...c.propietarioDe, ...c.alquilaEn].map((p) => p.titulo).join(' ');
      return `${c.nombre} ${c.email} ${c.telefono} ${propiedades}`.toLowerCase().includes(texto);
    });
  }, [panel, pestana, texto]);

  // Todas las cuentas creadas en el sitio, con lo que cada una tiene vinculado
  const cuentasVisibles = useMemo(() => {
    if (!panel) return [];
    const vinculados = new Map(panel.clientes.filter((c) => c.usuarioId).map((c) => [c.usuarioId as string, c]));
    return panel.usuarios
      .map((u) => ({ ...u, vinculo: vinculados.get(u.id) }))
      .filter((u) => !texto || `${u.nombre} ${u.email} ${u.telefono}`.toLowerCase().includes(texto));
  }, [panel, texto]);

  // Nombre del dueño de cada propiedad (para avisar en el formulario a quién se reemplaza)
  const nombrePorClave = useMemo(() => new Map((panel?.clientes ?? []).map((c) => [c.id, c.nombre])), [panel]);

  const cuenta = {
    todos: panel?.clientes.length ?? 0,
    propietarios: panel?.resumen.propietarios ?? 0,
    inquilinos: panel?.resumen.inquilinos ?? 0,
    cuentas: panel?.resumen.cuentas ?? 0,
  };

  const PESTANAS: { id: Pestana; texto: string }[] = [
    { id: 'todos', texto: 'Todos' },
    { id: 'propietarios', texto: 'Propietarios' },
    { id: 'inquilinos', texto: 'Inquilinos' },
    { id: 'cuentas', texto: 'Cuentas del sitio' },
  ];

  const abrirAsignar = (inicial: Partial<Formulario> = {}) => {
    setErrorForm(null);
    setDialogo({ ...FORMULARIO_VACIO, ...inicial });
  };

  const abrirParaCliente = (cliente: ClientePanel) =>
    abrirAsignar({
      rol: cliente.alquilaEn.length && !cliente.propietarioDe.length ? 'inquilino' : 'propietario',
      ...(cliente.usuarioId
        ? { modo: 'registrado' as const, usuarioId: cliente.usuarioId }
        : { modo: 'manual' as const, nombre: cliente.nombre, email: cliente.email, telefono: cliente.telefono }),
    });

  const cambiar = (cambios: Partial<Formulario>) => {
    setDialogo((actual) => (actual ? { ...actual, ...cambios } : actual));
    setErrorForm(null);
  };

  const propiedadElegida = panel?.propiedades.find((p) => p.id === dialogo?.propiedadId);
  // Un inquilino necesita que la propiedad tenga dueño cargado (lo exige el servidor).
  // Si estaba vendida igual se puede: el dueño se la alquila a alguien y pasa a figurar como alquilada.
  const motivoSinInquilino = !propiedadElegida
    ? null
    : !propiedadElegida.propietario
      ? 'Primero cargá el dueño de esta propiedad.'
      : null;

  const guardar = async () => {
    if (!dialogo) return;
    if (!dialogo.propiedadId) return setErrorForm('Elegí la propiedad.');
    if (dialogo.rol === 'inquilino' && motivoSinInquilino) return setErrorForm(motivoSinInquilino);
    let persona: PersonaAsignada;
    if (dialogo.modo === 'registrado') {
      if (!dialogo.usuarioId) return setErrorForm('Elegí la cuenta del cliente.');
      persona = { usuarioId: dialogo.usuarioId };
    } else {
      if (!dialogo.nombre.trim()) return setErrorForm('Escribí el nombre.');
      if (dialogo.email.trim() && !EMAIL_VALIDO.test(dialogo.email.trim())) return setErrorForm('El email no es válido.');
      if (!dialogo.email.trim() && !dialogo.telefono.trim()) return setErrorForm('Cargá al menos un teléfono o un email para poder contactarlo.');
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
        const continuar = await confirmar(`¿Cambiar ${dialogo.rol === 'propietario' ? 'el dueño' : 'el inquilino'}?`, {
          texto: `Esta propiedad ya tiene ${dialogo.rol === 'propietario' ? 'dueño' : 'inquilino'}${err.actual ? `: ${err.actual}` : ''}. Si seguís, deja de figurar y lo reemplaza la persona nueva.`,
          accion: 'Reemplazar',
        });
        if (!continuar) return;
        resultado = await asignarPersona(dialogo.propiedadId, dialogo.rol, persona, true);
      }
      setDialogo(null);
      mostrar(
        dialogo.rol === 'propietario'
          ? 'Dueño guardado.'
          : resultado.estado === 'alquilado'
            ? 'Inquilino guardado. La propiedad ahora figura como Alquilada.'
            : 'Inquilino guardado.',
      );
      await cargar();
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  const quitar = async (propiedad: PropiedadDeCliente, rol: RolCliente) => {
    const ok = await confirmar(`¿Quitar ${rol === 'propietario' ? 'al dueño' : 'al inquilino'}?`, {
      texto:
        rol === 'inquilino'
          ? `Se desvincula de "${propiedad.titulo}" y la propiedad vuelve a figurar como Disponible. La persona no se borra.`
          : `Se desvincula de "${propiedad.titulo}". La persona no se borra.`,
      accion: 'Quitar',
    });
    if (!ok) return;
    try {
      await asignarPersona(propiedad.id, rol, null);
      mostrar('Listo, se quitó.');
      await cargar();
    } catch (err) {
      mostrar(err instanceof Error ? err.message : 'No se pudo quitar', 'peligro');
    }
  };

  const reintentar = () => {
    setCargando(true);
    setError(null);
    cargar();
  };

  // Propiedades para el formulario: primero las que no tienen dueño (lo más útil de cargar)
  const sinDueno = (panel?.propiedades ?? []).filter((p) => !p.propietario);
  const conDueno = (panel?.propiedades ?? []).filter((p) => p.propietario);

  return (
    <>
      <Encabezado
        titulo="Clientes"
        descripcion="Dueños de las propiedades, inquilinos y las cuentas creadas en el sitio."
        acciones={
          <Boton variante="principal" icono="mas" onClick={() => abrirAsignar()} disabled={!panel}>
            Asignar a una propiedad
          </Boton>
        }
      />

      {error && (
        <div className="mb-6">
          <Alerta tono="peligro" titulo="No pudimos cargar los clientes" accion={<Boton tamano="sm" onClick={reintentar}>Reintentar</Boton>}>
            {error}
          </Alerta>
        </div>
      )}

      {cargando && !error && (
        <div className="flex flex-col gap-4" aria-busy="true">
          <Esqueleto className="h-24 w-full" />
          <Esqueleto className="h-10 w-full" />
          <Esqueleto className="h-64 w-full" />
        </div>
      )}

      {panel && (
        <div className="flex flex-col gap-5">
          {/* Resumen: cada número lleva a su pestaña; "sin dueño" abre el formulario */}
          <section aria-label="Resumen" className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-panel-borde bg-panel-borde lg:grid-cols-4">
            {[
              { texto: 'Dueños', valor: panel.resumen.propietarios, detalle: 'con propiedades cargadas', alTocar: () => setPestana('propietarios') },
              { texto: 'Inquilinos', valor: panel.resumen.inquilinos, detalle: 'alquilando ahora', alTocar: () => setPestana('inquilinos') },
              { texto: 'Cuentas del sitio', valor: panel.resumen.cuentas, detalle: `${panel.resumen.registrados} vinculadas a propiedades`, alTocar: () => setPestana('cuentas') },
              {
                texto: 'Propiedades sin dueño',
                valor: panel.resumen.propiedadesSinPropietario,
                detalle: panel.resumen.propiedadesSinPropietario ? 'Tocá para cargarlo' : 'Todas tienen dueño',
                alTocar: () => abrirAsignar({ propiedadId: sinDueno[0]?.id ?? '' }),
                alerta: panel.resumen.propiedadesSinPropietario > 0,
              },
            ].map((dato) => (
              <button key={dato.texto} type="button" onClick={dato.alTocar} className="group flex cursor-pointer flex-col gap-1 bg-panel-superficie px-5 py-4 text-left transition-colors hover:bg-panel-hundido">
                <span className="flex items-center justify-between text-[13px] text-panel-suave">
                  {dato.texto}
                  <Icono nombre="flecha" className="h-4 w-4 text-panel-tenue opacity-0 transition-opacity group-hover:opacity-100" />
                </span>
                <span className={`tabular text-[28px] font-semibold leading-tight ${dato.alerta ? 'text-amber-700 dark:text-amber-300' : ''}`}>{dato.valor}</span>
                <span className="text-[13px] text-panel-tenue">{dato.detalle}</span>
              </button>
            ))}
          </section>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div role="tablist" aria-label="Qué clientes ver" className="flex shrink-0 gap-1 overflow-x-auto rounded-lg bg-panel-hundido p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {PESTANAS.map((p) => {
                const activa = pestana === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="tab"
                    aria-selected={activa}
                    onClick={() => setPestana(p.id)}
                    className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-[13.5px] transition-colors ${activa ? 'bg-panel-superficie font-medium shadow-sm ring-1 ring-panel-borde' : 'text-panel-suave hover:text-panel-texto'}`}
                  >
                    {p.texto}
                    <span className="tabular rounded px-1.5 text-[12px] text-panel-tenue">{cuenta[p.id]}</span>
                  </button>
                );
              })}
            </div>
            <label className="relative lg:w-80">
              <span className="sr-only">Buscar</span>
              <Icono nombre="buscar" className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-panel-tenue" />
              <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre, email, teléfono o propiedad" className={`${control} pl-10`} />
            </label>
          </div>

          {pestana === 'cuentas' ? (
            <Tarjeta relleno={false}>
              {cuentasVisibles.length === 0 ? (
                <EstadoVacio
                  icono="clientes"
                  titulo={panel.usuarios.length ? 'Ninguna cuenta coincide' : 'Todavía nadie creó una cuenta'}
                  texto={panel.usuarios.length ? 'Probá con otra búsqueda.' : 'Cuando un cliente se registre en el sitio va a aparecer acá.'}
                />
              ) : (
                <ul className="m-0 flex list-none flex-col divide-y divide-panel-borde p-0">
                  {cuentasVisibles.map((u) => (
                    <li key={u.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <Avatar nombre={u.nombre} />
                        <div className="flex min-w-0 flex-col">
                          <p className="m-0 flex flex-wrap items-center gap-2 text-[14px] font-medium">
                            {u.nombre}
                            {u.vinculo?.propietarioDe.length ? <Insignia tono="acento">Dueño</Insignia> : null}
                            {u.vinculo?.alquilaEn.length ? <Insignia tono="info">Inquilino</Insignia> : null}
                            {!u.emailVerificado && <Insignia tono="aviso">Email sin confirmar</Insignia>}
                          </p>
                          <p className="m-0 flex flex-wrap gap-x-3 text-[13px] text-panel-suave">
                            <span className="break-all">{u.email}</span>
                            {u.telefono && <span className="tabular">{u.telefono}</span>}
                            {u.creadoEn && <span className="text-panel-tenue">Se registró el {new Date(u.creadoEn).toLocaleDateString('es-AR')}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <Accion icono="telefono" texto="Escribir por WhatsApp" href={enlaceWhatsApp(u.telefono, u.nombre)} externo />
                        <Accion icono="email" texto="Mandar un email" href={`mailto:${u.email}`} />
                        <Boton tamano="sm" icono="mas" className="ml-2" onClick={() => abrirAsignar({ modo: 'registrado', usuarioId: u.id })}>
                          Vincular
                        </Boton>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Tarjeta>
          ) : (
            <Tarjeta relleno={false}>
              {clientesVisibles.length === 0 ? (
                <EstadoVacio
                  icono="clientes"
                  titulo={panel.clientes.length === 0 ? 'Todavía no hay clientes cargados' : 'Ningún cliente coincide'}
                  texto={
                    panel.clientes.length === 0
                      ? 'Cargá el dueño de cada propiedad y los inquilinos de las alquiladas, y van a aparecer acá con sus datos de contacto.'
                      : 'Probá con otra búsqueda o cambiá de pestaña.'
                  }
                  accion={
                    panel.clientes.length === 0 ? (
                      <Boton variante="principal" icono="mas" onClick={() => abrirAsignar({ propiedadId: sinDueno[0]?.id ?? '' })}>
                        Cargar el primer dueño
                      </Boton>
                    ) : undefined
                  }
                />
              ) : (
                <ul className="m-0 flex list-none flex-col divide-y divide-panel-borde p-0">
                  {clientesVisibles.map((cliente) => {
                    const propiedades = [
                      ...cliente.propietarioDe.map((p) => ({ p, rol: 'propietario' as const })),
                      ...cliente.alquilaEn.map((p) => ({ p, rol: 'inquilino' as const })),
                    ];
                    return (
                      <li key={cliente.id} className="flex flex-col gap-3 px-5 py-4">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <Avatar nombre={cliente.nombre} grande />
                            <div className="flex min-w-0 flex-col gap-0.5">
                              <p className="m-0 flex flex-wrap items-center gap-2 text-[15px] font-semibold">
                                {cliente.nombre || 'Sin nombre'}
                                {cliente.propietarioDe.length > 0 && <Insignia tono="acento">Dueño</Insignia>}
                                {cliente.alquilaEn.length > 0 && <Insignia tono="info">Inquilino</Insignia>}
                                {cliente.registrado ? <Insignia tono="exito">Con cuenta</Insignia> : <Insignia>Sin cuenta</Insignia>}
                              </p>
                              <p className="m-0 flex flex-wrap gap-x-3 text-[13px] text-panel-suave">
                                {cliente.email && <span className="break-all">{cliente.email}</span>}
                                {cliente.telefono && <span className="tabular">{cliente.telefono}</span>}
                                {!cliente.email && !cliente.telefono && <span className="text-amber-700 dark:text-amber-300">Sin datos de contacto</span>}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <Accion icono="telefono" texto="Escribir por WhatsApp" href={cliente.telefono ? enlaceWhatsApp(cliente.telefono, cliente.nombre) : null} externo />
                            {cliente.email && <Accion icono="email" texto="Mandar un email" href={`mailto:${cliente.email}`} />}
                            <Accion icono="mas" texto="Vincular a otra propiedad" onClick={() => abrirParaCliente(cliente)} />
                          </div>
                        </div>
                        {propiedades.length > 0 && (
                          <ul className="m-0 grid list-none gap-2 p-0 sm:pl-14 md:grid-cols-2">
                            {propiedades.map(({ p, rol }) => (
                              <PropiedadVinculada key={`${rol}-${p.id}`} propiedad={p} rol={rol} onQuitar={() => quitar(p, rol)} />
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Tarjeta>
          )}
        </div>
      )}

      <Dialogo
        abierto={dialogo !== null}
        alCerrar={() => setDialogo(null)}
        titulo="Asignar a una propiedad"
        descripcion="Elegí la propiedad, si es su dueño o quien la alquila, y quién es."
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
          <div className="flex flex-col gap-5">
            <Campo
              etiqueta="Propiedad *"
              htmlFor="asignar-propiedad"
              ayuda={
                propiedadElegida?.propietario
                  ? `Dueño actual: ${nombrePorClave.get(propiedadElegida.propietario) || 'cargado'}${propiedadElegida.inquilino ? ` · Inquilino: ${nombrePorClave.get(propiedadElegida.inquilino) || 'cargado'}` : ''}`
                  : propiedadElegida
                    ? 'Todavía no tiene dueño cargado.'
                    : undefined
              }
            >
              <select id="asignar-propiedad" value={dialogo.propiedadId} onChange={(e) => cambiar({ propiedadId: e.target.value })} className={control}>
                <option value="">Elegí una propiedad</option>
                {sinDueno.length > 0 && (
                  <optgroup label="Sin dueño cargado">
                    {sinDueno.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.titulo}
                      </option>
                    ))}
                  </optgroup>
                )}
                {conDueno.length > 0 && (
                  <optgroup label="Con dueño">
                    {conDueno.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.titulo} · {nombrePorClave.get(p.propietario as string) || 'con dueño'}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </Campo>

            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
              <legend className="mb-2 text-[13px] font-medium">Es su…</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    { valor: 'propietario', titulo: 'Dueño', texto: 'Es el propietario', deshabilitado: null },
                    { valor: 'inquilino', titulo: 'Inquilino', texto: 'La alquila; pasa a figurar Alquilada', deshabilitado: motivoSinInquilino },
                  ] as const
                ).map((opcion) => {
                  const elegida = dialogo.rol === opcion.valor;
                  return (
                    <button
                      key={opcion.valor}
                      type="button"
                      aria-pressed={elegida}
                      disabled={Boolean(opcion.deshabilitado)}
                      onClick={() => cambiar({ rol: opcion.valor })}
                      className={`flex cursor-pointer flex-col gap-0.5 rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        elegida ? 'border-panel-acento bg-panel-acento-suave' : 'border-panel-borde hover:bg-panel-hundido'
                      }`}
                    >
                      <span className="text-[14px] font-medium">{opcion.titulo}</span>
                      <span className="text-[12.5px] text-panel-suave">{opcion.deshabilitado || opcion.texto}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
              <legend className="mb-2 text-[13px] font-medium">¿Quién es?</legend>
              <div role="tablist" aria-label="Quién es" className="flex w-fit gap-1 rounded-lg bg-panel-hundido p-1">
                {(
                  [
                    { valor: 'registrado', texto: 'Tiene cuenta en el sitio' },
                    { valor: 'manual', texto: 'No tiene cuenta' },
                  ] as const
                ).map((opcion) => (
                  <button
                    key={opcion.valor}
                    type="button"
                    role="tab"
                    aria-selected={dialogo.modo === opcion.valor}
                    onClick={() => cambiar({ modo: opcion.valor })}
                    className={`cursor-pointer rounded-md px-3 py-1.5 text-[13px] transition-colors ${dialogo.modo === opcion.valor ? 'bg-panel-superficie font-medium shadow-sm ring-1 ring-panel-borde' : 'text-panel-suave hover:text-panel-texto'}`}
                  >
                    {opcion.texto}
                  </button>
                ))}
              </div>

              {dialogo.modo === 'registrado' ? (
                panel?.usuarios.length ? (
                  <Campo etiqueta="Cuenta del cliente *" htmlFor="asignar-usuario">
                    <select id="asignar-usuario" value={dialogo.usuarioId} onChange={(e) => cambiar({ usuarioId: e.target.value })} className={control}>
                      <option value="">Elegí una cuenta</option>
                      {panel.usuarios.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nombre} · {u.email}
                        </option>
                      ))}
                    </select>
                  </Campo>
                ) : (
                  <p className="m-0 text-[13.5px] text-panel-suave">Todavía nadie creó una cuenta en el sitio. Elegí «No tiene cuenta» y cargá sus datos.</p>
                )
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Campo etiqueta="Nombre y apellido *" htmlFor="asignar-nombre" className="sm:col-span-2">
                    <input id="asignar-nombre" value={dialogo.nombre} onChange={(e) => cambiar({ nombre: e.target.value })} className={control} autoComplete="off" />
                  </Campo>
                  <Campo etiqueta="Teléfono" htmlFor="asignar-telefono" ayuda="Para escribirle por WhatsApp.">
                    <input id="asignar-telefono" type="tel" value={dialogo.telefono} onChange={(e) => cambiar({ telefono: e.target.value })} placeholder="Ej.: 343 444 4444" className={control} autoComplete="off" />
                  </Campo>
                  <Campo etiqueta="Email" htmlFor="asignar-email">
                    <input id="asignar-email" type="email" value={dialogo.email} onChange={(e) => cambiar({ email: e.target.value })} className={control} autoComplete="off" />
                  </Campo>
                </div>
              )}
            </fieldset>

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

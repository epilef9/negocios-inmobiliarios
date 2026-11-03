'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Encabezado,
  Boton,
  Dialogo,
  Insignia,
  Campo,
  EstadoVacio,
  Esqueleto,
  Alerta,
  control,
  useAviso,
  useConfirmar,
} from '@/components/panel/ui';
import Icono, { type NombreIcono } from '@/components/panel/Icono';
import {
  getSolicitudesPublicacionAdmin,
  aprobarSolicitudPublicacion,
  rechazarSolicitudPublicacion,
  type SolicitudPublicacion,
  type EstadoSolicitudPublicacion,
  urlDocumentoPublicacion,
} from '@/services/solicitudesPublicacion';

type FiltroEstado = 'todas' | EstadoSolicitudPublicacion;

const NOMBRE_TIPO: Record<string, string> = {
  casa: 'Casa',
  departamento: 'Departamento',
  terreno: 'Terreno / Lote',
  local: 'Local comercial',
  monoambiente: 'Monoambiente',
  oficina: 'Oficina',
  cochera: 'Cochera',
  otro: 'Otro',
};
const NOMBRE_OPERACION: Record<string, string> = {
  venta: 'Venta',
  alquiler: 'Alquiler',
  temporario: 'Alquiler temporario',
};
const NOMBRE_ESTADO: Record<EstadoSolicitudPublicacion, string> = {
  pendiente: 'Pendiente',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
};
const NOMBRE_COMODIDAD: Record<string, string> = {
  patio: 'Patio',
  parque: 'Parque',
  quincho: 'Quincho',
  pileta: 'Pileta',
  lavadero: 'Lavadero',
  balcon: 'Balcón',
  amoblado: 'Amoblado',
  aire_acondicionado: 'Aire acondicionado',
};
const DOCUMENTOS = [
  { clave: 'dni', nombre: 'DNI del propietario', obligatorio: true },
  { clave: 'escritura', nombre: 'Escritura o título', obligatorio: true },
  { clave: 'impuestos', nombre: 'Impuestos y servicios', obligatorio: true },
  { clave: 'planos', nombre: 'Planos', obligatorio: false },
  { clave: 'reglamento', nombre: 'Reglamento de copropiedad', obligatorio: false },
] as const;
const FILTROS: { id: FiltroEstado; nombre: string }[] = [
  { id: 'pendiente', nombre: 'Pendientes' },
  { id: 'aprobada', nombre: 'Aprobadas' },
  { id: 'rechazada', nombre: 'Rechazadas' },
  { id: 'todas', nombre: 'Todas' },
];

const tonoEstado = (estado: EstadoSolicitudPublicacion): 'aviso' | 'exito' | 'peligro' =>
  estado === 'aprobada' ? 'exito' : estado === 'rechazada' ? 'peligro' : 'aviso';

const precio = (sol: SolicitudPublicacion) =>
  `${sol.precioPretendido?.moneda === 'ARS' ? '$' : 'USD'} ${sol.precioPretendido?.monto?.toLocaleString('es-AR') ?? '-'}`;

const nombreCliente = (sol: SolicitudPublicacion) => {
  const cliente = typeof sol.cliente === 'object' ? sol.cliente : null;
  const nombre = `${sol.contacto?.nombre || cliente?.nombre || ''} ${sol.contacto?.apellido || cliente?.apellido || ''}`.trim();
  return nombre || 'Cliente sin nombre';
};

const idPropiedad = (sol: SolicitudPublicacion) =>
  sol.propiedadCreada ? (typeof sol.propiedadCreada === 'object' ? sol.propiedadCreada._id : sol.propiedadCreada) : null;

const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });

// Foto chica con reemplazo si no hay o no carga (evita el ícono de imagen rota)
function Miniatura({ src, className = 'h-12 w-16' }: { src?: string; className?: string }) {
  const [rota, setRota] = useState(false);
  if (!src || rota) {
    return (
      <span className={`flex shrink-0 items-center justify-center rounded-md bg-panel-hundido text-panel-tenue ${className}`} title="Sin foto">
        <Icono nombre="imagen" className="h-5 w-5" />
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- fotos subidas por el cliente (backend o Cloudinary)
  return <img src={src} alt="" loading="lazy" onError={() => setRota(true)} className={`shrink-0 rounded-md object-cover ${className}`} />;
}

// Bloque de la columna lateral del detalle: título chico y filas compactas
function Bloque({ titulo, extra, children }: { titulo: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-panel-borde">
      <div className="flex items-center justify-between gap-2 border-b border-panel-borde bg-panel-hundido/60 px-3.5 py-2">
        <h3 className="m-0 text-[12px] font-semibold uppercase tracking-wider text-panel-suave">{titulo}</h3>
        {extra}
      </div>
      {children}
    </section>
  );
}

function Linea({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-3.5 py-2 text-[13px]">
      <dt className="shrink-0 text-panel-suave">{etiqueta}</dt>
      <dd className="m-0 min-w-0 break-words text-right text-panel-texto">{children}</dd>
    </div>
  );
}

function Dato({ icono, etiqueta, valor }: { icono: NombreIcono; etiqueta: string; valor: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-r border-panel-borde px-3 py-2.5">
      <Icono nombre={icono} className="h-4 w-4 shrink-0 text-panel-tenue" />
      <div className="min-w-0">
        <p className="m-0 text-[11.5px] leading-tight text-panel-suave">{etiqueta}</p>
        <p className="m-0 truncate text-[14px] font-medium leading-snug">{valor}</p>
      </div>
    </div>
  );
}

export default function AdminPublicacionesPage() {
  const router = useRouter();
  const { mostrar, aviso } = useAviso();
  const { confirmar, dialogoConfirmar } = useConfirmar();
  const [solicitudes, setSolicitudes] = useState<SolicitudPublicacion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroEstado>('pendiente');
  const [filtroElegido, setFiltroElegido] = useState(false);

  const [solicitudDetalle, setSolicitudDetalle] = useState<SolicitudPublicacion | null>(null);
  const [fotoGrande, setFotoGrande] = useState<number | null>(null);

  const [solicitudARechazar, setSolicitudARechazar] = useState<SolicitudPublicacion | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [rechazando, setRechazando] = useState(false);
  const [errorRechazo, setErrorRechazo] = useState<string | null>(null);

  const [aprobandoId, setAprobandoId] = useState<string | null>(null);

  // Se traen todas una vez y se filtra acá, así cada pestaña muestra su cantidad
  const cargar = useCallback(async () => {
    setError(null);
    try {
      setSolicitudes(await getSolicitudesPublicacionAdmin('todas'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las solicitudes.');
      setSolicitudes([]);
    }
  }, []);

  useEffect(() => {
    const temporizador = window.setTimeout(() => void cargar(), 0);
    return () => window.clearTimeout(temporizador);
  }, [cargar]);

  const cantidades = useMemo(() => {
    const lista = solicitudes ?? [];
    return {
      todas: lista.length,
      pendiente: lista.filter((s) => s.estado === 'pendiente').length,
      aprobada: lista.filter((s) => s.estado === 'aprobada').length,
      rechazada: lista.filter((s) => s.estado === 'rechazada').length,
    } satisfies Record<FiltroEstado, number>;
  }, [solicitudes]);

  // Si no hay pendientes, arranca mostrando todas (hasta que se elija una pestaña a mano)
  const filtroActivo: FiltroEstado = !filtroElegido && solicitudes && cantidades.pendiente === 0 ? 'todas' : filtro;
  const visibles = (solicitudes ?? []).filter((s) => filtroActivo === 'todas' || s.estado === filtroActivo);

  const handleAprobar = async (sol: SolicitudPublicacion) => {
    const ok = await confirmar(`¿Aprobar la publicación de ${sol.direccion}?`, {
      texto: `Se crea la propiedad en el catálogo con ${nombreCliente(sol)} como dueño y después podés terminar de editarla.`,
      accion: 'Aprobar y crear',
      variante: 'principal',
    });
    if (!ok) return;
    setAprobandoId(sol._id);
    try {
      const { propiedadId } = await aprobarSolicitudPublicacion(sol._id);
      // Se sigue en la edición de la propiedad creada (HU-26)
      router.push(`/admin/propiedades/${propiedadId}/editar`);
    } catch (err) {
      mostrar(err instanceof Error ? err.message : 'No se pudo aprobar la solicitud.', 'peligro');
      setAprobandoId(null);
    }
  };

  const abrirRechazo = (sol: SolicitudPublicacion) => {
    setSolicitudARechazar(sol);
    setMotivoRechazo('');
    setErrorRechazo(null);
  };

  const handleConfirmarRechazo = async () => {
    if (!solicitudARechazar) return;
    if (!motivoRechazo.trim()) {
      setErrorRechazo('Escribí un motivo para informarle al cliente.');
      return;
    }
    setRechazando(true);
    setErrorRechazo(null);
    try {
      await rechazarSolicitudPublicacion(solicitudARechazar._id, motivoRechazo.trim());
      if (solicitudDetalle?._id === solicitudARechazar._id) setSolicitudDetalle(null);
      setSolicitudARechazar(null);
      setMotivoRechazo('');
      mostrar('Solicitud rechazada. Le avisamos al cliente por mail.');
      void cargar();
    } catch (err) {
      setErrorRechazo(err instanceof Error ? err.message : 'Error al rechazar.');
    } finally {
      setRechazando(false);
    }
  };

  const detalle = solicitudDetalle;
  const fotosDetalle = detalle?.fotos ?? [];
  const esTerreno = detalle?.tipoPropiedad === 'terreno';
  const docsObligatorios = DOCUMENTOS.filter((d) => d.obligatorio);
  const docsListos = detalle ? docsObligatorios.filter((d) => detalle.documentos?.[d.clave]).length : 0;
  const whatsapp = detalle?.contacto?.telefono?.replace(/\D/g, '');

  const datosInmueble: { icono: NombreIcono; etiqueta: string; valor: React.ReactNode }[] = detalle
    ? [
        { icono: 'propiedades', etiqueta: 'Tipo', valor: NOMBRE_TIPO[detalle.tipoPropiedad] ?? detalle.tipoPropiedad },
        { icono: 'maleta', etiqueta: 'Operación', valor: NOMBRE_OPERACION[detalle.operacion] ?? detalle.operacion },
        ...(!esTerreno
          ? [
              { icono: 'inicio' as NombreIcono, etiqueta: 'Ambientes', valor: detalle.ambientes || '-' },
              { icono: 'inicio' as NombreIcono, etiqueta: 'Dormitorios', valor: detalle.dormitorios || '-' },
              { icono: 'inicio' as NombreIcono, etiqueta: 'Baños', valor: detalle.banos || '-' },
            ]
          : []),
        { icono: 'ubicacion', etiqueta: 'Sup. total', valor: detalle.superficieTotal ? `${detalle.superficieTotal} m²` : '-' },
        ...(!esTerreno
          ? [
              { icono: 'ubicacion' as NombreIcono, etiqueta: 'Sup. cubierta', valor: detalle.superficieCubierta ? `${detalle.superficieCubierta} m²` : '-' },
              { icono: 'candado' as NombreIcono, etiqueta: 'Cochera', valor: detalle.cochera === 'si' ? 'Sí' : 'No' },
            ]
          : []),
        {
          icono: 'contratos',
          etiqueta: 'Expensas',
          valor:
            detalle.expensas === 'si'
              ? detalle.montoExpensas
                ? `$ ${detalle.montoExpensas.toLocaleString('es-AR')}`
                : 'Sí paga'
              : detalle.expensas === 'no'
                ? 'No paga'
                : 'Sin indicar',
        },
        ...(detalle.pisoUnidad ? [{ icono: 'propiedades' as NombreIcono, etiqueta: 'Piso / unidad', valor: detalle.pisoUnidad }] : []),
      ]
    : [];

  return (
    <div className="flex flex-col gap-5">
      <Encabezado
        titulo="Solicitudes de publicación"
        descripcion="Pedidos de clientes que quieren publicar su propiedad. Revisá los datos, las fotos y la documentación antes de aprobar."
      />

      {/* Pestañas con cantidad */}
      <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap gap-1.5">
        {FILTROS.map(({ id, nombre }) => {
          const activa = filtroActivo === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={activa}
              onClick={() => {
                setFiltro(id);
                setFiltroElegido(true);
              }}
              className={`inline-flex h-11 items-center gap-2 rounded-lg px-3 text-[13.5px] sm:h-9 font-medium transition-colors ${
                activa ? 'bg-panel-marca text-panel-marca-texto' : 'text-panel-suave hover:bg-panel-hundido hover:text-panel-texto'
              }`}
            >
              {nombre}
              <span className={`tabular rounded-md px-1.5 text-[12px] ${activa ? 'bg-black/15 dark:bg-white/15' : 'bg-panel-hundido'}`}>{cantidades[id]}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <Alerta tono="peligro" titulo="No pudimos cargar las solicitudes" accion={<Boton tamano="sm" onClick={() => void cargar()}>Reintentar</Boton>}>
          {error}
        </Alerta>
      )}

      <div className="overflow-hidden rounded-xl border border-panel-borde bg-panel-superficie">
        {!solicitudes ? (
          <div className="flex flex-col divide-y divide-panel-borde">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Esqueleto className="h-12 w-16" />
                <div className="flex flex-1 flex-col gap-2">
                  <Esqueleto className="h-4 w-1/3" />
                  <Esqueleto className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : visibles.length === 0 ? (
          <EstadoVacio
            icono="subir"
            titulo={filtroActivo === 'pendiente' ? 'No hay solicitudes pendientes' : 'No hay solicitudes'}
            texto={filtroActivo === 'todas' ? 'Cuando un cliente mande una propiedad para publicar, aparece acá.' : 'Probá con otra pestaña.'}
          />
        ) : (
          <ul className="m-0 list-none divide-y divide-panel-borde p-0">
            {visibles.map((sol) => (
              <li key={sol._id} className="group relative flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-panel-hundido/60 md:flex-row md:items-center md:gap-4">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Miniatura src={sol.fotos?.[0]} />
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => setSolicitudDetalle(sol)}
                      className="block max-w-full truncate text-left text-[14px] font-medium after:absolute after:inset-0 hover:underline focus-visible:outline-none"
                    >
                      {sol.titulo || sol.direccion}
                    </button>
                    <span className="block truncate text-[13px] text-panel-suave">
                      {[NOMBRE_TIPO[sol.tipoPropiedad] ?? sol.tipoPropiedad, NOMBRE_OPERACION[sol.operacion] ?? sol.operacion, sol.ciudad].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 pl-[76px] text-[13px] md:contents md:pl-0">
                  <span className="truncate text-panel-suave md:w-40">{nombreCliente(sol)}</span>
                  <span className="tabular whitespace-nowrap font-medium md:w-32 md:text-right">{precio(sol)}</span>
                  <span className="hidden whitespace-nowrap text-panel-tenue md:block md:w-16 md:text-right">{fecha(sol.createdAt)}</span>
                  <span className="md:w-24">
                    <Insignia tono={tonoEstado(sol.estado)}>{NOMBRE_ESTADO[sol.estado]}</Insignia>
                  </span>
                </div>
                <Icono nombre="flecha" className="pointer-events-none hidden h-4 w-4 shrink-0 text-panel-tenue transition-transform group-hover:translate-x-0.5 md:block" />
              </li>
            ))}
          </ul>
        )}
        {solicitudes && visibles.length > 0 && (
          <p className="m-0 border-t border-panel-borde px-4 py-2.5 text-[13px] text-panel-suave">
            {visibles.length} {visibles.length === 1 ? 'solicitud' : 'solicitudes'}
          </p>
        )}
      </div>

      {/* Detalle: un solo scroll, datos clave arriba y contacto/documentos al costado */}
      {detalle && (
        <Dialogo
          abierto={Boolean(detalle)}
          alCerrar={() => setSolicitudDetalle(null)}
          titulo={detalle.titulo || detalle.direccion}
          descripcion={
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Insignia tono={tonoEstado(detalle.estado)}>{NOMBRE_ESTADO[detalle.estado]}</Insignia>
              <span>
                {detalle.direccion}, {detalle.ciudad || 'Villa Libertador San Martín'} · enviada el {new Date(detalle.createdAt).toLocaleDateString('es-AR')}
              </span>
            </span>
          }
          ancho="xl"
          acciones={
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <p className="m-0 text-[13px] text-panel-suave">
                Precio pretendido <strong className="tabular ml-1 text-[16px] text-panel-texto">{precio(detalle)}</strong>
              </p>
              {detalle.estado === 'pendiente' ? (
                <div className="flex flex-wrap gap-2">
                  <Boton variante="peligro" onClick={() => abrirRechazo(detalle)}>
                    Rechazar
                  </Boton>
                  <Boton variante="principal" icono="check" cargando={aprobandoId === detalle._id} onClick={() => handleAprobar(detalle)}>
                    Aprobar y crear propiedad
                  </Boton>
                </div>
              ) : detalle.estado === 'aprobada' && idPropiedad(detalle) ? (
                <Boton variante="principal" icono="editar" onClick={() => router.push(`/admin/propiedades/${idPropiedad(detalle)}/editar`)}>
                  Editar en catálogo
                </Boton>
              ) : (
                <Boton onClick={() => setSolicitudDetalle(null)}>Cerrar</Boton>
              )}
            </div>
          }
        >
          <div className="flex flex-col gap-4 text-panel-texto">
            {detalle.estado === 'rechazada' && detalle.motivoRechazo && (
              <Alerta tono="peligro" titulo="Motivo del rechazo">{detalle.motivoRechazo}</Alerta>
            )}

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_280px]">
              {/* Columna principal */}
              <div className="flex min-w-0 flex-col gap-4">
                {fotosDetalle.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {fotosDetalle.map((url, i) => (
                      <button
                        key={url + i}
                        type="button"
                        onClick={() => setFotoGrande(i)}
                        aria-label={`Ampliar foto ${i + 1}`}
                        className="rounded-md transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-panel-acento"
                      >
                        <Miniatura src={url} className="h-[72px] w-24" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="m-0 flex items-center gap-2 rounded-lg bg-panel-hundido px-3.5 py-2.5 text-[13px] text-panel-suave">
                    <Icono nombre="imagen" className="h-4 w-4" /> El cliente no adjuntó fotos.
                  </p>
                )}

                {/* Datos clave en una grilla compacta */}
                <div className="overflow-hidden rounded-lg border border-panel-borde">
                  {/* -mb/-mr esconden el borde de las celdas del borde exterior */}
                  <div className="-mb-px -mr-px grid grid-cols-2 sm:grid-cols-3">
                    {datosInmueble.map((dato) => (
                      <Dato key={dato.etiqueta} {...dato} />
                    ))}
                  </div>
                </div>

                {(detalle.comodidades?.length || detalle.otrasComodidades) && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {detalle.comodidades?.map((c) => (
                      <span key={c} className="rounded-md bg-panel-hundido px-2 py-0.5 text-[12.5px] text-panel-texto">
                        {NOMBRE_COMODIDAD[c] ?? c}
                      </span>
                    ))}
                    {detalle.otrasComodidades && <span className="text-[13px] text-panel-suave">{detalle.otrasComodidades}</span>}
                  </div>
                )}

                {detalle.descripcion && (
                  <div>
                    <p className="m-0 mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-panel-suave">Descripción</p>
                    <p className="m-0 whitespace-pre-wrap text-[13.5px] leading-relaxed">{detalle.descripcion}</p>
                  </div>
                )}
              </div>

              {/* Columna lateral */}
              <div className="flex min-w-0 flex-col gap-3">
                <Bloque titulo="Propietario">
                  <div className="flex flex-col gap-2 px-3.5 py-3">
                    <p className="m-0 text-[14px] font-medium">{nombreCliente(detalle)}</p>
                    {detalle.contacto?.dni && <p className="m-0 text-[13px] text-panel-suave">DNI {detalle.contacto.dni}</p>}
                    <div className="flex flex-col gap-1 text-[13px]">
                      {detalle.contacto?.email && (
                        <a href={`mailto:${detalle.contacto.email}`} className="flex min-w-0 items-center gap-2 text-panel-texto hover:underline">
                          <Icono nombre="email" className="h-4 w-4 shrink-0 text-panel-tenue" />
                          <span className="truncate">{detalle.contacto.email}</span>
                        </a>
                      )}
                      {detalle.contacto?.telefono && (
                        <a href={`tel:${detalle.contacto.telefono}`} className="flex items-center gap-2 text-panel-texto hover:underline">
                          <Icono nombre="telefono" className="h-4 w-4 shrink-0 text-panel-tenue" />
                          {detalle.contacto.telefono}
                        </a>
                      )}
                    </div>
                    {whatsapp && (
                      <a
                        href={`https://wa.me/${whatsapp}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex h-8 items-center justify-center rounded-lg border border-panel-borde text-[13px] font-medium hover:bg-panel-hundido"
                      >
                        Escribir por WhatsApp
                      </a>
                    )}
                  </div>
                </Bloque>

                <Bloque titulo="Ubicación">
                  <dl className="m-0 divide-y divide-panel-borde">
                    <Linea etiqueta="Dirección">{detalle.direccion}</Linea>
                    <Linea etiqueta="Localidad">{detalle.ciudad || 'Villa Libertador San Martín'}</Linea>
                    {detalle.referenciasUbicacion && <Linea etiqueta="Referencias">{detalle.referenciasUbicacion}</Linea>}
                  </dl>
                </Bloque>

                <Bloque
                  titulo="Documentación"
                  extra={
                    <span className={`tabular text-[12px] ${docsListos === docsObligatorios.length ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {docsListos}/{docsObligatorios.length} obligatorios
                    </span>
                  }
                >
                  <ul className="m-0 list-none divide-y divide-panel-borde p-0">
                    {DOCUMENTOS.map((doc) => {
                      const referencia = detalle.documentos?.[doc.clave];
                      return (
                        <li key={doc.clave}>
                          {referencia ? (
                            <a
                              href={urlDocumentoPublicacion(referencia)}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 px-3.5 py-2 text-[13px] hover:bg-panel-hundido"
                            >
                              <Icono nombre="check" className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                              <span className="min-w-0 flex-1 truncate">{doc.nombre}</span>
                              <span className="text-[12px] text-panel-suave">Abrir</span>
                            </a>
                          ) : (
                            <span className="flex items-center gap-2 px-3.5 py-2 text-[13px] text-panel-suave">
                              <Icono
                                nombre={doc.obligatorio ? 'alerta' : 'documento'}
                                className={`h-4 w-4 shrink-0 ${doc.obligatorio ? 'text-red-600 dark:text-red-400' : 'text-panel-tenue'}`}
                              />
                              <span className="min-w-0 flex-1 truncate">{doc.nombre}</span>
                              <span className={`text-[12px] ${doc.obligatorio ? 'text-red-600 dark:text-red-400' : 'text-panel-tenue'}`}>
                                {doc.obligatorio ? 'Falta' : 'No adjuntó'}
                              </span>
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </Bloque>
              </div>
            </div>
          </div>
        </Dialogo>
      )}

      {/* Foto ampliada con anterior / siguiente */}
      {fotoGrande !== null && fotosDetalle[fotoGrande] && (
        <Dialogo
          abierto
          alCerrar={() => setFotoGrande(null)}
          titulo={`Foto ${fotoGrande + 1} de ${fotosDetalle.length}`}
          ancho="xl"
          acciones={
            <div className="flex w-full items-center justify-between gap-2">
              <div className="flex gap-2">
                <Boton icono="atras" disabled={fotoGrande === 0} onClick={() => setFotoGrande(fotoGrande - 1)}>
                  Anterior
                </Boton>
                <Boton disabled={fotoGrande >= fotosDetalle.length - 1} onClick={() => setFotoGrande(fotoGrande + 1)}>
                  Siguiente
                </Boton>
              </div>
              <Boton onClick={() => setFotoGrande(null)}>Cerrar</Boton>
            </div>
          }
        >
          <div className="flex items-center justify-center rounded-lg bg-black/90 p-2">
            <Miniatura src={fotosDetalle[fotoGrande]} className="max-h-[62dvh] min-h-40 w-auto max-w-full object-contain" />
          </div>
        </Dialogo>
      )}

      {solicitudARechazar && (
        <Dialogo
          abierto={Boolean(solicitudARechazar)}
          alCerrar={() => setSolicitudARechazar(null)}
          titulo="Rechazar solicitud"
          descripcion={`Contale al cliente por qué no se puede publicar ${solicitudARechazar.direccion}. Le llega por mail.`}
          acciones={
            <>
              <Boton onClick={() => setSolicitudARechazar(null)} disabled={rechazando}>
                Cancelar
              </Boton>
              <Boton variante="peligro" cargando={rechazando} onClick={handleConfirmarRechazo}>
                Confirmar rechazo
              </Boton>
            </>
          }
        >
          <Campo
            htmlFor="motivo-rechazo"
            etiqueta="Motivo del rechazo *"
            ayuda="Por ejemplo: falta la escritura, o la propiedad queda fuera de las localidades donde trabajamos."
            error={errorRechazo || undefined}
          >
            <textarea id="motivo-rechazo" rows={4} value={motivoRechazo} onChange={(e) => setMotivoRechazo(e.target.value)} placeholder="Escribí el motivo para el cliente…" className={control} />
          </Campo>
        </Dialogo>
      )}

      {dialogoConfirmar}
      {aviso}
    </div>
  );
}

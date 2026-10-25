'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Encabezado,
  Tarjeta,
  Boton,
  Dialogo,
  Insignia,
  Campo,
  EstadoVacio,
  control,
} from '@/components/panel/ui';
import {
  getSolicitudesPublicacionAdmin,
  aprobarSolicitudPublicacion,
  rechazarSolicitudPublicacion,
  type SolicitudPublicacion,
  type EstadoSolicitudPublicacion,
} from '@/services/solicitudesPublicacion';

type FiltroEstado = 'todas' | EstadoSolicitudPublicacion;

export default function AdminPublicacionesPage() {
  const router = useRouter();
  const [solicitudes, setSolicitudes] = useState<SolicitudPublicacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroEstado>('todas');

  // Modal de detalle
  const [solicitudDetalle, setSolicitudDetalle] = useState<SolicitudPublicacion | null>(null);
  const [fotoGrande, setFotoGrande] = useState<string | null>(null);

  // Modal de rechazo
  const [solicitudARechazar, setSolicitudARechazar] = useState<SolicitudPublicacion | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [rechazando, setRechazando] = useState(false);
  const [errorRechazo, setErrorRechazo] = useState<string | null>(null);

  // Estado de aprobación
  const [aprobandoId, setAprobandoId] = useState<string | null>(null);

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await getSolicitudesPublicacionAdmin(filtro);
      setSolicitudes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las solicitudes.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, [filtro]);

  const handleAprobar = async (sol: SolicitudPublicacion) => {
    if (
      !confirm(
        `¿Aprobar la publicación para ${sol.direccion}? Esto creará la propiedad en el catálogo asignando a ${sol.contacto?.nombre || 'el cliente'
        } como dueño.`
      )
    ) {
      return;
    }
    setAprobandoId(sol._id);
    try {
      const { propiedadId } = await aprobarSolicitudPublicacion(sol._id);
      // Redirigir a la edición de la propiedad creada como pide HU-26
      router.push(`/admin/propiedades/${propiedadId}/editar`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo aprobar la solicitud.');
      setAprobandoId(null);
    }
  };

  const handleConfirmarRechazo = async () => {
    if (!solicitudARechazar) return;
    if (!motivoRechazo.trim()) {
      setErrorRechazo('Por favor ingresá un motivo para informar al cliente.');
      return;
    }
    setRechazando(true);
    setErrorRechazo(null);
    try {
      await rechazarSolicitudPublicacion(solicitudARechazar._id, motivoRechazo.trim());
      setSolicitudARechazar(null);
      setMotivoRechazo('');
      if (solicitudDetalle?._id === solicitudARechazar._id) {
        setSolicitudDetalle(null);
      }
      cargar();
    } catch (err) {
      setErrorRechazo(err instanceof Error ? err.message : 'Error al rechazar.');
    } finally {
      setRechazando(false);
    }
  };

  const getTonoInsignia = (estado: EstadoSolicitudPublicacion): 'aviso' | 'exito' | 'peligro' => {
    switch (estado) {
      case 'aprobada':
        return 'exito';
      case 'rechazada':
        return 'peligro';
      default:
        return 'aviso';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Encabezado
        titulo="Solicitudes de publicación"
        descripcion="Revisá los pedidos con fotografías que los clientes cargan para que Araceli publique sus inmuebles."
      />

      {/* Pestañas de filtrado */}
      <div className="flex flex-wrap items-center gap-2 border-b border-panel-borde pb-3">
        {(['todas', 'pendiente', 'aprobada', 'rechazada'] as FiltroEstado[]).map((tab) => {
          const activa = filtro === tab;
          const nombres: Record<FiltroEstado, string> = {
            todas: 'Todas',
            pendiente: 'Pendientes',
            aprobada: 'Aprobadas',
            rechazada: 'Rechazadas',
          };
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setFiltro(tab)}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${activa
                ? 'bg-panel-marca text-panel-marca-texto'
                : 'bg-panel-superficie text-panel-suave hover:bg-panel-hundido hover:text-panel-texto border border-panel-borde'
                }`}
            >
              {nombres[tab]}
            </button>
          );
        })}
      </div>

      {cargando ? (
        <Tarjeta className="p-12 text-center text-panel-suave">
          Cargando solicitudes de publicación…
        </Tarjeta>
      ) : error ? (
        <Tarjeta className="p-8 text-center text-red-600 dark:text-red-400">
          {error}
        </Tarjeta>
      ) : solicitudes.length === 0 ? (
        <EstadoVacio
          icono="subir"
          titulo="No hay solicitudes"
          texto={
            filtro === 'todas'
              ? 'Aún ningún cliente envió un formulario para publicar una propiedad.'
              : `No se encontraron solicitudes con estado "${filtro}".`
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {solicitudes.map((sol) => {
            const cliente = typeof sol.cliente === 'object' ? sol.cliente : null;
            const nombreCliente =
              sol.contacto?.nombre || cliente?.nombre
                ? `${sol.contacto?.nombre || cliente?.nombre || ''} ${sol.contacto?.apellido || cliente?.apellido || ''}`.trim()
                : 'Cliente sin nombre';

            const tieneFotos = Array.isArray(sol.fotos) && sol.fotos.length > 0;

            return (
              <Tarjeta key={sol._id} className="flex flex-col justify-between overflow-hidden p-0 border border-panel-borde shadow-sm">
                {/* Portada / foto de la propiedad */}
                <div
                  onClick={() => setSolicitudDetalle(sol)}
                  className="relative aspect-video w-full bg-panel-hundido cursor-pointer overflow-hidden group"
                >
                  {tieneFotos ? (
                    <>
                      <img
                        src={sol.fotos![0]}
                        alt={sol.direccion}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-md bg-black/75 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                        📷 {sol.fotos!.length} foto{sol.fotos!.length > 1 ? 's' : ''}
                      </span>
                    </>
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-panel-tenue">
                      <span className="text-2xl">🏠</span>
                      <span className="text-xs">Sin fotos adjuntas</span>
                    </div>
                  )}

                  <div className="absolute top-2.5 left-2.5">
                    <span className="rounded-md bg-panel-superficie/90 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-panel-texto backdrop-blur-sm border border-panel-borde">
                      {sol.tipoPropiedad} · {sol.operacion}
                    </span>
                  </div>

                  <div className="absolute top-2.5 right-2.5">
                    <Insignia tono={getTonoInsignia(sol.estado)}>
                      {sol.estado === 'pendiente'
                        ? 'Pendiente'
                        : sol.estado === 'aprobada'
                          ? 'Aprobada'
                          : 'Rechazada'}
                    </Insignia>
                  </div>
                </div>

                <div className="flex flex-1 flex-col justify-between p-5 gap-4">
                  <div className="flex flex-col gap-2.5">
                    <div>
                      <h3
                        onClick={() => setSolicitudDetalle(sol)}
                        className="text-base font-semibold text-panel-texto line-clamp-1 cursor-pointer hover:underline"
                      >
                        {sol.direccion}
                      </h3>
                      <p className="text-xs text-panel-suave">
                        {sol.ciudad || 'Libertador San Martín'} · Enviado {new Date(sol.createdAt).toLocaleDateString('es-AR')}
                      </p>
                    </div>

                    <div className="rounded-lg bg-panel-hundido p-2.5 text-xs text-panel-texto flex flex-col gap-1">
                      <div>
                        <strong className="text-panel-suave">Cliente:</strong> {nombreCliente}
                      </div>
                      {sol.contacto?.telefono && (
                        <div>
                          <strong className="text-panel-suave">Tel:</strong> {sol.contacto.telefono}
                        </div>
                      )}
                      {sol.contacto?.dni && (
                        <div>
                          <strong className="text-panel-suave">DNI:</strong> {sol.contacto.dni}
                        </div>
                      )}
                    </div>

                    <div className="flex items-baseline justify-between border-t border-panel-borde pt-2">
                      <span className="text-xs text-panel-suave">Pretendido:</span>
                      <span className="text-base font-bold text-panel-texto">
                        {sol.precioPretendido?.moneda === 'ARS' ? '$' : 'USD'}{' '}
                        {sol.precioPretendido?.monto?.toLocaleString('es-AR')}
                      </span>
                    </div>

                    {sol.estado === 'rechazada' && sol.motivoRechazo && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                        <strong>Motivo:</strong> {sol.motivoRechazo}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-panel-borde pt-3">
                    <Boton
                      variante="secundario"
                      tamano="sm"
                      onClick={() => setSolicitudDetalle(sol)}
                    >
                      Ver fotos y detalle
                    </Boton>

                    {sol.estado === 'pendiente' && (
                      <>
                        <Boton
                          variante="principal"
                          tamano="sm"
                          cargando={aprobandoId === sol._id}
                          disabled={Boolean(aprobandoId)}
                          onClick={() => handleAprobar(sol)}
                        >
                          Aprobar y crear
                        </Boton>
                        <Boton
                          variante="peligro"
                          tamano="sm"
                          onClick={() => {
                            setSolicitudARechazar(sol);
                            setMotivoRechazo('');
                            setErrorRechazo(null);
                          }}
                        >
                          Rechazar
                        </Boton>
                      </>
                    )}

                    {sol.estado === 'aprobada' && sol.propiedadCreada && typeof sol.propiedadCreada === 'object' && (
                      <Boton
                        variante="fantasma"
                        tamano="sm"
                        onClick={() => {
                          const propId = typeof sol.propiedadCreada === 'object' ? sol.propiedadCreada._id : sol.propiedadCreada;
                          router.push(`/admin/propiedades/${propId}/editar`);
                        }}
                      >
                        Editar en catálogo →
                      </Boton>
                    )}
                  </div>
                </div>
              </Tarjeta>
            );
          })}
        </div>
      )}

      {/* Modal de Detalle Completo con Galería */}
      {solicitudDetalle && (
        <Dialogo
          abierto={Boolean(solicitudDetalle)}
          alCerrar={() => setSolicitudDetalle(null)}
          titulo="Solicitud de publicación"
          descripcion={`Enviado el ${new Date(solicitudDetalle.createdAt).toLocaleDateString('es-AR')}`}
          ancho="lg"
          acciones={
            <div className="flex w-full items-center justify-between gap-3">
              <Boton variante="secundario" onClick={() => setSolicitudDetalle(null)}>
                Cerrar
              </Boton>
              {solicitudDetalle.estado === 'pendiente' && (
                <div className="flex gap-2">
                  <Boton
                    variante="peligro"
                    onClick={() => {
                      setSolicitudARechazar(solicitudDetalle);
                      setMotivoRechazo('');
                    }}
                  >
                    Rechazar
                  </Boton>
                  <Boton
                    variante="principal"
                    cargando={aprobandoId === solicitudDetalle._id}
                    onClick={() => handleAprobar(solicitudDetalle)}
                  >
                    Aprobar y crear propiedad
                  </Boton>
                </div>
              )}
            </div>
          }
        >
          <div className="flex flex-col gap-6 py-2 text-sm text-panel-texto max-h-[75vh] overflow-y-auto pr-1">
            {/* Galería de fotos del cliente */}
            {solicitudDetalle.fotos && solicitudDetalle.fotos.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-panel-suave m-0">
                    Fotografías enviadas por el cliente ({solicitudDetalle.fotos.length})
                  </p>
                  <span className="text-xs text-panel-tenue">Hacé clic para ver en pantalla grande</span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {solicitudDetalle.fotos.map((url, i) => (
                    <div
                      key={i}
                      onClick={() => setFotoGrande(url)}
                      className="group relative block aspect-video overflow-hidden rounded-xl border border-panel-borde bg-panel-hundido cursor-zoom-in"
                    >
                      <img
                        src={url}
                        alt={`Foto ${i + 1}`}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/25 flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-medium bg-black/60 px-2.5 py-1 rounded-md backdrop-blur-sm transition-opacity">
                          Ampliar foto
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-panel-borde p-4 text-center text-xs text-panel-tenue">
                El cliente no adjuntó fotos en esta solicitud.
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-panel-hundido p-4 flex flex-col gap-1.5">
                <p className="text-xs font-semibold uppercase text-panel-suave mb-1">Datos del Inmueble</p>
                <p><strong>Tipo:</strong> {solicitudDetalle.tipoPropiedad}</p>
                <p><strong>Operación:</strong> {solicitudDetalle.operacion}</p>
                <p><strong>Dirección:</strong> {solicitudDetalle.direccion}</p>
                <p><strong>Ciudad:</strong> {solicitudDetalle.ciudad || 'Libertador San Martín'}</p>
                <p>
                  <strong>Precio pretendido:</strong> {solicitudDetalle.precioPretendido?.moneda}{' '}
                  {solicitudDetalle.precioPretendido?.monto?.toLocaleString('es-AR')}
                </p>
                <p><strong>Ambientes:</strong> {solicitudDetalle.ambientes || '-'}</p>
                <p><strong>Dormitorios:</strong> {solicitudDetalle.dormitorios || '-'}</p>
                <p><strong>Baños:</strong> {solicitudDetalle.banos || '-'}</p>
                <p><strong>Superficie total:</strong> {solicitudDetalle.superficieTotal ? `${solicitudDetalle.superficieTotal} m²` : '-'}</p>
                <p><strong>Superficie cubierta:</strong> {solicitudDetalle.superficieCubierta ? `${solicitudDetalle.superficieCubierta} m²` : '-'}</p>
              </div>

              <div className="rounded-xl bg-panel-hundido p-4 flex flex-col gap-1.5">
                <p className="text-xs font-semibold uppercase text-panel-suave mb-1">Datos del Cliente Propietario</p>
                <p><strong>Nombre:</strong> {solicitudDetalle.contacto?.nombre} {solicitudDetalle.contacto?.apellido}</p>
                <p><strong>Email:</strong> {solicitudDetalle.contacto?.email || '-'}</p>
                <p><strong>Teléfono:</strong> {solicitudDetalle.contacto?.telefono || '-'}</p>
                <p><strong>DNI:</strong> {solicitudDetalle.contacto?.dni || '-'}</p>
                <div className="mt-3 pt-3 border-t border-panel-borde flex items-center justify-between">
                  <span><strong>Estado actual:</strong></span>
                  <Insignia tono={getTonoInsignia(solicitudDetalle.estado)}>
                    {solicitudDetalle.estado}
                  </Insignia>
                </div>
              </div>
            </div>

            {solicitudDetalle.descripcion && (
              <div>
                <p className="text-xs font-semibold uppercase text-panel-suave mb-1">Descripción y detalles adicionales</p>
                <p className="rounded-xl bg-panel-hundido p-3.5 whitespace-pre-wrap text-panel-texto">
                  {solicitudDetalle.descripcion}
                </p>
              </div>
            )}
          </div>
        </Dialogo>
      )}

      {/* Modal para Ver Foto Ampliada */}
      {fotoGrande && (
        <Dialogo
          abierto={Boolean(fotoGrande)}
          alCerrar={() => setFotoGrande(null)}
          titulo="Vista ampliada de fotografía"
          ancho="lg"
          acciones={
            <Boton variante="secundario" onClick={() => setFotoGrande(null)}>
              Cerrar
            </Boton>
          }
        >
          <div className="flex items-center justify-center p-2 bg-black/90 rounded-xl overflow-hidden max-h-[70vh]">
            <img
              src={fotoGrande}
              alt="Foto ampliada"
              className="max-h-[65vh] w-auto max-w-full object-contain rounded-lg"
            />
          </div>
        </Dialogo>
      )}

      {/* Modal para Rechazar */}
      {solicitudARechazar && (
        <Dialogo
          abierto={Boolean(solicitudARechazar)}
          alCerrar={() => setSolicitudARechazar(null)}
          titulo="Rechazar solicitud de publicación"
          descripcion={`Indicá el motivo por el cual no se puede publicar ${solicitudARechazar.direccion}. Se le enviará un correo explicativo al cliente.`}
          acciones={
            <div className="flex w-full justify-end gap-3">
              <Boton
                variante="secundario"
                onClick={() => setSolicitudARechazar(null)}
                disabled={rechazando}
              >
                Cancelar
              </Boton>
              <Boton
                variante="peligro"
                cargando={rechazando}
                onClick={handleConfirmarRechazo}
              >
                Confirmar rechazo
              </Boton>
            </div>
          }
        >
          <div className="flex flex-col gap-4 py-2">
            <Campo
              htmlFor="motivo-rechazo"
              etiqueta="Motivo del rechazo *"
              ayuda="Ej: La documentación de titularidad está incompleta, o la zona queda fuera del radio de cobertura."
              error={errorRechazo || undefined}
            >
              <textarea
                id="motivo-rechazo"
                rows={4}
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                placeholder="Escribí el motivo para el cliente…"
                className={control}
              />
            </Campo>
          </div>
        </Dialogo>
      )}
    </div>
  );
}

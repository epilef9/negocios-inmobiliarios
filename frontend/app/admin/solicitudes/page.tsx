'use client';

import { useEffect, useMemo, useState } from 'react';
import { API_URL } from '@/services/api';
import { conSesion } from '@/services/sesion';
import { EVENTO_SOLICITUDES, actualizarArchivadoSolicitud, actualizarEstadoSolicitud, eliminarSolicitudDefinitivamente, getSolicitudesAdmin, type DocumentoSolicitud, type EstadoSolicitud, type SolicitudAdmin } from '@/services/solicitudes';
import Icono from '@/components/panel/Icono';
import { Alerta, Boton, Dialogo, Encabezado, EstadoVacio, Insignia, Tarjeta, useAviso } from '@/components/panel/ui';

import ActividadRegistro from '@/components/panel/ActividadRegistro';
const estadoTono: Record<string, 'aviso' | 'exito' | 'peligro' | 'neutro'> = {
  pendiente: 'aviso',
  falta_documentacion: 'aviso',
  aprobada: 'exito',
  rechazada: 'peligro',
  vencida: 'neutro',
  cerrada: 'neutro',
};

const formatoFecha = (valor: string | undefined) => {
  if (!valor) return 'Sin fecha';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(fecha);
};

const formatoFechaPersonal = (valor: string) => {
  const fecha = new Date(`${valor}T00:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor) || Number.isNaN(fecha.getTime())) return valor;
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'long', year: 'numeric' }).format(fecha);
};

const formatoImporte = (valor: string) => {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return valor;
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(numero);
};

const formatoMoneda = (valor?: number | null, moneda?: string | null) => {
  if (valor == null) return 'No informado';
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return 'No informado';
  const texto = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(numero);
  return `${moneda === 'ARS' ? 'ARS' : 'USD'} ${texto}`;
};

const normalizarTexto = (valor: unknown) => {
  if (valor == null) return '';
  if (typeof valor === 'string') return valor.trim();
  if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor);
  return '';
};

const obtenerNombreCliente = (solicitud: SolicitudAdmin) => {
  const titular = solicitud.datosPersonales?.titular as Record<string, unknown> | undefined;
  const nombre = normalizarTexto(titular?.nombre);
  const apellido = normalizarTexto(titular?.apellido);
  if (nombre || apellido) return `${nombre} ${apellido}`.trim();
  return 'Cliente sin nombre registrado';
};

const obtenerEmailCliente = (solicitud: SolicitudAdmin) => {
  const titular = solicitud.datosPersonales?.titular as Record<string, unknown> | undefined;
  const email = normalizarTexto(titular?.email);
  return email || 'Email no informado';
};

const aplanarDatos = (valor: unknown, prefijo = ''): Array<{ clave: string; valor: string }> => {
  if (valor == null) return prefijo ? [{ clave: prefijo.replace(/\.$/, ''), valor: '' }] : [];
  if (typeof valor === 'string' || typeof valor === 'number' || typeof valor === 'boolean') {
    return [{ clave: prefijo.replace(/\.$/, ''), valor: String(valor) }];
  }
  if (Array.isArray(valor)) {
    if (!valor.length) return [{ clave: prefijo.replace(/\.$/, ''), valor: '' }];
    return valor.flatMap((item, indice) => aplanarDatos(item, `${prefijo}${indice + 1}.`));
  }
  if (typeof valor === 'object') {
    const campos = Object.entries(valor as Record<string, unknown>);
    if (!campos.length) return [{ clave: prefijo.replace(/\.$/, ''), valor: '' }];
    return campos.flatMap(([clave, item]) => aplanarDatos(item, `${prefijo}${clave}.`));
  }
  return [];
};

const etiquetasCampo: Record<string, string> = {
  nombre: 'Nombre',
  apellido: 'Apellido',
  dni: 'DNI',
  cuil: 'CUIL',
  fechaNacimiento: 'Fecha de nacimiento',
  email: 'Correo electrónico',
  telefono: 'Teléfono',
  domicilio: 'Domicilio',
  localidad: 'Localidad',
  provincia: 'Provincia',
  ocupacion: 'Ocupación',
  ingresosMensuales: 'Ingresos mensuales',
  ingresosTipo: 'Tipo de comprobante de ingresos',
  incluyeCotitular: '¿Incluye cotitular?',
  tipo: 'Tipo',
  localidadPropiedad: 'Localidad de la propiedad en garantía',
  provinciaPropiedad: 'Provincia de la propiedad en garantía',
  documentacionCaucion: 'Documentación de caución',
  recibosIngresos: 'Recibos de sueldo',
  constanciaIngresos: 'Constancia de ingresos',
};

const tituloCampo = (clave: string) => {
  const partes = clave.split('.');
  const campo = partes[partes.length - 1];
  const etiqueta = etiquetasCampo[campo] ?? campo.replace(/([a-z])([A-Z])/g, '$1 $2');
  if (partes[0] === 'titular') return `${etiqueta} del titular`;
  if (partes[0] === 'cotitular') return `${etiqueta} del cotitular`;
  if (partes[0] === 'garantia' && partes[1] === 'garante') return `${etiqueta} del garante`;
  if (partes[0] === 'garantia') return campo === 'tipo' ? 'Tipo de garantía' : etiqueta;
  return etiqueta;
};

const presentarValor = (clave: string, valor: string) => {
  if (!valor.trim()) return 'No informado';
  if (valor === 'true') return 'Sí';
  if (valor === 'false') return 'No';
  if (clave.endsWith('fechaNacimiento')) return formatoFechaPersonal(valor);
  if (clave.endsWith('ingresosMensuales')) return formatoImporte(valor);
  if (clave === 'ingresosTipo') {
    if (valor === 'constancia') return 'Constancia';
    if (valor === 'recibos') return 'Recibos de sueldo';
  }
  if (clave === 'garantia.tipo') {
    if (valor === 'propietaria') return 'Propietaria';
    if (valor === 'caucion') return 'Seguro de caución';
  }
  return valor;
};

function ImagenPropiedad({ src, alt, className = '' }: { src?: string | null; alt: string; className?: string }) {
  const [urlFallida, setUrlFallida] = useState<string | null>(null);

  if (!src || urlFallida === src) {
    return (
      <span className={`flex items-center justify-center bg-panel-hundido text-panel-tenue ${className}`}>
        <Icono nombre="imagen" className="h-6 w-6" />
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- URLs de imagen del catálogo.
  return <img src={src} alt={alt} onError={() => setUrlFallida(src)} className={className} />;
}

const etiquetaEstado = (estado: string) => {
  if (estado === 'aprobada') return 'Aprobada';
  if (estado === 'rechazada') return 'Rechazada';
  if (estado === 'vencida') return 'Vencida';
  if (estado === 'cerrada') return 'Cerrada';
  if (estado === 'falta_documentacion') return 'Falta documentación';
  return 'Pendiente';
};

const nombreDocumentoPresentado = (documentos: DocumentoSolicitud[], indice: number) => {
  const documento = documentos[indice];
  const total = documentos.filter((item) => item.tipo === documento.tipo).length;
  if (total < 2) return documento.nombre;
  const numero = documentos.slice(0, indice + 1).filter((item) => item.tipo === documento.tipo).length;
  return `${documento.nombre} (${numero} de ${total})`;
};

type DocumentoSolicitable = { id: string; nombre: string };
type GrupoDocumentosSolicitables = { titulo: string; documentos: DocumentoSolicitable[] };

const obtenerDocumentosSolicitables = (solicitud: SolicitudAdmin): GrupoDocumentosSolicitables[] => {
  const datos = solicitud.datosPersonales ?? {};
  const garantia = datos.garantia && typeof datos.garantia === 'object'
    ? datos.garantia as Record<string, unknown>
    : {};
  const documentos = solicitud.documentos ?? [];
  const tiposPresentados = documentos.map((documento) => documento.tipo);
  const porTipo = (tipo: string) => documentos.find((documento) => documento.tipo === tipo);
  const opcion = (tipo: string): DocumentoSolicitable | null => {
    const documento = porTipo(tipo);
    return documento ? { id: tipo, nombre: documento.nombre } : null;
  };
  const titular = ['dniTitularFrente', 'dniTitularDorso', 'cuilTitular', 'domicilio']
    .map(opcion)
    .filter((documento): documento is DocumentoSolicitable => documento !== null);

  if (datos.incluyeCotitular === true) {
    ['dniCotitularFrente', 'dniCotitularDorso'].forEach((tipo) => {
      const documento = opcion(tipo);
      if (documento) titular.push(documento);
    });
  }

  const tipoIngresos = datos.ingresosTipo === 'recibos' || datos.ingresosTipo === 'constancia'
    ? datos.ingresosTipo
    : tiposPresentados.includes('recibosIngresos')
      ? 'recibos'
      : tiposPresentados.includes('constanciaIngresos') ? 'constancia' : null;
  const cantidadRecibos = tiposPresentados.filter((tipo) => tipo === 'recibosIngresos').length;
  const ingresos: DocumentoSolicitable[] = tipoIngresos === 'recibos'
    ? Array.from({ length: cantidadRecibos }, (_, indice) => ({
      id: `recibosIngresos:${indice}`,
      nombre: `Recibo de sueldo (${indice + 1} de ${cantidadRecibos})`,
    }))
    : tipoIngresos === 'constancia'
      ? [opcion('constanciaIngresos')].filter((documento): documento is DocumentoSolicitable => documento !== null)
      : [];

  const tipoGarantia = garantia.tipo === 'propietaria' || garantia.tipo === 'caucion'
    ? garantia.tipo
    : tiposPresentados.includes('escrituraGarantia') || tiposPresentados.includes('reciboGarante')
      ? 'propietaria'
      : tiposPresentados.includes('documentacionCaucion') ? 'caucion' : null;
  const documentosGarantia: DocumentoSolicitable[] = solicitud.operacion !== 'alquiler'
    ? []
    : tipoGarantia === 'propietaria'
      ? ['escrituraGarantia', 'reciboGarante']
        .map(opcion)
        .filter((documento): documento is DocumentoSolicitable => documento !== null)
      : tipoGarantia === 'caucion'
        ? [{ id: 'documentacionCaucion', nombre: 'Documentación del seguro de caución' }]
        : [];

  return [
    { titulo: 'Documentación del titular', documentos: titular },
    { titulo: 'Acreditación de ingresos', documentos: ingresos },
    { titulo: 'Documentación de la garantía', documentos: documentosGarantia },
  ].filter((grupo) => grupo.documentos.length > 0);
};

export default function SolicitudesAdminPage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [tipo, setTipo] = useState<'todas' | 'alquiler' | 'compra'>('todas');
  const [estado, setEstado] = useState<'todas' | EstadoSolicitud>('todas');
  const [orden, setOrden] = useState<'recientes' | 'antiguos'>('recientes');
  const [pestana, setPestana] = useState<'activas' | 'historial'>('activas');
  const [verArchivadas, setVerArchivadas] = useState(false);
  const [seleccionada, setSeleccionada] = useState<SolicitudAdmin | null>(null);
  const [solicitudParaArchivar, setSolicitudParaArchivar] = useState<SolicitudAdmin | null>(null);
  const [solicitudParaEliminar, setSolicitudParaEliminar] = useState<SolicitudAdmin | null>(null);
  const [confirmacionEliminar, setConfirmacionEliminar] = useState('');
  const [archivandoId, setArchivandoId] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [preview, setPreview] = useState<{ url: string; nombre: string; mime: string } | null>(null);
  const [accionSeleccionada, setAccionSeleccionada] = useState<'pendiente' | 'rechazada' | null>(null);
  const [comentarioAccion, setComentarioAccion] = useState('');
  const [documentosSeleccionados, setDocumentosSeleccionados] = useState<string[]>([]);
  const [confirmandoAccion, setConfirmandoAccion] = useState<'pendiente' | 'aprobada' | 'rechazada' | null>(null);
  const [actualizandoEstado, setActualizandoEstado] = useState(false);
  const { mostrar, aviso } = useAviso();

  useEffect(() => {
    let activo = true;
    getSolicitudesAdmin()
      .then((lista) => {
        if (!activo) return;
        setSolicitudes(lista ?? []);
        setError(null);
      })
      .catch((e: Error) => {
        if (!activo) return;
        setError(e.message || 'No se pudieron cargar las solicitudes');
      })
      .finally(() => activo && setCargando(false));
    return () => { activo = false; };
  }, []);

  const solicitudesPestana = useMemo(() => solicitudes.filter((solicitud) => {
    if (pestana === 'activas') return !solicitud.archivada && ['pendiente', 'falta_documentacion'].includes(solicitud.estado);
    if (verArchivadas) return solicitud.archivada === true;
    return !solicitud.archivada && ['aprobada', 'rechazada', 'vencida', 'cerrada'].includes(solicitud.estado);
  }), [pestana, solicitudes, verArchivadas]);

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return [...solicitudesPestana]
      .filter((solicitud) => {
        const propiedad = solicitud.propiedad;
        const nombreCliente = obtenerNombreCliente(solicitud).toLowerCase();
        const emailCliente = obtenerEmailCliente(solicitud).toLowerCase();
        const tituloPropiedad = (propiedad?.titulo ?? '').toLowerCase();
        const localidad = (propiedad?.ciudad || propiedad?.direccion || '').toLowerCase();
        if (tipo !== 'todas' && solicitud.operacion !== tipo) return false;
        if (estado !== 'todas' && solicitud.estado !== estado) return false;
        if (!texto) return true;
        const identificador = (!propiedad?.disponible || solicitud.problemaDescifrado) ? `${solicitud.id} ${propiedad?.id ?? ''}`.toLowerCase() : '';
        return `${nombreCliente} ${emailCliente} ${tituloPropiedad} ${localidad} ${identificador}`.includes(texto);
      })
      .sort((a, b) => {
        const fechaA = new Date(a.createdAt).getTime();
        const fechaB = new Date(b.createdAt).getTime();
        return orden === 'recientes' ? fechaB - fechaA : fechaA - fechaB;
      });
  }, [busqueda, estado, orden, solicitudesPestana, tipo]);

  const cambiarPestana = (nuevaPestana: 'activas' | 'historial') => {
    setPestana(nuevaPestana);
    setVerArchivadas(false);
    setEstado('todas');
  };

  const cambiarVistaArchivadas = (archivadas: boolean) => {
    setVerArchivadas(archivadas);
    setEstado('todas');
  };

  const cerrarDetalle = () => {
    setSeleccionada(null);
    setAccionSeleccionada(null);
    setComentarioAccion('');
    setDocumentosSeleccionados([]);
    setConfirmandoAccion(null);
    if (preview) {
      URL.revokeObjectURL(preview.url);
      setPreview(null);
    }
  };

  const abrirDetalle = (solicitud: SolicitudAdmin) => {
    setSeleccionada(solicitud);
    setAccionSeleccionada(null);
    setComentarioAccion('');
    setDocumentosSeleccionados([]);
    setConfirmandoAccion(null);
  };

  const guardarEstado = async () => {
    if (!seleccionada || !confirmandoAccion || seleccionada.problemaDescifrado || actualizandoEstado) return;
    if (confirmandoAccion === 'rechazada' && !comentarioAccion.trim()) {
      setConfirmandoAccion(null);
      mostrar('Escribí el motivo del rechazo para continuar', 'peligro');
      return;
    }
    if (confirmandoAccion === 'pendiente' && !comentarioAccion.trim()) {
      setConfirmandoAccion(null);
      mostrar('Escribí un comentario para continuar', 'peligro');
      return;
    }

    const nuevoEstado: EstadoSolicitud = confirmandoAccion === 'pendiente' && documentosSeleccionados.length
      ? 'falta_documentacion'
      : confirmandoAccion;
    const comentario = confirmandoAccion === 'aprobada' ? '' : comentarioAccion.trim();
    setActualizandoEstado(true);
    try {
      const actualizada = await actualizarEstadoSolicitud(
        seleccionada.id,
        nuevoEstado,
        comentario,
        nuevoEstado === 'falta_documentacion' ? documentosSeleccionados : [],
      );
      const solicitudActualizada: SolicitudAdmin = {
        ...seleccionada,
        ...actualizada,
        datosPersonales: seleccionada.datosPersonales,
        documentos: seleccionada.documentos,
        problemaDescifrado: seleccionada.problemaDescifrado,
      };
      setSolicitudes((actuales) => actuales.map((item) => item.id === solicitudActualizada.id ? solicitudActualizada : item));
      window.dispatchEvent(new Event(EVENTO_SOLICITUDES));
      cerrarDetalle();
      if (actualizada.notificacion?.estado === 'fallida') {
        mostrar('La solicitud se actualizó, pero no se pudo enviar el correo al cliente.', 'info');
      } else if (actualizada.notificacion?.estado === 'sin_destinatario') {
        mostrar('La solicitud se actualizó, pero no hay una dirección de correo registrada para notificar al cliente.', 'info');
      } else if (actualizada.notificacion?.estado === 'simulada') {
        mostrar('La solicitud se actualizó. El correo fue simulado en este entorno.', 'info');
      } else {
        mostrar(`La solicitud se actualizó correctamente. El cliente fue notificado.`);
      }
    } catch (e) {
      mostrar(e instanceof Error ? e.message : 'No se pudo guardar el cambio. Intentá nuevamente.', 'peligro');
    } finally {
      setActualizandoEstado(false);
    }
  };

  const cambiarArchivado = async (solicitud: SolicitudAdmin, archivada: boolean) => {
    setArchivandoId(solicitud.id);
    try {
      const resultado = await actualizarArchivadoSolicitud(solicitud.id, archivada);
      setSolicitudes((actuales) => actuales.map((item) => item.id === resultado.id
        ? { ...item, archivada: resultado.archivada, archivadaEn: resultado.archivadaEn }
        : item));
      setSolicitudParaArchivar(null);
      mostrar(archivada ? 'Solicitud archivada.' : 'Solicitud restaurada.');
    } catch (e) {
      mostrar(e instanceof Error ? e.message : 'No se pudo actualizar el archivado de la solicitud.', 'peligro');
    } finally {
      setArchivandoId(null);
    }
  };

  const eliminarSolicitud = async () => {
    if (!solicitudParaEliminar || confirmacionEliminar !== 'ELIMINAR') return;
    setEliminando(true);
    try {
      await eliminarSolicitudDefinitivamente(solicitudParaEliminar.id);
      setSolicitudes((actuales) => actuales.filter((item) => item.id !== solicitudParaEliminar.id));
      if (seleccionada?.id === solicitudParaEliminar.id) cerrarDetalle();
      setSolicitudParaEliminar(null);
      setConfirmacionEliminar('');
      mostrar('La solicitud y sus documentos asociados se eliminaron definitivamente.');
    } catch (e) {
      mostrar(e instanceof Error ? e.message : 'No se pudo eliminar la solicitud de forma segura.', 'peligro');
    } finally {
      setEliminando(false);
    }
  };

  const abrirDocumento = async (documento: DocumentoSolicitud) => {
    if (!documento.url) return;
    try {
      const respuesta = await fetch(`${API_URL}${documento.url}`, conSesion({ method: 'GET' }));
      if (!respuesta.ok) throw new Error('No se pudo abrir el documento');
      const blob = await respuesta.blob();
      if (preview) URL.revokeObjectURL(preview.url);
      setPreview({
        url: URL.createObjectURL(blob),
        nombre: documento.nombre,
        mime: documento.tipoMime,
      });
    } catch {
      setError('No se pudo abrir este documento. Probá nuevamente o consultá con la inmobiliaria.');
    }
  };

  const datosPersonales = seleccionada?.datosPersonales as Record<string, unknown> | undefined;
  const camposPersonales = datosPersonales ? aplanarDatos(datosPersonales) : [];
  const camposPersonalesVisibles = camposPersonales.filter(({ clave }) => clave !== 'ingresosTipo');

  return (
    <>
      <Encabezado
        guia="solicitudes"
        titulo="Solicitudes"
        descripcion="Gestioná las solicitudes de alquiler y compra realizadas por los clientes."
      />
      {aviso}

      <div className="flex flex-col gap-6">
        {error && <Alerta tono="peligro" titulo="No se pudieron cargar algunas solicitudes.">{error}</Alerta>}

        <Tarjeta titulo="Listado de solicitudes" descripcion="Buscá por cliente o propiedad, filtrá por operación y revisá el estado actual.">
          <div className="flex flex-col gap-4">
            <div data-guia="pestanas" className="flex flex-wrap items-center gap-2 border-b border-panel-borde pb-4" role="tablist" aria-label="Secciones de solicitudes">
              <button
                type="button"
                role="tab"
                aria-selected={pestana === 'activas'}
                onClick={() => cambiarPestana('activas')}
                className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium transition-colors sm:min-h-0 ${pestana === 'activas' ? 'bg-panel-marca text-panel-marca-texto' : 'bg-panel-hundido text-panel-suave hover:text-panel-texto'}`}
              >
                Activas
                <span className="rounded-full bg-panel-superficie/20 px-2 py-0.5 text-[11px]">{solicitudes.filter((item) => !item.archivada && ['pendiente', 'falta_documentacion'].includes(item.estado)).length}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={pestana === 'historial'}
                onClick={() => cambiarPestana('historial')}
                className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium transition-colors sm:min-h-0 ${pestana === 'historial' ? 'bg-panel-marca text-panel-marca-texto' : 'bg-panel-hundido text-panel-suave hover:text-panel-texto'}`}
              >
                Historial
                <span className="rounded-full bg-panel-superficie/20 px-2 py-0.5 text-[11px]">{solicitudes.filter((item) => !item.archivada && ['aprobada', 'rechazada', 'vencida', 'cerrada'].includes(item.estado)).length}</span>
              </button>
              {pestana === 'historial' && (
                <div className="ml-auto flex rounded-lg border border-panel-borde bg-panel-hundido/50 p-1" aria-label="Filtro de archivado">
                  <button
                    type="button"
                    aria-pressed={!verArchivadas}
                    onClick={() => cambiarVistaArchivadas(false)}
                    className={`rounded-md px-3 py-1.5 text-[12px] font-medium ${!verArchivadas ? 'bg-panel-superficie text-panel-texto shadow-sm' : 'text-panel-suave hover:text-panel-texto'}`}
                  >
                    Revisadas
                  </button>
                  <button
                    type="button"
                    aria-pressed={verArchivadas}
                    onClick={() => cambiarVistaArchivadas(true)}
                    className={`rounded-md px-3 py-1.5 text-[12px] font-medium ${verArchivadas ? 'bg-panel-superficie text-panel-texto shadow-sm' : 'text-panel-suave hover:text-panel-texto'}`}
                  >
                    Archivadas
                  </button>
                </div>
              )}
            </div>

            <div data-guia="filtros" className="grid gap-3 md:grid-cols-[minmax(0,1.5fr)_220px_220px_180px]">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium uppercase tracking-[0.08em] text-panel-suave">Buscar</span>
                <input
                  value={busqueda}
                  onChange={(event) => setBusqueda(event.target.value)}
                  placeholder="Nombre, email o propiedad"
                  className="h-10 w-full rounded-lg border border-panel-borde-fuerte bg-panel-superficie px-3 text-sm text-panel-texto placeholder:text-panel-tenue focus:border-panel-acento focus:outline-none focus:ring-2 focus:ring-panel-acento-suave"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium uppercase tracking-[0.08em] text-panel-suave">Operación</span>
                <select value={tipo} onChange={(event) => setTipo(event.target.value as typeof tipo)} className="h-10 w-full rounded-lg border border-panel-borde-fuerte bg-panel-superficie px-3 text-sm text-panel-texto focus:border-panel-acento focus:outline-none focus:ring-2 focus:ring-panel-acento-suave">
                  <option value="todas">Todas</option>
                  <option value="compra">Compra</option>
                  <option value="alquiler">Alquiler</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium uppercase tracking-[0.08em] text-panel-suave">Estado</span>
                <select value={estado} onChange={(event) => setEstado(event.target.value as typeof estado)} className="h-10 w-full rounded-lg border border-panel-borde-fuerte bg-panel-superficie px-3 text-sm text-panel-texto focus:border-panel-acento focus:outline-none focus:ring-2 focus:ring-panel-acento-suave">
                  <option value="todas">Todos</option>
                  {(pestana === 'activas' || verArchivadas) && <option value="pendiente">Pendiente</option>}
                  {(pestana === 'activas' || verArchivadas) && <option value="falta_documentacion">Falta documentación</option>}
                  {(pestana === 'historial' || verArchivadas) && <option value="aprobada">Aprobada</option>}
                  {(pestana === 'historial' || verArchivadas) && <option value="rechazada">Rechazada</option>}
                  {(pestana === 'historial' || verArchivadas) && <option value="vencida">Vencida</option>}
                  {(pestana === 'historial' || verArchivadas) && <option value="cerrada">Cerrada</option>}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium uppercase tracking-[0.08em] text-panel-suave">Orden</span>
                <select value={orden} onChange={(event) => setOrden(event.target.value as typeof orden)} className="h-10 w-full rounded-lg border border-panel-borde-fuerte bg-panel-superficie px-3 text-sm text-panel-texto focus:border-panel-acento focus:outline-none focus:ring-2 focus:ring-panel-acento-suave">
                  <option value="recientes">Más recientes</option>
                  <option value="antiguos">Más antiguas</option>
                </select>
              </label>
            </div>

            {cargando ? (
              <div className="flex flex-col gap-3 pt-2">
                {[...Array(4)].map((_, index) => (
                  <div key={index} className="h-24 animate-pulse rounded-xl bg-panel-hundido" />
                ))}
              </div>
            ) : !error && solicitudesPestana.length === 0 ? (
              <EstadoVacio
                icono="info"
                titulo={pestana === 'activas' ? 'No hay solicitudes activas' : verArchivadas ? 'No hay solicitudes archivadas' : 'Todavía no hay solicitudes revisadas'}
                texto={pestana === 'activas'
                  ? 'Las solicitudes pendientes aparecerán aquí para que puedas revisarlas.'
                  : verArchivadas
                    ? 'Las solicitudes archivadas aparecerán aquí.'
                    : 'Las solicitudes aprobadas o rechazadas aparecerán aquí.'}
              />
            ) : !error && visibles.length === 0 ? (
              <EstadoVacio
                icono="info"
                titulo="No hay solicitudes que coincidan"
                texto="Probá cambiar la búsqueda o los filtros seleccionados."
              />
            ) : (
              <div data-guia="lista" className="flex flex-col gap-3 pt-2">
                {visibles.map((solicitud) => {
                  const nombreCliente = solicitud.problemaDescifrado ? 'No disponible' : obtenerNombreCliente(solicitud);
                  const emailCliente = solicitud.problemaDescifrado ? 'No disponible' : obtenerEmailCliente(solicitud);
                  const propiedad = solicitud.propiedad;
                  const imagen = propiedad?.imagen;
                  const propiedadNoDisponible = !propiedad || propiedad.disponible === false;
                  return (
                    <article key={solicitud.id} className="rounded-xl border border-panel-borde bg-panel-superficie/80 p-3 sm:p-4">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <span className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-panel-borde">
                            <ImagenPropiedad src={imagen} alt={propiedad?.titulo || 'Propiedad'} className="h-full w-full object-cover" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="m-0 truncate text-[15px] font-semibold text-panel-texto">{propiedadNoDisponible ? 'Propiedad vinculada no disponible' : propiedad.titulo || 'Propiedad sin título'}</h3>
                              <Insignia tono={estadoTono[solicitud.estado] ?? 'neutro'}>{etiquetaEstado(solicitud.estado)}</Insignia>
                              {solicitud.archivada && <Insignia tono="neutro">Archivada</Insignia>}
                              {solicitud.problemaDescifrado && <Insignia tono="peligro">Problema técnico</Insignia>}
                            </div>
                            <p className="m-0 mt-1 text-[13px] text-panel-suave">{propiedadNoDisponible ? `No se encontró la propiedad asociada${propiedad?.id ? ` (referencia ${propiedad.id})` : ''}.` : propiedad.direccion || propiedad.ciudad || 'Dirección no informada'}</p>
                            {solicitud.problemaDescifrado && (
                              <p className="m-0 mt-2 text-[13px] text-red-700">
                                No se pudo recuperar la información de esta solicitud. Se produjo un problema al descifrar sus datos.
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" style={{ alignItems: 'center' }}>
                          <div>
                            <p className="m-0 text-[11px] font-medium uppercase tracking-[0.08em] text-panel-tenue">Operación</p>
                            <p className="m-0 mt-1 text-[13px] font-medium text-panel-texto">{solicitud.operacion === 'compra' ? 'Compra' : 'Alquiler'}</p>
                          </div>
                          <div>
                            <p className="m-0 text-[11px] font-medium uppercase tracking-[0.08em] text-panel-tenue">Cliente</p>
                            <p className="m-0 mt-1 text-[13px] text-panel-texto">{nombreCliente}</p>
                          </div>
                          <div>
                            <p className="m-0 text-[11px] font-medium uppercase tracking-[0.08em] text-panel-tenue">Correo</p>
                            <p className="m-0 mt-1 truncate text-[13px] text-panel-texto">{emailCliente}</p>
                          </div>
                          <div>
                            <p className="m-0 text-[11px] font-medium uppercase tracking-[0.08em] text-panel-tenue">Fecha</p>
                            <p className="m-0 mt-1 text-[13px] text-panel-texto">{formatoFecha(solicitud.createdAt)}</p>
                          </div>
                        </div>

                        <div data-guia="acciones-fila" className="flex flex-wrap gap-2 xl:ml-auto">
                          <Boton onClick={() => abrirDetalle(solicitud)} icono="ojo" variante="principal" tamano="sm">
                            {solicitud.problemaDescifrado ? 'Ver incidencia' : 'Ver solicitud'}
                          </Boton>
                          {solicitud.archivada ? (
                            <Boton onClick={() => void cambiarArchivado(solicitud, false)} icono="flecha" tamano="sm" cargando={archivandoId === solicitud.id}>
                              Restaurar
                            </Boton>
                          ) : (
                            <Boton onClick={() => setSolicitudParaArchivar(solicitud)} tamano="sm">
                              Archivar
                            </Boton>
                          )}
                          <Boton
                            onClick={() => { setSolicitudParaEliminar(solicitud); setConfirmacionEliminar(''); }}
                            variante="peligro"
                            tamano="sm"
                          >
                            Eliminar definitivamente
                          </Boton>
                        </div>
                      </div>
                      <ActividadRegistro entidad="solicitud" id={solicitud.id} className="mt-3" />
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </Tarjeta>
      </div>

      <Dialogo abierto={Boolean(seleccionada)} alCerrar={cerrarDetalle} titulo={seleccionada ? `Solicitud de ${seleccionada.operacion === 'compra' ? 'compra' : 'alquiler'}` : 'Solicitud'} ancho="lg">
        {seleccionada && (
          <div className="flex flex-col gap-6">
            {seleccionada.problemaDescifrado ? (
              <Alerta tono="peligro" titulo="No se pudo recuperar la información de esta solicitud.">
                Se produjo un problema técnico al descifrar sus datos. La solicitud se conserva con su estado actual; la revisión y el acceso a su documentación quedan bloqueados hasta resolver la incidencia.
                <p className="mb-0 mt-2 text-[12px]">Identificador: {seleccionada.id}</p>
              </Alerta>
            ) : (
              <>
                <Tarjeta titulo="Información de la propiedad" descripcion="Datos de la propiedad y su disponibilidad actual." relleno={false} className="border-panel-borde bg-panel-hundido/10">
                  <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                    <div className="overflow-hidden rounded-xl border border-panel-borde bg-panel-hundido/30">
                      <ImagenPropiedad src={seleccionada.propiedad?.imagen} alt={seleccionada.propiedad?.titulo || 'Propiedad'} className="h-56 w-full object-cover" />
                    </div>
                    <div className="flex flex-col gap-3 rounded-xl border border-panel-borde bg-panel-superficie p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="m-0 text-[20px] font-semibold leading-tight">
                          {seleccionada.propiedad?.disponible === false ? 'Propiedad vinculada no disponible' : seleccionada.propiedad?.titulo || 'Propiedad no disponible'}
                        </h3>
                        <Insignia tono={seleccionada.propiedad?.disponible === false ? 'neutro' : 'aviso'}>
                          {seleccionada.propiedad?.estadoPropiedad || 'Disponibilidad no informada'}
                        </Insignia>
                      </div>
                      <p className="m-0 text-[14px] text-panel-suave">
                        {seleccionada.propiedad?.disponible === false
                          ? `No se encontró la propiedad asociada${seleccionada.propiedad.id ? ` (referencia ${seleccionada.propiedad.id})` : ''}.`
                          : seleccionada.propiedad?.direccion || seleccionada.propiedad?.ciudad || 'Dirección no informada'}
                      </p>
                      <div className="grid gap-2 pt-2 text-[13px] text-panel-suave sm:grid-cols-2">
                        <div><span className="font-medium text-panel-texto">Localidad:</span> {seleccionada.propiedad?.ciudad || 'No informada'}</div>
                        <div><span className="font-medium text-panel-texto">Tipo:</span> {seleccionada.propiedad?.tipoInmueble || 'No informado'}</div>
                        <div><span className="font-medium text-panel-texto">Operación:</span> {seleccionada.operacion === 'compra' ? 'Compra' : 'Alquiler'}</div>
                        <div><span className="font-medium text-panel-texto">Precio:</span> {formatoMoneda(seleccionada.propiedad?.precio, seleccionada.propiedad?.moneda)}</div>
                      </div>
                    </div>
                  </div>
                </Tarjeta>

                <Tarjeta titulo="Información personal del solicitante" descripcion="Datos completados por el cliente al enviar la solicitud." relleno={false} className="border-panel-borde bg-panel-hundido/10">
                  <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
                    {camposPersonalesVisibles.length ? (
                      camposPersonalesVisibles.map(({ clave, valor }) => (
                        <div key={`${seleccionada.id}-${clave}`} className="rounded-lg border border-panel-borde bg-panel-hundido/20 p-3">
                          <p className="m-0 text-[11px] font-medium uppercase tracking-[0.08em] text-panel-tenue">{tituloCampo(clave)}</p>
                          <p className="m-0 mt-1 break-words text-[14px] text-panel-texto">{presentarValor(clave, valor)}</p>
                        </div>
                      ))
                    ) : (
                      <p className="m-0 text-[14px] text-panel-suave">No se registraron datos personales detallados para esta solicitud.</p>
                    )}
                  </div>
                </Tarjeta>

                <Tarjeta titulo="Documentación presentada" descripcion="Archivos adjuntados y cifrados por el cliente." relleno={false} className="border-panel-borde bg-panel-hundido/10">
                  <div className="flex flex-col gap-4 p-5">
                    {seleccionada.documentos?.length ? (
                      <>
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {seleccionada.documentos.map((documento, index) => (
                            <div key={`${seleccionada.id}-${documento.tipo}-${index}`} className="rounded-lg border border-panel-borde bg-panel-hundido/20 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="m-0 whitespace-normal break-words text-[14px] font-medium text-panel-texto">{nombreDocumentoPresentado(seleccionada.documentos ?? [], index)}</p>
                              <p className="m-0 mt-1 text-[12px] text-panel-suave">{documento.tipoMime}</p>
                            </div>
                            <Icono nombre="imagen" className="mt-0.5 h-4 w-4 text-panel-suave" />
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Boton onClick={() => abrirDocumento(documento)} icono="ojo" tamano="sm">
                              Ver
                            </Boton>
                            <a href={`${API_URL}${documento.url ?? ''}`} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-panel-borde-fuerte bg-panel-superficie px-3 text-[13px] text-panel-texto hover:bg-panel-hundido">
                              <Icono nombre="descargar" className="h-4 w-4" />
                              Descargar
                            </a>
                          </div>
                        </div>
                          ))}
                        </div>

                        {preview && (
                          <div className="rounded-xl border border-panel-borde bg-panel-hundido/20 p-3">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <p className="m-0 text-[13px] font-medium text-panel-texto">Vista previa de {preview.nombre}</p>
                          <button type="button" onClick={() => { URL.revokeObjectURL(preview.url); setPreview(null); }} className="rounded-md p-1.5 text-panel-tenue hover:bg-panel-hundido hover:text-panel-texto" aria-label="Cerrar vista previa">
                            <Icono nombre="cerrar" className="h-[18px] w-[18px]" />
                          </button>
                        </div>
                        {preview.mime.startsWith('image/') ? (
                          // eslint-disable-next-line @next/next/no-img-element -- Blob temporal descifrado y protegido por sesión.
                          <img src={preview.url} alt={preview.nombre} className="max-h-[420px] w-full rounded-lg object-contain" />
                        ) : (
                          <iframe title={preview.nombre} src={preview.url} className="h-[520px] w-full rounded-lg border border-panel-borde bg-white" />
                        )}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="m-0 text-[14px] text-panel-suave">Esta solicitud no adjuntó documentos.</p>
                    )}
                  </div>
                </Tarjeta>

                <Tarjeta
                  titulo="Estado de la solicitud"
                  descripcion="Acciones administrativas y registro de las decisiones sobre esta solicitud."
                  relleno={false}
                  className="border-panel-acento bg-panel-acento-suave/20 shadow-lg shadow-black/10"
                >
                  <div className="flex flex-col gap-5 p-5">
                    <div className="rounded-xl border border-panel-acento/60 bg-panel-superficie px-4 py-4">
                      <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.1em] text-panel-tenue">Estado actual</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <Insignia tono={estadoTono[seleccionada.estado] ?? 'neutro'} className="px-3 py-1 text-[14px]">
                          {etiquetaEstado(seleccionada.estado)}
                        </Insignia>
                        <span className="text-[12px] text-panel-tenue">Estado registrado para esta solicitud.</span>
                      </div>
                    </div>

                    {seleccionada.estado === 'pendiente' ? (
                      <>
                        <div className="flex flex-wrap gap-2">
                          <Boton
                            onClick={() => {
                              setAccionSeleccionada('pendiente');
                              setComentarioAccion('');
                              setDocumentosSeleccionados([]);
                              setConfirmandoAccion(null);
                            }}
                            disabled={actualizandoEstado}
                          >
                            Mantener pendiente
                          </Boton>
                          <Boton
                            onClick={() => {
                              setAccionSeleccionada(null);
                              setConfirmandoAccion('aprobada');
                            }}
                            variante="principal"
                            disabled={actualizandoEstado}
                          >
                            Aprobar
                          </Boton>
                          <Boton
                            onClick={() => {
                              setAccionSeleccionada('rechazada');
                              setComentarioAccion('');
                              setDocumentosSeleccionados([]);
                              setConfirmandoAccion(null);
                            }}
                            variante="peligro"
                            disabled={actualizandoEstado}
                          >
                            Rechazar
                          </Boton>
                        </div>

                        {accionSeleccionada === 'pendiente' && (
                          <div className="flex flex-col gap-4 rounded-xl border border-panel-borde-fuerte bg-panel-superficie p-4">
                            <h4 className="m-0 text-[14px] font-semibold text-panel-texto">Documentación solicitada o a corregir</h4>
                            {obtenerDocumentosSolicitables(seleccionada).map((grupo) => (
                              <fieldset key={grupo.titulo} className="m-0 flex flex-col gap-2 border-0 p-0">
                                <legend className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-panel-tenue">{grupo.titulo}</legend>
                                {grupo.documentos.map((documento) => (
                                  <label key={documento.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-panel-borde bg-panel-hundido/20 px-3 py-2.5 text-[13px] text-panel-texto">
                                    <input
                                      type="checkbox"
                                      checked={documentosSeleccionados.includes(documento.id)}
                                      onChange={(event) => setDocumentosSeleccionados((actuales) => event.target.checked
                                        ? [...actuales, documento.id]
                                        : actuales.filter((id) => id !== documento.id))}
                                      className="mt-0.5 accent-panel-acento"
                                    />
                                    <span className="break-words">{documento.nombre}</span>
                                  </label>
                                ))}
                              </fieldset>
                            ))}
                            <label className="flex flex-col gap-1.5">
                              <span className="text-[13px] font-medium text-panel-texto">Comentario obligatorio</span>
                              <textarea
                                value={comentarioAccion}
                                onChange={(event) => setComentarioAccion(event.target.value)}
                                maxLength={250}
                                rows={3}
                                placeholder="Explicá qué debe corregir el cliente"
                                aria-describedby="contador-comentario-solicitud"
                                className="min-w-0 w-full whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-lg border border-panel-borde-fuerte bg-panel-hundido px-3 py-2 text-sm text-panel-texto placeholder:text-panel-tenue focus:border-panel-acento focus:outline-none focus:ring-2 focus:ring-panel-acento-suave"
                              />
                              <span id="contador-comentario-solicitud" className="text-right text-[12px] text-panel-tenue">{comentarioAccion.length}/250</span>
                            </label>
                            <div className="flex flex-wrap gap-2">
                              <Boton
                                onClick={() => setConfirmandoAccion('pendiente')}
                                variante="principal"
                                disabled={!comentarioAccion.trim() || actualizandoEstado}
                              >
                                Continuar
                              </Boton>
                              <Boton onClick={() => { setAccionSeleccionada(null); setComentarioAccion(''); setDocumentosSeleccionados([]); }}>
                                Cancelar
                              </Boton>
                            </div>
                          </div>
                        )}

                        {accionSeleccionada === 'rechazada' && (
                          <div className="flex flex-col gap-3 rounded-xl border border-panel-borde-fuerte bg-panel-superficie p-4">
                            <label className="flex flex-col gap-1.5">
                              <span className="text-[13px] font-medium text-panel-texto">Motivo del rechazo</span>
                              <textarea
                                value={comentarioAccion}
                                onChange={(event) => setComentarioAccion(event.target.value)}
                                maxLength={250}
                                rows={3}
                                placeholder="Explicá brevemente por qué se rechaza esta solicitud. El cliente podrá ver este motivo."
                                className="min-w-0 w-full whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-lg border border-panel-borde-fuerte bg-panel-hundido px-3 py-2 text-sm text-panel-texto placeholder:text-panel-tenue focus:border-panel-acento focus:outline-none focus:ring-2 focus:ring-panel-acento-suave"
                              />
                              <span className="text-right text-[12px] text-panel-tenue">{comentarioAccion.length}/250</span>
                            </label>
                            <div className="flex flex-wrap gap-2">
                              <Boton
                                onClick={() => {
                                  if (!comentarioAccion.trim()) {
                                    mostrar('Escribí el motivo del rechazo para continuar', 'peligro');
                                    return;
                                  }
                                  setConfirmandoAccion('rechazada');
                                }}
                                variante="peligro"
                                disabled={actualizandoEstado}
                              >
                                Continuar con el rechazo
                              </Boton>
                              <Boton onClick={() => { setAccionSeleccionada(null); setComentarioAccion(''); }}>
                                Cancelar
                              </Boton>
                            </div>
                          </div>
                        )}
                      </>
                    ) : seleccionada.estado === 'falta_documentacion' ? (
                      <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 p-4">
                        <Alerta tono="aviso" titulo="Esperando documentación del cliente">
                          Esta solicitud debe conservar este estado hasta que el cliente presente las correcciones.
                        </Alerta>
                        <div className="mt-3 rounded-lg border border-panel-borde bg-panel-superficie p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h4 className="m-0 text-[13px] font-semibold text-panel-texto">Documentación solicitada</h4>
                            <span className="text-[12px] text-panel-tenue">Pedido el {formatoFecha(seleccionada.documentosSolicitadosEn ?? undefined)}</span>
                          </div>
                          <ul className="m-0 mt-2 flex list-disc flex-col gap-1 pl-5 text-[13px] text-panel-suave">
                            {(seleccionada.documentosSolicitados ?? []).map((id) => {
                              const documento = obtenerDocumentosSolicitables(seleccionada)
                                .flatMap((grupo) => grupo.documentos)
                                .find((item) => item.id === id);
                              const nombreRecibo = /^recibosIngresos:(\d+)$/.exec(id);
                              return <li key={id}>{documento?.nombre || (nombreRecibo ? `Recibo de sueldo (${Number(nombreRecibo[1]) + 1} de 3)` : 'Documento solicitado')}</li>;
                            })}
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <p className="m-0 text-[13px] text-panel-suave">Las acciones de revisión están disponibles solamente para solicitudes pendientes.</p>
                    )}

                    <div className="border-t border-panel-acento/40 pt-4">
                      <h4 className="m-0 text-[14px] font-semibold text-panel-texto">Historial de estados y comentarios</h4>
                      {seleccionada.historialEstados?.length ? (
                        <ol className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
                          {seleccionada.historialEstados.map((cambio, index) => (
                            <li key={`${seleccionada.id}-${index}`} className="rounded-lg border border-panel-borde bg-panel-superficie/80 px-3 py-2.5">
                              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                                <p className="m-0 text-[13px] font-medium text-panel-texto">{etiquetaEstado(cambio.estado)}</p>
                                <time dateTime={cambio.fecha} className="text-[12px] text-panel-tenue">{formatoFecha(cambio.fecha)}</time>
                              </div>
                              {cambio.tipoEvento === 'documentacion_presentada'
                                ? <p className="m-0 mt-1 text-[13px] text-panel-suave">El cliente presentó la documentación solicitada.</p>
                                : cambio.comentario && <p className="m-0 mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-[13px] text-panel-suave">{cambio.comentario}</p>}
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="m-0 mt-2 text-[13px] text-panel-tenue">Todavía no hay cambios ni comentarios registrados.</p>
                      )}
                    </div>
                  </div>
                </Tarjeta>
              </>
            )}
          </div>
        )}
      </Dialogo>

      <Dialogo
        abierto={Boolean(confirmandoAccion)}
        alCerrar={() => setConfirmandoAccion(null)}
        titulo={confirmandoAccion === 'aprobada' ? 'Confirmar aprobación' : confirmandoAccion === 'rechazada' ? 'Confirmar rechazo' : documentosSeleccionados.length ? 'Confirmar solicitud de documentación' : 'Confirmar solicitud pendiente'}
      >
        {confirmandoAccion && seleccionada && (
          <div className="flex flex-col gap-4">
            <p className="m-0 text-[14px] leading-relaxed text-panel-suave">
              {confirmandoAccion === 'aprobada'
                ? '¿Estás seguro de aprobar esta solicitud? El cliente será notificado.'
                : confirmandoAccion === 'rechazada'
                  ? '¿Estás seguro de rechazar esta solicitud? El cliente será notificado.'
                  : documentosSeleccionados.length
                    ? 'Se solicitarán las siguientes correcciones y el cliente será notificado:'
                    : 'La solicitud se mantendrá pendiente y el cliente será notificado.'}
            </p>
            {confirmandoAccion === 'pendiente' && documentosSeleccionados.length > 0 && (
              <>
                <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-[13px] text-panel-texto">
                  {obtenerDocumentosSolicitables(seleccionada)
                    .flatMap((grupo) => grupo.documentos)
                    .filter((documento) => documentosSeleccionados.includes(documento.id))
                    .map((documento) => <li key={documento.id}>{documento.nombre}</li>)}
                </ul>
              </>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Boton onClick={() => setConfirmandoAccion(null)} disabled={actualizandoEstado}>Cancelar</Boton>
              <Boton
                onClick={() => void guardarEstado()}
                variante={confirmandoAccion === 'rechazada' ? 'peligro' : 'principal'}
                cargando={actualizandoEstado}
              >
                {confirmandoAccion === 'aprobada' ? 'Confirmar aprobación' : confirmandoAccion === 'rechazada' ? 'Confirmar rechazo' : documentosSeleccionados.length ? 'Confirmar solicitud' : 'Confirmar pendiente'}
              </Boton>
            </div>
          </div>
        )}
      </Dialogo>

      <Dialogo
        abierto={Boolean(solicitudParaArchivar)}
        alCerrar={() => setSolicitudParaArchivar(null)}
        titulo={solicitudParaArchivar?.archivada ? 'Restaurar solicitud' : 'Archivar solicitud'}
      >
        {solicitudParaArchivar && (
          <div className="flex flex-col gap-4">
            <p className="m-0 text-[14px] leading-relaxed text-panel-suave">
              {solicitudParaArchivar.archivada
                ? 'La solicitud volverá a aparecer en la lista correspondiente a su estado actual.'
                : 'La solicitud dejará de aparecer en las listas habituales, pero sus datos, documentos y estado se conservarán.'}
            </p>
            {solicitudParaArchivar.estado === 'pendiente' && !solicitudParaArchivar.archivada && (
              <Alerta tono="aviso" titulo="Esta solicitud todavía requiere revisión">
                Al archivarla ya no aparecerá entre las solicitudes activas. Podés recuperarla desde Historial → Archivadas.
              </Alerta>
            )}
            <div className="rounded-lg border border-panel-borde bg-panel-hundido/20 p-3">
              <p className="m-0 text-[13px] font-medium text-panel-texto">
                {solicitudParaArchivar.problemaDescifrado ? 'Cliente no disponible por una incidencia técnica' : obtenerNombreCliente(solicitudParaArchivar)}
              </p>
              <p className="m-0 mt-1 text-[12px] text-panel-suave">Solicitud · {solicitudParaArchivar.id}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Boton onClick={() => setSolicitudParaArchivar(null)} disabled={archivandoId !== null}>Cancelar</Boton>
              <Boton
                onClick={() => void cambiarArchivado(solicitudParaArchivar, !solicitudParaArchivar.archivada)}
                variante="principal"
                cargando={archivandoId === solicitudParaArchivar.id}
              >
                {solicitudParaArchivar.archivada ? 'Restaurar' : 'Archivar solicitud'}
              </Boton>
            </div>
          </div>
        )}
      </Dialogo>

      <Dialogo
        abierto={Boolean(solicitudParaEliminar)}
        alCerrar={() => {
          if (!eliminando) {
            setSolicitudParaEliminar(null);
            setConfirmacionEliminar('');
          }
        }}
        titulo="Eliminar definitivamente"
      >
        {solicitudParaEliminar && (() => {
          const propiedad = solicitudParaEliminar.propiedad;
          const tituloPropiedad = propiedad?.titulo
            || (propiedad?.disponible === false ? 'Propiedad vinculada no disponible' : 'Propiedad no informada');
          const cliente = solicitudParaEliminar.problemaDescifrado
            ? 'No disponible (incidencia técnica de descifrado)'
            : obtenerNombreCliente(solicitudParaEliminar);

          return (
            <div className="flex flex-col gap-4">
              <Alerta tono="peligro" titulo="Esta acción es irreversible">
                Se eliminarán permanentemente esta solicitud, su historial y los documentos que estén asociados exclusivamente a ella. El cliente ya no podrá consultar esta solicitud en la futura HU-24.
              </Alerta>
              <div className="rounded-lg border border-panel-borde bg-panel-hundido/20 p-3">
                <dl className="m-0 grid gap-3 text-[13px] sm:grid-cols-2">
                  <div className="min-w-0">
                    <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-panel-tenue">Identificador</dt>
                    <dd className="m-0 mt-1 break-all font-medium text-panel-texto">{solicitudParaEliminar.id}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-panel-tenue">Cliente</dt>
                    <dd className="m-0 mt-1 break-words font-medium text-panel-texto">{cliente}</dd>
                  </div>
                  <div className="min-w-0 sm:col-span-2">
                    <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-panel-tenue">Propiedad</dt>
                    <dd className="m-0 mt-1 break-words font-medium text-panel-texto">{tituloPropiedad}</dd>
                    {propiedad?.id && <dd className="m-0 mt-1 break-all text-[12px] text-panel-suave">Referencia: {propiedad.id}</dd>}
                  </div>
                </dl>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-panel-texto">Escribí ELIMINAR para confirmar</span>
                <input
                  value={confirmacionEliminar}
                  onChange={(event) => setConfirmacionEliminar(event.target.value)}
                  autoComplete="off"
                  className="h-10 w-full rounded-lg border border-panel-borde-fuerte bg-panel-superficie px-3 text-sm text-panel-texto focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                />
              </label>
              <div className="flex flex-wrap justify-end gap-2">
                <Boton
                  onClick={() => { setSolicitudParaEliminar(null); setConfirmacionEliminar(''); }}
                  disabled={eliminando}
                >
                  Cancelar
                </Boton>
                <Boton
                  onClick={() => void eliminarSolicitud()}
                  variante="peligro"
                  disabled={confirmacionEliminar !== 'ELIMINAR'}
                  cargando={eliminando}
                >
                  Eliminar definitivamente
                </Boton>
              </div>
            </div>
          );
        })()}
      </Dialogo>

    </>
  );
}

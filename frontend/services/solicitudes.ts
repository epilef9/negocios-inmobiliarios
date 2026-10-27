import { request } from "./api";

export type TipoOperacionSolicitud = "alquiler" | "compra";

export type SolicitudCreada = {
	id: string;
	estado: "pendiente";
	createdAt: string;
};

export type SolicitudNotificacion = {
	id: string;
	mensaje: string;
	leida: boolean;
	createdAt: string;
	solicitudId: string;
	estado: string;
	operacion: TipoOperacionSolicitud;
	propiedad: string;
};

export type EstadoSolicitud = "pendiente" | "aprobada" | "rechazada" | "vencida" | "cerrada";

export type SolicitudResumen = {
	id: string;
	operacion: TipoOperacionSolicitud;
	estado: EstadoSolicitud;
	createdAt: string;
	comentarioEstado?: string;
	comentarioFecha?: string | null;
	historialEstados?: { estado: string; comentario: string; comentarioReferenciaIndice?: number; fecha: string }[];
	archivada?: boolean;
	archivadaAt?: string | null;
	propiedad: { id: string; disponible?: boolean; titulo: string | null; ciudad: string | null; imagen?: string | null; direccion?: string | null; tipoInmueble?: string | null; estadoPropiedad?: string | null; tipoOperacion?: string | null; precio?: number | null; moneda?: string | null } | null;
};

export type DocumentoSolicitud = {
	tipo: string;
	nombre: string;
	tamano: number;
	mimeType: string;
	url?: string;
};

export type SolicitudAdmin = SolicitudResumen & {
	updatedAt?: string;
	datosPersonales?: Record<string, unknown>;
	documentos?: DocumentoSolicitud[];
	problemaDescifrado?: boolean;
};

export type DocumentoSubido = { id: string; tipo: string };
const cargas = new WeakMap<File, Map<string, DocumentoSubido>>();

// Una foto grande se reduce antes de viajar; los PDF no se alteran.
async function prepararDocumento(archivo: File): Promise<File> {
    const maximo = 4 * 1024 * 1024;
    if (archivo.size <= maximo) return archivo;
    if (!['image/jpeg', 'image/png'].includes(archivo.type)) throw new Error(`El PDF "${archivo.name}" debe pesar hasta 4 MB.`);
    const imagen = await createImageBitmap(archivo);
    try {
        const escala = Math.min(1, 2400 / Math.max(imagen.width, imagen.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(imagen.width * escala);
        canvas.height = Math.round(imagen.height * escala);
        const contexto = canvas.getContext('2d');
        if (!contexto) throw new Error('No pudimos preparar la foto. Probá con una imagen más chica.');
        contexto.fillStyle = '#ffffff';
        contexto.fillRect(0, 0, canvas.width, canvas.height);
        contexto.drawImage(imagen, 0, 0, canvas.width, canvas.height);
        for (const calidad of [0.9, 0.8, 0.7]) {
            const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', calidad));
            if (blob && blob.size <= maximo) return new File([blob], archivo.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
        }
        throw new Error(`La foto "${archivo.name}" sigue siendo muy grande. Elegí una de menor tamaño.`);
    } finally { imagen.close(); }
}

export const crearSolicitud = async (formData: FormData, claveIdempotencia: string, progreso?: (texto: string) => void) => {
    const adjuntos = [...formData.entries()].filter((entrada): entrada is [string, File] => entrada[1] instanceof File);
    const documentos: DocumentoSubido[] = [];
    for (const [indice, [tipo, archivo]] of adjuntos.entries()) {
        progreso?.(`Subiendo documento ${indice + 1} de ${adjuntos.length}…`);
        const clave = `${claveIdempotencia}:${tipo}`;
        let referencia = cargas.get(archivo)?.get(clave);
        if (!referencia) {
            const envio = new FormData();
            envio.append('archivo', await prepararDocumento(archivo));
            referencia = await request<DocumentoSubido>(`/solicitudes/documentos/${tipo}`, {
                method: 'POST', headers: { 'Idempotency-Key': claveIdempotencia }, body: envio,
            });
            const cache = cargas.get(archivo) || new Map<string, DocumentoSubido>();
            cache.set(clave, referencia);
            cargas.set(archivo, cache);
        }
        documentos.push(referencia);
    }
    progreso?.('Guardando solicitud…');
    const resultado = await request<SolicitudCreada>('/solicitudes', {
        method: 'POST', headers: { 'Idempotency-Key': claveIdempotencia },
        body: JSON.stringify({ datos: formData.get('datos'), documentos }),
    });
    if (!resultado || typeof resultado.id !== 'string' || typeof resultado.createdAt !== 'string') {
        throw new Error('El servidor no confirmó que la solicitud quedó guardada. Probá de nuevo en un momento.');
    }
    return resultado;
};

export const getMisSolicitudes = () => request<SolicitudResumen[]>("/solicitudes/mias");

export const getSolicitudesAdmin = () => request<SolicitudAdmin[]>("/solicitudes/admin");

export const getSolicitudAdmin = (id: string) => request<SolicitudAdmin>(`/solicitudes/${id}`);

export const actualizarEstadoSolicitud = (id: string, estado: EstadoSolicitud, comentario: string, reutilizarComentario = false) =>
	request<SolicitudAdmin>(`/solicitudes/${id}/estado`, {
		method: "PATCH",
		body: JSON.stringify({ estado, comentario, reutilizarComentario }),
	});

export const agregarComentarioSolicitud = (id: string, comentario: string) =>
	request<SolicitudAdmin>(`/solicitudes/${id}/comentarios`, {
		method: "POST",
		body: JSON.stringify({ comentario }),
	});

export const actualizarArchivadoSolicitud = (id: string, archivada: boolean) =>
	request<{ id: string; archivada: boolean; archivadaAt: string | null }>(`/solicitudes/${id}/archivo`, {
		method: "PATCH",
		body: JSON.stringify({ archivada }),
	});

export const eliminarSolicitudDefinitivamente = (id: string) =>
	request<{ id: string }>(`/solicitudes/${id}`, { method: "DELETE" });

export const getNotificacionesSolicitudes = () =>
	request<SolicitudNotificacion[]>("/solicitudes/admin/notificaciones");

export const EVENTO_SOLICITUDES = 'solicitudes-actualizadas';
export const getCantidadSolicitudesPendientes = () => request<number>('/solicitudes/admin/pendientes');

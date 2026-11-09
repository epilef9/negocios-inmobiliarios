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

export type EstadoSolicitud = "pendiente" | "falta_documentacion" | "aprobada" | "rechazada" | "vencida" | "cerrada";

export type SolicitudResumen = {
	id: string;
	operacion: TipoOperacionSolicitud;
	estado: EstadoSolicitud;
	createdAt: string;
	comentarioEstado?: string;
	comentarioFecha?: string | null;
	historialEstados?: { estado: string; comentario: string; comentarioReferenciaIndice?: number; tipoEvento?: "documentacion_presentada"; fecha: string }[];
	documentosSolicitados?: string[];
	documentosSolicitadosEn?: string | null;
	archivada?: boolean;
	archivadaEn?: string | null;
	propiedad: { id: string; disponible?: boolean; titulo: string | null; ciudad: string | null; imagen?: string | null; direccion?: string | null; tipoInmueble?: string | null; estadoPropiedad?: string | null; tipoOperacion?: string | null; precio?: number | null; moneda?: string | null } | null;
};

export type DocumentoSolicitud = {
	tipo: string;
	indice?: number;
	nombre: string;
	tamano: number;
	tipoMime: string;
	url?: string;
};

export type SolicitudAdmin = SolicitudResumen & {
	updatedAt?: string;
	datosPersonales?: Record<string, unknown>;
	documentos?: DocumentoSolicitud[];
	documentosSolicitados?: string[];
	documentosSolicitadosEn?: string | null;
	documentosSolicitadosPor?: string | null;
	notificacion?: { estado: "enviada" | "simulada" | "fallida" | "sin_destinatario" };
	problemaDescifrado?: boolean;
};

export type DocumentoSubido = { id: string; tipo: string };
const cargas = new WeakMap<File, Map<string, DocumentoSubido>>();

// Una foto grande se reduce antes de viajar; los PDF no se alteran.
async function prepararDocumento(archivo: File): Promise<File> {
    const maximoPdf = 4 * 1024 * 1024;
    const maximoImagen = 20 * 1024 * 1024;
    if (archivo.size <= 0) throw new Error(`El archivo "${archivo.name}" está vacío.`);
    if (archivo.type === 'application/pdf') {
        if (archivo.size > maximoPdf) throw new Error(`El PDF "${archivo.name}" debe pesar hasta 4 MB.`);
        return archivo;
    }
    if (!['image/jpeg', 'image/png'].includes(archivo.type)) {
        throw new Error(`El archivo "${archivo.name}" debe ser PDF, JPG o PNG.`);
    }
    if (archivo.size > maximoImagen) throw new Error(`La imagen "${archivo.name}" debe pesar hasta 20 MB antes de optimizarla.`);
    if (archivo.size <= maximoPdf) return archivo;
    let imagen: ImageBitmap;
    try {
        imagen = await createImageBitmap(archivo);
    } catch {
        throw new Error(`No pudimos leer la imagen "${archivo.name}". Elegí otro archivo JPG o PNG.`);
    }
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
            if (blob && blob.size <= maximoPdf) return new File([blob], archivo.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
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

export async function corregirDocumentacionSolicitud(
	id: string,
	archivos: Record<string, File>,
	claveIdempotencia: string,
	progreso?: (texto: string) => void,
): Promise<{ solicitud: SolicitudResumen; repetida: boolean; notificacion?: { estado: "enviada" | "simulada" | "fallida" | "sin_destinatario" } }> {
	const referencias: { id: string; tipo: string; indice?: number }[] = [];
	const entradas = Object.entries(archivos);
	if (!entradas.length) throw new Error("Adjuntá todos los documentos que te solicitaron.");
	const preparados: File[] = [];
	for (const [, archivo] of entradas) preparados.push(await prepararDocumento(archivo));

	for (const [indice, [solicitado]] of entradas.entries()) {
		const recibo = /^recibosIngresos:(\d+)$/.exec(solicitado);
		const tipo = recibo ? "recibosIngresos" : solicitado;
		const formData = new FormData();
		formData.append("archivo", preparados[indice]);
		progreso?.(`Preparando documento ${indice + 1} de ${entradas.length}…`);
		const referencia = await request<DocumentoSubido>(`/solicitudes/documentos/${encodeURIComponent(tipo)}`, {
			method: "POST",
			headers: { "Idempotency-Key": claveIdempotencia },
			body: formData,
		});
		referencias.push({
			id: referencia.id,
			tipo,
			...(recibo ? { indice: Number(recibo[1]) } : {}),
		});
	}

	progreso?.("Guardando la documentación corregida…");
	return request<{ solicitud: SolicitudResumen; repetida: boolean; notificacion?: { estado: "enviada" | "simulada" | "fallida" | "sin_destinatario" } }>(`/solicitudes/${encodeURIComponent(id)}/documentacion`, {
		method: "POST",
		headers: { "Idempotency-Key": claveIdempotencia },
		body: JSON.stringify({ documentos: referencias }),
	});
}

export const getMisSolicitudes = () => request<SolicitudResumen[]>("/solicitudes/mias");

export const getSolicitudesAdmin = () => request<SolicitudAdmin[]>("/solicitudes/admin");

export const getSolicitudAdmin = (id: string) => request<SolicitudAdmin>(`/solicitudes/${id}`);

export const actualizarEstadoSolicitud = (id: string, estado: EstadoSolicitud, comentario: string, documentosSolicitados: string[] = []) =>
	request<SolicitudAdmin>(`/solicitudes/${id}/estado`, {
		method: "PATCH",
		body: JSON.stringify({ estado, comentario, documentosSolicitados }),
	});

export const agregarComentarioSolicitud = (id: string, comentario: string) =>
	request<SolicitudAdmin>(`/solicitudes/${id}/comentarios`, {
		method: "POST",
		body: JSON.stringify({ comentario }),
	});

export const actualizarArchivadoSolicitud = (id: string, archivada: boolean) =>
	request<{ id: string; archivada: boolean; archivadaEn: string | null }>(`/solicitudes/${id}/archivo`, {
		method: "PATCH",
		body: JSON.stringify({ archivada }),
	});

export const eliminarSolicitudDefinitivamente = (id: string) =>
	request<{ id: string }>(`/solicitudes/${id}`, { method: "DELETE" });

export const getNotificacionesSolicitudes = () =>
	request<SolicitudNotificacion[]>("/solicitudes/admin/notificaciones");

export const EVENTO_SOLICITUDES = 'solicitudes-actualizadas';
export const getCantidadSolicitudesPendientes = () => request<number>('/solicitudes/admin/pendientes');

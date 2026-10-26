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

export type EstadoSolicitud = "pendiente" | "aprobada" | "rechazada";

export type SolicitudResumen = {
	id: string;
	operacion: TipoOperacionSolicitud;
	estado: EstadoSolicitud;
	createdAt: string;
	comentarioEstado?: string;
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

export const crearSolicitud = async (formData: FormData, claveIdempotencia: string) => {
	const resultado = await request<SolicitudCreada>("/solicitudes", {
		method: "POST",
		headers: { "Idempotency-Key": claveIdempotencia },
		body: formData,
	});
	if (!resultado || typeof resultado.id !== "string" || resultado.estado !== "pendiente" || typeof resultado.createdAt !== "string") {
		throw new Error("El servidor no confirmó que la solicitud quedó guardada. Probá de nuevo en un momento.");
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

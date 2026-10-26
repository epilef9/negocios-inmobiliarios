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

export type SolicitudResumen = {
	id: string;
	operacion: TipoOperacionSolicitud;
	estado: string;
	createdAt: string;
	propiedad: { id: string; titulo: string; ciudad: string } | null;
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

export const getNotificacionesSolicitudes = () =>
	request<SolicitudNotificacion[]>("/solicitudes/admin/notificaciones");

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
	const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
	const isFormData = options.body instanceof FormData;
	const response = await fetch(`${API_URL}${path}`, {
		...options,
		headers: {
			...(isFormData ? {} : { "Content-Type": "application/json" }),
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...options.headers,
		},
	});
	const body = await response.json().catch(() => ({}));
	if (!response.ok) throw new Error(body.message ?? "No se pudo completar la operación");
	return body.data as T;
}

export type ApiProperty = {
	_id: string;
	title: string;
	codigoInterno?: string;
	description: string;
	price: number;
	moneda?: "USD" | "ARS";
	priceARS?: number;
	cotizacionDolar?: number;
	location: string;
	ciudad?: string;
	provincia?: string;
	direccionCompleta?: string;
	referenciasUbicacion?: string;
	bedrooms: number;
	bathrooms: number;
	area: number;
	cochera?: string;
	pisoUnidad?: string;
	images?: string[];
	categoria_operacion?: "venta" | "alquiler" | "temporario";
	tipo_inmueble?: "departamento" | "local" | "casa" | "monoambiente" | "terreno";
	cantidad_ambientes?: number;
	comodidades?: string[];
	otrasComodidades?: string;
	expensas?: string;
	montoExpensas?: number;
	linkGoogleMaps?: string;
	latitud?: string;
	longitud?: string;
	permitirVisita?: boolean;
	permitirWhatsApp?: boolean;
	permitirEmail?: boolean;
	horarioAtencion?: string;
	telefonoWhatsApp?: string;
	precioPorNocheUSD?: number;
	minimoNoches?: number;
	huespedesMaximos?: number;
	costoLimpiezaUSD?: number;
	duracionAlquilerMeses?: number;
	unidadDuracionAlquiler?: "meses" | "años";
	checkInDesde?: string;
	checkOutHasta?: string;
	checkInFlexible?: string;
	estado?: "disponible" | "reservado" | "alquilado" | "vendido";
	operation?: string;
	category?: string;
	propertyType?: string;
	status?: string;
	amenities?: string[];
	expenses?: number;
};

export type ApiLocalidad = {
	_id: string;
	nombre: string;
	provincia: "entre_rios";
};

export const getProperties = () => request<ApiProperty[]>("/properties");

export const getLocalidades = () => request<ApiLocalidad[]>("/localidades");

export const getPropertyById = (id: string) => request<ApiProperty>(`/properties/${id}`);

export const uploadPropertyImages = async (files: File[]) => {
	const formData = new FormData();
	files.forEach((file) => formData.append("images", file));
	return request<string[]>("/properties/images", {
		method: "POST",
		body: formData,
	});
};

export const resolveMapsLink = (url: string) =>
	request<{ latitud: string; longitud: string }>(`/properties/maps/resolve?url=${encodeURIComponent(url)}`);

export const createProperty = (property: Omit<ApiProperty, "_id">) =>
	request<ApiProperty>("/properties", { method: "POST", body: JSON.stringify(property) });

export const updateProperty = (id: string, property: Partial<Omit<ApiProperty, "_id">>) =>
	request<ApiProperty>(`/properties/${id}`, { method: "PUT", body: JSON.stringify(property) });

export const deleteProperty = (id: string) =>
	request<void>(`/properties/${id}`, { method: "DELETE" });

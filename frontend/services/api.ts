const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
	const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
	const response = await fetch(`${API_URL}${path}`, {
		...options,
		headers: {
			"Content-Type": "application/json",
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
	description: string;
	price: number;
	location: string;
	bedrooms: number;
	bathrooms: number;
	area: number;
	images?: string[];
};

export const getProperties = () => request<ApiProperty[]>("/properties");

export const createProperty = (property: Omit<ApiProperty, "_id">) =>
	request<ApiProperty>("/properties", { method: "POST", body: JSON.stringify(property) });

export const updateProperty = (id: string, property: Partial<Omit<ApiProperty, "_id">>) =>
	request<ApiProperty>(`/properties/${id}`, { method: "PUT", body: JSON.stringify(property) });

export const deleteProperty = (id: string) =>
	request<void>(`/properties/${id}`, { method: "DELETE" });

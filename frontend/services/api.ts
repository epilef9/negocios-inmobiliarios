const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api").replace(/\/$/, "");

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
	body?: BodyInit | Record<string, unknown> | null;
};

export interface HealthResponse {
	status: string;
	service: string;
}

export async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
	const { body, headers, ...requestOptions } = options;
	const requestHeaders = new Headers(headers);

	if (body && typeof body === "object" && !(body instanceof FormData)) {
		requestHeaders.set("Content-Type", "application/json");
	}

	const response = await fetch(`${apiBaseUrl}/${path.replace(/^\//, "")}`, {
		...requestOptions,
		headers: requestHeaders,
		body:
			body && typeof body === "object" && !(body instanceof FormData)
				? JSON.stringify(body)
				: body,
	});

	if (!response.ok) {
		throw new Error(`API request failed with status ${response.status}`);
	}

	return response.json() as Promise<T>;
}

export function checkBackendHealth(): Promise<HealthResponse> {
	return request<HealthResponse>("health");
}

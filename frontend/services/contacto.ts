// Envío del formulario de contacto: el backend lo manda por mail a la inmobiliaria

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "production" ? "/api" : "http://localhost:4000/api");

export interface ConsultaPayload {
  nombre: string;
  email: string;
  telefono?: string;
  motivo?: string;
  mensaje: string;
  captchaToken?: string;
}

export async function enviarConsulta(payload: ConsultaPayload): Promise<void> {
  const response = await fetch(`${API_URL}/contacto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detalle = Array.isArray(body.errors) ? body.errors[0] : undefined;
    throw new Error(body.message ? (detalle ? `${body.message}: ${detalle}` : body.message) : "No pudimos enviar tu consulta.");
  }
}

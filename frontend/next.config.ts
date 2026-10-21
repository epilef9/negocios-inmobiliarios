import type { NextConfig } from "next";

// Encabezados de seguridad para todas las páginas del sitio
const encabezadosSeguridad = [
  // Nadie puede mostrar el sitio dentro de otra página (evita que engañen a alguien para que haga clic)
  { key: "X-Frame-Options", value: "DENY" },
  // El navegador no adivina tipos de archivo
  { key: "X-Content-Type-Options", value: "nosniff" },
  // A otros sitios solo se les manda el dominio, no la dirección completa (que puede tener enlaces de mails)
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Cámara y micrófono apagados; ubicación solo para este sitio (el mapa del panel la puede usar)
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: encabezadosSeguridad }];
  },
};

export default nextConfig;

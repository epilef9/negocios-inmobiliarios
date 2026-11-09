import type { NextConfig } from "next";

// Encabezados de seguridad para todas las páginas del sitio
const enDesarrollo = process.env.NODE_ENV !== "production";

// Origen de la API cuando no es el mismo sitio (en local es el backend en :4000; en Vercel es /api, o sea 'self')
const origenApi = (() => {
  try {
    return process.env.NEXT_PUBLIC_API_URL ? new URL(process.env.NEXT_PUBLIC_API_URL).origin : enDesarrollo ? "http://localhost:4000" : "";
  } catch {
    return "";
  }
})();

// Política de contenido: el navegador solo carga lo que el sitio usa de verdad.
// - Fotos: Cloudinary (propiedades), Unsplash (foto de relleno), los mosaicos de OpenStreetMap y ArcGIS (mapas Leaflet, el satelital de la portada) y la propia API
//   (sin Cloudinary las fotos se guardan en backend/uploads, como en desarrollo)
// - Conexiones: la API, los buscadores de direcciones del mapa del panel (ArcGIS, Nominatim, Photon), dolarapi y Cloudflare Turnstile
// - Iframe: el mapa de Google de la página Contacto y la verificación «no soy un robot» (Turnstile)
// - Scripts/estilos con 'unsafe-inline': Next.js inyecta scripts de arranque y el tema oscuro se aplica con un script en línea
//   (con nonce habría que renderizar todas las páginas en cada pedido y se perdería el sitio estático)
const politicaContenido = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com${enDesarrollo ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${origenApi} https://res.cloudinary.com https://images.unsplash.com https://*.tile.openstreetmap.org https://server.arcgisonline.com`.replace(/\s+/g, " "),
  "font-src 'self' data:",
  `connect-src 'self' ${origenApi} https://geocode.arcgis.com https://nominatim.openstreetmap.org https://photon.komoot.io https://dolarapi.com https://challenges.cloudflare.com${enDesarrollo ? " ws://localhost:* http://localhost:*" : ""}`.replace(/\s+/g, " "),
  "frame-src https://maps.google.com https://www.google.com https://challenges.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(enDesarrollo ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const encabezadosSeguridad = [
  { key: "Content-Security-Policy", value: politicaContenido },
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
  // En Vercel el sitio corre como un servicio junto al backend y ahí el optimizador de imágenes de Next
  // (/_next/image) responde 404: las fotos de la portada no se veían. Se sirven tal cual, ya están en WEBP.
  images: { unoptimized: true },
  async headers() {
    return [{ source: "/:path*", headers: encabezadosSeguridad }];
  },
};

export default nextConfig;

import type { MetadataRoute } from "next";
import { urlSitio } from "@/services/servidor";

// Qué pueden recorrer los buscadores: el sitio público sí; el panel y las páginas de cada cuenta no
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/perfil", "/reservas", "/visitas", "/solicitudes", "/mis-publicaciones", "/favoritos", "/avisos", "/comparar", "/verificar-email", "/confirmar-email", "/restablecer-contrasena", "/api/"],
    },
    sitemap: `${urlSitio()}/sitemap.xml`,
  };
}

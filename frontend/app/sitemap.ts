import type { MetadataRoute } from "next";
import { propiedadesEnServidor, urlSitio } from "@/services/servidor";
import { LOCALIDADES_SEO } from "@/components/sitio/localidadesSeo";

// Se regenera cada hora: suma las propiedades publicadas a las páginas fijas
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = urlSitio();
  const fijas: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/propiedades`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/requisitos`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/contacto`, changeFrequency: "yearly", priority: 0.5 },
    ...LOCALIDADES_SEO.flatMap((l) => l.operaciones.map((o) => ({ url: `${base}/inmuebles/${o.slug}-en-${l.slug}`, changeFrequency: "weekly" as const, priority: 0.7 }))),
  ];
  const propiedades = (await propiedadesEnServidor()) ?? [];
  return [
    ...fijas,
    ...propiedades.map((p) => ({
      url: `${base}/propiedades/${p._id}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : undefined,
      changeFrequency: "weekly" as const,
      priority: !p.estado || p.estado === "disponible" ? 0.8 : 0.4,
    })),
  ];
}

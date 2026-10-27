import type { Metadata } from "next";
import FichaPropiedad from "./FichaPropiedad";
import { propiedadEnServidor, resumenPropiedad, urlSitio } from "@/services/servidor";

// La ficha se arma en el navegador (FichaPropiedad); acá, en el servidor, van los metadatos para que al
// compartir el link en WhatsApp se vea la foto, el título y el precio, y los datos para Google.

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { id } = await params;
	const p = await propiedadEnServidor(id);
	if (!p) return { title: "Propiedad | Araceli Balbuena Negocios Inmobiliarios" };
	const resumen = resumenPropiedad(p);
	const descripcion = `${resumen}.${p.description ? ` ${p.description.replace(/\s+/g, " ").slice(0, 160)}` : ""}`;
	const foto = p.images?.[0];
	const url = `${urlSitio()}/propiedades/${p._id}`;
	return {
		title: `${p.title} | Araceli Balbuena Negocios Inmobiliarios`,
		description: descripcion,
		alternates: { canonical: url },
		openGraph: {
			type: "website",
			url,
			title: p.title,
			description: resumen,
			siteName: "Araceli Balbuena Negocios Inmobiliarios",
			locale: "es_AR",
			...(foto ? { images: [{ url: foto, alt: p.title }] } : {}),
		},
		twitter: { card: foto ? "summary_large_image" : "summary", title: p.title, description: resumen, ...(foto ? { images: [foto] } : {}) },
	};
}

export default async function Page({ params }: Props) {
	const { id } = await params;
	const p = await propiedadEnServidor(id);
	// Datos estructurados (JSON-LD) para que Google entienda que es un aviso inmobiliario
	const datos = p
		? {
				"@context": "https://schema.org",
				"@type": "RealEstateListing",
				name: p.title,
				url: `${urlSitio()}/propiedades/${p._id}`,
				description: resumenPropiedad(p),
				...(p.images?.length ? { image: p.images.slice(0, 5) } : {}),
				offers: {
					"@type": "Offer",
					price: p.categoria_operacion === "temporario" && p.precioPorNocheUSD ? p.precioPorNocheUSD : p.moneda === "ARS" ? p.priceARS ?? p.price : p.price,
					priceCurrency: p.moneda === "ARS" && p.categoria_operacion !== "temporario" ? "ARS" : "USD",
					availability: !p.estado || p.estado === "disponible" ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
				},
				address: { "@type": "PostalAddress", streetAddress: p.direccionCompleta || p.location, addressLocality: p.ciudad, addressRegion: "Entre Ríos", addressCountry: "AR" },
			}
		: null;
	return (
		<>
			{datos && (
				<script
					type="application/ld+json"
					// Se escapa "<" para que ningún texto de la propiedad pueda cerrar la etiqueta
					dangerouslySetInnerHTML={{ __html: JSON.stringify(datos).replace(/</g, "\\u003c") }}
				/>
			)}
			<FichaPropiedad />
		</>
	);
}

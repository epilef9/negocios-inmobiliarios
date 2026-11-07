import type { Metadata } from "next";
import FichaPropiedad from "./FichaPropiedad";
import { propiedadEnServidor, resumenPropiedad, urlSitio } from "@/services/servidor";
import { operacionesAbiertas, operacionesDe, precioDe } from "@/components/sitio/operaciones";
import type { ApiProperty } from "@/services/api";

// La ficha se arma en el navegador (FichaPropiedad); acá, en el servidor, van los metadatos para que al
// compartir el link en WhatsApp se vea la foto, el título y el precio, y los datos para Google.

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { id } = await params;
	const p = await propiedadEnServidor(id);
	if (!p) return { title: "Propiedad | Araceli Balbuena Negocios Inmobiliarios" };
	const resumen = resumenPropiedad(p);
	const descripcion = `${resumen}.${p.descripcion ? ` ${p.descripcion.replace(/\s+/g, " ").slice(0, 160)}` : ""}`;
	const foto = p.fotos?.[0];
	const url = `${urlSitio()}/propiedades/${p._id}`;
	return {
		title: `${p.titulo} | Araceli Balbuena Negocios Inmobiliarios`,
		description: descripcion,
		alternates: { canonical: url },
		openGraph: {
			type: "website",
			url,
			title: p.titulo,
			description: resumen,
			siteName: "Araceli Balbuena Negocios Inmobiliarios",
			locale: "es_AR",
			...(foto ? { images: [{ url: foto, alt: p.titulo }] } : {}),
		},
		twitter: { card: foto ? "summary_large_image" : "summary", title: p.titulo, description: resumen, ...(foto ? { images: [foto] } : {}) },
	};
}

// Ofertas para el JSON-LD: el precio de cada operación en la moneda publicada y si sigue disponible
function ofertas(p: ApiProperty) {
	const abiertas = operacionesAbiertas(p);
	const lista = (operacionesDe(p).length ? operacionesDe(p) : ["venta" as const]).map((operacion) => {
		const temporario = operacion === "temporario" && p.precioPorNocheUSD;
		const precio = precioDe(p, operacion) ?? { precio: p.precio, moneda: p.moneda === "ARS" ? "ARS" : "USD", precioARS: p.precioARS };
		return {
			"@type": "Offer",
			name: operacion === "venta" ? "Venta" : operacion === "alquiler" ? "Alquiler mensual" : "Alquiler por noche",
			price: temporario ? p.precioPorNocheUSD : precio.moneda === "ARS" ? precio.precioARS ?? precio.precio : precio.precio,
			priceCurrency: !temporario && precio.moneda === "ARS" ? "ARS" : "USD",
			availability: abiertas.includes(operacion) ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
		};
	});
	return lista.length === 1 ? lista[0] : lista;
}

export default async function Page({ params }: Props) {
	const { id } = await params;
	const p = await propiedadEnServidor(id);
	// Datos estructurados (JSON-LD) para que Google entienda que es un aviso inmobiliario
	const datos = p
		? {
				"@context": "https://schema.org",
				"@type": "RealEstateListing",
				name: p.titulo,
				url: `${urlSitio()}/propiedades/${p._id}`,
				description: resumenPropiedad(p),
				...(p.fotos?.length ? { image: p.fotos.slice(0, 5) } : {}),
				// HU-25: una oferta por operación (venta y alquiler tienen cada una su precio)
				offers: ofertas(p),
				address: { "@type": "PostalAddress", streetAddress: p.direccionCompleta || p.ubicacion, addressLocality: p.ciudad, addressRegion: "Entre Ríos", addressCountry: "AR" },
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

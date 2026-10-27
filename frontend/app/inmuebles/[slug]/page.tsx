import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SitioBase from "@/components/sitio/SitioBase";
import ListadoLocalidad from "./ListadoLocalidad";
import { LOCALIDADES_SEO, paginaSeo } from "@/components/sitio/localidadesSeo";
import { propiedadesEnServidor, urlSitio } from "@/services/servidor";

// Página por localidad y operación (SEO): título, descripción y texto propios, y las propiedades de esa zona
// ya en el HTML, para que Google las lea sin ejecutar JavaScript.

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 600;

export function generateStaticParams() {
	return LOCALIDADES_SEO.flatMap((l) => l.operaciones.map((o) => ({ slug: `${o.slug}-en-${l.slug}` })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const pagina = paginaSeo((await params).slug);
	if (!pagina) return {};
	const { localidad, operacion } = pagina;
	const titulo = `${operacion.titulo} en ${localidad.nombre} | Araceli Balbuena Negocios Inmobiliarios`;
	const url = `${urlSitio()}/inmuebles/${operacion.slug}-en-${localidad.slug}`;
	return {
		title: titulo,
		description: `${operacion.titulo} en ${localidad.nombre}, Entre Ríos. ${localidad.texto.slice(0, 120)}`,
		alternates: { canonical: url },
		openGraph: { title: titulo, url, type: "website", locale: "es_AR" },
	};
}

export default async function PaginaLocalidad({ params }: Props) {
	const pagina = paginaSeo((await params).slug);
	if (!pagina) notFound();
	const { localidad, operacion } = pagina;
	const todas = await propiedadesEnServidor();
	const deLaZona = todas
		? todas.filter((p) => p.categoria_operacion === operacion.categoria && `${p.ciudad ?? ""} ${p.location ?? ""}`.toLocaleLowerCase("es").includes(localidad.coincide))
		: null;
	const datos = {
		"@context": "https://schema.org",
		"@type": "RealEstateAgent",
		name: "Araceli Balbuena Negocios Inmobiliarios",
		url: urlSitio(),
		areaServed: localidad.nombre,
		address: { "@type": "PostalAddress", streetAddress: "25 de Mayo 726", addressLocality: "Villa Libertador San Martín", addressRegion: "Entre Ríos", addressCountry: "AR" },
	};

	return (
		<SitioBase>
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datos).replace(/</g, "\\u003c") }} />
			<header className="encabezado-color encabezado-azul flex flex-col gap-6 px-5 pb-14 pt-32 sm:px-10 lg:pt-40">
				<nav aria-label="Ruta" className="calma-micro flex items-center gap-3 text-[#efe9df]/60">
					<Link href="/propiedades" className="calma-link calma-link-sutil">
						Propiedades
					</Link>
					<span aria-hidden="true">/</span>
					<span className="text-[#efe9df]/80">{localidad.nombre}</span>
				</nav>
				<h1 className="font-display m-0 max-w-4xl text-[clamp(48px,7vw,112px)] font-normal leading-[0.92] tracking-[-0.02em]">
					{operacion.titulo} en {localidad.nombre}
				</h1>
				<p className="m-0 max-w-2xl text-[17px] leading-relaxed text-[#efe9df]/75">{localidad.texto}</p>
			</header>

			<section aria-label={`${operacion.titulo} en ${localidad.nombre}`} className="px-5 pb-16 sm:px-10">
				<ListadoLocalidad iniciales={deLaZona} categoria={operacion.categoria} coincide={localidad.coincide} />
			</section>

			<nav aria-label="Otras búsquedas" className="flex flex-col gap-4 border-t border-[#efe9df]/15 px-5 py-12 sm:px-10">
				<p className="calma-micro m-0 text-[#efe9df]/55">Otras búsquedas</p>
				<ul className="m-0 flex list-none flex-wrap gap-x-6 gap-y-3 p-0">
					{LOCALIDADES_SEO.flatMap((l) =>
						l.operaciones
							.filter((o) => !(l.slug === localidad.slug && o.slug === operacion.slug))
							.map((o) => (
								<li key={`${o.slug}-${l.slug}`}>
									<Link href={`/inmuebles/${o.slug}-en-${l.slug}`} className="calma-link calma-link-sutil text-[15px]">
										{o.titulo} en {l.nombre}
									</Link>
								</li>
							))
					)}
				</ul>
			</nav>
		</SitioBase>
	);
}

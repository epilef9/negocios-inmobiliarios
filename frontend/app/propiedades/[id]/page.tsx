"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import SitioBase from "@/components/sitio/SitioBase";
import BotonFavorito from "@/components/sitio/BotonFavorito";
import Galeria from "@/components/detalle/Galeria";
import AgendarVisita, { type AgendarVisitaHandle } from "@/components/detalle/AgendarVisita";
import { etiquetaEstado, etiquetaTipo, precioDePropiedad, useDolarBlue } from "@/components/sitio/precio";
import { etiquetaOperacion } from "@/components/sitio/datos";
import { EMAIL, WHATSAPP_URL } from "@/components/sitio/SiteFooter";
import { COMODIDADES } from "@/components/catalogo/FiltrosCatalogo";
import { getPropertyById, type ApiProperty } from "@/services/api";

const MapaUbicacionPropiedad = dynamic(() => import("@/components/MapaUbicacionPropiedad"), {
	ssr: false,
	loading: () => <div className="calma-brillo h-80 w-full" />,
});

const etiquetaComodidad = Object.fromEntries(COMODIDADES.map((c) => [c.value, c.label]));

// Lista de características: solo las que la propiedad tiene cargadas
function caracteristicas(p: ApiProperty) {
	const filas: [string, string][] = [];
	const agregar = (etiqueta: string, valor: string | number | undefined | null) => {
		if (valor !== undefined && valor !== null && valor !== "" && valor !== 0) filas.push([etiqueta, String(valor)]);
	};
	const esTerreno = p.tipo_inmueble === "terreno";
	agregar("Tipo", etiquetaTipo[p.tipo_inmueble || ""] ?? p.tipo_inmueble);
	agregar("Superficie", p.area ? `${p.area} m²` : undefined);
	if (!esTerreno) {
		agregar("Ambientes", p.cantidad_ambientes);
		agregar("Dormitorios", p.bedrooms);
		agregar("Baños", p.bathrooms);
		agregar("Cochera", p.cochera === "si" ? "Sí" : p.cochera === "no" ? "No" : p.cochera);
		agregar("Piso", p.pisoUnidad);
	}
	if (p.categoria_operacion === "alquiler" && p.duracionAlquilerMeses) {
		agregar("Contrato", `${p.duracionAlquilerMeses} ${p.unidadDuracionAlquiler === "años" ? "años" : "meses"}`);
	}
	if (p.categoria_operacion === "temporario") {
		agregar("Huéspedes", p.huespedesMaximos ? `Hasta ${p.huespedesMaximos}` : undefined);
		agregar("Estadía mínima", p.minimoNoches ? `${p.minimoNoches} noches` : undefined);
		agregar("Ingreso", p.checkInDesde ? `Desde las ${p.checkInDesde}` : undefined);
		agregar("Salida", p.checkOutHasta ? `Hasta las ${p.checkOutHasta}` : undefined);
		agregar("Limpieza", p.costoLimpiezaUSD ? `USD ${p.costoLimpiezaUSD}` : undefined);
	}
	return filas;
}

export default function DetallePropiedad() {
	const params = useParams<{ id: string }>();
	const id = Array.isArray(params.id) ? params.id[0] : params.id;
	const blue = useDolarBlue();
	const visita = useRef<AgendarVisitaHandle>(null);
	const [propiedad, setPropiedad] = useState<ApiProperty | null>(null);
	const [estado, setEstado] = useState<"cargando" | "listo" | "error">("cargando");
	const [mensajeError, setMensajeError] = useState("");

	useEffect(() => {
		if (!id) return;
		let activo = true;
		getPropertyById(id)
			.then((datos) => {
				if (!activo) return;
				setPropiedad(datos);
				setEstado("listo");
			})
			.catch((e: unknown) => {
				if (!activo) return;
				setMensajeError(e instanceof Error ? e.message : "");
				setEstado("error");
			});
		return () => {
			activo = false;
		};
	}, [id]);

	if (estado === "cargando") {
		return (
			<SitioBase>
				<div aria-busy="true" aria-label="Cargando propiedad" className="flex flex-col gap-6 px-5 pb-20 pt-28 sm:px-10">
					<div className="calma-brillo aspect-[16/9] max-h-[78vh] w-full" />
					<div className="calma-brillo h-12 w-2/3" />
				</div>
			</SitioBase>
		);
	}

	if (estado === "error" || !propiedad) {
		const noExiste = /no encontrada|no es válido/i.test(mensajeError);
		return (
			<SitioBase>
				<section className="flex flex-col items-start gap-6 px-5 pb-24 pt-36 sm:px-10">
					<h1 className="font-display m-0 max-w-3xl text-[clamp(40px,5vw,72px)] font-normal leading-none">
						{noExiste ? "Esta propiedad ya no está publicada." : "No pudimos cargar la propiedad."}
					</h1>
					<p className="m-0 max-w-xl text-[16px] text-[#efe9df]/70">
						{noExiste ? "Puede que se haya vendido o alquilado. Mirá las que tenemos disponibles." : "Puede ser un problema de conexión. Probá de nuevo en un momento."}
					</p>
					<Link href="/propiedades" className="calma-micro flex items-center gap-2.5 rounded-full bg-[#efe9df] px-6 py-4 text-[12px] text-[#071733] transition-colors hover:bg-white">
						<span className="calma-dot" aria-hidden="true" />
						Ver propiedades
					</Link>
				</section>
			</SitioBase>
		);
	}

	const p = propiedad;
	const precio = precioDePropiedad(p, blue);
	const operacion = etiquetaOperacion[p.categoria_operacion || ""] ?? "Propiedad";
	const ubicacion = [p.direccionCompleta, p.ciudad].filter(Boolean).join(", ") || p.location;
	const estadoNoDisponible = p.estado && p.estado !== "disponible" ? etiquetaEstado[p.estado] : null;
	// Una propiedad vendida o alquilada ya no se puede visitar
	const sePuedeVisitar = Boolean(p.permitirVisita) && p.estado !== "vendido" && p.estado !== "alquilado";
	const filas = caracteristicas(p);
	const comodidades = (p.comodidades ?? []).map((c) => etiquetaComodidad[c]).filter(Boolean);
	const enlace = typeof window !== "undefined" ? window.location.href : "";
	const mensaje = `Hola, me interesa la propiedad "${p.title}"${enlace ? ` (${enlace})` : ""}. ¿Me pasan más información?`;
	const numeroWhatsApp = p.permitirWhatsApp && p.telefonoWhatsApp ? `https://wa.me/${p.telefonoWhatsApp.replace(/\D/g, "")}` : WHATSAPP_URL;
	const whatsapp = `${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
	const mail = `mailto:${EMAIL}?subject=${encodeURIComponent(`Consulta por ${p.title}`)}&body=${encodeURIComponent(mensaje)}`;
	const tieneMapa = Boolean(p.latitud && p.longitud);

	return (
		<SitioBase>
			<div className="px-5 pt-24 sm:px-10 sm:pt-28">
				<nav aria-label="Ruta" className="calma-micro mb-5 flex items-center gap-3 text-[#efe9df]/60">
					<Link href="/propiedades" className="calma-link calma-link-sutil">
						Propiedades
					</Link>
					<span aria-hidden="true">/</span>
					<span className="truncate text-[#efe9df]/80">{p.title}</span>
				</nav>
				<Galeria imagenes={p.images ?? []} titulo={p.title} />
			</div>

			<div className="grid gap-12 px-5 pb-20 pt-12 sm:px-10 lg:grid-cols-12 lg:gap-6 lg:pt-16">
				<article className="flex flex-col gap-12 lg:col-span-7">
					<header className="flex flex-col gap-4">
						<p className="calma-micro m-0 flex flex-wrap items-center gap-3 text-[#efe9df]/70">
							{operacion}
							{p.ciudad ? ` en ${p.ciudad}` : ""}
							{estadoNoDisponible && <span className="rounded-full bg-[#efe9df] px-3 py-1 text-[#071733]">{estadoNoDisponible}</span>}
						</p>
						<h1 className="font-display m-0 text-[clamp(44px,5.4vw,84px)] font-normal leading-[0.98] tracking-[-0.02em]">{p.title}</h1>
						<p className="m-0 text-[16px] text-[#efe9df]/75">{ubicacion}</p>
					</header>

					{filas.length > 0 && (
						<section aria-labelledby="titulo-caracteristicas">
							<h2 id="titulo-caracteristicas" className="sr-only">
								Características
							</h2>
							<dl className="m-0 grid grid-cols-2 border-t border-[#efe9df]/15 sm:grid-cols-3">
								{filas.map(([etiqueta, valor]) => (
									<div key={etiqueta} className="flex flex-col gap-1.5 border-b border-[#efe9df]/15 py-5 pr-4">
										<dt className="calma-micro text-[#efe9df]/60">{etiqueta}</dt>
										<dd className="font-display m-0 text-[24px] leading-tight">{valor}</dd>
									</div>
								))}
							</dl>
						</section>
					)}

					{p.description && (
						<section aria-labelledby="titulo-descripcion" className="flex flex-col gap-4">
							<h2 id="titulo-descripcion" className="font-display m-0 text-[32px] font-normal">
								Sobre la propiedad
							</h2>
							<p className="m-0 max-w-[68ch] whitespace-pre-line text-[17px] leading-[1.7] text-[#efe9df]/85">{p.description}</p>
						</section>
					)}

					{(comodidades.length > 0 || p.otrasComodidades) && (
						<section aria-labelledby="titulo-comodidades" className="flex flex-col gap-5">
							<h2 id="titulo-comodidades" className="font-display m-0 text-[32px] font-normal">
								Comodidades
							</h2>
							<ul className="m-0 grid list-none gap-x-6 gap-y-3 p-0 sm:grid-cols-2">
								{comodidades.map((c) => (
									<li key={c} className="flex items-center gap-3 text-[16px]">
										<span className="calma-dot" aria-hidden="true" />
										{c}
									</li>
								))}
							</ul>
							{p.otrasComodidades && <p className="m-0 text-[15px] text-[#efe9df]/70">{p.otrasComodidades}</p>}
						</section>
					)}

					<section aria-labelledby="titulo-ubicacion" className="flex flex-col gap-5">
						<h2 id="titulo-ubicacion" className="font-display m-0 text-[32px] font-normal">
							Ubicación
						</h2>
						<p className="m-0 text-[16px] text-[#efe9df]/80">
							{ubicacion}
							{p.referenciasUbicacion && <span className="block pt-1 text-[15px] text-[#efe9df]/60">{p.referenciasUbicacion}</span>}
						</p>
						{tieneMapa && (
							<div className="overflow-hidden rounded-2xl">
								<MapaUbicacionPropiedad latitud={p.latitud as string} longitud={p.longitud as string} />
							</div>
						)}
						{p.linkGoogleMaps && (
							<a href={p.linkGoogleMaps} target="_blank" rel="noreferrer" className="calma-micro calma-link self-start">
								Abrir en Google Maps
							</a>
						)}
					</section>
				</article>

				<aside aria-label="Precio y contacto" className="lg:col-span-4 lg:col-start-9">
					<div className="flex flex-col gap-6 rounded-3xl border border-[#efe9df]/15 bg-[#0b2048] p-6 sm:p-8 lg:sticky lg:top-24">
						<div className="flex flex-col gap-1.5">
							<p className="calma-micro m-0 text-[#efe9df]/60">{operacion}</p>
							<p className="font-display m-0 text-[clamp(36px,3.4vw,48px)] leading-none">{precio.principal}</p>
							{precio.referencia && <p className="m-0 text-[14px] text-[#efe9df]/65">{precio.referencia}</p>}
							{p.montoExpensas ? <p className="m-0 pt-1 text-[14px] text-[#efe9df]/65">Expensas ARS {p.montoExpensas.toLocaleString("es-AR")}</p> : null}
						</div>
						<div className="flex flex-col gap-3">
							{sePuedeVisitar && (
								<button
									type="button"
									onClick={() => visita.current?.abrir()}
									className="calma-micro flex items-center justify-center gap-2.5 rounded-full bg-[#efe9df] px-6 py-4 text-[12px] text-[#071733] transition-colors hover:bg-white"
								>
									<span className="calma-dot" aria-hidden="true" />
									Agendar una visita
								</button>
							)}
							<a
								href={whatsapp}
								target="_blank"
								rel="noreferrer"
								className={`calma-micro flex items-center justify-center gap-2.5 rounded-full px-6 py-4 text-[12px] transition-colors ${
									sePuedeVisitar ? "border border-[#efe9df]/40 hover:border-[#efe9df]" : "bg-[#efe9df] text-[#071733] hover:bg-white"
								}`}
							>
								Escribir por WhatsApp
							</a>
							{p.permitirEmail !== false && (
								<a href={mail} className="calma-micro flex items-center justify-center rounded-full border border-[#efe9df]/40 px-6 py-4 text-[12px] transition-colors hover:border-[#efe9df]">
									Consultar por email
								</a>
							)}
							<BotonFavorito propiedadId={p._id} titulo={p.title} variante="texto" />
						</div>
						{p.horarioAtencion && <p className="m-0 text-[13px] text-[#efe9df]/60">Atención: {p.horarioAtencion}</p>}
					</div>
				</aside>
			</div>

			{sePuedeVisitar && <AgendarVisita ref={visita} propiedad={p} precio={precio.principal} />}
		</SitioBase>
	);
}

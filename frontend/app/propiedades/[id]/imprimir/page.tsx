"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import LogoEmpresa from "@/components/sitio/LogoEmpresa";
import { useContacto } from "@/components/sitio/useAjustes";
import { etiquetaOperacion } from "@/components/sitio/datos";
import { datosCortos, etiquetaTipo, precioDePropiedad, useDolarBlue } from "@/components/sitio/precio";
import { COMODIDADES } from "@/components/catalogo/FiltrosCatalogo";
import { getPropertyById, type ApiProperty } from "@/services/api";

// Ficha de la propiedad en una hoja A4, lista para imprimir o guardar como PDF desde el navegador
// (vidriera de la oficina o para darle a un cliente). Fondo blanco y sin elementos del sitio.

const etiquetaComodidad = Object.fromEntries(COMODIDADES.map((c) => [c.value, c.label]));

export default function ImprimirFicha() {
	const { id } = useParams<{ id: string }>();
	const contacto = useContacto();
	const blue = useDolarBlue();
	const [p, setP] = useState<ApiProperty | null>(null);
	const [error, setError] = useState(false);

	useEffect(() => {
		let activo = true;
		getPropertyById(id)
			.then((datos) => activo && setP(datos))
			.catch(() => activo && setError(true));
		return () => {
			activo = false;
		};
	}, [id]);

	if (error) {
		return (
			<main className="min-h-dvh bg-white p-10 text-[#071733]">
				<p>No pudimos cargar la propiedad.</p>
				<Link href="/propiedades" className="underline">
					Volver al catálogo
				</Link>
			</main>
		);
	}
	if (!p) return <main aria-busy="true" className="min-h-dvh bg-white" />;

	const precio = precioDePropiedad(p, blue);
	// Una foto grande y dos chicas; con menos de tres, solo la portada (la hoja tiene que entrar en una A4)
	const fotos = (p.images ?? []).length >= 3 ? (p.images ?? []).slice(0, 3) : (p.images ?? []).slice(0, 1);
	const comodidades = (p.comodidades ?? []).map((c) => etiquetaComodidad[c]).filter(Boolean);
	const datos = [etiquetaTipo[p.tipo_inmueble || ""], ...datosCortos(p), p.cochera === "si" ? "Cochera" : ""].filter(Boolean);

	return (
		<main className="min-h-dvh bg-[#e9e6e0] py-8 text-[#071733] print:bg-white print:py-0">
			<div className="no-imprimir mx-auto mb-6 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4" id="ficha-acciones">
				<Link href={`/propiedades/${p._id}`} className="text-[14px] underline">
					← Volver a la propiedad
				</Link>
				<button type="button" onClick={() => window.print()} className="rounded-full bg-[#071733] px-6 py-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-white">
					Imprimir o guardar PDF
				</button>
			</div>

			<article id="ficha-imprimible" className="mx-auto flex max-w-[210mm] flex-col gap-6 bg-white p-[14mm] shadow-xl print:shadow-none">
				<header className="flex items-center justify-between gap-6 border-b border-[#071733]/15 pb-5">
					<LogoEmpresa version="apilado" className="h-12 w-auto" prioridad />
					<div className="text-right text-[12px] leading-snug">
						<p className="m-0 font-semibold uppercase tracking-[0.14em]">{etiquetaOperacion[p.categoria_operacion || ""] ?? "Propiedad"}</p>
						{p.codigoInterno && <p className="m-0">Código {p.codigoInterno}</p>}
					</div>
				</header>

				{fotos.length > 0 && (
					<div className={`grid gap-2 ${fotos.length === 3 ? "grid-cols-2" : ""}`}>
						{fotos.map((foto, i) => (
							// eslint-disable-next-line @next/next/no-img-element
							<img key={foto} src={foto} alt={i === 0 ? p.title : ""} className={`w-full rounded object-cover ${fotos.length !== 3 ? "h-[90mm]" : i === 0 ? "col-span-2 h-[78mm]" : "h-[42mm]"}`} />
						))}
					</div>
				)}

				<div className="flex flex-wrap items-start justify-between gap-6">
					<div className="flex min-w-0 flex-1 flex-col gap-1.5">
						<h1 className="font-display m-0 text-[30px] font-normal leading-tight">{p.title}</h1>
						<p className="m-0 text-[14px] text-[#071733]/75">
							{(p.direccionCompleta && p.ciudad && p.direccionCompleta.toLocaleLowerCase("es").includes(p.ciudad.toLocaleLowerCase("es")) ? p.direccionCompleta : [p.direccionCompleta, p.ciudad].filter(Boolean).join(", ")) || p.location}
						</p>
						<p className="m-0 text-[14px]">{datos.join(" · ")}</p>
					</div>
					<div className="text-right">
						{precio.anterior && <p className="m-0 text-[13px] text-[#071733]/60 line-through">{precio.anterior}</p>}
						<p className="font-display m-0 text-[28px] leading-none">{precio.principal}</p>
						{p.montoExpensas ? <p className="m-0 mt-1 text-[12px]">Expensas ARS {p.montoExpensas.toLocaleString("es-AR")}</p> : null}
						{p.financiacion?.disponible && (
							<p className="m-0 mt-1 text-[12px]">
								Financiación: {p.financiacion.anticipoPorcentaje ? `${p.financiacion.anticipoPorcentaje}% y ` : ""}
								{p.financiacion.cuotas} cuotas
							</p>
						)}
					</div>
				</div>

				{p.description && <p className="m-0 whitespace-pre-line text-[13px] leading-relaxed">{p.description.slice(0, 900)}</p>}

				{comodidades.length > 0 && (
					<ul className="m-0 grid list-none grid-cols-3 gap-x-4 gap-y-1 p-0 text-[12.5px]">
						{comodidades.map((c) => (
							<li key={c}>• {c}</li>
						))}
					</ul>
				)}

				<footer className="mt-auto flex flex-wrap items-end justify-between gap-4 border-t border-[#071733]/15 pt-4 text-[12.5px] leading-snug">
					<div>
						<p className="m-0 font-semibold">Araceli Balbuena · Negocios Inmobiliarios</p>
						<p className="m-0">{contacto.direccionCompleta}, Entre Ríos</p>
						<p className="m-0">
							{contacto.telefono} · {contacto.email}
						</p>
					</div>
					<p className="m-0 max-w-[60mm] text-right text-[11px] text-[#071733]/60">Valores sujetos a cambios. Consultá disponibilidad antes de visitar.</p>
				</footer>
			</article>
		</main>
	);
}

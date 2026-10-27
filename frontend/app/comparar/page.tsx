"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SitioBase from "@/components/sitio/SitioBase";
import { obtenerPropiedades, etiquetaOperacion } from "@/components/sitio/datos";
import { etiquetaEstado, etiquetaTipo, precioDePropiedad, useDolarBlue } from "@/components/sitio/precio";
import { paraComparar, useLista } from "@/components/sitio/listaLocal";
import { COMODIDADES } from "@/components/catalogo/FiltrosCatalogo";
import type { ApiProperty } from "@/services/api";

// Comparar 2 o 3 propiedades lado a lado. La selección se guarda en este navegador.
// En el celular las columnas se deslizan de costado.

const etiquetaComodidad = Object.fromEntries(COMODIDADES.map((c) => [c.value, c.label]));

const FILAS: { titulo: string; valor: (p: ApiProperty) => string }[] = [
	{ titulo: "Operación", valor: (p) => etiquetaOperacion[p.categoria_operacion || ""] ?? "—" },
	{ titulo: "Estado", valor: (p) => etiquetaEstado[p.estado || "disponible"] ?? "Disponible" },
	{ titulo: "Tipo", valor: (p) => etiquetaTipo[p.tipo_inmueble || ""] ?? "—" },
	{ titulo: "Ubicación", valor: (p) => p.ciudad || p.location || "—" },
	{ titulo: "Superficie", valor: (p) => (p.area ? `${p.area} m²` : "—") },
	{ titulo: "Ambientes", valor: (p) => (p.cantidad_ambientes ? String(p.cantidad_ambientes) : "—") },
	{ titulo: "Dormitorios", valor: (p) => (p.tipo_inmueble === "terreno" ? "—" : String(p.bedrooms ?? "—")) },
	{ titulo: "Baños", valor: (p) => (p.tipo_inmueble === "terreno" ? "—" : String(p.bathrooms ?? "—")) },
	{ titulo: "Cochera", valor: (p) => (p.cochera === "si" ? "Sí" : p.cochera === "no" ? "No" : p.cochera || "—") },
	{
		titulo: "Expensas",
		valor: (p) => (p.expensas === "sin_expensas" ? "No tiene" : p.montoExpensas ? `ARS ${p.montoExpensas.toLocaleString("es-AR")}` : p.expensas === "incluye" ? "Incluidas" : "—"),
	},
	{ titulo: "Financiación", valor: (p) => (p.financiacion?.disponible ? `${p.financiacion.cuotas} cuotas${p.financiacion.tasa ? ` · ${p.financiacion.tasa}` : ""}` : "—") },
	{ titulo: "Comodidades", valor: (p) => (p.comodidades ?? []).map((c) => etiquetaComodidad[c]).filter(Boolean).join(", ") || "—" },
];

export default function CompararPage() {
	const ids = useLista(paraComparar);
	const blue = useDolarBlue();
	const [todas, setTodas] = useState<ApiProperty[] | null>(null);
	const [error, setError] = useState(false);

	useEffect(() => {
		let activo = true;
		obtenerPropiedades()
			.then((lista) => activo && setTodas(lista))
			.catch(() => activo && setError(true));
		return () => {
			activo = false;
		};
	}, []);

	const elegidas = todas ? ids.map((id) => todas.find((p) => p._id === id)).filter((p): p is ApiProperty => Boolean(p)) : [];
	const quitar = (id: string) => paraComparar.guardar(ids.filter((x) => x !== id));

	return (
		<SitioBase pieSimple>
			<header className="encabezado-color encabezado-azul flex flex-col gap-5 px-5 pb-12 pt-32 sm:px-10 lg:pt-40">
				<h1 className="font-display m-0 text-[clamp(56px,8vw,112px)] font-normal leading-[0.9] tracking-[-0.02em]">Comparar</h1>
				<p className="m-0 max-w-xl text-[16px] leading-relaxed text-[#efe9df]/70">Hasta tres propiedades lado a lado. Sumalas desde el catálogo, tus favoritos o la ficha de cada una.</p>
			</header>

			<section aria-label="Comparación" className="px-5 pb-24 sm:px-10">
				{error ? (
					<p role="alert" className="m-0 text-[15px] text-[#ff8b80]">
						No pudimos cargar las propiedades. Probá de nuevo en un momento.
					</p>
				) : !todas ? (
					<div aria-busy="true" className="calma-brillo h-96 w-full" />
				) : elegidas.length < 2 ? (
					<div className="flex flex-col items-start gap-5 border-y border-[#efe9df]/15 py-12">
						<p className="font-display m-0 max-w-2xl text-[clamp(26px,3vw,38px)] leading-tight">
							{elegidas.length === 1 ? "Elegiste una. Sumá otra para compararlas." : "Todavía no elegiste propiedades para comparar."}
						</p>
						<Link href="/propiedades" className="calma-micro flex items-center gap-2.5 rounded-full bg-[#efe9df] px-6 py-4 text-[12px] text-[#071733] hover:bg-white">
							<span className="calma-dot" aria-hidden="true" />
							Ir al catálogo
						</Link>
					</div>
				) : (
					<div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
						<table className="w-full min-w-[640px] border-collapse text-left">
							<caption className="sr-only">Comparación de {elegidas.length} propiedades</caption>
							<thead>
								<tr>
									<th scope="col" className="w-36 align-bottom pb-6">
										<span className="sr-only">Dato</span>
									</th>
									{elegidas.map((p) => {
										const precio = precioDePropiedad(p, blue);
										return (
											<th key={p._id} scope="col" className="w-1/3 px-3 pb-6 align-top font-normal">
												<div className="flex flex-col gap-3">
													<div className="aspect-[4/3] overflow-hidden rounded-xl bg-[#0e2652]">
														{p.images?.[0] && (
															// eslint-disable-next-line @next/next/no-img-element
															<img src={p.images[0]} alt="" className="h-full w-full object-cover" loading="lazy" />
														)}
													</div>
													<Link href={`/propiedades/${p._id}`} className="font-display calma-link calma-link-sutil text-[22px] leading-tight">
														{p.title}
													</Link>
													<span className="text-[16px]">{precio.principal}</span>
													{precio.anterior && <s className="text-[13px] text-[#efe9df]/55">{precio.anterior}</s>}
													<button type="button" onClick={() => quitar(p._id)} className="calma-micro calma-link calma-link-sutil cursor-pointer self-start text-[11px] text-[#efe9df]/70">
														Quitar
													</button>
												</div>
											</th>
										);
									})}
								</tr>
							</thead>
							<tbody>
								{FILAS.map((fila) => (
									<tr key={fila.titulo} className="border-t border-[#efe9df]/12">
										<th scope="row" className="calma-micro py-4 pr-3 align-top text-[#efe9df]/60">
											{fila.titulo}
										</th>
										{elegidas.map((p) => (
											<td key={p._id} className="px-3 py-4 align-top text-[15px]">
												{fila.valor(p)}
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</section>
		</SitioBase>
	);
}

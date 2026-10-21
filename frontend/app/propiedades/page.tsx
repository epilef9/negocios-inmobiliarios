"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import SitioBase from "@/components/sitio/SitioBase";
import Revelar from "@/components/sitio/Revelar";
import TarjetaPropiedad from "@/components/sitio/TarjetaPropiedad";
import { useDolarBlue } from "@/components/sitio/precio";
import { LOCALIDADES_RESPALDO, normalizar, obtenerLocalidades } from "@/components/sitio/datos";
import { WHATSAPP_URL } from "@/components/sitio/SiteFooter";
import FiltrosCatalogo, { FILTROS_VACIOS, OPERACIONES, TIPOS, type FiltrosPropiedades } from "@/components/catalogo/FiltrosCatalogo";
import { getProperties, reorderProperties, type ApiProperty } from "@/services/api";
import { useAuth } from "@/context/AuthContext";

const POR_PAGINA = 9;

type Orden = "destacadas" | "recientes" | "menor" | "mayor";

const ORDENES: { value: Orden; label: string }[] = [
	{ value: "destacadas", label: "Destacadas" },
	{ value: "recientes", label: "Más recientes" },
	{ value: "menor", label: "Menor precio" },
	{ value: "mayor", label: "Mayor precio" },
];

// Título animado: HTML fijo para que React no reconcilie los nodos que divide GSAP
const TITULO = "Propiedades";

// Filtros que llegan en la dirección desde otra página (por ejemplo, el buscador del Home)
const filtrosDeLaDireccion = (params: URLSearchParams): FiltrosPropiedades => {
	const operation = params.get("operacion") || "";
	const propertyType = params.get("tipo") || "";
	return {
		...FILTROS_VACIOS,
		operation: OPERACIONES.some((o) => o.value === operation) ? operation : "",
		propertyType: TIPOS.some((t) => t.value === propertyType) ? propertyType : "",
		location: (params.get("ubicacion") || "").slice(0, 100),
	};
};

// Un monoambiente es un departamento de 1 ambiente (así se carga en el panel); los viejos se buscan como departamento
const tipoGeneral = (tipo: string) => (normalizar(tipo) === "monoambiente" ? "departamento" : normalizar(tipo));

const cumpleFiltros = (p: ApiProperty, f: FiltrosPropiedades) => {
	const operacion = p.categoria_operacion || p.operation || p.category || "";
	const tipo = p.tipo_inmueble || p.propertyType || "";
	const estado = p.estado || p.status || "";
	const comodidades = p.comodidades || p.amenities || [];
	const ambientes = p.cantidad_ambientes ?? p.bedrooms;
	return (
		(!f.operation || normalizar(operacion) === f.operation) &&
		(!f.location || normalizar(p.ciudad) === normalizar(f.location)) &&
		(!f.propertyType || tipoGeneral(tipo) === f.propertyType) &&
		(!f.minPrice || p.price >= Number(f.minPrice)) &&
		(!f.maxPrice || p.price <= Number(f.maxPrice)) &&
		(!f.rooms || (ambientes !== undefined && ambientes >= Number(f.rooms))) &&
		(!f.amenities || comodidades.includes(f.amenities)) &&
		(!f.status || normalizar(estado) === f.status)
	);
};

// La dirección se lee con useSearchParams: al navegar desde otra página, window.location
// todavía no está actualizada durante el render, y los filtros se perdían.
export default function PropiedadesPage() {
	return (
		<Suspense fallback={<main className="min-h-dvh bg-[#071733]" />}>
			<PropiedadesConFiltros />
		</Suspense>
	);
}

function PropiedadesConFiltros() {
	const searchParams = useSearchParams();
	const clave = searchParams.toString();
	// La clave remonta el catálogo cuando cambian los filtros de la dirección
	return <Catalogo key={clave} filtrosIniciales={filtrosDeLaDireccion(new URLSearchParams(clave))} />;
}

function Catalogo({ filtrosIniciales }: { filtrosIniciales: FiltrosPropiedades }) {
	const { user } = useAuth();
	const esAdmin = user?.role === "admin";
	const blue = useDolarBlue();

	const [propiedades, setPropiedades] = useState<ApiProperty[]>([]);
	const [localidades, setLocalidades] = useState<string[]>(LOCALIDADES_RESPALDO);
	const [filtros, setFiltros] = useState(filtrosIniciales);
	const [orden, setOrden] = useState<Orden>("destacadas");
	const [visibles, setVisibles] = useState(POR_PAGINA);
	const [estado, setEstado] = useState<"cargando" | "listo" | "error">("cargando");

	const [reordenando, setReordenando] = useState(false);
	const [ordenSinGuardar, setOrdenSinGuardar] = useState(false);
	const [guardandoOrden, setGuardandoOrden] = useState(false);
	const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

	// Pide las propiedades; el estado "cargando" se pone antes de llamarla (al inicio ya lo está)
	const pedir = useCallback(() => {
		getProperties()
			.then((datos) => {
				setPropiedades(datos ?? []);
				setEstado("listo");
			})
			.catch(() => setEstado("error"));
	}, []);

	useEffect(() => {
		pedir();
		obtenerLocalidades().then(setLocalidades);
	}, [pedir]);

	const reintentar = () => {
		setEstado("cargando");
		pedir();
	};

	useEffect(() => {
		if (!aviso) return;
		const t = setTimeout(() => setAviso(null), 4000);
		return () => clearTimeout(t);
	}, [aviso]);

	// Las localidades de la lista oficial más las que aparezcan en propiedades cargadas
	const opcionesLocalidad = useMemo(() => {
		const todas = new Map<string, string>();
		[...localidades, ...propiedades.map((p) => p.ciudad || "")].forEach((nombre) => {
			if (nombre) todas.set(normalizar(nombre), nombre);
		});
		return [...todas.values()].sort((a, b) => a.localeCompare(b, "es"));
	}, [localidades, propiedades]);

	const resultado = useMemo(() => {
		// Mientras el admin reordena se ve el catálogo completo en su orden real
		if (reordenando) return propiedades;
		const lista = propiedades.filter((p) => cumpleFiltros(p, filtros));
		const fecha = (p: ApiProperty) => (p.createdAt ? Date.parse(p.createdAt) : 0);
		if (orden === "recientes") return [...lista].sort((a, b) => fecha(b) - fecha(a));
		if (orden === "menor") return [...lista].sort((a, b) => a.price - b.price);
		if (orden === "mayor") return [...lista].sort((a, b) => b.price - a.price);
		return lista;
	}, [propiedades, filtros, orden, reordenando]);

	const mostradas = reordenando ? resultado : resultado.slice(0, visibles);
	const restantes = resultado.length - mostradas.length;

	const cambiarFiltros = (nuevos: FiltrosPropiedades) => {
		setFiltros(nuevos);
		setVisibles(POR_PAGINA);
	};

	// Reordenamiento (solo administrador)
	const mover = (id: string, destino: "inicio" | "arriba" | "abajo" | "final") => {
		setPropiedades((lista) => {
			const i = lista.findIndex((p) => p._id === id);
			if (i === -1) return lista;
			const copia = [...lista];
			const [elegida] = copia.splice(i, 1);
			const nuevo = destino === "inicio" ? 0 : destino === "final" ? copia.length : destino === "arriba" ? Math.max(0, i - 1) : Math.min(copia.length, i + 1);
			copia.splice(nuevo, 0, elegida);
			return copia;
		});
		setOrdenSinGuardar(true);
	};

	const guardarOrden = async () => {
		setGuardandoOrden(true);
		try {
			await reorderProperties(propiedades.map((p, i) => ({ id: p._id, orden: i + 1 })));
			setOrdenSinGuardar(false);
			setAviso({ tipo: "ok", texto: "Orden guardado. Así se ve ahora el catálogo." });
		} catch (e) {
			setAviso({ tipo: "error", texto: e instanceof Error ? `No se guardó el orden: ${e.message}` : "No se guardó el orden. Probá de nuevo." });
		} finally {
			setGuardandoOrden(false);
		}
	};

	const consultaWhatsApp = `${WHATSAPP_URL}?text=${encodeURIComponent("Hola, estoy buscando una propiedad y no encontré lo que necesito en la web. ¿Me pueden ayudar?")}`;

	return (
		<SitioBase>
			<Revelar>
				<header className="encabezado-color encabezado-azul flex flex-col gap-10 px-5 pb-14 pt-32 sm:px-10 lg:pt-40">
					<div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
						<h1
							data-reveal="lineas"
							data-motion-hide
							className="font-display m-0 text-[clamp(64px,10vw,160px)] font-normal leading-[0.9] tracking-[-0.02em]"
							dangerouslySetInnerHTML={{ __html: TITULO }}
						/>
						<p className="max-w-sm pb-3 text-[16px] leading-relaxed text-[#efe9df]/70">
							Casas, departamentos, locales y terrenos en Villa Libertador San Martín, Crespo y Diamante.
						</p>
					</div>
					{!reordenando && (
						<FiltrosCatalogo
							filtros={filtros}
							localidades={opcionesLocalidad}
							onCambiar={cambiarFiltros}
							onLimpiar={() => cambiarFiltros(FILTROS_VACIOS)}
						/>
					)}
				</header>
			</Revelar>

			{esAdmin && (
				<aside aria-label="Herramientas de administración" className="mx-5 mb-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#efe9df]/15 bg-[#0b2048] px-5 py-4 sm:mx-10">
					<p className="m-0 text-[14px] text-[#efe9df]/80">
						{reordenando
							? "Mové las propiedades para definir en qué orden aparecen en el catálogo y en el inicio."
							: "Estás viendo el catálogo como administrador."}
					</p>
					<div className="flex flex-wrap items-center gap-3">
						{ordenSinGuardar && (
							<button
								type="button"
								onClick={guardarOrden}
								disabled={guardandoOrden}
								className="calma-micro flex items-center gap-2.5 rounded-full bg-[#efe9df] px-5 py-3 text-[12px] text-[#071733] transition-colors hover:bg-white disabled:opacity-60"
							>
								<span className="calma-dot" aria-hidden="true" />
								{guardandoOrden ? "Guardando…" : "Guardar orden"}
							</button>
						)}
						<button
							type="button"
							onClick={() => setReordenando((v) => !v)}
							aria-pressed={reordenando}
							className="calma-micro rounded-full border border-[#efe9df]/40 px-5 py-3 text-[12px] transition-colors hover:border-[#efe9df]"
						>
							{reordenando ? "Terminar de reordenar" : "Reordenar catálogo"}
						</button>
						<Link href="/admin/catalogo" className="calma-micro calma-link calma-link-sutil">
							Organizador completo
						</Link>
					</div>
				</aside>
			)}

			<section aria-label="Resultados" className="px-5 pb-20 sm:px-10">
				{estado === "listo" && propiedades.length > 0 && !reordenando && (
					<div className="mb-10 flex flex-wrap items-center justify-between gap-4">
						<p aria-live="polite" className="m-0 text-[15px] text-[#efe9df]/80">
							{resultado.length === 1 ? "1 propiedad" : `${resultado.length} propiedades`}
						</p>
						<label className="flex items-center gap-3 text-[14px] text-[#efe9df]/70">
							Ordenar por
							<select
								value={orden}
								onChange={(e) => setOrden(e.target.value as Orden)}
								className="font-display cursor-pointer border-0 border-b border-[#efe9df]/30 bg-transparent pb-1 text-[20px] text-[#efe9df] [&>option]:text-[#071733]"
							>
								{ORDENES.map((o) => (
									<option key={o.value} value={o.value}>
										{o.label}
									</option>
								))}
							</select>
						</label>
					</div>
				)}

				{estado === "cargando" && (
					<div aria-busy="true" aria-label="Cargando propiedades" className="grid gap-x-6 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
						{Array.from({ length: 6 }, (_, i) => (
							<div key={i} className="flex flex-col gap-4">
								<div className="calma-brillo aspect-[4/3]" />
								<div className="calma-brillo h-4 w-2/5" />
								<div className="calma-brillo h-7 w-4/5" />
							</div>
						))}
					</div>
				)}

				{estado === "error" && (
					<div role="alert" className="flex flex-col items-start gap-6 border-y border-[#efe9df]/15 py-14">
						<p className="font-display m-0 max-w-2xl text-[clamp(28px,3vw,40px)] leading-tight">No pudimos cargar las propiedades.</p>
						<p className="m-0 text-[15px] text-[#efe9df]/70">Puede ser un problema de conexión. Probá de nuevo en un momento.</p>
						<button type="button" onClick={reintentar} className="calma-micro rounded-full border border-[#efe9df]/40 px-6 py-4 text-[12px] transition-colors hover:border-[#efe9df]">
							Reintentar
						</button>
					</div>
				)}

				{estado === "listo" && resultado.length === 0 && (
					<div className="flex flex-col items-start gap-6 border-y border-[#efe9df]/15 py-14">
						<p className="font-display m-0 max-w-2xl text-[clamp(28px,3vw,40px)] leading-tight">
							{propiedades.length === 0 ? "Todavía no hay propiedades publicadas." : "No hay propiedades con esos filtros."}
						</p>
						<p className="m-0 max-w-xl text-[15px] leading-relaxed text-[#efe9df]/70">
							Contanos qué buscás y te avisamos cuando entre algo parecido.
						</p>
						<div className="flex flex-wrap gap-3">
							{propiedades.length > 0 && (
								<button type="button" onClick={() => cambiarFiltros(FILTROS_VACIOS)} className="calma-micro rounded-full border border-[#efe9df]/40 px-6 py-4 text-[12px] transition-colors hover:border-[#efe9df]">
									Limpiar filtros
								</button>
							)}
							<a href={consultaWhatsApp} target="_blank" rel="noreferrer" className="calma-micro flex items-center gap-2.5 rounded-full bg-[#efe9df] px-6 py-4 text-[12px] text-[#071733] transition-colors hover:bg-white">
								<span className="calma-dot" aria-hidden="true" />
								Consultar por WhatsApp
							</a>
						</div>
					</div>
				)}

				{estado === "listo" && mostradas.length > 0 && (
					<ul className="m-0 grid list-none gap-x-6 gap-y-14 p-0 md:grid-cols-2 lg:grid-cols-3">
						{mostradas.map((propiedad, indice) => (
							<li key={propiedad._id} className="flex flex-col gap-3">
								{reordenando && (
									<div className="flex items-center justify-between gap-2 rounded-xl bg-[#0b2048] px-3 py-2">
										<span className="calma-micro text-[#efe9df]">
											{indice === 0 ? "Primera" : `Posición ${indice + 1}`}
										</span>
										<span className="flex gap-1">
											{(
												[
													["inicio", "Llevar al principio", "M6 5h12M12 19V9m-5 5 5-5 5 5"],
													["arriba", "Subir un lugar", "M12 19V5m-6 6 6-6 6 6"],
													["abajo", "Bajar un lugar", "M12 5v14m6-6-6 6-6-6"],
													["final", "Llevar al final", "M6 19h12M12 5v10m5-5-5 5-5-5"],
												] as const
											).map(([destino, texto, trazo]) => (
												<button
													key={destino}
													type="button"
													onClick={() => mover(propiedad._id, destino)}
													disabled={(destino === "inicio" || destino === "arriba") ? indice === 0 : indice === mostradas.length - 1}
													aria-label={`${texto}: ${propiedad.title}`}
													title={texto}
													className="flex h-11 w-11 items-center justify-center rounded-lg text-[#efe9df] transition-colors hover:bg-[#efe9df]/10 disabled:opacity-30"
												>
													<svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
														<path d={trazo} />
													</svg>
												</button>
											))}
										</span>
									</div>
								)}
								<TarjetaPropiedad propiedad={propiedad} blue={blue} tamano="compacta" revelar={false} />
							</li>
						))}
					</ul>
				)}

				{estado === "listo" && restantes > 0 && (
					<div className="mt-16 flex justify-center">
						<button
							type="button"
							onClick={() => setVisibles((v) => v + POR_PAGINA)}
							className="calma-micro rounded-full border border-[#efe9df]/40 px-8 py-4 text-[12px] transition-colors hover:border-[#efe9df] hover:bg-[#efe9df]/5"
						>
							Ver más propiedades ({restantes})
						</button>
					</div>
				)}
			</section>

			{aviso && (
				<div
					role={aviso.tipo === "error" ? "alert" : "status"}
					className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-6 py-3.5 text-[14px] shadow-[0_18px_40px_rgba(0,0,0,0.35)] ${
						aviso.tipo === "error" ? "bg-[#d9382b] text-white" : "bg-[#efe9df] text-[#071733]"
					}`}
				>
					{aviso.texto}
				</div>
			)}
		</SitioBase>
	);
}

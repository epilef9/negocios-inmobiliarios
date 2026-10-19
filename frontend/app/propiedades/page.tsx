"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Filtros, { type PropertyFilters } from "@/components/Filtros";
import PropiedadCard from "@/components/PropiedadCard";
import { getProperties, reorderProperties, type ApiProperty } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

// Valores y opciones que usan los filtros del catálogo
const initialFilters: PropertyFilters = {
	operation: "",
	location: "",
	propertyType: "",
	minPrice: "",
	maxPrice: "",
	rooms: "",
	amenities: "",
	status: "",
};
const normalize = (value: string) => value.toLocaleLowerCase("es").trim();
const unique = (values: (string | undefined)[]) =>
	[...new Set(values.filter((value): value is string => Boolean(value)))].sort((a, b) =>
		a.localeCompare(b, "es")
	);
const uniqueNumbers = (values: number[]) => [...new Set(values)].sort((a, b) => a - b);
const operationOptions = ["venta", "alquiler", "temporario"];
const propertyTypeOptions = ["departamento", "local", "casa", "monoambiente", "terreno"];
const statusOptions = ["disponible", "reservado", "alquilado", "vendido"];
const amenityOptions = [
	{ value: "aire", label: "Aire acondicionado" },
	{ value: "ascensor", label: "Ascensor" },
	{ value: "cocina", label: "Cocina equipada" },
	{ value: "balcon", label: "Balcón" },
	{ value: "wifi", label: "Wifi" },
	{ value: "tv", label: "TV" },
	{ value: "seguridad", label: "Seguridad 24h" },
	{ value: "cochera_cubierta", label: "Cochera cubierta" },
	{ value: "calefaccion", label: "Calefacción" },
	{ value: "pileta", label: "Pileta" },
	{ value: "parrilla", label: "Parrilla" },
	{ value: "laundry", label: "Laundry" },
];

// Filtros que llegan en la dirección desde otra página (por ejemplo, el buscador del Home)
const filtersFromParams = (params: URLSearchParams): PropertyFilters => {
	const operation = params.get("operacion") || "";
	const propertyType = params.get("tipo") || "";
	const location = (params.get("ubicacion") || "").slice(0, 100);
	return {
		...initialFilters,
		operation: operationOptions.includes(operation) ? operation : "",
		propertyType: propertyTypeOptions.includes(propertyType) ? propertyType : "",
		location,
	};
};

// La dirección se lee con useSearchParams: al navegar desde otra página, window.location
// todavía no está actualizada durante el render, y los filtros se perdían.
export default function PropiedadesPage() {
	return (
		<Suspense fallback={<main className="min-h-dvh bg-[#f7f8fa]" />}>
			<PropiedadesConFiltros />
		</Suspense>
	);
}

function PropiedadesConFiltros() {
	const searchParams = useSearchParams();
	const clave = searchParams.toString();
	// La clave remonta el catálogo cuando cambian los filtros de la dirección
	return <PropiedadesContenido key={clave} filtrosIniciales={filtersFromParams(new URLSearchParams(clave))} />;
}

function PropiedadesContenido({ filtrosIniciales }: { filtrosIniciales: PropertyFilters }) {
	const { user } = useAuth();
	const { currentPalette } = useTheme();

	const [properties, setProperties] = useState<ApiProperty[]>([]);
	const [filters, setFilters] = useState(filtrosIniciales);
	const [appliedFilters, setAppliedFilters] = useState(filtrosIniciales);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	// Estados del Modo Administrador para edición del catálogo en caliente
	const [adminEditMode, setAdminEditMode] = useState(false);
	const [hasUnsavedOrder, setHasUnsavedOrder] = useState(false);
	const [toast, setToast] = useState<string | null>(null);

	// Cargar las propiedades cuando se abre el catálogo
	useEffect(() => {
		getProperties()
			.then((data) => {
				let sorted = [...(data || [])];
				try {
					const cachedOrder = localStorage.getItem("inmobiliaria_custom_catalog_order");
					if (cachedOrder) {
						const orderMap = JSON.parse(cachedOrder) as Record<string, number>;
						sorted.sort((a, b) => {
							const orderA = orderMap[a._id] !== undefined ? orderMap[a._id] : (a.orden ?? 9999);
							const orderB = orderMap[b._id] !== undefined ? orderMap[b._id] : (b.orden ?? 9999);
							return orderA - orderB;
						});
					}
				} catch {
					// ignore
				}
				setProperties(sorted);
			})
			.catch((reason: unknown) =>
				setError(reason instanceof Error ? reason.message : "No se pudieron obtener las propiedades.")
			)
			.finally(() => setLoading(false));
	}, []);

	// Mover propiedad hacia arriba en caliente
	const movePropertyUp = (propertyId: string) => {
		const index = properties.findIndex((p) => p._id === propertyId);
		if (index <= 0) return;
		const updated = [...properties];
		const temp = updated[index - 1];
		updated[index - 1] = updated[index];
		updated[index] = temp;
		setProperties(updated);
		setHasUnsavedOrder(true);
	};

	// Mover propiedad hacia abajo en caliente
	const movePropertyDown = (propertyId: string) => {
		const index = properties.findIndex((p) => p._id === propertyId);
		if (index === -1 || index >= properties.length - 1) return;
		const updated = [...properties];
		const temp = updated[index + 1];
		updated[index + 1] = updated[index];
		updated[index] = temp;
		setProperties(updated);
		setHasUnsavedOrder(true);
	};

	// Mover al primer lugar (#1)
	const movePropertyToFirst = (propertyId: string) => {
		const index = properties.findIndex((p) => p._id === propertyId);
		if (index <= 0) return;
		const updated = [...properties];
		const [selected] = updated.splice(index, 1);
		updated.unshift(selected);
		setProperties(updated);
		setHasUnsavedOrder(true);
	};

	// Mover al último lugar
	const movePropertyToLast = (propertyId: string) => {
		const index = properties.findIndex((p) => p._id === propertyId);
		if (index === -1 || index >= properties.length - 1) return;
		const updated = [...properties];
		const [selected] = updated.splice(index, 1);
		updated.push(selected);
		setProperties(updated);
		setHasUnsavedOrder(true);
	};

	// Guardar el nuevo orden definido por el admin
	const saveCurrentOrder = async () => {
		try {
			const items = properties.map((p, idx) => ({
				id: p._id,
				orden: idx + 1,
			}));

			await reorderProperties(items).catch(() => {});

			const orderMap: Record<string, number> = {};
			items.forEach((item) => {
				orderMap[item.id] = item.orden;
			});
			localStorage.setItem("inmobiliaria_custom_catalog_order", JSON.stringify(orderMap));
			localStorage.setItem("inmobiliaria_catalog_updated_at", new Date().toISOString());

			setHasUnsavedOrder(false);
			setToast("¡Orden de catálogo actualizado y publicado exitosamente!");
			setTimeout(() => setToast(null), 3500);
		} catch {
			setToast("Error al guardar en el servidor. Guardado localmente.");
			setTimeout(() => setToast(null), 3500);
		}
	};

	// Aplicar los filtros seleccionados sobre las propiedades obtenidas
	const filteredProperties = properties.filter((property) => {
		const operation = property.categoria_operacion || property.operation || property.category || "";
		const type = property.tipo_inmueble || property.propertyType || "";
		const status = property.estado || property.status || "";
		const amenities = property.comodidades || property.amenities || [];
		const rooms = property.cantidad_ambientes;
		return (
			(!appliedFilters.operation || normalize(operation) === normalize(appliedFilters.operation)) &&
			(!appliedFilters.location || normalize(property.ciudad || "") === normalize(appliedFilters.location)) &&
			(!appliedFilters.propertyType || normalize(type) === normalize(appliedFilters.propertyType)) &&
			(!appliedFilters.minPrice || property.price >= Number(appliedFilters.minPrice)) &&
			(!appliedFilters.maxPrice || property.price <= Number(appliedFilters.maxPrice)) &&
			(!appliedFilters.rooms || (rooms !== undefined && rooms === Number(appliedFilters.rooms))) &&
			(!appliedFilters.amenities || amenities.includes(appliedFilters.amenities)) &&
			(!appliedFilters.status || normalize(status) === normalize(appliedFilters.status))
		);
	});

	// Armar las opciones disponibles según los datos cargados
	const options = {
		operations: operationOptions,
		locations: unique(properties.map((property) => property.ciudad)),
		types: propertyTypeOptions,
		rooms: uniqueNumbers(
			properties.flatMap((property) =>
				property.cantidad_ambientes === undefined ? [] : [property.cantidad_ambientes]
			)
		),
		amenities: amenityOptions,
		statuses: statusOptions,
	};

	const isAdmin = user?.role === "admin";

	return (
		<main className="min-h-dvh bg-[#f7f8fa] font-sans text-[#141a2b]">
			{/* Toast Notificación */}
			{toast && (
				<div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-emerald-600 text-white shadow-2xl animate-fade-in-up border border-emerald-400">
					<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
					</svg>
					<span className="text-sm font-bold">{toast}</span>
				</div>
			)}

			{/* BARRA EXCLUSIVA PARA EL ADMINISTRADOR */}
			{isAdmin && (
				<aside
					aria-label="Barra de herramientas de administrador"
					className="sticky top-0 z-50 w-full px-4 py-2.5 backdrop-blur-md text-white shadow-lg border-b border-white/20 transition-all"
					style={{
						backgroundColor: currentPalette.primary === '#0A193D' ? 'rgba(10, 25, 61, 0.95)' : currentPalette.primary,
					}}
				>
					<div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
						<div className="flex items-center gap-2.5">
							<span className="flex h-2.5 w-2.5 relative">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
								<span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
							</span>
							<span className="text-xs font-bold tracking-tight">
								👑 Modo Administrador
							</span>
							<span className="hidden sm:inline text-[11px] text-white/70">
								(Estás viendo el catálogo como cliente con herramientas de edición)
							</span>
						</div>

						<div className="flex items-center gap-2">
							{/* Switch para activar reordenamiento en caliente */}
							<button
								type="button"
								onClick={() => setAdminEditMode(!adminEditMode)}
								className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
									adminEditMode
										? "bg-amber-400 text-slate-900 shadow-md ring-2 ring-amber-300"
										: "bg-white/15 hover:bg-white/25 text-white"
								}`}
							>
								<span>{adminEditMode ? "✓ Modo Reordenar Activo" : "🔀 Reordenar desde aquí"}</span>
							</button>

							{hasUnsavedOrder && (
								<button
									type="button"
									onClick={saveCurrentOrder}
									className="px-3.5 py-1.5 rounded-lg text-xs font-extrabold text-white shadow-md animate-pulse transition cursor-pointer"
									style={{ backgroundColor: currentPalette.accent }}
								>
									💾 Guardar Nuevo Orden
								</button>
							)}

							<Link
								href="/admin/catalogo"
								className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-white/10 hover:bg-white/20 transition flex items-center gap-1"
							>
								<span>Organizador Completo</span>
								<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
								</svg>
							</Link>

							<Link
								href="/admin"
								className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 transition"
							>
								Panel Admin
							</Link>
						</div>
					</div>
				</aside>
			)}

			{/* Encabezado del catálogo */}
			<section className="relative overflow-hidden bg-[#071a52] px-5 pb-16 pt-32 text-white sm:px-8 lg:px-12 lg:pb-20">
				<Navbar />
				<div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
					<div>
						<p className="mb-4 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.22em] text-[#f47e73]">
							<span className="h-px w-8 bg-[#f47e73]" />
							Catálogo inmobiliario
						</p>
						<h1 className="max-w-3xl font-fraunces text-5xl font-semibold leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl">
							Encontrá un lugar que se sienta tuyo.
						</h1>
						<p className="mt-6 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
							Explorá nuestra selección de propiedades y encontrá el espacio que acompaña tu próxima etapa.
						</p>
					</div>
					<div className="relative border-l border-white/20 pl-5 text-sm text-white/70">
						{isAdmin && (
							<div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm text-xs">
								<p className="font-bold text-white mb-1">🛠️ Opciones de Administrador</p>
								<p className="text-white/80">
									Activá el &ldquo;Modo Reordenar&rdquo; arriba para acomodar las tarjetas a tu gusto.
								</p>
							</div>
						)}
					</div>
				</div>
				<div className="absolute -bottom-20 -right-12 h-64 w-64 rounded-full border border-white/10" aria-hidden="true" />
				<div className="absolute bottom-0 left-0 h-px w-1/3 bg-[#d9382b]" aria-hidden="true" />
			</section>

			{/* Filtros y resultados */}
			<section className="relative mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-12 lg:py-16">
				<div className="mb-8 flex flex-col gap-4 border-b border-[#dfe5ef] pb-6 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#d9382b]">
							Explorá a tu ritmo
						</p>
						<h2 className="font-fraunces text-3xl font-semibold text-[#071a52] sm:text-4xl">
							Propiedades disponibles
						</h2>
					</div>
					<div className="flex items-center gap-4">
						<p className="text-sm text-[#69707f]">
							<strong className="text-xl text-[#071a52]">{filteredProperties.length}</strong>
							<span className="ml-1">resultados</span>
						</p>
					</div>
				</div>

				<div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
					<Filtros
						filters={filters}
						onChange={setFilters}
						onApply={(event) => {
							event.preventDefault();
							setAppliedFilters(filters);
						}}
						onClear={() => {
							setFilters(initialFilters);
							setAppliedFilters(initialFilters);
						}}
						options={options}
					/>

					<div>
						{loading ? (
							<div className="rounded-2xl border border-[#dfe5ef] bg-white p-12 text-center text-sm text-[#69707f]">
								Cargando propiedades...
							</div>
						) : error ? (
							<div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-700">
								{error}
							</div>
						) : filteredProperties.length === 0 ? (
							<div className="rounded-2xl border border-dashed border-[#bdccef] bg-white p-12 text-center">
								<h3 className="text-lg font-bold text-[#141a2b]">No encontramos propiedades</h3>
								<p className="mt-2 text-sm text-[#69707f]">
									Probá cambiar los filtros para ampliar la búsqueda.
								</p>
							</div>
						) : (
							<div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
								{filteredProperties.map((property) => {
									const globalIdx = properties.findIndex((p) => p._id === property._id);
									const positionNum = globalIdx + 1;
									const isFirst = globalIdx === 0;
									const isLast = globalIdx === properties.length - 1;

									return (
										<div
											key={property._id}
											className={`relative group/admin-card transition-all ${
												isAdmin && adminEditMode ? "card-floating-edit" : ""
											}`}
										>
											{/* Barra de control para el administrador si está activo el modo reordenar */}
											{isAdmin && adminEditMode && (
												<div className="mb-2.5 p-2 rounded-xl bg-slate-900 text-white shadow-xl flex items-center justify-between text-xs border border-white/20 animate-fade-in-up">
													<div className="flex items-center gap-1.5">
														<span className="w-6 h-6 rounded-md bg-amber-400 text-slate-950 font-black flex items-center justify-center text-[11px]">
															#{positionNum}
														</span>
														{isFirst && (
															<span className="text-[10px] font-bold text-amber-300">
																★ Portada
															</span>
														)}
													</div>

													<div className="flex items-center gap-1">
														<button
															type="button"
															onClick={() => movePropertyToFirst(property._id)}
															disabled={isFirst}
															title="Llevar arriba del todo"
															className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-[10px] font-bold"
														>
															⏫ Inicio
														</button>
														<button
															type="button"
															onClick={() => movePropertyUp(property._id)}
															disabled={isFirst}
															title="Mover antes"
															className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30"
														>
															<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
																<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
															</svg>
														</button>
														<button
															type="button"
															onClick={() => movePropertyDown(property._id)}
															disabled={isLast}
															title="Mover después"
															className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30"
														>
															<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
																<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
															</svg>
														</button>
														<button
															type="button"
															onClick={() => movePropertyToLast(property._id)}
															disabled={isLast}
															title="Llevar abajo del todo"
															className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-[10px] font-bold"
														>
															⏬ Final
														</button>
													</div>
												</div>
											)}

											<PropiedadCard property={property} />
										</div>
									);
								})}
							</div>
						)}
					</div>
				</div>
			</section>
		</main>
	);
}
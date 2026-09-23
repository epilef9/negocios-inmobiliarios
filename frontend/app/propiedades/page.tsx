"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Filtros, { type PropertyFilters } from "@/components/Filtros";
import PropiedadCard from "@/components/PropiedadCard";
import { getProperties, type ApiProperty } from "@/services/api";

// Valores y opciones que usan los filtros del catálogo
const initialFilters: PropertyFilters = { operation: "", location: "", propertyType: "", minPrice: "", maxPrice: "", rooms: "", amenities: "", status: "" };
const normalize = (value: string) => value.toLocaleLowerCase("es").trim();
const unique = (values: (string | undefined)[]) => [...new Set(values.filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, "es"));
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

// Mantener el filtro de operación si viene desde otra página
const getInitialFilters = (): PropertyFilters => {
	if (typeof window === "undefined") return initialFilters;
	const operation = new URLSearchParams(window.location.search).get("operacion") || "";
	return operationOptions.includes(operation) ? { ...initialFilters, operation } : initialFilters;
};

export default function PropiedadesPage() {
	const [properties, setProperties] = useState<ApiProperty[]>([]);
	const [filters, setFilters] = useState(getInitialFilters);
	const [appliedFilters, setAppliedFilters] = useState(getInitialFilters);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	// Cargar las propiedades cuando se abre el catálogo
	useEffect(() => {
		getProperties().then(setProperties).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "No se pudieron obtener las propiedades.")).finally(() => setLoading(false));
	}, []);

	// Aplicar los filtros seleccionados sobre las propiedades obtenidas
	const filteredProperties = properties.filter((property) => {
		const operation = property.categoria_operacion || property.operation || property.category || "";
		const type = property.tipo_inmueble || property.propertyType || "";
		const status = property.estado || property.status || "";
		const amenities = property.comodidades || property.amenities || [];
		const rooms = property.cantidad_ambientes;
		return (!appliedFilters.operation || normalize(operation) === normalize(appliedFilters.operation)) && (!appliedFilters.location || normalize(property.ciudad || "") === normalize(appliedFilters.location)) && (!appliedFilters.propertyType || normalize(type) === normalize(appliedFilters.propertyType)) && (!appliedFilters.minPrice || property.price >= Number(appliedFilters.minPrice)) && (!appliedFilters.maxPrice || property.price <= Number(appliedFilters.maxPrice)) && (!appliedFilters.rooms || (rooms !== undefined && rooms === Number(appliedFilters.rooms))) && (!appliedFilters.amenities || amenities.includes(appliedFilters.amenities)) && (!appliedFilters.status || normalize(status) === normalize(appliedFilters.status));
	});

	// Armar las opciones disponibles según los datos cargados
	const options = {
		operations: operationOptions,
		locations: unique(properties.map((property) => property.ciudad)),
		types: propertyTypeOptions,
		rooms: uniqueNumbers(properties.flatMap((property) => property.cantidad_ambientes === undefined ? [] : [property.cantidad_ambientes])),
		amenities: amenityOptions,
		statuses: statusOptions,
	};

	return <main className="min-h-dvh bg-[#f7f8fa] font-sans text-[#141a2b]">
		{/* Encabezado del catálogo */}
		<section className="relative overflow-hidden bg-[#071a52] px-5 pb-16 pt-32 text-white sm:px-8 lg:px-12 lg:pb-20">
			<Navbar />
			<div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
				<div>
					<p className="mb-4 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.22em] text-[#f47e73]"><span className="h-px w-8 bg-[#f47e73]" />Catálogo inmobiliario</p>
					<h1 className="max-w-3xl font-fraunces text-5xl font-semibold leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl">Encontrá un lugar que se sienta tuyo.</h1>
					<p className="mt-6 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">Explorá nuestra selección de propiedades y encontrá el espacio que acompaña tu próxima etapa.</p>
				</div>
				<div className="relative border-l border-white/20 pl-5 text-sm text-white/70">
				</div>
			</div>
			<div className="absolute -bottom-20 -right-12 h-64 w-64 rounded-full border border-white/10" aria-hidden="true" />
			<div className="absolute bottom-0 left-0 h-px w-1/3 bg-[#d9382b]" aria-hidden="true" />
		</section>
		{/* Filtros y resultados */}
		<section className="relative mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-12 lg:py-16">
			<div className="mb-8 flex flex-col gap-4 border-b border-[#dfe5ef] pb-6 sm:flex-row sm:items-end sm:justify-between">
				<div><p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#d9382b]">Explorá a tu ritmo</p><h2 className="font-fraunces text-3xl font-semibold text-[#071a52] sm:text-4xl">Propiedades disponibles</h2></div>
				<p className="text-sm text-[#69707f]"><strong className="text-xl text-[#071a52]">{filteredProperties.length}</strong><span className="ml-1">resultados</span></p>
			</div>
			<div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
				<Filtros filters={filters} onChange={setFilters} onApply={(event) => { event.preventDefault(); setAppliedFilters(filters); }} onClear={() => { setFilters(initialFilters); setAppliedFilters(initialFilters); }} options={options} />
				<div>
					{loading ? <div className="rounded-2xl border border-[#dfe5ef] bg-white p-12 text-center text-sm text-[#69707f]">Cargando propiedades...</div>
					 : error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-700">{error}</div>
					 : filteredProperties.length === 0 ? <div className="rounded-2xl border border-dashed border-[#bdccef] bg-white p-12 text-center"><h3 className="text-lg font-bold text-[#141a2b]">No encontramos propiedades</h3><p className="mt-2 text-sm text-[#69707f]">Probá cambiar los filtros para ampliar la búsqueda.</p></div>
					 : <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{filteredProperties.map((property) => <PropiedadCard key={property._id} property={property} />)}</div>}
				</div>
			</div>
		</section>
	</main>;
}
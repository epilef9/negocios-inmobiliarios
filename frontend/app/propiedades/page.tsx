"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Filtros, { type PropertyFilters } from "@/components/Filtros";
import PropiedadCard from "@/components/PropiedadCard";
import { getProperties, type ApiProperty } from "@/services/api";

const initialFilters: PropertyFilters = { operation: "", location: "", propertyType: "", minPrice: "", maxPrice: "", rooms: "", amenities: "", status: "" };
const normalize = (value: string) => value.toLocaleLowerCase("es").trim();
const unique = (values: (string | undefined)[]) => [...new Set(values.filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, "es"));
const uniqueNumbers = (values: number[]) => [...new Set(values)].sort((a, b) => a - b);
const operationOptions = ["venta", "alquiler", "temporario"];
const propertyTypeOptions = ["departamento", "local", "casa", "monoambiente", "terreno"];
const statusOptions = ["disponible", "reservado", "alquilado", "vendido"];

export default function PropiedadesPage() {
	const [properties, setProperties] = useState<ApiProperty[]>([]);
	const [filters, setFilters] = useState(initialFilters);
	const [appliedFilters, setAppliedFilters] = useState(initialFilters);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		getProperties().then(setProperties).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "No se pudieron obtener las propiedades.")).finally(() => setLoading(false));
	}, []);

	const filteredProperties = properties.filter((property) => {
		const operation = property.categoria_operacion || property.operation || property.category || "";
		const type = property.tipo_inmueble || property.propertyType || "";
		const status = property.estado || property.status || "";
		const amenities = property.comodidades || property.amenities || [];
		const rooms = property.cantidad_ambientes;
		return (!appliedFilters.operation || normalize(operation) === normalize(appliedFilters.operation)) && (!appliedFilters.location || normalize(property.ciudad || "") === normalize(appliedFilters.location)) && (!appliedFilters.propertyType || normalize(type) === normalize(appliedFilters.propertyType)) && (!appliedFilters.minPrice || property.price >= Number(appliedFilters.minPrice)) && (!appliedFilters.maxPrice || property.price <= Number(appliedFilters.maxPrice)) && (!appliedFilters.rooms || (rooms !== undefined && rooms === Number(appliedFilters.rooms))) && (!appliedFilters.amenities || amenities.some((amenity) => normalize(amenity) === normalize(appliedFilters.amenities))) && (!appliedFilters.status || normalize(status) === normalize(appliedFilters.status));
	});

	const options = {
		operations: operationOptions,
		locations: unique(properties.map((property) => property.ciudad)),
		types: propertyTypeOptions,
		rooms: uniqueNumbers(properties.flatMap((property) => property.cantidad_ambientes === undefined ? [] : [property.cantidad_ambientes])),
		amenities: unique(properties.flatMap((property) => property.comodidades || property.amenities || [])),
		statuses: statusOptions,
	};

	return <main className="min-h-dvh bg-[#f7f8fa] font-sans text-[#141a2b]"><section className="relative overflow-hidden bg-[#071a52] px-5 pb-14 pt-32 text-white sm:px-8 lg:px-12"><Navbar /><div className="relative mx-auto max-w-7xl"><p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#f47e73]">Catálogo inmobiliario</p><h1 className="font-fraunces text-4xl font-semibold tracking-tight sm:text-5xl">Todas las propiedades</h1><p className="mt-4 max-w-xl text-base leading-relaxed text-white/70">Encontrá espacios pensados para tu próxima etapa, con información clara y asesoramiento cuando lo necesites.</p></div></section><section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-12 lg:py-14"><div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]"><Filtros filters={filters} onChange={setFilters} onApply={(event) => { event.preventDefault(); setAppliedFilters(filters); }} onClear={() => { setFilters(initialFilters); setAppliedFilters(initialFilters); }} options={options} /><div><div className="mb-6 flex items-end justify-between border-b border-[#dfe5ef] pb-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#d9382b]">Resultados</p><h2 className="mt-1 text-2xl font-bold text-[#141a2b]">Propiedades disponibles</h2></div><span className="text-sm text-[#69707f]"><strong className="text-[#141a2b]">{filteredProperties.length}</strong> encontradas</span></div>{loading ? <div className="rounded-2xl border border-[#dfe5ef] bg-white p-12 text-center text-sm text-[#69707f]">Cargando propiedades...</div> : error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-700">{error}</div> : filteredProperties.length === 0 ? <div className="rounded-2xl border border-dashed border-[#bdccef] bg-white p-12 text-center"><h3 className="text-lg font-bold text-[#141a2b]">No encontramos propiedades</h3><p className="mt-2 text-sm text-[#69707f]">Probá cambiar los filtros para ampliar la búsqueda.</p></div> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filteredProperties.map((property) => <PropiedadCard key={property._id} property={property} />)}</div>}</div></div></section></main>;
}

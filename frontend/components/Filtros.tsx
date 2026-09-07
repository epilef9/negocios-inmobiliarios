import type { FormEvent } from "react";

export type PropertyFilters = {
	operation: string;
	location: string;
	propertyType: string;
	minPrice: string;
	maxPrice: string;
	rooms: string;
	amenities: string;
	status: string;
};

type FiltrosProps = {
	filters: PropertyFilters;
	onChange: (filters: PropertyFilters) => void;
	onApply: (event: FormEvent<HTMLFormElement>) => void;
	onClear: () => void;
	options: {
		operations: string[];
		locations: string[];
		types: string[];
		rooms: number[];
		amenities: string[];
		statuses: string[];
	};
};

const inputClass = "mt-2 w-full rounded-lg border border-[#dfe5ef] bg-white px-3 py-2.5 text-sm text-[#141a2b] outline-none transition placeholder:text-[#9aa2b2] focus:border-[#d9382b] focus:ring-2 focus:ring-[#d9382b]/10";
const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function Filtros({ filters, onChange, onApply, onClear, options }: FiltrosProps) {
	const update = (key: keyof PropertyFilters, value: string) => onChange({ ...filters, [key]: value });

	return (
		<form onSubmit={onApply} className="rounded-2xl border border-[#dfe5ef] bg-white p-5 shadow-[0_12px_30px_rgba(7,26,82,0.05)]">
			<div className="flex items-center justify-between border-b border-[#edf0f4] pb-4"><h2 className="text-base font-bold text-[#141a2b]">Filtrar propiedades</h2><button type="button" onClick={onClear} className="text-xs font-semibold text-[#d9382b] hover:underline">Borrar filtros</button></div>
			<div className="space-y-5 pt-5">
				<label className="block text-xs font-bold uppercase tracking-[0.12em] text-[#69707f]">Operación<select value={filters.operation} onChange={(event) => update("operation", event.target.value)} className={inputClass}><option value="">Todas</option>{options.operations.map((option) => <option key={option} value={option}>{label(option)}</option>)}</select></label>
				<label className="block text-xs font-bold uppercase tracking-[0.12em] text-[#69707f]">Ubicación<select value={filters.location} onChange={(event) => update("location", event.target.value)} className={inputClass}><option value="">Todas</option>{options.locations.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
				<label className="block text-xs font-bold uppercase tracking-[0.12em] text-[#69707f]">Tipo de inmueble<select value={filters.propertyType} onChange={(event) => update("propertyType", event.target.value)} className={inputClass}><option value="">Todos</option>{options.types.map((option) => <option key={option} value={option}>{label(option)}</option>)}</select></label>
				<fieldset><legend className="text-xs font-bold uppercase tracking-[0.12em] text-[#69707f]">Precio (USD)</legend><div className="mt-2 grid grid-cols-2 gap-2"><input type="number" min="0" value={filters.minPrice} onChange={(event) => update("minPrice", event.target.value)} className="w-full rounded-lg border border-[#dfe5ef] px-3 py-2.5 text-sm outline-none focus:border-[#d9382b]" placeholder="Mínimo" /><input type="number" min="0" value={filters.maxPrice} onChange={(event) => update("maxPrice", event.target.value)} className="w-full rounded-lg border border-[#dfe5ef] px-3 py-2.5 text-sm outline-none focus:border-[#d9382b]" placeholder="Máximo" /></div></fieldset>
				<label className="block text-xs font-bold uppercase tracking-[0.12em] text-[#69707f]">Ambientes<select value={filters.rooms} onChange={(event) => update("rooms", event.target.value)} className={inputClass}><option value="">Todos</option>{options.rooms.map((rooms) => <option key={rooms} value={rooms}>{rooms} dormitorios o más</option>)}</select></label>
				<label className="block text-xs font-bold uppercase tracking-[0.12em] text-[#69707f]">Comodidades<select value={filters.amenities} onChange={(event) => update("amenities", event.target.value)} className={inputClass} disabled={!options.amenities.length}><option value="">{options.amenities.length ? "Todas" : "Sin datos disponibles"}</option>{options.amenities.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
				<label className="block text-xs font-bold uppercase tracking-[0.12em] text-[#69707f]">Estado<select value={filters.status} onChange={(event) => update("status", event.target.value)} className={inputClass}><option value="">Todos</option>{options.statuses.map((option) => <option key={option} value={option}>{label(option)}</option>)}</select></label>
			</div>
			<button type="submit" className="mt-6 w-full rounded-lg bg-[#d9382b] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#b92d24]">Aplicar filtros</button>
		</form>
	);
}

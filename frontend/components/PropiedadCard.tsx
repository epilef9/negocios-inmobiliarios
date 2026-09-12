import Link from "next/link";
import type { ApiProperty } from "@/services/api";

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=85";

type PropiedadCardProps = {
	property: ApiProperty;
};

const formatPrice = (value: number, currency: string) =>
	`${currency} ${value.toLocaleString("es-AR")}`;

function PropertyTypeIcon({ type }: { type: string }) {
	const normalizedType = type.toLocaleLowerCase("es");

	if (normalizedType.includes("casa") || normalizedType.includes("monoambiente")) {
		return <path d="m3.5 10.5 8.5-7 8.5 7M5.5 9v10.5h13V9M9 19.5v-5h6v5" />;
	}

	if (normalizedType.includes("local")) {
		return <path d="M4 10.5h16M5 10.5v9h14v-9M7 6h10l2 4.5H5L7 6ZM9 19.5v-5h6v5" />;
	}

	if (normalizedType.includes("terreno")) {
		return <path d="m4 18 5-7 3 3 3-5 5 9H4ZM6 6h.01M11 6h.01M16 6h.01" />;
	}

	return <path d="M5 20V5h14v15M8 8h2M14 8h2M8 12h2M14 12h2M8 16h2M14 16h2" />;
}

function FeatureIcon({ kind }: { kind: "rooms" | "bathrooms" | "area" }) {
	if (kind === "rooms") {
		return <path d="M4 16v-4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4M4 16h16M6 16v2M18 16v2M7 10V7h4v3M17 10V8h2v2" />;
	}

	if (kind === "bathrooms") {
		return <path d="M5 10h14a2 2 0 0 1 2 2v1H3v-1a2 2 0 0 1 2-2ZM4 13v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2M7 10V6a2 2 0 0 1 4 0v1" />;
	}

	return <path d="M4 19 20 5M7 5h13v13M4 9v10h10" />;
}

export default function PropiedadCard({ property }: PropiedadCardProps) {
	const image = property.images?.[0] || PLACEHOLDER_IMAGE;
	const operation = property.categoria_operacion || property.operation || property.category || "Propiedad";
	const type = property.tipo_inmueble || property.propertyType || "Inmueble";
	const currency = property.moneda || "USD";
	const rooms = property.cantidad_ambientes ?? property.bedrooms;
	const status = property.estado || property.status || "disponible";
	const statusLabel = status;
	const statusIsAvailable = status.toLocaleLowerCase("es") === "disponible";

	return (
		<article className="group overflow-hidden rounded-2xl border border-[#d9e1ef] bg-white shadow-[0_12px_30px_rgba(7,26,82,0.08)] transition duration-300 hover:-translate-y-1.5 hover:border-[#b9c9e7] hover:shadow-[0_20px_42px_rgba(7,26,82,0.16)]">
			<div className="relative aspect-[16/10] overflow-hidden bg-[#e9edf4]">
				<img src={image} alt={property.title} className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-105" />
				<div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#071a52]/75 to-transparent" aria-hidden="true" />
				<span className={`absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white shadow-lg backdrop-blur-sm ${statusIsAvailable ? "border-white/30 bg-[#10265A]/95 shadow-[#071a52]/30" : "border-red-200/40 bg-[#b4232b]/95 shadow-red-950/25"}`}>
					<svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
						{statusIsAvailable ? <path d="m5 12 4 4L19 6" /> : <path d="M6 6l12 12M18 6 6 18" />}
					</svg>
					{statusLabel}
				</span>
				<span className="absolute bottom-4 left-4 rounded-full border border-white/25 bg-[#071a52]/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-sm">
					{operation}
				</span>
			</div>
			<div className="p-5">
				<p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#d9382b]">
					<svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
						<PropertyTypeIcon type={type} />
					</svg>
					{type}
				</p>
				<h2 className="mt-1.5 line-clamp-2 text-lg font-bold leading-snug text-[#141a2b]">{property.title}</h2>
				<p className="mt-2 flex items-start gap-2 text-sm leading-snug text-[#69707f]">
					<svg className="mt-0.5 h-4 w-4 shrink-0 text-[#d9382b]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
						<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
						<circle cx="12" cy="10" r="2.5" />
					</svg>
					<span>{property.location}</span>
				</p>
				<div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-y border-[#edf0f4] py-3 text-xs font-medium text-[#69707f]">
					<span className="inline-flex items-center gap-1.5"><svg className="h-4 w-4 text-[#d9382b]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><FeatureIcon kind="rooms" /></svg>{rooms} amb.</span>
					<span className="inline-flex items-center gap-1.5"><svg className="h-4 w-4 text-[#d9382b]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><FeatureIcon kind="bathrooms" /></svg>{property.bathrooms} baño{property.bathrooms === 1 ? "" : "s"}</span>
					<span className="inline-flex items-center gap-1.5"><svg className="h-4 w-4 text-[#d9382b]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><FeatureIcon kind="area" /></svg>{property.area} m²</span>
				</div>
				<div className="mt-4 flex items-end justify-between gap-3">
					<div>
						<p className="text-xl font-bold tracking-tight text-[#071a52]">{formatPrice(property.price, currency)}</p>
						{property.priceARS !== undefined && <p className="mt-1 text-xs text-[#69707f]">{formatPrice(property.priceARS, "ARS")}</p>}
						{property.expenses !== undefined && <p className="mt-1 text-[11px] text-[#69707f]">Expensas {formatPrice(property.expenses, "ARS")}</p>}
					</div>
					<Link href={`/propiedades/${property._id}`} className="shrink-0 rounded-lg bg-[#071a52] px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#d9382b]">Ver detalle</Link>
				</div>
			</div>
		</article>
	);
}

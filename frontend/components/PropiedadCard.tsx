import Link from "next/link";
import type { ApiProperty } from "@/services/api";

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=85";

type PropiedadCardProps = {
	property: ApiProperty;
};

const formatPrice = (value: number, currency: string) =>
	`${currency} ${value.toLocaleString("es-AR")}`;

export default function PropiedadCard({ property }: PropiedadCardProps) {
	const image = property.images?.[0] || PLACEHOLDER_IMAGE;
	const operation = property.categoria_operacion || property.operation || property.category || "Propiedad";

	return (
		<article className="group overflow-hidden rounded-2xl border border-[#dfe5ef] bg-white shadow-[0_12px_30px_rgba(7,26,82,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_38px_rgba(7,26,82,0.12)]">
			<div className="relative aspect-[16/10] overflow-hidden bg-[#e9edf4]">
				<img src={image} alt={property.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
				<span className="absolute left-4 top-4 rounded-md bg-white/95 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#d9382b] shadow-sm">
					{property.estado || property.status || "Disponible"}
				</span>
				<span className="absolute bottom-4 left-4 rounded-md bg-[#071a52]/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-sm">
					{operation}
				</span>
			</div>
			<div className="p-5">
				<p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#69707f]">{property.tipo_inmueble || property.propertyType || "Inmueble"}</p>
				<h2 className="mt-2 line-clamp-2 min-h-12 text-lg font-bold leading-snug text-[#141a2b]">{property.title}</h2>
				<p className="mt-2 flex items-start gap-2 text-sm text-[#69707f]"><span aria-hidden="true" className="text-[#d9382b]">●</span>{property.location}</p>
				<div className="mt-5 flex items-end justify-between gap-3 border-t border-[#edf0f4] pt-4">
					<div>
						<p className="text-xl font-bold text-[#071a52]">{formatPrice(property.price, "USD")}</p>
						{property.priceARS !== undefined && <p className="mt-1 text-xs text-[#69707f]">{formatPrice(property.priceARS, "ARS")}</p>}
						<p className="mt-2 text-xs text-[#69707f]">{property.cantidad_ambientes ?? property.bedrooms} amb. · {property.bathrooms} baño · {property.area} m²{property.expenses !== undefined && ` · Expensas ${formatPrice(property.expenses, "ARS")}`}</p>
					</div>
					<Link href={`/propiedades/${property._id}`} className="shrink-0 rounded-lg border border-[#bdccef] px-3 py-2 text-xs font-semibold text-[#071a52] transition hover:border-[#d9382b] hover:text-[#d9382b]">Ver detalle</Link>
				</div>
			</div>
		</article>
	);
}

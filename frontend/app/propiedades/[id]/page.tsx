'use client';

import Link from "next/link";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { getPropertyById, resolveMapsLink, type ApiProperty } from "@/services/api";

const SelectorUbicacionMapa = dynamic(() => import("@/components/SelectorUbicacionMapa"), {
  ssr: false,
  loading: () => <div className="h-80 w-full animate-pulse rounded-xl bg-slate-100" />,
});

function ActionIcon({ type }: { type: "calendar" | "whatsapp" | "mail" }) {
  const paths = {
    calendar: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" /></>,
    whatsapp: <><path d="M20 11.5a8 8 0 0 1-11.8 7.1L4 20l1.5-4.1A8 8 0 1 1 20 11.5Z" /><path d="M9 8.5c.3 2 2.2 4 4.2 4.5l1.2-1.2 1.6.7c.2.1.3.4.2.6-.4 1.1-1.3 1.6-2.5 1.3-3.4-.8-5.5-2.9-6.3-6.2-.3-1.2.2-2.1 1.3-2.5.2-.1.5 0 .6.2l.7 1.6L9 8.5Z" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  }[type];

  return <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths}</svg>;
}

const formatPrice = (value: number | undefined, currency: string) => value === undefined ? "" : `${currency} ${value.toLocaleString("es-AR")}`;

const amenityLabels: Record<string, string> = {
  aire: "Aire acondicionado",
  ascensor: "Ascensor",
  cocina: "Cocina equipada",
  balcon: "Balcón",
  wifi: "Wifi",
  tv: "TV",
  seguridad: "Seguridad 24h",
  cochera_cubierta: "Cochera cubierta",
  calefaccion: "Calefacción",
  pileta: "Pileta",
  parrilla: "Parrilla",
  laundry: "Laundry",
};

export default function PropertyDetail() {
  const params = useParams<{ id: string }>();
  const propertyId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [property, setProperty] = useState<ApiProperty | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mapCoordinates, setMapCoordinates] = useState<{ latitud: string; longitud: string } | null>(null);

  useEffect(() => {
    if (!propertyId) return;

    getPropertyById(propertyId)
      .then((data) => {
        setProperty(data);
        setError("");
        setActiveImage(0);
        if (data.latitud && data.longitud) {
          setMapCoordinates({ latitud: data.latitud, longitud: data.longitud });
        } else if (data.linkGoogleMaps) {
          resolveMapsLink(data.linkGoogleMaps).then(setMapCoordinates).catch(() => setMapCoordinates(null));
        } else {
          setMapCoordinates(null);
        }
      })
      .catch((reason: unknown) => {
        setProperty(null);
        setError(reason instanceof Error ? reason.message : "No se pudo obtener la propiedad.");
      })
      .finally(() => setLoading(false));
  }, [propertyId]);

  if (loading || property?._id !== propertyId) return <main className="min-h-dvh bg-[#f5f7fa] font-sans text-[#092454]"><p className="mx-auto max-w-[1260px] px-4 py-16 text-center text-sm text-slate-500">Cargando propiedad...</p></main>;
  if (error || !property) return <main className="min-h-dvh bg-[#f5f7fa] font-sans text-[#092454]"><section className="mx-auto max-w-[1260px] px-4 py-16 text-center"><h1 className="text-2xl font-bold">Propiedad no encontrada</h1><p className="mt-3 text-sm text-slate-500">{error || "No existe una propiedad asociada a este identificador."}</p><Link href="/propiedades" className="mt-6 inline-block rounded-md bg-[#092454] px-5 py-2.5 text-sm font-semibold text-white">Volver a propiedades</Link></section></main>;

  const gallery = property.images ?? [];
  const details = [
    property.cantidad_ambientes !== undefined ? `${property.cantidad_ambientes} ambientes` : null,
    property.bathrooms !== undefined ? `${property.bathrooms} baño${property.bathrooms === 1 ? "" : "s"}` : null,
    property.area !== undefined ? `${property.area} m²` : null,
    property.cochera ? `Cochera: ${property.cochera}` : null,
  ].filter((detail): detail is string => Boolean(detail));
  const amenities = (property.comodidades ?? [])
    .map((amenity) => amenityLabels[amenity])
    .filter((amenity): amenity is string => Boolean(amenity));
  const location = [property.direccionCompleta, property.ciudad, property.provincia].filter(Boolean).join(", ") || property.location;
  const operation = property.categoria_operacion || property.operation;
  const type = property.tipo_inmueble || property.propertyType;
  const operationLabel = operation === "temporario" ? "Alquiler temporario" : operation === "venta" ? "Venta" : operation === "alquiler" ? "Alquiler" : operation;
  const whatsappHref = property.telefonoWhatsApp ? `https://wa.me/${property.telefonoWhatsApp.replace(/\D/g, "")}` : "";
  const moveImage = (direction: number) => setActiveImage((activeImage + direction + gallery.length) % gallery.length);

  return (
    <main className="min-h-dvh bg-[#f5f7fa] font-sans text-[#092454]">
      <header className="h-[62px] bg-[#092454] text-white shadow-md"><div className="mx-auto flex h-full max-w-[1260px] items-center justify-between px-5 lg:px-0"><Link href="/" className="flex items-center gap-2.5"><span className="relative flex h-10 w-11 items-end justify-center border-b-[3px] border-white"><span className="absolute -top-1 h-7 w-7 rotate-45 border-l-[4px] border-t-[4px] border-white" /><span className="relative z-10 grid h-4 w-4 grid-cols-2 gap-0.5 bg-red-600 p-0.5"><i className="bg-white/80" /><i className="bg-white/80" /><i className="bg-white/80" /><i className="bg-white/80" /></span></span><span className="leading-[0.9]"><strong className="block text-[17px] font-bold tracking-[0.06em]">NEGOCIOS</strong><b className="block text-[14px] font-bold tracking-[0.04em] text-red-500">INMOBILIARIOS</b></span></Link><nav className="hidden items-center gap-10 text-[14px] font-semibold md:flex"><Link href="/" className="py-5 text-white/85 transition hover:text-white">Inicio</Link><Link href="/requisitos" className="py-5 text-white/85 transition hover:text-white">Requisitos</Link><Link href="/contacto" className="py-5 text-white/85 transition hover:text-white">Contacto</Link><Link href="/admin" className="ml-4 rounded-md bg-red-600 px-5 py-2.5 transition hover:bg-red-500">Ingresar</Link></nav></div></header>

      <section className="mx-auto max-w-[1260px] px-4 pb-12 pt-5 sm:px-6 lg:px-0"><div className="mb-4 flex items-center gap-2 text-xs text-slate-500"><Link href="/propiedades" className="transition hover:text-[#092454]">Propiedades</Link><span>/</span><span>Detalle</span></div><div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_350px]">
        <div className="min-w-0">
          {gallery.length > 0 ? <><div className="relative aspect-[16/7] overflow-hidden rounded-lg bg-slate-200 shadow-sm sm:aspect-[16/6.5]"><img src={gallery[activeImage]} alt={property.title} className="h-full w-full object-cover transition-opacity duration-300" />{gallery.length > 1 && <><button type="button" onClick={() => moveImage(-1)} aria-label="Imagen anterior" className="absolute left-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-xl text-[#092454] shadow-md transition hover:bg-red-600 hover:text-white">‹</button><button type="button" onClick={() => moveImage(1)} aria-label="Imagen siguiente" className="absolute right-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-xl text-[#092454] shadow-md transition hover:bg-red-600 hover:text-white">›</button></>}<span className="absolute right-3 top-3 rounded-full bg-black/65 px-3 py-1 text-xs font-semibold text-white">{activeImage + 1} / {gallery.length}</span></div><div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">{gallery.map((image, index) => <button type="button" key={image} onClick={() => setActiveImage(index)} className={`aspect-[1.55] overflow-hidden rounded-md border-2 bg-white ${activeImage === index ? "border-[#092454]" : "border-transparent"}`}><img src={image} alt={`Miniatura ${index + 1} de ${property.title}`} className="h-full w-full object-cover" /></button>)}</div></> : <div className="flex aspect-[16/7] items-center justify-center rounded-lg bg-slate-200 text-sm text-slate-500 sm:aspect-[16/6.5]">Esta propiedad no tiene imágenes cargadas.</div>}
          <div className="mt-5 rounded-lg border border-[#e3e7ee] bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div>{operationLabel && <span className="inline-flex rounded-md bg-[#d9382b] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white">{operationLabel}</span>}<h1 className="mt-2 text-[22px] font-bold leading-tight text-[#092454] sm:text-[24px]">{property.title}</h1><p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500"><span className="text-red-600">●</span>{location}</p></div><button type="button" className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-red-600"><span className="text-xl text-red-600">♡</span> Guardar</button></div>{(type || details.length > 0) && <div className="mt-4 flex flex-wrap gap-2">{[type, ...details].filter((value): value is string => Boolean(value)).map((label) => <span key={label} className="rounded-full bg-[#f0f4fa] px-3 py-1.5 text-xs font-semibold text-[#31466b]">{label}</span>)}</div>}{property.description && <div className="mt-4 border-t border-[#edf0f4] pt-4 text-[13px] leading-[1.45] text-slate-600"><p>{property.description}</p></div>}</div>
          {amenities.length > 0 && <div className="mt-5 rounded-lg border border-[#e3e7ee] bg-white p-4 shadow-sm sm:p-5"><h2 className="text-base font-bold text-[#092454]"><span className="mr-2 text-red-600">●</span>Comodidades</h2><div className="mt-3 flex flex-wrap gap-2">{amenities.map((amenity) => <span key={amenity} className="rounded-full bg-[#f0f4fa] px-3 py-1.5 text-xs font-semibold text-[#31466b]">{amenity}</span>)}</div></div>}
          <div className="mt-5 rounded-lg border border-[#e3e7ee] bg-white p-4 shadow-sm sm:p-5"><h2 className="text-base font-bold text-[#092454]"><span className="mr-2 text-red-600">●</span>Ubicación</h2><p className="mt-3 text-sm text-slate-600">{location}</p>{property.referenciasUbicacion && <p className="mt-1 text-sm text-slate-500">{property.referenciasUbicacion}</p>}{property.linkGoogleMaps && <a href={property.linkGoogleMaps} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-red-600 hover:underline">Ver en Google Maps</a>}{mapCoordinates && <div className="mt-4 overflow-hidden rounded-xl"><SelectorUbicacionMapa latitud={mapCoordinates.latitud} longitud={mapCoordinates.longitud} onChange={() => undefined} direccionSugerida={property.direccionCompleta ?? ""} ciudadSugerida={property.ciudad ?? ""} provinciaSugerida={property.provincia ?? "entre_rios"} /></div>}</div>
        </div>

        <aside className="rounded-xl border border-[#e4e8ee] bg-white p-5 shadow-[0_3px_18px_rgba(9,36,84,0.08)] sm:p-6 lg:sticky lg:top-5"><p className="text-[15px] font-semibold text-slate-500">Precio</p><p className="mt-1 text-[36px] font-bold leading-tight text-[#092454]">{formatPrice(property.price, property.moneda || "USD")}</p>{property.priceARS !== undefined && <p className="text-[18px] text-slate-500">{formatPrice(property.priceARS, "ARS")}</p>}{property.montoExpensas !== undefined && <p className="mt-1 text-sm text-slate-500">Expensas: {formatPrice(property.montoExpensas, "ARS")}</p>}<div className="my-5 h-px bg-[#edf0f4]" /><div className="space-y-3">{property.permitirVisita && <button type="button" className="group flex w-full items-center gap-4 rounded-lg border border-[#e3e7ee] p-3 text-left shadow-sm transition hover:border-[#092454] hover:shadow-md"><span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#092454] text-white"><ActionIcon type="calendar" /></span><span className="flex-1"><strong className="block text-sm text-[#092454]">Agendar visita</strong><small className="text-xs text-slate-500">Coordiná una visita al inmueble</small></span><span className="text-2xl text-[#092454]">›</span></button>}{property.permitirWhatsApp && whatsappHref && <a href={whatsappHref} target="_blank" rel="noreferrer" className="group flex w-full items-center gap-4 rounded-lg border border-[#e3e7ee] p-3 text-left shadow-sm transition hover:border-[#25a85a] hover:shadow-md"><span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#52ba63] text-white"><ActionIcon type="whatsapp" /></span><span className="flex-1"><strong className="block text-sm text-[#319449]">Contactar por WhatsApp</strong><small className="text-xs text-slate-500">Escribinos directamente</small></span><span className="text-2xl text-[#092454]">›</span></a>}{property.permitirEmail && <a href={`mailto:?subject=${encodeURIComponent(`Consulta por ${property.title}`)}`} className="group flex w-full items-center gap-4 rounded-lg border border-[#e3e7ee] p-3 text-left shadow-sm transition hover:border-[#092454] hover:shadow-md"><span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#092454] text-white"><ActionIcon type="mail" /></span><span className="flex-1"><strong className="block text-sm text-[#092454]">Enviar consulta</strong><small className="text-xs text-slate-500">Consultá por esta propiedad</small></span><span className="text-2xl text-[#092454]">›</span></a>}</div></aside>
      </div></section>
    </main>
  );
}
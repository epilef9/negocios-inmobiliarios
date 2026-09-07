'use client';

import Link from "next/link";
import { useState } from "react";

const gallery = [
  "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1600&q=90",
  "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1600566753051-f0b89df2dd90?auto=format&fit=crop&w=700&q=85",
];

const details = ["2 ambientes", "1 baño", "55 m²", "Cochera", "A/A", "Ascensor", "Seguridad 24h"];

function ActionIcon({ type }: { type: "calendar" | "whatsapp" | "mail" }) {
  const paths = {
    calendar: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" /></>,
    whatsapp: <><path d="M20 11.5a8 8 0 0 1-11.8 7.1L4 20l1.5-4.1A8 8 0 1 1 20 11.5Z" /><path d="M9 8.5c.3 2 2.2 4 4.2 4.5l1.2-1.2 1.6.7c.2.1.3.4.2.6-.4 1.1-1.3 1.6-2.5 1.3-3.4-.8-5.5-2.9-6.3-6.2-.3-1.2.2-2.1 1.3-2.5.2-.1.5 0 .6.2l.7 1.6L9 8.5Z" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  }[type];

  return <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths}</svg>;
}

export default function PropertyDetail() {
  const [activeImage, setActiveImage] = useState(0);
  const moveImage = (direction: number) => setActiveImage((activeImage + direction + gallery.length) % gallery.length);

  return (
    <main className="min-h-dvh bg-[#f5f7fa] font-sans text-[#092454]">
      <header className="h-[62px] bg-[#092454] text-white shadow-md">
        <div className="mx-auto flex h-full max-w-[1260px] items-center justify-between px-5 lg:px-0">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="relative flex h-10 w-11 items-end justify-center border-b-[3px] border-white pb-0.5"><span className="absolute -top-1 h-7 w-7 rotate-45 border-l-[4px] border-t-[4px] border-white" /><span className="relative z-10 mb-0.5 grid h-4 w-4 grid-cols-2 gap-0.5 bg-red-600 p-0.5"><i className="bg-white/80" /><i className="bg-white/80" /><i className="bg-white/80" /><i className="bg-white/80" /></span></span>
            <span className="leading-[0.9]"><strong className="block text-[17px] font-bold tracking-[0.06em]">NEGOCIOS</strong><b className="block text-[14px] font-bold tracking-[0.04em] text-red-500">INMOBILIARIOS</b></span>
          </Link>
          <nav className="hidden items-center gap-10 text-[14px] font-semibold md:flex"><Link href="/" className="border-b-2 border-red-500 py-5 text-white">Inicio</Link><Link href="/propiedades" className="py-5 text-white/85 transition hover:text-white">Requisitos</Link><Link href="/contacto" className="py-5 text-white/85 transition hover:text-white">Contacto</Link><Link href="/admin" className="ml-4 rounded-md bg-red-600 px-5 py-2.5 transition hover:bg-red-500">♙&nbsp; Ingresar</Link></nav>
        </div>
      </header>

      <section className="mx-auto max-w-[1260px] px-4 pb-12 pt-5 sm:px-6 lg:px-0">
        <div className="mb-4 flex items-center gap-2 text-xs text-slate-500"><Link href="/propiedades" className="transition hover:text-[#092454]">Propiedades</Link><span>/</span><span>Detalle</span></div>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_350px]">
          <div className="min-w-0">
            <div className="relative aspect-[16/7] overflow-hidden rounded-lg bg-slate-200 shadow-sm sm:aspect-[16/6.5]"><img src={gallery[activeImage]} alt="Interior de la propiedad" className="h-full w-full object-cover transition-opacity duration-300" /><button type="button" onClick={() => moveImage(-1)} aria-label="Imagen anterior" className="absolute left-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-xl text-[#092454] shadow-md transition hover:bg-red-600 hover:text-white">‹</button><button type="button" onClick={() => moveImage(1)} aria-label="Imagen siguiente" className="absolute right-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-xl text-[#092454] shadow-md transition hover:bg-red-600 hover:text-white">›</button><span className="absolute right-3 top-3 rounded-full bg-black/65 px-3 py-1 text-xs font-semibold text-white">▧ {activeImage + 1} / {gallery.length}</span></div>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">{gallery.map((image, index) => <button type="button" key={image} onClick={() => setActiveImage(index)} className={`aspect-[1.55] overflow-hidden rounded-md border-2 bg-white ${activeImage === index ? "border-[#092454]" : "border-transparent"}`}><img src={image} alt={`Miniatura ${index + 1}`} className="h-full w-full object-cover" /></button>)}</div>
            <div className="mt-5 rounded-lg border border-[#e3e7ee] bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="text-[22px] font-bold leading-tight text-[#092454] sm:text-[24px]">Departamento 2 ambientes con cochera — Centro</h1><p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500"><span className="text-red-600">●</span> Calle San Martín 1200, Paraná, Entre Ríos</p></div><button type="button" className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-red-600"><span className="text-xl text-red-600">♡</span> Guardar</button></div>
              <div className="mt-4 flex flex-wrap gap-2">{details.map((label) => <span key={label} className="rounded-full bg-[#f0f4fa] px-3 py-1.5 text-xs font-semibold text-[#31466b]">{label}</span>)}</div>
              <div className="mt-4 border-t border-[#edf0f4] pt-4 text-[13px] leading-[1.45] text-slate-600"><p className="font-semibold text-[#31466b]">Luminoso departamento en planta alta con excelente ubicación en el centro de Paraná.</p><p className="mt-1">Cuenta con living-comedor amplio, cocina integrada con mesada de granito, dormitorio principal en suite y cochera cubierta propia.</p><p className="mt-3 border-t border-[#edf0f4] pt-3">El edificio cuenta con ascensor, seguridad las 24 horas y áreas comunes mantenidas.<br />Ideal para profesionales o parejas jóvenes. A pasos de comercios, bancos y transporte público.</p></div>
            </div>
            <div className="mt-5 rounded-lg border border-[#e3e7ee] bg-white p-4 shadow-sm sm:p-5"><h2 className="text-base font-bold text-[#092454]"><span className="mr-2 text-red-600">●</span>Ubicación</h2><div className="relative mt-3 h-44 overflow-hidden rounded-md bg-[#dbe8de]"><div className="absolute inset-0 opacity-70" style={{ backgroundImage: "linear-gradient(25deg, transparent 35%, #fff 36%, #fff 39%, transparent 40%), linear-gradient(100deg, transparent 46%, #fff 47%, #fff 49%, transparent 50%), linear-gradient(160deg, transparent 61%, #f4d2a0 62%, #f4d2a0 66%, transparent 67%)", backgroundSize: "145px 110px, 170px 120px, 230px 160px" }} /><span className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-red-600 text-xl text-white shadow-lg">●</span><div className="absolute right-3 top-3 overflow-hidden rounded-md bg-white text-lg font-bold shadow"><button type="button" className="block h-8 w-8 border-b border-slate-200">+</button><button type="button" className="block h-8 w-8">−</button></div></div></div>
          </div>

          <aside className="rounded-xl border border-[#e4e8ee] bg-white p-5 shadow-[0_3px_18px_rgba(9,36,84,0.08)] sm:p-6 lg:sticky lg:top-5"><p className="text-[15px] font-semibold text-slate-500">Precio de venta</p><p className="mt-1 text-[36px] font-bold leading-tight text-[#092454]">USD 72.000</p><p className="text-[18px] text-slate-500">≈ $98.640.000 ARS</p><div className="mt-4 flex gap-2 rounded-md bg-[#f0f2f6] p-3 text-xs leading-4 text-slate-600"><span className="font-bold">ⓘ</span><span>Valor referencial según cotización dólar blue vigente. Puede variar.</span></div><div className="my-5 h-px bg-[#edf0f4]" /><div className="space-y-3"><button type="button" className="group flex w-full items-center gap-4 rounded-lg border border-[#e3e7ee] p-3 text-left shadow-sm transition hover:border-[#092454] hover:shadow-md"><span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#092454] text-white"><ActionIcon type="calendar" /></span><span className="flex-1"><strong className="block text-sm text-[#092454]">Agendar visita</strong><small className="text-xs text-slate-500">Coordiná una visita al inmueble</small></span><span className="text-2xl text-[#092454] transition group-hover:translate-x-1">›</span></button><a href="https://wa.me/5491100000000" className="group flex w-full items-center gap-4 rounded-lg border border-[#e3e7ee] p-3 text-left shadow-sm transition hover:border-[#25a85a] hover:shadow-md"><span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#52ba63] text-white"><ActionIcon type="whatsapp" /></span><span className="flex-1"><strong className="block text-sm text-[#319449]">Contactar por WhatsApp</strong><small className="text-xs text-slate-500">Escribinos directamente</small></span><span className="text-2xl text-[#092454] transition group-hover:translate-x-1">›</span></a><button type="button" className="group flex w-full items-center gap-4 rounded-lg border border-[#e3e7ee] p-3 text-left shadow-sm transition hover:border-[#092454] hover:shadow-md"><span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#092454] text-white"><ActionIcon type="mail" /></span><span className="flex-1"><strong className="block text-sm text-[#092454]">Enviar consulta</strong><small className="text-xs text-slate-500">Responderemos a la brevedad</small></span><span className="text-2xl text-[#092454] transition group-hover:translate-x-1">›</span></button></div><div className="mt-5 flex items-center justify-center gap-2 border-t border-[#edf0f4] pt-5 text-xs font-semibold text-slate-500"><span className="text-base">◷</span> Lun a Vie 9 – 18 h · Sáb 9 – 13 h</div></aside>
        </div>
      </section>
    </main>
  );
}

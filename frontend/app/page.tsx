// frontend/app/page.tsx
import Link from "next/link";
import Navbar from "@/components/Navbar";

const featuredProperties = [
  {
    title: "Propiedad destacada 1",
    type: "[TIPO DE OPERACIÓN]",
    location: "[Ubicación pendiente]",
    price: "[Precio pendiente]",
    detail: "[Detalles pendientes]",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=85",
    accent: "Próximamente",
  },
  {
    title: "Propiedad destacada 2",
    type: "[TIPO DE OPERACIÓN]",
    location: "[Ubicación pendiente]",
    price: "[Precio pendiente]",
    detail: "[Detalles pendientes]",
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=85",
    accent: "Próximamente",
  },
  {
    title: "Propiedad destacada 3",
    type: "[TIPO DE OPERACIÓN]",
    location: "[Ubicación pendiente]",
    price: "[Precio pendiente]",
    detail: "[Detalles pendientes]",
    image: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=900&q=85",
    accent: "Próximamente",
  },
];

const steps = [
  ["01", "Contanos qué buscás", "[Descripción del paso pendiente de definir por el cliente]"],
  ["02", "Explorá con claridad", "[Descripción del paso pendiente de definir por el cliente]"],
  ["03", "Coordiná tu próximo paso", "[Descripción del paso pendiente de definir por el cliente]"],
];

export default function Home() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#050b18] font-sans selection:bg-red-600 selection:text-white">
      <Navbar />

      {/* 2. HERO */}
      <section className="relative w-full min-h-dvh flex items-center justify-center overflow-hidden">
        
        {/* Video de fondo */}
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src="/videos/home.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
        />

        <div className="absolute inset-0 bg-gradient-to-b from-[#03102c]/55 via-[#061533]/60 to-[#050b18]" aria-hidden="true" />
        <div className="relative z-10 flex flex-col items-center text-center gap-6 px-5 py-16 max-w-3xl sm:gap-7 md:gap-8 mt-12">
          <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky-200 backdrop-blur-md opacity-0 animate-fade-in-up">
            Negocios inmobiliarios
          </span>
          <h1 className="text-[clamp(2.25rem,6vw,4.5rem)] font-bold leading-[1.08] tracking-tight text-white opacity-0 animate-fade-in-up">
            Encontrá el lugar que{" "}
            <span className="bg-gradient-to-r from-sky-400 to-blue-400 bg-clip-text text-transparent">
              cambia todo
            </span>
          </h1>

          <p className="text-lg text-white/80 max-w-xl leading-relaxed font-light opacity-0 animate-fade-in-up [animation-delay:150ms] sm:text-xl">
            Propiedades exclusivas con asesoramiento personalizado.
            Tu próximo hogar, a un clic de distancia.
          </p>

          <div className="flex flex-col gap-3.5 w-full max-w-xs mt-2 opacity-0 animate-fade-in-up [animation-delay:300ms] sm:flex-row sm:max-w-none sm:w-auto">
            <Link
              href="/propiedades"
              className="group inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-7 py-3.5 text-base font-semibold text-white transition-all duration-300 hover:bg-blue-600 hover:shadow-xl hover:shadow-blue-500/25 hover:-translate-y-0.5 active:scale-[0.98]"
            >
              Explorar propiedades
              <svg
                className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>

            <Link
              href="/contacto"
              className="inline-flex items-center justify-center rounded-lg border border-white/20 px-7 py-3.5 text-base font-medium text-white backdrop-blur-sm transition-all duration-300 hover:border-white/45 hover:bg-white/10 hover:-translate-y-0.5 active:scale-[0.98]"
            >
              Contactanos
            </Link>
          </div>
        </div>
        <a href="#explorar" className="absolute bottom-7 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/60 transition-colors hover:text-white">
          Descubrí más
          <span className="h-8 w-px bg-gradient-to-b from-white/60 to-transparent" />
        </a>
      </section>

      <section id="explorar" className="relative bg-[#f3f7ff] px-5 py-16 text-[#07133a] sm:px-8 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="relative -mt-28 rounded-2xl border border-white/70 bg-white/80 p-5 shadow-2xl shadow-[#081b52]/15 backdrop-blur-xl sm:p-7 lg:-mt-36">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-red-600">Búsqueda inteligente</p>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Empezá por lo que necesitás</h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">[Descripción de sección pendiente de definir por el cliente]</p>
              </div>
              <Link href="/propiedades" className="inline-flex items-center justify-center rounded-lg bg-[#071a52] px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600">Ver catálogo completo <span className="ml-2">→</span></Link>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[["Comprar", "[Descripción pendiente]"], ["Alquilar", "[Descripción pendiente]"], ["Temporario", "[Descripción pendiente]"]].map(([label, description]) => (
                <Link key={label} href="/propiedades" className="group rounded-xl border border-[#dbe5f6] bg-white/70 p-4 transition hover:-translate-y-1 hover:border-red-300 hover:shadow-lg hover:shadow-red-900/10">
                  <div className="flex items-center justify-between"><span className="text-base font-bold">{label}</span><span className="text-xl text-red-600 transition group-hover:translate-x-1">↗</span></div>
                  <p className="mt-2 text-xs text-slate-500">{description}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="grid gap-5 border-b border-[#dbe5f6] py-14 sm:grid-cols-3 lg:py-16">
            {[["[N°]", "[Métrica pendiente]"], ["[N°]", "[Métrica pendiente]"], ["[N°]", "[Métrica pendiente]"]].map(([value, label]) => (
              <div key={label} className="border-l-2 border-red-500 pl-5"><p className="text-3xl font-bold text-[#071a52]">{value}</p><p className="mt-1 text-sm text-slate-500">{label}</p></div>
            ))}
          </div>

          <div className="flex flex-col gap-4 py-14 sm:flex-row sm:items-end sm:justify-between lg:py-20">
            <div><p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-red-600">Selección de la semana</p><h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Espacios con algo para decir</h2><p className="mt-3 max-w-xl text-slate-600">[Descripción pendiente de definir por el cliente]</p></div>
            <Link href="/propiedades" className="shrink-0 text-sm font-bold text-[#071a52] underline decoration-red-500 decoration-2 underline-offset-4 transition hover:text-red-600">Ver todas las propiedades →</Link>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {featuredProperties.map((property) => (
              <article key={property.title} className="group overflow-hidden rounded-2xl border border-white/80 bg-white shadow-lg shadow-[#071a52]/8 transition duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-200"><img src={property.image} alt={property.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /><span className="absolute left-3 top-3 rounded-md bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-600 backdrop-blur-sm">{property.accent}</span></div>
                <div className="p-5"><p className="text-[10px] font-bold tracking-[0.16em] text-red-600">{property.type}</p><h3 className="mt-2 text-lg font-bold text-[#071a52]">{property.title}</h3><p className="mt-1 text-sm text-slate-500">{property.location}</p><div className="mt-5 flex items-end justify-between border-t border-slate-100 pt-4"><div><p className="text-lg font-bold text-[#071a52]">{property.price}</p><p className="mt-1 text-xs text-slate-500">{property.detail}</p></div><Link href="/propiedades" className="rounded-lg border border-[#bdccef] px-3 py-2 text-xs font-semibold text-[#071a52] transition hover:border-red-500 hover:text-red-600">Ver detalle</Link></div></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#071a52] px-5 py-20 text-white sm:px-8 lg:px-12 lg:py-24">
        <div className="absolute -right-24 top-0 h-80 w-80 rounded-full bg-sky-400/10 blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl"><div className="max-w-2xl"><p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-sky-300">Una forma más simple</p><h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Tu próxima decisión, acompañada.</h2><p className="mt-4 leading-relaxed text-white/65">[Descripción pendiente de definir por el cliente]</p></div><div className="mt-12 grid gap-8 md:grid-cols-3">{steps.map(([number, title, description]) => <div key={number} className="border-t border-white/20 pt-5"><span className="text-sm font-bold text-red-400">{number}</span><h3 className="mt-7 text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-white/60">{description}</p></div>)}</div></div>
      </section>

      <section className="bg-[#f3f7ff] px-5 py-16 sm:px-8 lg:px-12 lg:py-20"><div className="mx-auto flex max-w-7xl flex-col gap-8 rounded-2xl border border-[#d5e0f4] bg-white/60 p-7 shadow-xl shadow-[#071a52]/5 backdrop-blur-xl sm:p-10 lg:flex-row lg:items-center lg:justify-between"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-red-600">Hablemos</p><h2 className="text-2xl font-bold text-[#071a52] sm:text-3xl">¿Ya tenés una propiedad en mente?</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">[Descripción pendiente de definir por el cliente]</p></div><div className="flex flex-col gap-3 sm:flex-row"><Link href="/contacto" className="rounded-lg bg-red-600 px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#071a52]">Contactar a un asesor</Link><Link href="/admin/propiedades/nueva" className="rounded-lg border border-[#bdccef] px-6 py-3 text-center text-sm font-semibold text-[#071a52] transition hover:border-red-500 hover:text-red-600">Publicar propiedad</Link></div></div></section>
    </main>
  );
}
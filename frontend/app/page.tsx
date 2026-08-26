// frontend/app/page.tsx
import Link from "next/link";
import Navbar from "@/components/Navbar"; // Ajusta la ruta de importación si es necesario

export default function Home() {
  return (
    <main className="relative min-h-dvh bg-black font-sans selection:bg-red-600 selection:text-white">
      
      {/* Importamos el componente Navbar */}
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

        {/* Overlay degradado */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/80"
          aria-hidden="true"
        />

        {/* Contenido del Hero */}
        <div className="relative z-10 flex flex-col items-center text-center gap-6 px-5 py-16 max-w-3xl sm:gap-7 md:gap-8 mt-12">
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
      </section>
    </main>
  );
}
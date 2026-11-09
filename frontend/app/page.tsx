// frontend/app/page.tsx
import Image from "next/image";
import Link from "next/link";
import SitioBase from "@/components/sitio/SitioBase";
import Revelar from "@/components/sitio/Revelar";
import HeroCalma from "@/components/home/calma/HeroCalma";
import DestacadasCalma from "@/components/home/calma/DestacadasCalma";
import MapaZonasCalma from "@/components/home/calma/MapaZonasCalma";

// Texto que se anima renglón por renglón. Va como HTML fijo para que React no reconcilie
// los nodos que GSAP SplitText reorganiza (es un texto propio, nunca datos de usuarios).
const tituloPropiedades =
  '<span class="block">Propiedades</span><span class="block pl-[1.2em] md:pl-[3.6em]">que valen una visita.</span>';

export default function Home() {
  return (
    <SitioBase>
      <HeroCalma />

      <Revelar>
        {/* La inmobiliaria */}
        <section className="relative grid gap-10 px-5 py-16 sm:px-10 lg:grid-cols-12 lg:gap-6 lg:py-20">
          <div aria-hidden="true" className="absolute inset-y-0 left-1/2 hidden w-px bg-[#efe9df]/10 lg:block" />
          <div data-reveal="imagen" data-motion-hide className="relative aspect-[4/5] max-h-[560px] overflow-hidden lg:col-span-4">
            <div data-parallax className="absolute inset-0">
              <Image src="/images/home-inmobiliaria.webp" alt="Frente de la oficina de Negocios Inmobiliarios al anochecer" fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover object-[center_45%]" />
            </div>
          </div>
          <div className="flex flex-col gap-10 lg:col-span-6 lg:col-start-7 lg:pl-10">
            <h2 className="sr-only">La inmobiliaria</h2>
            <div data-reveal="suave" data-motion-hide className="flex flex-col gap-5">
              <p className="font-display m-0 text-[clamp(30px,2.9vw,42px)] leading-[1.12] [text-wrap:balance]">
                Somos Araceli Balbuena Negocios Inmobiliarios, de Villa Libertador San Martín.
              </p>
              <p className="font-display m-0 text-[clamp(21px,1.8vw,26px)] leading-[1.3] text-[#efe9df]/80 [text-wrap:pretty]">
                Te acompañamos a comprar, alquilar o pasar unos días en Libertador, Crespo y Diamante, con atención en persona y alguien que conoce cada barrio.
              </p>
            </div>
            <div className="grid gap-8 text-[15px] leading-[1.65] text-[#efe9df]/70 sm:grid-cols-2">
              <p className="m-0">Desde nuestra oficina en 25 de Mayo 726 coordinamos cada visita, preparamos los contratos y te explicamos qué necesitás para cada operación.</p>
              <p className="m-0">Casas, departamentos, locales y terrenos en venta y en alquiler, y alojamientos por días para quienes vienen de visita a la zona.</p>
            </div>
            <Link href="/requisitos" className="calma-micro calma-link self-start">
              Ver requisitos para alquilar
            </Link>
          </div>
        </section>

        {/* Propiedades destacadas, en el orden que define el administrador */}
        <section className="px-5 pb-16 sm:px-10 lg:pb-20">
          <h2
            data-reveal="lineas"
            data-motion-hide
            className="font-display m-0 pb-10 text-[clamp(52px,6.4vw,104px)] font-normal leading-[0.95] tracking-[-0.02em]"
            dangerouslySetInnerHTML={{ __html: tituloPropiedades }}
          />
          <DestacadasCalma />
          <Link href="/propiedades" className="calma-micro calma-link mt-10">
            Ver el catálogo completo
          </Link>
        </section>

        {/* Mapa satelital de las tres localidades con las propiedades marcadas */}
        <MapaZonasCalma />

      </Revelar>
    </SitioBase>
  );
}

// frontend/app/page.tsx
import Image from "next/image";
import Link from "next/link";
import SitioBase from "@/components/sitio/SitioBase";
import Revelar from "@/components/sitio/Revelar";
import HeroCalma from "@/components/home/calma/HeroCalma";
import DestacadasCalma from "@/components/home/calma/DestacadasCalma";
import LocalidadesCalma from "@/components/home/calma/LocalidadesCalma";

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
          <div className="flex flex-col gap-10 lg:col-span-6 lg:col-start-7">
            <h2 className="sr-only">La inmobiliaria</h2>
            <p data-reveal="suave" data-motion-hide className="font-display m-0 text-[clamp(28px,2.7vw,38px)] leading-[1.18] [text-indent:3.2em]">
              Somos de Villa Libertador San Martín. Te ayudamos a comprar, alquilar o pasar unos días en el centro de Entre Ríos, con alguien que conoce cada barrio y te atiende en persona.
            </p>
            <div className="grid gap-8 text-[15px] leading-[1.65] text-[#efe9df]/70 sm:grid-cols-2">
              <p className="m-0">Desde la oficina de 25 de Mayo 726 coordinamos las visitas, los contratos y los requisitos de cada operación.</p>
              <p className="m-0">Venta, alquiler y alquiler por días de casas, departamentos, locales y terrenos.</p>
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

        <LocalidadesCalma />

      </Revelar>
    </SitioBase>
  );
}

// frontend/app/page.tsx
import Image from "next/image";
import Link from "next/link";
import HomeHeader from "@/components/home/calma/HomeHeader";
import HeroCalma from "@/components/home/calma/HeroCalma";
import DestacadasCalma from "@/components/home/calma/DestacadasCalma";
import LocalidadesCalma from "@/components/home/calma/LocalidadesCalma";
import Revelar from "@/components/home/calma/Revelar";
import SmoothScroll from "@/components/home/calma/SmoothScroll";
import CursorVer from "@/components/home/calma/CursorVer";

const WHATSAPP_URL = "https://wa.me/543434469522";
const EMAIL = "puiggarinegociosinmobiliarios@hotmail.com";
const MAPS_URL = "https://www.google.com/maps/search/?api=1&query=25+de+Mayo+726+Villa+Libertador+San+Mart%C3%ADn+Entre+R%C3%ADos";

// Textos que se animan renglón por renglón. Van como HTML fijo para que React no reconcilie
// los nodos que GSAP SplitText reorganiza (son textos propios, nunca datos de usuarios).
const tituloPropiedades =
  '<span class="block">Propiedades</span><span class="block pl-[1.2em] md:pl-[3.6em]">que valen una visita.</span>';
const textoOficina = 'Pasá por 25 de Mayo 726, Villa Libertador San Martín.';

const horarios = [
  { dias: "Lunes a jueves", horas: "9 a 13 y 17 a 19 h" },
  { dias: "Viernes", horas: "9 a 13 h" },
  { dias: "Fin de semana", horas: "Cerrado" },
];

const botonClaro =
  "calma-micro group flex items-center gap-2.5 rounded-full bg-[#efe9df] px-6 py-4 text-[12px] text-[#071733] transition-colors duration-500 hover:bg-white";
const botonLinea =
  "calma-micro rounded-full border border-[#efe9df]/40 px-6 py-4 text-[12px] transition-colors duration-500 hover:border-[#efe9df] hover:bg-[#efe9df]/5";

export default function Home() {
  return (
    <main className="home-calma-raiz min-h-dvh bg-[#071733] font-sans text-[#efe9df] selection:bg-[#d9382b] selection:text-white">
      <SmoothScroll />
      <CursorVer />
      <HomeHeader />
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

        {/* Contacto */}
        <footer className="grid gap-10 px-5 pb-10 pt-16 sm:px-10 lg:grid-cols-12 lg:gap-6 lg:pt-20">
          <p
            data-reveal="lineas"
            data-motion-hide
            className="font-display m-0 text-[clamp(44px,5.6vw,88px)] leading-none lg:col-span-7"
            dangerouslySetInnerHTML={{ __html: textoOficina }}
          />
          <div className="flex flex-col gap-7 lg:col-span-4 lg:col-start-9">
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-[15px]">
              {horarios.map((horario) => (
                <div key={horario.dias} className="contents">
                  <dt className="text-[#efe9df]/70">{horario.dias}</dt>
                  <dd className="m-0">{horario.horas}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap gap-3">
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className={botonClaro}>
                <span className="calma-dot" aria-hidden="true" />
                WhatsApp
              </a>
              <a href={`mailto:${EMAIL}`} className={botonLinea}>
                Email
              </a>
              <a href={MAPS_URL} target="_blank" rel="noreferrer" className={botonLinea}>
                Cómo llegar
              </a>
            </div>
          </div>
          <p className="calma-micro col-span-full mt-10 border-t border-[#efe9df]/15 pt-6 text-[#efe9df]/60">
            Negocios Inmobiliarios, Villa Libertador San Martín, Entre Ríos
          </p>
        </footer>
      </Revelar>
    </main>
  );
}

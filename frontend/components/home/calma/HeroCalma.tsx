'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import { registrarGsap, SIN_MOVIMIENTO_REDUCIDO } from '@/components/sitio/motion';
import { LOCALIDADES_RESPALDO, obtenerLocalidades } from '@/components/sitio/datos';

const OPERACIONES = [
  { value: 'venta', label: 'Comprar' },
  { value: 'alquiler', label: 'Alquilar' },
  { value: 'temporario', label: 'Por días' },
];

const TIPOS = [
  { value: '', label: 'Cualquiera' },
  { value: 'casa', label: 'Casa' },
  { value: 'departamento', label: 'Departamento' },
  { value: 'local', label: 'Local' },
  { value: 'terreno', label: 'Terreno' },
];

// HTML fijo: SplitText reorganiza estos nodos y React no debe volver a tocarlos
const TITULO_HERO =
  '<span class="block">Lugares</span><span class="block pl-[1.1em]">para vivir</span><span class="block pl-[2.2em]">sin apuro.</span>';

const campo = 'flex flex-col gap-2.5 border-[#efe9df]/25 py-5';
const select =
  'font-display w-full cursor-pointer appearance-none border-0 bg-transparent p-0 text-[22px] sm:text-[26px] text-[#efe9df] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#efe9df] [&>option]:text-[#071733]';

export default function HeroCalma() {
  const raiz = useRef<HTMLElement>(null);
  const router = useRouter();
  const [operacion, setOperacion] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [tipo, setTipo] = useState('');
  const [localidades, setLocalidades] = useState<string[]>(LOCALIDADES_RESPALDO);

  useEffect(() => {
    obtenerLocalidades().then(setLocalidades);
  }, []);

  useGSAP(
    () => {
      registrarGsap();
      const mm = gsap.matchMedia();
      mm.add(SIN_MOVIMIENTO_REDUCIDO, () => {
        // Momento de entrada: la persiana sube, tablilla por tablilla desde abajo, y descubre la casa
        gsap.set('[data-persiana]', { autoAlpha: 1 });
        gsap.to('[data-tablilla]', {
          scaleY: 0,
          duration: 1.1,
          ease: 'expo.inOut',
          stagger: { each: 0.055, from: 'end' },
          onComplete: () => {
            gsap.set('[data-persiana]', { display: 'none' });
          },
        });
        gsap.fromTo('[data-hero-foto]', { scale: 1.14 }, { scale: 1, duration: 3, ease: 'power3.out', delay: 0.15 });

        SplitText.create('[data-hero-titulo]', {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          onSplit(self) {
            gsap.set('[data-hero-titulo]', { visibility: 'visible' });
            return gsap.from(self.lines, { yPercent: 115, duration: 1.5, ease: 'expo.out', stagger: 0.12, delay: 0.75 });
          },
        });

        gsap.from('[data-hero-aparece]', { autoAlpha: 0, y: 24, duration: 1.3, ease: 'expo.out', stagger: 0.08, delay: 1.35 });

        // Al bajar, la foto se queda un poco atrás (parallax)
        gsap.to('[data-hero-foto]', {
          yPercent: 14,
          ease: 'none',
          scrollTrigger: { trigger: raiz.current, start: 'top top', end: 'bottom top', scrub: true },
        });
      });
    },
    { scope: raiz }
  );

  const buscar = (evento: React.FormEvent) => {
    evento.preventDefault();
    const params = new URLSearchParams();
    if (operacion) params.set('operacion', operacion);
    if (localidad) params.set('ubicacion', localidad);
    if (tipo) params.set('tipo', tipo);
    router.push(`/propiedades${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <section ref={raiz} className="relative flex min-h-[max(100svh,760px)] flex-col overflow-hidden text-[#efe9df]">
      <div data-hero-foto className="absolute inset-0 will-change-transform">
        <Image src="/images/home-hero.webp" alt="" fill priority sizes="100vw" className="object-cover object-[78%_center] md:object-center" />
      </div>
      {/* Persiana: solo existe para la animación de entrada (oculta si se reduce el movimiento) */}
      <div data-persiana aria-hidden="true" className="invisible absolute inset-0 z-20 flex flex-col">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} data-tablilla className="block flex-1 origin-top border-b border-[#0b2350] bg-[#071733]" />
        ))}
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,23,51,0.55)_0%,rgba(7,23,51,0)_30%,rgba(7,23,51,0.35)_55%,rgba(7,23,51,0.96)_100%)]"
      />

      <div className="relative mt-auto flex flex-col gap-10 px-5 pb-8 pt-32 sm:gap-12 sm:px-10 sm:pb-10">
        <div className="flex flex-wrap items-end justify-between gap-10">
          <h1
            data-hero-titulo
            data-motion-hide
            className="font-display m-0 text-[clamp(60px,9.4vw,152px)] font-normal leading-[0.94] tracking-[-0.02em]"
            dangerouslySetInnerHTML={{ __html: TITULO_HERO }}
          />
          <div data-hero-aparece data-motion-hide className="hidden flex-col gap-2.5 pb-3 sm:flex">
            <span className="calma-micro text-[#efe9df]/70">Trabajamos en</span>
            <span className="font-display text-[26px] leading-[1.2]">
              Libertador San Martín
              <br />
              Crespo
              <br />
              Diamante
            </span>
          </div>
        </div>

        <form
          data-hero-aparece
          data-motion-hide
          role="search"
          aria-label="Buscar propiedades"
          onSubmit={buscar}
          className="grid grid-cols-2 border-y border-[#efe9df]/25 lg:grid-cols-4"
        >
          <div className={`${campo} col-span-2 lg:col-span-1 lg:pr-6`}>
            <span className="calma-micro text-[#efe9df]/70" id="hero-operacion">
              Quiero
            </span>
            <div role="group" aria-labelledby="hero-operacion" className="font-display flex flex-wrap gap-x-5 gap-y-1 text-[22px] sm:text-[26px]">
              {OPERACIONES.map((op) => {
                const activa = operacion === op.value;
                return (
                  <button
                    key={op.value}
                    type="button"
                    aria-pressed={activa}
                    onClick={() => setOperacion(activa ? '' : op.value)}
                    className={`border-b pb-0.5 transition-colors duration-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#efe9df] ${
                      activa ? 'border-[#d9382b] text-[#efe9df]' : 'border-transparent text-[#efe9df]/60 hover:text-[#efe9df]'
                    }`}
                  >
                    {op.label}
                  </button>
                );
              })}
            </div>
          </div>
          <label className={`${campo} border-t pr-4 lg:border-l lg:border-t-0 lg:px-6`}>
            <span className="calma-micro text-[#efe9df]/70">En</span>
            <select value={localidad} onChange={(e) => setLocalidad(e.target.value)} className={select}>
              <option value="">Toda la zona</option>
              {localidades.map((nombre) => (
                <option key={nombre} value={nombre}>
                  {nombre}
                </option>
              ))}
            </select>
          </label>
          <label className={`${campo} border-l border-t pl-4 lg:border-t-0 lg:px-6`}>
            <span className="calma-micro text-[#efe9df]/70">Tipo</span>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={select}>
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <div className="col-span-2 flex items-center border-t border-[#efe9df]/25 py-5 lg:col-span-1 lg:justify-end lg:border-l lg:border-t-0 lg:pl-6">
            <button
              type="submit"
              className="calma-micro group flex items-center gap-2.5 rounded-full bg-[#efe9df] px-7 py-[18px] text-[12px] text-[#071733] transition-colors duration-500 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#efe9df]"
            >
              <span className="calma-dot" aria-hidden="true" />
              Ver propiedades
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import SitioBase from '@/components/sitio/SitioBase';
import Revelar from '@/components/sitio/Revelar';
import { WHATSAPP_URL } from '@/components/sitio/SiteFooter';
import { GUIAS, esOperacion, type Operacion } from '@/components/requisitos/datos';
import { useChecklist, type EstadoGuardado } from '@/components/requisitos/useChecklist';

// Texto que se anima renglón por renglón: va como HTML fijo para que React no reconcilie los nodos que divide GSAP
const TITULO = 'Requisitos';

const botonClaro =
  'calma-micro flex items-center justify-center gap-2.5 rounded-full bg-[#efe9df] px-7 py-4 text-[12px] text-[#071733] transition-colors duration-500 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#efe9df]';

function Check() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function TextoGuardado({ estado, nombre }: { estado: EstadoGuardado; nombre: string }) {
  if (estado === 'navegador') {
    return (
      <>
        Se guarda en este navegador.{' '}
        <Link href="/login?volver=/requisitos" className="calma-link text-[#efe9df]">
          Ingresá
        </Link>{' '}
        para tenerlo en cualquier dispositivo.
      </>
    );
  }
  if (estado === 'cargando') return <>Trayendo lo que marcaste en tu cuenta…</>;
  if (estado === 'guardando') return <>Guardando en tu cuenta…</>;
  if (estado === 'error') return <>No pudimos conectar con tu cuenta. Lo que marques queda en este navegador.</>;
  return <>Guardado en tu cuenta{nombre ? ` (${nombre})` : ''}.</>;
}

function Requisitos({ inicial }: { inicial: Operacion }) {
  const [activa, setActiva] = useState<Operacion>(inicial);
  const { marcas, alternar, desmarcar, estado, nombre } = useChecklist();

  const guia = GUIAS.find((g) => g.id === activa) ?? GUIAS[0];
  const idsDe = (id: Operacion) => (GUIAS.find((g) => g.id === id)?.secciones ?? []).flatMap((s) => s.items.map((i) => i.id));
  const ids = idsDe(guia.id);
  const listos = ids.filter((id) => marcas[id]).length;
  const completo = listos === ids.length;
  const consulta = `${WHATSAPP_URL}?text=${encodeURIComponent(guia.consulta)}`;

  const elegir = (id: Operacion) => {
    setActiva(id);
    // La guía elegida queda en la dirección para poder compartirla, sin recargar ni repetir la entrada de la página
    window.history.replaceState(null, '', `/requisitos?para=${id}`);
  };

  return (
    <SitioBase>
      <Revelar>
        <header className="encabezado-color encabezado-azul grid gap-8 px-5 pb-14 pt-32 sm:px-10 lg:grid-cols-12 lg:items-end lg:gap-6 lg:pb-20 lg:pt-40">
          <h1
            data-reveal="lineas"
            data-motion-hide
            className="font-display m-0 text-[clamp(64px,10vw,160px)] font-normal leading-[0.9] tracking-[-0.02em] lg:col-span-8"
            dangerouslySetInnerHTML={{ __html: TITULO }}
          />
          <p data-reveal="suave" className="m-0 max-w-sm pb-3 text-[16px] leading-relaxed text-[#efe9df]/70 lg:col-span-4">
            Todo lo que vas a necesitar para alquilar, comprar o publicar con nosotros. Marcá lo que ya tenés y llevá la cuenta.
          </p>
        </header>

        <div data-reveal="suave" className="px-5 sm:px-10">
          <div role="group" aria-label="Elegí una guía" className="flex flex-wrap gap-x-8 gap-y-3 border-y border-[#efe9df]/20 py-5">
            {GUIAS.map((g) => {
              const elegida = g.id === activa;
              const delGrupo = idsDe(g.id);
              const hechos = delGrupo.filter((id) => marcas[id]).length;
              return (
                <button
                  key={g.id}
                  type="button"
                  aria-pressed={elegida}
                  onClick={() => elegir(g.id)}
                  className={`flex items-baseline gap-2.5 border-b pb-0.5 transition-colors duration-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#efe9df] ${
                    elegida ? 'border-[#d9382b] text-[#efe9df]' : 'border-transparent text-[#efe9df]/55 hover:text-[#efe9df]'
                  }`}
                >
                  <span className="font-display text-[clamp(26px,3vw,36px)] leading-none">{g.pestana}</span>
                  <span className="text-[13px] tabular-nums text-[#efe9df]/55">
                    {hechos}/{delGrupo.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Revelar>

      <section key={guia.id} aria-labelledby="guia-titulo" className="calma-aparecer grid gap-14 px-5 pb-24 pt-14 sm:px-10 lg:grid-cols-12 lg:gap-6 lg:pb-32 lg:pt-20">
        <aside className="lg:col-span-4">
          <div className="flex flex-col gap-10 lg:sticky lg:top-28">
            <div className="flex flex-col gap-3">
              <h2 id="guia-titulo" className="font-display m-0 text-[clamp(40px,4.4vw,64px)] font-normal leading-none">
                {guia.titulo}
              </h2>
              <p className="m-0 max-w-sm text-[16px] leading-relaxed text-[#efe9df]/70">{guia.bajada}</p>
            </div>

            <div className="flex flex-col gap-4">
              <p aria-live="polite" className="m-0 flex items-baseline gap-3">
                <span className="font-display text-[clamp(56px,6vw,96px)] leading-none tabular-nums">{listos}</span>
                <span className="text-[17px] text-[#efe9df]/70">
                  {completo ? 'de ' + ids.length + ', tenés todo listo' : `de ${ids.length} listos`}
                </span>
              </p>
              <div className="h-px w-full bg-[#efe9df]/20">
                <div
                  className="h-px origin-left bg-[#d9382b] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{ transform: `scaleX(${ids.length ? listos / ids.length : 0})` }}
                />
              </div>
              <p className="m-0 text-[14px] leading-relaxed text-[#efe9df]/60">
                <TextoGuardado estado={estado} nombre={nombre} />
              </p>
              {listos > 0 && (
                <button
                  type="button"
                  onClick={() => desmarcar(ids)}
                  className="calma-link calma-link-sutil self-start text-[14px] text-[#efe9df]/70 hover:text-[#efe9df]"
                >
                  Desmarcar esta lista
                </button>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <a href={consulta} target="_blank" rel="noreferrer" className={`${botonClaro} self-start`}>
                <span className="calma-dot" aria-hidden="true" />
                {guia.accion}
              </a>
              <p className="m-0 max-w-xs text-[14px] text-[#efe9df]/60">
                ¿Te falta algún papel o tenés un caso distinto? Escribinos y lo vemos juntos.
              </p>
            </div>
          </div>
        </aside>

        <div className="flex flex-col gap-12 lg:col-span-7 lg:col-start-6">
          {guia.secciones.map((seccion) => (
            <fieldset key={seccion.titulo} className="m-0 min-w-0 border-0 p-0">
              <legend className="calma-micro mb-4 p-0 text-[#efe9df]/70">{seccion.titulo}</legend>
              <ul className="m-0 list-none border-t border-[#efe9df]/20 p-0">
                {seccion.items.map((item) => {
                  const marcado = Boolean(marcas[item.id]);
                  return (
                    <li key={item.id} className="border-b border-[#efe9df]/20">
                      <label className="group flex cursor-pointer items-start gap-4 py-5">
                        <input type="checkbox" checked={marcado} onChange={() => alternar(item.id)} className="peer sr-only" />
                        <span
                          aria-hidden="true"
                          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#efe9df] ${
                            marcado
                              ? 'border-[#efe9df] bg-[#efe9df] text-[#071733]'
                              : 'border-[#efe9df]/40 text-transparent group-hover:border-[#efe9df]'
                          }`}
                        >
                          <Check />
                        </span>
                        <span
                          className={`text-[17px] leading-snug transition-colors duration-300 ${
                            marcado ? 'text-[#efe9df]' : 'text-[#efe9df]/75 group-hover:text-[#efe9df]'
                          }`}
                        >
                          {item.texto}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          ))}
          <p className="m-0 max-w-xl text-[14px] leading-relaxed text-[#efe9df]/60">
            La documentación puede cambiar según la normativa vigente y las políticas internas de la inmobiliaria.
          </p>
        </div>
      </section>
    </SitioBase>
  );
}

function RequisitosConGuia() {
  const para = useSearchParams().get('para');
  const inicial: Operacion = esOperacion(para) ? para : 'alquilar';
  return <Requisitos inicial={inicial} />;
}

export default function RequisitosPage() {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-[#071733]" />}>
      <RequisitosConGuia />
    </Suspense>
  );
}

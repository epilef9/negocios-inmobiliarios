import Link from 'next/link';
import SitioBase from '@/components/sitio/SitioBase';
import { PROVISORIO, ULTIMA_ACTUALIZACION, type Seccion } from './contenido';

// Estructura común de los Términos y la Política de privacidad
export default function PaginaLegal({ titulo, bajada, secciones, otra }: { titulo: string; bajada: string; secciones: Seccion[]; otra: { href: string; texto: string } }) {
  return (
    <SitioBase pieSimple>
      <header className="encabezado-color encabezado-azul px-5 pb-14 pt-32 sm:px-10 lg:pt-40">
        <h1 className="font-display m-0 text-[clamp(48px,7vw,112px)] font-normal leading-[0.9] tracking-[-0.02em]">{titulo}</h1>
        <p className="m-0 mt-4 max-w-xl text-[16px] leading-relaxed text-[#efe9df]/70">{bajada}</p>
        <p className="calma-micro m-0 mt-4 text-[#efe9df]/55">Última actualización: {ULTIMA_ACTUALIZACION}</p>
      </header>

      <div className="flex flex-col gap-12 px-5 pb-24 sm:px-10">
        {PROVISORIO && (
          <p role="note" className="m-0 max-w-3xl border border-[#d9382b]/60 bg-[#d9382b]/10 p-5 text-[15px] leading-relaxed">
            <strong className="font-semibold">Texto provisorio.</strong> Es un borrador para revisar: los datos de la inmobiliaria (razón social, CUIT, domicilio, mail, plazos) son de ejemplo y no son reales, y el contenido todavía no está aprobado.
          </p>
        )}

        <article className="flex max-w-3xl flex-col gap-10">
          {secciones.map((s) => (
            <section key={s.titulo} className="border-t border-[#efe9df]/15 pt-8">
              <h2 className="font-display m-0 text-[clamp(26px,2.6vw,36px)] font-normal leading-tight">{s.titulo}</h2>
              {s.parrafos?.map((p) => (
                <p key={p} className="m-0 mt-4 text-[16px] leading-relaxed text-[#efe9df]/80">
                  {p}
                </p>
              ))}
              {s.items && (
                <ul className="m-0 mt-4 flex list-disc flex-col gap-2.5 pl-5 text-[16px] leading-relaxed text-[#efe9df]/80">
                  {s.items.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </article>

        <Link href={otra.href} className="calma-link self-start text-[15px] text-[#efe9df]">
          {otra.texto}
        </Link>
      </div>
    </SitioBase>
  );
}

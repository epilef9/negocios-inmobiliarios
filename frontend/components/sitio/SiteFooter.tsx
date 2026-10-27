'use client';

import Revelar from './Revelar';
import { useContacto } from './useAjustes';
import { CONTACTO_PREDETERMINADO, enlacesContacto } from '@/services/ajustes';

// Respaldo para lo que todavía arma enlaces sin el hook (los datos reales los carga el administrador)
export const WHATSAPP_URL = enlacesContacto(CONTACTO_PREDETERMINADO).whatsappUrl;

const escaparHtml = (texto: string) => texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

const botonClaro =
  'calma-micro group flex items-center gap-2.5 rounded-full bg-[#efe9df] px-6 py-4 text-[12px] text-[#071733] transition-colors duration-500 hover:bg-white';
const botonLinea =
  'calma-micro rounded-full border border-[#efe9df]/40 px-6 py-4 text-[12px] transition-colors duration-500 hover:border-[#efe9df] hover:bg-[#efe9df]/5';

const lineaFinal = 'Negocios Inmobiliarios, Villa Libertador San Martín, Entre Ríos';

// Pie del sitio con la dirección, el horario y los contactos de la oficina.
// En las páginas que ya muestran esos datos (contacto) va solo la línea final.
export default function SiteFooter({ simple = false }: { simple?: boolean }) {
  const contacto = useContacto();
  // Texto que se anima renglón por renglón: va como HTML fijo para que React no reconcilie los nodos que divide GSAP
  const textoOficina = `Pasá por ${escaparHtml(contacto.direccionCompleta)}.`;
  if (simple) {
    return (
      <footer className="px-5 pb-10 sm:px-10">
        <p className="calma-micro m-0 border-t border-[#efe9df]/15 pt-6 text-[#efe9df]/60">{lineaFinal}</p>
      </footer>
    );
  }

  return (
    // Si cambia la dirección se vuelve a montar, así la animación divide el texto nuevo
    <Revelar key={contacto.direccionCompleta}>
      <footer className="grid gap-10 px-5 pb-10 pt-16 sm:px-10 lg:grid-cols-12 lg:gap-6 lg:pt-20">
        <p
          data-reveal="lineas"
          data-motion-hide
          className="font-display m-0 text-[clamp(30px,5.6vw,88px)] leading-none lg:col-span-7"
          dangerouslySetInnerHTML={{ __html: textoOficina }}
        />
        <div className="flex flex-col gap-7 lg:col-span-4 lg:col-start-9">
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-[15px]">
            {contacto.horarios.map((horario) => (
              <div key={horario.dias} className="contents">
                <dt className="text-[#efe9df]/70">{horario.dias}</dt>
                <dd className="m-0">{horario.horas}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-3">
            <a href={contacto.whatsappUrl} target="_blank" rel="noreferrer" className={botonClaro}>
              <span className="calma-dot" aria-hidden="true" />
              WhatsApp
            </a>
            <a href={`mailto:${contacto.email}`} className={botonLinea}>
              Email
            </a>
            <a href={contacto.mapsUrl} target="_blank" rel="noreferrer" className={botonLinea}>
              Cómo llegar
            </a>
          </div>
        </div>
        <p className="calma-micro col-span-full mt-10 border-t border-[#efe9df]/15 pt-6 text-[#efe9df]/60">
          {lineaFinal}
        </p>
      </footer>
    </Revelar>
  );
}

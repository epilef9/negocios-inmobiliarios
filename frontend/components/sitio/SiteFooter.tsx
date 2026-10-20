import Revelar from './Revelar';

export const WHATSAPP_URL = 'https://wa.me/543434469522';
export const EMAIL = 'puiggarinegociosinmobiliarios@hotmail.com';
export const DIRECCION = '25 de Mayo 726, Villa Libertador San Martín';
export const MAPS_URL = 'https://www.google.com/maps/search/?api=1&query=25+de+Mayo+726+Villa+Libertador+San+Mart%C3%ADn+Entre+R%C3%ADos';

// Texto que se anima renglón por renglón: va como HTML fijo para que React no reconcilie los nodos que divide GSAP
const textoOficina = `Pasá por ${DIRECCION}.`;

export const HORARIOS = [
  { dias: 'Lunes a jueves', horas: '9 a 13 y 17 a 19 h' },
  { dias: 'Viernes', horas: '9 a 13 h' },
  { dias: 'Fin de semana', horas: 'Cerrado' },
];

const botonClaro =
  'calma-micro group flex items-center gap-2.5 rounded-full bg-[#efe9df] px-6 py-4 text-[12px] text-[#071733] transition-colors duration-500 hover:bg-white';
const botonLinea =
  'calma-micro rounded-full border border-[#efe9df]/40 px-6 py-4 text-[12px] transition-colors duration-500 hover:border-[#efe9df] hover:bg-[#efe9df]/5';

const lineaFinal = 'Negocios Inmobiliarios, Villa Libertador San Martín, Entre Ríos';

// Pie del sitio con la dirección, el horario y los contactos de la oficina.
// En las páginas que ya muestran esos datos (contacto) va solo la línea final.
export default function SiteFooter({ simple = false }: { simple?: boolean }) {
  if (simple) {
    return (
      <footer className="px-5 pb-10 sm:px-10">
        <p className="calma-micro m-0 border-t border-[#efe9df]/15 pt-6 text-[#efe9df]/60">{lineaFinal}</p>
      </footer>
    );
  }

  return (
    <Revelar>
      <footer className="grid gap-10 px-5 pb-10 pt-16 sm:px-10 lg:grid-cols-12 lg:gap-6 lg:pt-20">
        <p
          data-reveal="lineas"
          data-motion-hide
          className="font-display m-0 text-[clamp(44px,5.6vw,88px)] leading-none lg:col-span-7"
          dangerouslySetInnerHTML={{ __html: textoOficina }}
        />
        <div className="flex flex-col gap-7 lg:col-span-4 lg:col-start-9">
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-[15px]">
            {HORARIOS.map((horario) => (
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
          {lineaFinal}
        </p>
      </footer>
    </Revelar>
  );
}

'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAjustes } from '@/components/sitio/useAjustes';
import { enlacesContacto, CONTACTO_PREDETERMINADO, type PreguntaFrecuente } from '@/services/ajustes';
import { getRequisitos, type Requisito } from '@/services/requisitos';
import { buscar, completar, mensajeWhatsapp, PUNTOS_MINIMOS } from './asistente';

// Asistente de preguntas frecuentes de Contacto: responde lo que se pregunta siempre (horarios, requisitos,
// cómo agendar o publicar) con los datos del sitio, y lo que no sabe lo deriva a WhatsApp con el mensaje armado.
// Las preguntas las edita el administrador en Panel → Configuración → Datos del sitio.

type Mensaje =
  | { id: number; de: 'persona'; texto: string }
  | { id: number; de: 'asistente'; respondida: boolean; texto: string; enlace?: PreguntaFrecuente['enlace']; whatsapp: string; parecidas?: PreguntaFrecuente[] };

const CUANTAS_SUGERIDAS = 6;

// Respuesta en renglones: los que empiezan con «• » se muestran como lista
function TextoRespuesta({ texto }: { texto: string }) {
  const bloques: { lista: boolean; renglones: string[] }[] = [];
  for (const renglon of texto.split('\n')) {
    const esItem = renglon.startsWith('• ');
    const ultimo = bloques[bloques.length - 1];
    if (ultimo && ultimo.lista === esItem) ultimo.renglones.push(esItem ? renglon.slice(2) : renglon);
    else bloques.push({ lista: esItem, renglones: [esItem ? renglon.slice(2) : renglon] });
  }
  return (
    <>
      {bloques.map((b, i) =>
        b.lista ? (
          <ul key={i} className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0">
            {b.renglones.map((r, j) => (
              <li key={j} className="flex gap-2.5">
                <span aria-hidden="true" className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-[#d9382b]" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        ) : (
          b.renglones
            .filter((r) => r.trim())
            .map((r, j) => (
              <p key={`${i}-${j}`} className="m-0 [&+p]:mt-2 [ul+&]:mt-3">
                {r}
              </p>
            ))
        ),
      )}
    </>
  );
}

const chip =
  'rounded-full border border-[#efe9df]/25 px-4 py-2 text-left text-[14px] text-[#efe9df]/85 transition-colors duration-300 hover:border-[#efe9df] hover:text-[#efe9df] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#efe9df]';

export default function AsistenteConsultas() {
  const id = useId();
  const { contacto: contactoGuardado, preguntas } = useAjustes();
  const contacto = { ...CONTACTO_PREDETERMINADO, ...contactoGuardado };
  const { whatsappUrl } = enlacesContacto(contacto);
  const [requisitos, setRequisitos] = useState<Requisito[] | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [consulta, setConsulta] = useState('');
  const siguienteId = useRef(1);
  const conversacion = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);

  // Los requisitos se leen de la misma lista que la página Requisitos, así la respuesta nunca queda vieja
  useEffect(() => {
    let activo = true;
    getRequisitos()
      .then((r) => activo && setRequisitos(r))
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, []);

  // Cada mensaje nuevo queda a la vista, moviendo solo la conversación (no la página)
  useEffect(() => {
    const caja = conversacion.current;
    if (caja) caja.scrollTo({ top: caja.scrollHeight, behavior: 'smooth' });
  }, [mensajes]);

  const enlaceWhatsapp = (texto: string) => `${whatsappUrl}?text=${encodeURIComponent(mensajeWhatsapp(texto))}`;

  const responder = (texto: string, elegida?: PreguntaFrecuente) => {
    const limpio = texto.trim();
    if (!limpio) return;
    const nuevos: Mensaje[] = [{ id: siguienteId.current++, de: 'persona', texto: limpio }];
    const resultados = elegida ? [{ pregunta: elegida, puntos: Infinity }] : buscar(preguntas, limpio);
    const mejor = resultados[0];
    if (mejor && mejor.puntos >= PUNTOS_MINIMOS) {
      const parecidas = resultados
        .slice(1)
        .filter((r) => r.puntos >= PUNTOS_MINIMOS && r.puntos >= mejor.puntos - 1)
        .slice(0, 2)
        .map((r) => r.pregunta);
      nuevos.push({
        id: siguienteId.current++,
        de: 'asistente',
        respondida: true,
        texto: completar(mejor.pregunta.respuesta, { contacto, requisitos }),
        enlace: mejor.pregunta.enlace,
        whatsapp: enlaceWhatsapp(limpio),
        parecidas,
      });
    } else {
      nuevos.push({
        id: siguienteId.current++,
        de: 'asistente',
        respondida: false,
        texto: 'Eso no lo tengo respondido acá. Escribile a Araceli por WhatsApp: el mensaje ya va armado con tu pregunta y te responde en horario de oficina.',
        whatsapp: enlaceWhatsapp(limpio),
      });
    }
    setMensajes((m) => [...m, ...nuevos].slice(-30));
    setConsulta('');
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    responder(consulta);
    campo.current?.focus();
  };

  const sugeridas = preguntas.slice(0, CUANTAS_SUGERIDAS);

  return (
    <section aria-labelledby={`${id}-titulo`} className="grid gap-10 px-5 pb-24 sm:px-10 lg:grid-cols-12 lg:gap-6 lg:pb-32">
      <div data-reveal="suave" className="flex flex-col gap-4 lg:col-span-4">
        <p className="calma-micro m-0 text-[#efe9df]/70">Preguntas frecuentes</p>
        <h2 id={`${id}-titulo`} className="font-display m-0 text-[clamp(40px,4.4vw,64px)] font-normal leading-none">
          ¿Una duda rápida?
        </h2>
        <p className="m-0 max-w-sm text-[16px] leading-relaxed text-[#efe9df]/70">
          Preguntá lo que quieras saber de horarios, requisitos, visitas o cómo publicar y te respondemos al instante. Si es algo puntual, te armamos el mensaje para Araceli.
        </p>
      </div>

      <div data-reveal="suave" className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#efe9df]/20 bg-[#efe9df]/5 lg:col-span-7 lg:col-start-6">
        <div
          ref={conversacion}
          role="log"
          aria-live="polite"
          aria-label="Conversación con el asistente"
          data-lenis-prevent
          className="flex max-h-[460px] min-h-[220px] flex-col gap-4 overflow-y-auto overscroll-contain p-5 sm:p-7"
        >
          <div className="max-w-[90%] self-start rounded-2xl rounded-tl-md bg-[#efe9df]/10 px-5 py-4 text-[15px] leading-relaxed text-[#efe9df]">
            <p className="m-0">Hola. Soy el asistente de la inmobiliaria: escribí tu pregunta o elegí una de abajo.</p>
          </div>

          {mensajes.map((m) =>
            m.de === 'persona' ? (
              <div key={m.id} className="max-w-[85%] self-end rounded-2xl rounded-tr-md bg-[#efe9df] px-5 py-3 text-[15px] leading-relaxed text-[#071733]">
                <span className="sr-only">Vos: </span>
                {m.texto}
              </div>
            ) : (
              <div key={m.id} className="flex max-w-[90%] flex-col gap-3 self-start">
                <div className="rounded-2xl rounded-tl-md bg-[#efe9df]/10 px-5 py-4 text-[15px] leading-relaxed text-[#efe9df]">
                  <span className="sr-only">Asistente: </span>
                  <TextoRespuesta texto={m.texto} />
                  {m.enlace && (
                    <Link href={m.enlace.href} className="calma-link mt-3 inline-block text-[14px] text-[#efe9df]">
                      {m.enlace.texto} →
                    </Link>
                  )}
                </div>
                {/* Respondida: un enlace discreto por si no era eso. Sin respuesta: el botón de WhatsApp bien visible */}
                <a
                    href={m.whatsapp}
                    target="_blank"
                    rel="noreferrer"
                    className={
                      m.respondida
                        ? 'calma-link self-start text-[13px] text-[#efe9df]/70'
                        : 'calma-micro inline-flex items-center gap-2.5 self-start rounded-full bg-[#efe9df] px-5 py-3 text-[12px] text-[#071733] transition-colors duration-300 hover:bg-white'
                    }
                  >
                    {m.respondida ? '¿No era eso? Preguntale a Araceli por WhatsApp' : (
                      <>
                        <span className="calma-dot" aria-hidden="true" />
                        Escribir por WhatsApp
                      </>
                    )}
                  </a>
                {m.parecidas && m.parecidas.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <span className="sr-only">También puede interesarte:</span>
                    {m.parecidas.map((p) => (
                      <button key={p.pregunta} type="button" className={chip} onClick={() => responder(p.pregunta, p)}>
                        {p.pregunta}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ),
          )}
        </div>

        <div className="flex flex-col gap-4 border-t border-[#efe9df]/15 p-5 sm:p-7">
          {sugeridas.length > 0 && (
            // En el celular las preguntas van en una fila que se desliza, para no tapar la conversación
            <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0" role="group" aria-label="Preguntas frecuentes">
              {sugeridas.map((p) => (
                <button key={p.pregunta} type="button" className={`${chip} shrink-0 whitespace-nowrap sm:whitespace-normal`} onClick={() => responder(p.pregunta, p)}>
                  {p.pregunta}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={enviar} className="flex items-end gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <label htmlFor={`${id}-consulta`} className="calma-micro text-[#efe9df]/70">
                Tu pregunta
              </label>
              <input
                ref={campo}
                id={`${id}-consulta`}
                type="text"
                value={consulta}
                maxLength={300}
                autoComplete="off"
                onChange={(e) => setConsulta(e.target.value)}
                placeholder="Ej.: ¿qué necesito para alquilar?"
                className="w-full rounded-none border-0 border-b border-[#efe9df]/30 bg-transparent py-3 text-[17px] text-[#efe9df] placeholder:text-[#efe9df]/40 transition-colors duration-500 focus:border-[#efe9df] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={!consulta.trim()}
              className="calma-micro shrink-0 rounded-full bg-[#efe9df] px-6 py-3.5 text-[12px] text-[#071733] transition-colors duration-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#efe9df]"
            >
              Preguntar
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

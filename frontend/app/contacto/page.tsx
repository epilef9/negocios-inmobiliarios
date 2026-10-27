'use client';

import { useId, useState, type FormEvent } from 'react';
import Link from 'next/link';
import SitioBase from '@/components/sitio/SitioBase';
import Revelar from '@/components/sitio/Revelar';
import { useAuth } from '@/context/AuthContext';
import { enviarConsulta } from '@/services/contacto';
import { useContacto } from '@/components/sitio/useAjustes';
import Captcha, { CLAVE_CAPTCHA } from '@/components/sitio/Captcha';

// Texto que se anima renglón por renglón: va como HTML fijo para que React no reconcilie los nodos que divide GSAP
const TITULO = 'Hablemos.';


const MOTIVOS = [
  { value: 'comprar', label: 'Comprar', frase: 'comprar una propiedad' },
  { value: 'alquilar', label: 'Alquilar', frase: 'alquilar una propiedad' },
  { value: 'temporario', label: 'Por días', frase: 'un alquiler por días' },
  { value: 'vender', label: 'Vender o tasar', frase: 'vender o tasar mi propiedad' },
  { value: 'otra', label: 'Otra consulta', frase: '' },
];

type Canal = 'whatsapp' | 'email';

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const etiqueta = 'calma-micro text-[#efe9df]/70';
const control =
  'w-full rounded-none border-0 border-b border-[#efe9df]/30 bg-transparent py-3 text-[18px] text-[#efe9df] placeholder:text-[#efe9df]/40 transition-colors duration-500 focus:border-[#efe9df] focus:outline-none aria-[invalid=true]:border-[#d9382b]';
const botonClaro =
  'calma-micro flex items-center justify-center gap-2.5 rounded-full bg-[#efe9df] px-7 py-4 text-[12px] text-[#071733] transition-colors duration-500 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#efe9df]';
const botonLinea =
  'calma-micro flex items-center justify-center rounded-full border border-[#efe9df]/40 px-7 py-4 text-[12px] transition-colors duration-500 hover:border-[#efe9df] hover:bg-[#efe9df]/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#efe9df]';

// Canales de contacto, con los datos que carga el administrador (HU-38)
const canalesDe = (c: ReturnType<typeof useContacto>) =>
  [
    { nombre: 'WhatsApp', valor: c.telefono, href: c.whatsappUrl, externo: true },
    { nombre: 'Teléfono', valor: c.telefono, href: c.telefonoUrl, externo: false },
    { nombre: 'Email', valor: c.email, href: `mailto:${c.email}`, externo: false },
    { nombre: 'Instagram', valor: c.instagram ? `@${c.instagram}` : '', href: c.instagramUrl, externo: true },
  ].filter((canal) => canal.valor && canal.href);

// Arma el texto de la consulta tal como le llega a la inmobiliaria
function armarTexto(nombre: string, motivo: string, mensaje: string) {
  const frase = MOTIVOS.find((m) => m.value === motivo)?.frase;
  const saludo = `Hola, soy ${nombre}.${frase ? ` Me interesa ${frase}.` : ''}`;
  return `${saludo}\n\n${mensaje}`;
}

function enlaceDe(contacto: { whatsappUrl: string; email: string }, canal: Canal, nombre: string, motivo: string, mensaje: string) {
  const texto = armarTexto(nombre, motivo, mensaje);
  if (canal === 'whatsapp') return `${contacto.whatsappUrl}?text=${encodeURIComponent(texto)}`;
  const asunto = `Consulta web de ${nombre}`;
  return `mailto:${contacto.email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(texto)}`;
}

export default function ContactoPage() {
  const id = useId();
  const { user } = useAuth();
  const contacto = useContacto();
  const canales = canalesDe(contacto);
  const nombreCuenta = user ? `${user.nombre ?? ''} ${user.apellido ?? ''}`.trim() : '';

  // El nombre queda en null hasta que la persona lo toca, así se completa solo con el de la cuenta
  const [nombre, setNombre] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [email, setEmail] = useState<string | null>(null);
  const [faltan, setFaltan] = useState<{ nombre: boolean; email: boolean; mensaje: boolean }>({ nombre: false, email: false, mensaje: false });
  const [enviado, setEnviado] = useState<{ canal: Canal; enlace: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [reinicioCaptcha, setReinicioCaptcha] = useState(0);

  const nombreActual = nombre ?? nombreCuenta;
  // El email se completa solo con el de la cuenta; es la dirección a la que respondemos
  const emailActual = email ?? user?.email ?? '';

  const enviar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const boton = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const canal: Canal = boton?.dataset.canal === 'email' ? 'email' : 'whatsapp';

    const faltaNombre = !nombreActual.trim();
    const faltaMensaje = !mensaje.trim();
    // El email solo hace falta cuando la consulta se manda por mail: es adonde se responde
    const faltaEmail = canal === 'email' && !EMAIL_VALIDO.test(emailActual.trim());
    setFaltan({ nombre: faltaNombre, email: faltaEmail, mensaje: faltaMensaje });
    if (faltaNombre || faltaEmail || faltaMensaje) {
      document.getElementById(faltaNombre ? `${id}-nombre` : faltaEmail ? `${id}-email` : `${id}-mensaje`)?.focus();
      return;
    }
    setErrorEnvio('');

    if (canal === 'email') {
      if (CLAVE_CAPTCHA && !captcha) {
        setErrorEnvio('Completá la verificación «no soy un robot» para enviar por email.');
        return;
      }
      setEnviando(true);
      try {
        await enviarConsulta({
          nombre: nombreActual.trim(),
          email: emailActual.trim(),
          motivo: MOTIVOS.find((m) => m.value === motivo)?.label,
          mensaje: mensaje.trim(),
          captchaToken: captcha || undefined,
        });
        setEnviado({ canal, enlace: '' });
      } catch (err) {
        setErrorEnvio(err instanceof Error ? err.message : 'No pudimos enviar tu consulta. Probá de nuevo.');
        setReinicioCaptcha((n) => n + 1);
      } finally {
        setEnviando(false);
      }
      return;
    }

    const enlace = enlaceDe(contacto, canal, nombreActual.trim(), motivo, mensaje.trim());
    window.open(enlace, '_blank', 'noopener,noreferrer');
    setEnviado({ canal, enlace });
  };

  const nuevaConsulta = () => {
    setEnviado(null);
    setMensaje('');
    setMotivo('');
    setFaltan({ nombre: false, email: false, mensaje: false });
    setErrorEnvio('');
  };

  return (
    <SitioBase pieSimple>
      <Revelar>
        <header className="encabezado-color encabezado-rojo grid gap-8 px-5 pb-16 pt-32 sm:px-10 lg:grid-cols-12 lg:items-end lg:gap-6 lg:pb-24 lg:pt-40">
          <h1
            data-reveal="lineas"
            data-motion-hide
            className="font-display m-0 text-[clamp(64px,10vw,160px)] font-normal leading-[0.9] tracking-[-0.02em] lg:col-span-8"
            dangerouslySetInnerHTML={{ __html: TITULO }}
          />
          <p data-reveal="suave" className="m-0 max-w-sm pb-3 text-[16px] leading-relaxed text-[#efe9df]/70 lg:col-span-4">
            Contanos qué estás buscando o qué querés vender. Te responde Araceli Balbuena, en horario de oficina.
          </p>
        </header>

        <section className="grid gap-16 px-5 pb-24 sm:px-10 lg:grid-cols-12 lg:gap-6 lg:pb-32">
          <div data-reveal="suave" className="lg:col-span-4">
            <h2 className="calma-micro m-0 mb-6 text-[#efe9df]/70">Directo</h2>
            <ul className="m-0 list-none border-t border-[#efe9df]/20 p-0">
              {canales.map((canal) => (
                <li key={canal.nombre} className="border-b border-[#efe9df]/20">
                  <a
                    href={canal.href}
                    {...(canal.externo ? { target: '_blank', rel: 'noreferrer' } : {})}
                    className="group flex flex-col gap-1.5 py-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
                  >
                    <span className="text-[15px] text-[#efe9df]/70">{canal.nombre}</span>
                    <span className="calma-link calma-link-sutil break-all text-[17px] sm:text-right">{canal.valor}</span>
                  </a>
                </li>
              ))}
            </ul>

            <div className="mt-10 rounded-2xl border border-[#efe9df]/20 bg-[#efe9df]/5 p-6 sm:p-8">
              <p className="calma-micro m-0 text-[#d9382b]">¿Tenés una propiedad?</p>
              <h3 className="font-display m-0 mt-2 text-[24px] text-[#efe9df]">
                Quiero publicar mi propiedad
              </h3>
              <p className="m-0 mt-3 text-[14px] leading-relaxed text-[#efe9df]/70">
                Si querés vender o alquilar tu inmueble con nosotros, completá la solicitud y coordinamos los detalles.
              </p>
              <Link
                href="/publicar"
                className="calma-micro mt-6 inline-flex items-center gap-2 rounded-full bg-[#efe9df] px-5 py-3 text-[12px] text-[#071733] transition-colors hover:bg-white"
              >
                Solicitar publicación →
              </Link>
            </div>
          </div>

          <div data-reveal="suave" className="lg:col-span-7 lg:col-start-6">
            {enviado ? (
              <div role="status" className="flex flex-col items-start gap-6 border-t border-[#efe9df]/20 pt-10">
                <h2 className="font-display m-0 text-[clamp(40px,4.4vw,64px)] font-normal leading-none">
                  {enviado.canal === 'whatsapp' ? 'Se abrió WhatsApp.' : 'Consulta enviada.'}
                </h2>
                <p className="m-0 max-w-md text-[17px] leading-relaxed text-[#efe9df]/80">
                  {enviado.canal === 'whatsapp'
                    ? 'Tu consulta ya está escrita. Solo falta que toques enviar en el chat. Te respondemos en horario de oficina.'
                    : `Recibimos tu consulta. Te respondemos a ${emailActual.trim()} en horario de oficina.`}
                </p>
                {enviado.canal === 'whatsapp' && (
                  <p className="m-0 text-[15px] text-[#efe9df]/70">
                    ¿No se abrió?{' '}
                    <a href={enviado.enlace} target="_blank" rel="noreferrer" className="calma-link text-[#efe9df]">
                      Abrilo desde acá
                    </a>
                  </p>
                )}
                <button type="button" onClick={nuevaConsulta} className={botonLinea}>
                  Escribir otra consulta
                </button>
              </div>
            ) : (
              <form noValidate onSubmit={enviar} className="flex flex-col gap-10">
                <div className="flex flex-col gap-3">
                  <h2 className="font-display m-0 text-[clamp(40px,4.4vw,64px)] font-normal leading-none">
                    Dejanos tu consulta
                  </h2>
                  <p className="m-0 max-w-md text-[16px] leading-relaxed text-[#efe9df]/70">
                    La escribís acá y la mandás por WhatsApp o por email, como te quede más cómodo. Por email llega directo a la inmobiliaria.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <span className={etiqueta} id={`${id}-motivo`}>
                    Me interesa
                  </span>
                  <div
                    role="group"
                    aria-labelledby={`${id}-motivo`}
                    className="font-display flex flex-wrap gap-x-6 gap-y-2 text-[24px]"
                  >
                    {MOTIVOS.map((m) => {
                      const activo = motivo === m.value;
                      return (
                        <button
                          key={m.value}
                          type="button"
                          aria-pressed={activo}
                          onClick={() => setMotivo(activo ? '' : m.value)}
                          className={`border-b pb-0.5 transition-colors duration-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#efe9df] ${
                            activo ? 'border-[#d9382b] text-[#efe9df]' : 'border-transparent text-[#efe9df]/55 hover:text-[#efe9df]'
                          }`}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor={`${id}-nombre`} className={etiqueta}>
                    Tu nombre
                  </label>
                  <input
                    id={`${id}-nombre`}
                    type="text"
                    autoComplete="name"
                    required
                    value={nombreActual}
                    onChange={(e) => setNombre(e.target.value)}
                    aria-invalid={faltan.nombre}
                    aria-describedby={faltan.nombre ? `${id}-nombre-error` : undefined}
                    placeholder="Nombre y apellido"
                    className={control}
                  />
                  {faltan.nombre && (
                    <p id={`${id}-nombre-error`} className="m-0 text-[14px] text-[#ff8a7d]">
                      Escribí tu nombre así sabemos a quién responderle.
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor={`${id}-email`} className={etiqueta}>
                    Tu email
                  </label>
                  <input
                    id={`${id}-email`}
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    value={emailActual}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={faltan.email}
                    aria-describedby={`${id}-email-ayuda`}
                    placeholder="nombre@email.com"
                    className={control}
                  />
                  <p id={`${id}-email-ayuda`} className={`m-0 text-[14px] ${faltan.email ? 'text-[#ff8a7d]' : 'text-[#efe9df]/55'}`}>
                    {faltan.email ? 'Escribí un email válido para poder responderte.' : 'Solo hace falta si enviás por email: ahí te respondemos.'}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor={`${id}-mensaje`} className={etiqueta}>
                    Tu consulta
                  </label>
                  <textarea
                    id={`${id}-mensaje`}
                    required
                    rows={4}
                    value={mensaje}
                    onChange={(e) => setMensaje(e.target.value)}
                    aria-invalid={faltan.mensaje}
                    aria-describedby={faltan.mensaje ? `${id}-mensaje-error` : undefined}
                    placeholder="Por ejemplo: busco una casa de 3 dormitorios en Villa Libertador San Martín."
                    className={`${control} resize-y leading-relaxed`}
                  />
                  {faltan.mensaje && (
                    <p id={`${id}-mensaje-error`} className="m-0 text-[14px] text-[#ff8a7d]">
                      Contanos en qué te podemos ayudar.
                    </p>
                  )}
                </div>

                {errorEnvio && (
                  <p role="alert" className="m-0 text-[15px] leading-relaxed text-[#ff8a7d]">
                    {errorEnvio}
                  </p>
                )}

                <Captcha alResolver={setCaptcha} reinicio={reinicioCaptcha} />

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button type="submit" data-canal="whatsapp" disabled={enviando} className={botonClaro}>
                    <span className="calma-dot" aria-hidden="true" />
                    Enviar por WhatsApp
                  </button>
                  <button type="submit" data-canal="email" disabled={enviando} className={`${botonLinea} disabled:cursor-wait disabled:opacity-60`}>
                    {enviando ? 'Enviando…' : 'Enviar por email'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>

        <section aria-labelledby={`${id}-oficina`} className="grid gap-10 px-5 pb-20 sm:px-10 lg:grid-cols-12 lg:gap-6">
          <div data-reveal="imagen" className="tarjeta-color overflow-hidden rounded-3xl lg:col-span-7">
            <iframe
              title={`Mapa de la oficina en ${contacto.direccionCompleta}`}
              src={contacto.mapaEmbed}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="block h-[340px] w-full border-0 [filter:saturate(0.75)] sm:h-[440px]"
            />
          </div>
          <div data-reveal="suave" className="flex flex-col gap-8 lg:col-span-4 lg:col-start-9 lg:justify-end">
            <div className="flex flex-col gap-3">
              <h2 id={`${id}-oficina`} className="font-display m-0 text-[clamp(40px,4.4vw,64px)] font-normal leading-none">
                La oficina
              </h2>
              <p className="m-0 text-[17px] leading-relaxed text-[#efe9df]/80">{contacto.direccionCompleta}, Entre Ríos.</p>
            </div>
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-[15px]">
              {contacto.horarios.map((horario) => (
                <div key={horario.dias} className="contents">
                  <dt className="text-[#efe9df]/70">{horario.dias}</dt>
                  <dd className="m-0">{horario.horas}</dd>
                </div>
              ))}
            </dl>
            <a href={contacto.mapsUrl} target="_blank" rel="noreferrer" className={`${botonLinea} self-start`}>
              Cómo llegar
            </a>
          </div>
        </section>
      </Revelar>
    </SitioBase>
  );
}

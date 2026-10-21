'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthRequestError, resendVerification } from '@/services/auth';
import Revelar from '@/components/sitio/Revelar';

// Estilos compartidos por los formularios de ingreso y registro
export const etiqueta = 'calma-micro text-[#efe9df]/70';
export const control =
  'w-full rounded-none border-0 border-b border-[#efe9df]/30 bg-transparent py-3 text-[18px] text-[#efe9df] placeholder:text-[#efe9df]/35 transition-colors duration-500 focus:border-[#efe9df] focus:outline-none aria-[invalid=true]:border-[#d9382b]';
export const botonPrincipal =
  'calma-micro flex w-full items-center justify-center gap-2.5 rounded-full bg-[#efe9df] px-7 py-4 text-[12px] text-[#071733] transition-colors duration-500 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#efe9df] disabled:cursor-wait disabled:opacity-60';

// Solo se aceptan rutas internas para volver después de ingresar
// (los navegadores tratan "/\otro.com" igual que "//otro.com", así que también se rechaza la barra invertida)
export const destinoSeguro = (volver: string | null) =>
  volver && volver.startsWith('/') && !volver.startsWith('//') && !volver.includes('\\') && !/[\u0000-\u001f]/.test(volver) ? volver : null;

// Botón para ver u ocultar la contraseña: un ojo abierto o tachado. El texto queda para lectores de pantalla.
export function BotonVerPassword({ visible, alCambiar, className = '' }: { visible: boolean; alCambiar: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={alCambiar}
      aria-pressed={visible}
      aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[#efe9df]/70 transition-colors duration-300 hover:bg-[#efe9df]/10 hover:text-[#efe9df] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#efe9df] ${className}`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" />
        <circle cx="12" cy="12" r="3" className={`origin-center transition-transform duration-300 ${visible ? 'scale-100' : 'scale-90'}`} />
        {/* Raya que tacha el ojo cuando la contraseña está oculta; se dibuja o se borra al tocar */}
        <path
          d="M4 4l16 16"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={visible ? 1 : 0}
          className="transition-[stroke-dashoffset] duration-300 motion-reduce:transition-none"
        />
      </svg>
    </button>
  );
}

const beneficios = [
  'Guardá tus propiedades favoritas y encontralas desde cualquier dispositivo.',
  'Llevá la cuenta de los papeles que ya tenés para alquilar o comprar.',
  'Pedí visitas con tus datos ya completos.',
];

type Props = {
  titulo: string;
  bajada: string;
  children: React.ReactNode;
};

// Pantalla de cuenta: foto con lo que permite la cuenta a un lado y el formulario al otro
export default function PantallaCuenta({ titulo, bajada, children }: Props) {
  return (
    <main className="home-calma-raiz grid min-h-dvh bg-[#071733] font-sans text-[#efe9df] selection:bg-[#d9382b] selection:text-white lg:grid-cols-2">
      <Revelar>
        <div data-reveal="imagen" className="relative hidden h-full min-h-dvh overflow-hidden bg-[#0b2048] lg:block">
          {/* eslint-disable-next-line @next/next/no-img-element -- imagen local decorativa, sin optimización necesaria */}
          <img src="/images/home-blue-hour.webp" alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#071733] via-[#071733]/40 to-[#071733]/10" />
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-6 p-10 xl:p-14">
            <p className="font-display m-0 max-w-md text-[clamp(36px,3.4vw,52px)] leading-[1.02]">Tu búsqueda, guardada en un solo lugar.</p>
            <ul className="m-0 flex max-w-md list-none flex-col gap-3 p-0 text-[15px] text-[#efe9df]/80">
              {beneficios.map((beneficio) => (
                <li key={beneficio} className="flex gap-3">
                  <span className="calma-dot mt-2 shrink-0" aria-hidden="true" />
                  {beneficio}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Revelar>

      <div className="flex min-h-dvh flex-col px-5 py-6 sm:px-10">
        <div className="calma-micro flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 text-[13px] tracking-[0.3em]">
            <svg width="26" height="22" viewBox="0 0 40 34" aria-hidden="true">
              <path d="M4 18 20 4l16 14" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
              <rect x="15" y="17" width="10" height="10" fill="#d9382b" />
              <path d="M2 32h36" stroke="currentColor" strokeWidth="3" />
            </svg>
            Negocios
          </Link>
          <Link href="/propiedades" className="calma-link calma-link-sutil">
            Ver propiedades
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-10 py-14">
          <Link
            href="/"
            className="calma-micro inline-flex min-h-10 items-center gap-2 self-start rounded-full border border-[#efe9df]/30 px-5 text-[11px] transition-colors duration-500 hover:border-[#efe9df] hover:bg-[#efe9df]/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#efe9df]"
          >
            <span aria-hidden="true">←</span>
            Volver al inicio
          </Link>
          <div className="flex flex-col gap-3">
            <h1 className="font-display m-0 text-[clamp(52px,6vw,88px)] font-normal leading-[0.92] tracking-[-0.02em]">{titulo}</h1>
            <p className="m-0 text-[16px] leading-relaxed text-[#efe9df]/70">{bajada}</p>
          </div>
          {children}
        </div>
      </div>
    </main>
  );
}

// Aviso cuando la persona ya tiene la sesión iniciada
export function YaIngresaste({ nombre, onSalir }: { nombre: string; onSalir: () => void }) {
  return (
    <div className="flex flex-col gap-6 border-t border-[#efe9df]/20 pt-8">
      <p className="m-0 text-[17px] leading-relaxed">
        Ya ingresaste como <strong className="font-semibold">{nombre}</strong>.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/favoritos" className={`${botonPrincipal} w-auto`}>
          Ir a mis favoritos
        </Link>
        <button
          type="button"
          onClick={onSalir}
          className="calma-micro rounded-full border border-[#efe9df]/40 px-7 py-4 text-[12px] transition-colors duration-500 hover:border-[#efe9df] hover:bg-[#efe9df]/5"
        >
          Salir de la cuenta
        </button>
      </div>
    </div>
  );
}

// Caja que aparece solo en desarrollo, cuando el backend no tiene mails configurados: muestra el enlace del mail
export function EnlaceDeDesarrollo({ enlace, para = 'confirmar la cuenta', accion = 'Confirmar mi email ahora' }: { enlace: string; para?: string; accion?: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-[#efe9df]/40 p-4">
      <p className="m-0 text-[13px] leading-relaxed text-[#efe9df]/70">
        Modo de prueba: el servidor no tiene un servicio de mails configurado, así que no se envió ningún correo. Usá este enlace para {para}.
      </p>
      <a href={enlace} className="calma-link break-all text-[14px] text-[#efe9df]">
        {accion}
      </a>
    </div>
  );
}

const SEGUNDOS_ENTRE_REENVIOS = 60;

// Reenvía el enlace de confirmación; lo usan el registro y el ingreso.
// Mientras corre la espera entre envíos, el botón muestra cuánto falta.
export function ReenviarVerificacion({
  email,
  esperaInicial = 0,
  enlaceDevInicial,
}: {
  email: string;
  esperaInicial?: number;
  enlaceDevInicial?: string;
}) {
  const [estado, setEstado] = useState<'libre' | 'enviando' | 'enviado' | 'error'>('libre');
  const [mensaje, setMensaje] = useState('');
  const [espera, setEspera] = useState(esperaInicial);
  const [enlaceDev, setEnlaceDev] = useState(enlaceDevInicial);

  useEffect(() => {
    if (espera <= 0) return;
    const id = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [espera]);

  const reenviar = async () => {
    setEstado('enviando');
    try {
      const respuesta = await resendVerification(email);
      setEstado('enviado');
      setEnlaceDev(respuesta.enlaceDev);
      setEspera(respuesta.segundos || SEGUNDOS_ENTRE_REENVIOS);
      setMensaje(respuesta.enlaceDev ? '' : 'Listo, si la cuenta existe te mandamos un enlace nuevo. Revisá también la carpeta de spam.');
    } catch (err) {
      setEstado('error');
      if (err instanceof AuthRequestError && err.segundos) setEspera(err.segundos);
      setMensaje(err instanceof Error ? err.message : 'No pudimos enviar el mail. Probá de nuevo en un rato.');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={reenviar}
        disabled={estado === 'enviando' || espera > 0}
        className="calma-micro self-start rounded-full border border-[#efe9df]/40 px-7 py-4 text-[12px] transition-colors duration-500 hover:border-[#efe9df] hover:bg-[#efe9df]/5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-[#efe9df]/40 disabled:hover:bg-transparent"
      >
        {estado === 'enviando' ? 'Enviando…' : espera > 0 ? `Reenviar en ${espera} s` : 'Reenviar el enlace'}
      </button>
      {mensaje && (
        <p role="status" className={`m-0 text-[14px] ${estado === 'error' ? 'text-[#ff8a7d]' : 'text-[#efe9df]/70'}`}>
          {mensaje}
        </p>
      )}
      {enlaceDev && <EnlaceDeDesarrollo enlace={enlaceDev} />}
    </div>
  );
}

// Pantalla que se muestra tras registrarse: la cuenta existe pero falta confirmar el email
export function RevisaTuCorreo({ email, correoEnviado, enlaceDev }: { email: string; correoEnviado: boolean; enlaceDev?: string }) {
  return (
    <div role="status" className="flex flex-col gap-6 border-t border-[#efe9df]/20 pt-8">
      <p className="m-0 text-[17px] leading-relaxed">
        {correoEnviado ? (
          <>
            Te mandamos un enlace a <strong className="font-semibold">{email}</strong>. Tocalo para activar tu cuenta; vale 24 horas.
          </>
        ) : (
          <>
            Creamos tu cuenta, pero no pudimos enviar el mail a <strong className="font-semibold">{email}</strong>. Pedí el enlace de nuevo.
          </>
        )}
      </p>
      <ReenviarVerificacion email={email} esperaInicial={correoEnviado ? SEGUNDOS_ENTRE_REENVIOS : 0} enlaceDevInicial={enlaceDev} />
      <p className="m-0 text-[15px] text-[#efe9df]/70">
        ¿Ya lo confirmaste?{' '}
        <Link href="/login" className="calma-link text-[#efe9df]">
          Ingresá
        </Link>
      </p>
    </div>
  );
}

'use client';

import Link from 'next/link';
import Revelar from '@/components/sitio/Revelar';

// Estilos compartidos por los formularios de ingreso y registro
export const etiqueta = 'calma-micro text-[#efe9df]/70';
export const control =
  'w-full rounded-none border-0 border-b border-[#efe9df]/30 bg-transparent py-3 text-[18px] text-[#efe9df] placeholder:text-[#efe9df]/35 transition-colors duration-500 focus:border-[#efe9df] focus:outline-none aria-[invalid=true]:border-[#d9382b]';
export const botonPrincipal =
  'calma-micro flex w-full items-center justify-center gap-2.5 rounded-full bg-[#efe9df] px-7 py-4 text-[12px] text-[#071733] transition-colors duration-500 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#efe9df] disabled:cursor-wait disabled:opacity-60';

// Solo se aceptan rutas internas para volver después de ingresar
export const destinoSeguro = (volver: string | null) =>
  volver && volver.startsWith('/') && !volver.startsWith('//') ? volver : null;

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

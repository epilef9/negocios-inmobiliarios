'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useConfirmarSalida } from './ConfirmarSalida';
import AvisoSalida from './AvisoSalida';
import LogoEmpresa from './LogoEmpresa';


// Inicio va primero: no todos saben que el logo lleva a la portada. Contacto va a la derecha, con el punto rojo.
const enlaces = [
  { href: '/', texto: 'Inicio' },
  { href: '/propiedades', texto: 'Propiedades' },
  { href: '/publicar', texto: 'Publicar' },
  { href: '/requisitos', texto: 'Requisitos' },
];

const esActual = (ruta: string | null, href: string) => (href === '/' ? ruta === '/' : Boolean(ruta && (ruta === href || ruta.startsWith(`${href}/`))));

// Barra del sitio de vidrio esmerilado: transparente y desenfocada, deja ver la foto de atrás; el logo
// lleva un halo fino para leerse con sus colores. Al bajar se desliza hacia arriba y se desvanece; al subir
// vuelve igual de suave (las transiciones están en .barra-vidrio, en globals.css).
export default function SiteHeader() {
  const { user, isLoading } = useAuth();
  const { pedirSalida, dialogoSalida } = useConfirmarSalida();
  const ruta = usePathname();
  const ingresar = ruta && ruta !== '/' ? `/login?volver=${encodeURIComponent(ruta)}` : '/login';
  const [oculta, setOculta] = useState(false);
  const [conFondo, setConFondo] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    let anterior = window.scrollY;
    const alScrollear = () => {
      const y = window.scrollY;
      setConFondo(y > 80);
      setOculta(y > anterior && y > 260);
      anterior = y;
    };
    alScrollear();
    window.addEventListener('scroll', alScrollear, { passive: true });
    return () => window.removeEventListener('scroll', alScrollear);
  }, []);

  const sesion = isLoading ? null : user ? (
    <>
      <Link href="/favoritos" className="calma-link calma-link-sutil">
        Favoritos
      </Link>
      <Link href="/perfil" className="calma-link calma-link-sutil">
        Mi cuenta
      </Link>
      {user.role === 'admin' && (
        <Link href="/admin" className="calma-link calma-link-sutil">
          Panel
        </Link>
      )}
      <button type="button" onClick={pedirSalida} className="calma-link calma-link-sutil uppercase tracking-[0.16em]">
        Salir
      </button>
    </>
  ) : (
    <Link href={ingresar} className="calma-link calma-link-sutil">
      Ingresar
    </Link>
  );

  return (
    <header
      className={`barra-vidrio calma-micro fixed inset-x-0 top-0 z-50 text-[#efe9df] ${oculta && !menuAbierto ? 'es-oculta' : ''} ${
        conFondo || menuAbierto ? 'con-fondo' : ''
      }`}
    >
      {dialogoSalida}
      <AvisoSalida />
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 py-2.5 sm:px-10">
        <nav aria-label="Principal" className="hidden gap-7 lg:flex">
          {enlaces.map((enlace) => (
            <Link key={enlace.href} href={enlace.href} aria-current={esActual(ruta, enlace.href) ? 'page' : undefined} className="calma-link calma-link-sutil">
              {enlace.texto}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          onClick={() => setMenuAbierto((abierto) => !abierto)}
          aria-expanded={menuAbierto}
          aria-controls="menu-movil"
          className="-ml-3 min-h-11 justify-self-start px-3 uppercase tracking-[0.16em] lg:hidden"
        >
          {menuAbierto ? 'Cerrar' : 'Menú'}
        </button>

        <Link href="/" aria-label="Ir al inicio" className="flex items-start self-start sm:-mb-6 lg:-mb-12">
          {/* Logo original: ARACELI BALBUENA arriba, línea azul y NEGOCIOS INMOBILIARIOS abajo.
              En pantallas grandes sobresale por debajo de la barra (margen negativo), sin agrandarla. */}
          <LogoEmpresa className="barra-logo h-12 w-auto sm:h-[72px] lg:h-24" prioridad />
        </Link>

        <div className="flex items-center justify-self-end gap-7">
          <Link href="/contacto" aria-current={esActual(ruta, '/contacto') ? 'page' : undefined} className="flex min-h-11 items-center gap-2">
            <span className="calma-dot" aria-hidden="true" />
            <span className="calma-link calma-link-sutil">Contacto</span>
          </Link>
          <div className="hidden items-center gap-7 lg:flex">{sesion}</div>
        </div>
      </div>

      {menuAbierto && (
        <nav id="menu-movil" aria-label="Menú" className="flex flex-col gap-6 border-t border-white/15 px-5 pb-8 pt-6 lg:hidden">
          {enlaces.map((enlace) => (
            <Link
              key={enlace.href}
              href={enlace.href}
              onClick={() => setMenuAbierto(false)}
              aria-current={esActual(ruta, enlace.href) ? 'page' : undefined}
              className="font-display text-3xl normal-case tracking-normal"
            >
              {enlace.texto}
            </Link>
          ))}
          <div className="flex gap-7 pt-2">{sesion}</div>
        </nav>
      )}
    </header>
  );
}

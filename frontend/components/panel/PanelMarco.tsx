'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import Icono, { type NombreIcono } from './Icono';
import LogoEmpresa from '@/components/sitio/LogoEmpresa';

const SECCIONES: { href: string; texto: string; icono: NombreIcono; exacta?: boolean }[] = [
  { href: '/admin', texto: 'Inicio', icono: 'inicio', exacta: true },
  { href: '/admin/propiedades', texto: 'Propiedades', icono: 'propiedades' },
  { href: '/admin/catalogo', texto: 'Orden del catálogo', icono: 'catalogo' },
  { href: '/admin/visitas', texto: 'Visitas', icono: 'visitas' },
  { href: '/admin/disponibilidad', texto: 'Disponibilidad', icono: 'calendario' },
  { href: '/admin/clientes', texto: 'Clientes', icono: 'clientes' },
  { href: '/admin/contratos', texto: 'Contratos', icono: 'contratos' },
  { href: '/admin/publicaciones', texto: 'Publicaciones', icono: 'subir' },
  { href: '/admin/requisitos', texto: 'Requisitos', icono: 'contratos' },
  { href: '/admin/configuracion', texto: 'Configuración', icono: 'configuracion' },
];

function Logo() {
  return (
    <Link href="/admin" className="flex flex-col items-start gap-1.5 text-white">
      <LogoEmpresa className="h-12 w-auto" />
      <span className="text-[11px] text-white/60">Panel de administración</span>
    </Link>
  );
}

function Menu({ alElegir }: { alElegir?: () => void }) {
  const ruta = usePathname() ?? '';
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const nombre = user ? `${user.nombre ?? ''} ${user.apellido ?? ''}`.trim() || user.email : '';

  return (
    <div className="flex h-full flex-col gap-6 bg-panel-menu px-3 py-5 text-white">
      <div className="px-2">
        <Logo />
      </div>

      <nav aria-label="Secciones del panel" className="flex flex-1 flex-col gap-0.5">
        {SECCIONES.map((seccion) => {
          const activa = seccion.exacta ? ruta === seccion.href : ruta === seccion.href || ruta.startsWith(`${seccion.href}/`);
          return (
            <Link
              key={seccion.href}
              href={seccion.href}
              onClick={alElegir}
              aria-current={activa ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] transition-colors ${
                activa ? 'bg-white/12 font-medium text-white' : 'text-white/70 hover:bg-white/6 hover:text-white'
              }`}
            >
              <Icono nombre={seccion.icono} className={`h-[18px] w-[18px] ${activa ? 'text-white' : 'text-white/60'}`} />
              {seccion.texto}
              {activa && <span aria-hidden="true" className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--p-acento)]" />}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-0.5 border-t border-white/10 pt-4">
        <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] text-white/70 hover:bg-white/6 hover:text-white">
          <Icono nombre="sitio" className="h-[18px] w-[18px] text-white/60" />
          Ver el sitio
        </Link>
        <button
          type="button"
          onClick={toggleTheme}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[14px] text-white/70 hover:bg-white/6 hover:text-white"
        >
          <Icono nombre={theme === 'dark' ? 'sol' : 'luna'} className="h-[18px] w-[18px] text-white/60" />
          {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        </button>
        <div className="mt-2 flex items-center gap-1 rounded-lg">
          <Link href="/perfil" title="Ver y editar tus datos" className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/6">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/12 text-[12px] font-semibold uppercase">
            {(user?.nombre?.[0] ?? user?.email?.[0] ?? 'A') + (user?.apellido?.[0] ?? '')}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium">{nombre}</span>
            <span className="block text-[12px] text-white/55">Mi perfil</span>
          </span>
          </Link>
          <button type="button" onClick={logout} aria-label="Salir de la cuenta" title="Salir" className="rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white">
            <Icono nombre="salir" className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Marco común de todas las páginas del panel
export default function PanelMarco({ children }: { children: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  const ruta = usePathname();

  // El cajón del celular se cierra solo al cambiar de página o con Escape
  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false);
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [abierto]);

  const seccion = SECCIONES.find((s) => (s.exacta ? ruta === s.href : ruta?.startsWith(s.href)))?.texto ?? 'Panel';

  return (
    <div className="panel min-h-dvh font-sans lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 hidden h-dvh lg:block">
        <Menu />
      </aside>

      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-white/10 bg-panel-menu px-4 py-3 text-white lg:hidden">
        <button type="button" onClick={() => setAbierto(true)} aria-label="Abrir menú" aria-expanded={abierto} className="rounded-md p-1.5 hover:bg-white/10">
          <Icono nombre="menu" />
        </button>
        <span className="text-[15px] font-medium">{seccion}</span>
      </div>

      {abierto && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú del panel">
          <button type="button" aria-label="Cerrar menú" onClick={() => setAbierto(false)} className="absolute inset-0 bg-black/45" />
          <div className="absolute inset-y-0 left-0 w-[min(84vw,288px)] shadow-2xl">
            <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar menú" className="absolute right-3 top-4 z-10 rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white">
              <Icono nombre="cerrar" />
            </button>
            <Menu alElegir={() => setAbierto(false)} />
          </div>
        </div>
      )}

      <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-8 lg:px-10">
        <div className="mx-auto w-full max-w-[1200px]">{children}</div>
      </main>
    </div>
  );
}

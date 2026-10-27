'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useConfirmarSalida } from '@/components/sitio/ConfirmarSalida';
import { useTheme } from '@/context/ThemeContext';
import Icono, { type NombreIcono } from './Icono';
import LogoEmpresa from '@/components/sitio/LogoEmpresa';
import { EVENTO_SOLICITUDES } from '@/services/solicitudes';
import { EVENTO_RESERVAS } from '@/services/reservas';
import { EVENTO_PENDIENTES, getPendientesPanel, type PendientesPanel } from '@/services/panel';

// `incluye`: otras rutas que marcan la sección como activa (el orden del catálogo se abre desde Configuración)
// `pendiente`: qué número del servidor se muestra al lado (lo que hay para revisar o confirmar) y cómo se lee
type Pendiente = { clave: keyof PendientesPanel; texto: string };
const SECCIONES: { href: string; texto: string; icono: NombreIcono; exacta?: boolean; incluye?: string[]; pendiente?: Pendiente }[] = [
  { href: '/admin', texto: 'Inicio', icono: 'inicio', exacta: true },
  { href: '/admin/propiedades', texto: 'Propiedades', icono: 'propiedades' },
  { href: '/admin/estadisticas', texto: 'Estadísticas', icono: 'estrella' },
  { href: '/admin/visitas', texto: 'Visitas', icono: 'visitas', pendiente: { clave: 'visitas', texto: 'por confirmar' } },
  { href: '/admin/horario', texto: 'Horario de visitas', icono: 'reloj' },
  { href: '/admin/reservas', texto: 'Reservas', icono: 'maleta', pendiente: { clave: 'reservas', texto: 'por confirmar (reservas o pagos)' } },
  { href: '/admin/disponibilidad', texto: 'Disponibilidad', icono: 'calendario' },
  { href: '/admin/senas', texto: 'Reservas con seña', icono: 'candado', pendiente: { clave: 'senas', texto: 'por vencer' } },
  { href: '/admin/solicitudes', texto: 'Solicitudes', icono: 'solicitudes', pendiente: { clave: 'solicitudes', texto: 'por revisar' } },
  { href: '/admin/clientes', texto: 'Clientes', icono: 'clientes' },
  { href: '/admin/contratos', texto: 'Contratos', icono: 'documento', pendiente: { clave: 'contratos', texto: 'para revisar (vencen o actualizan precio)' } },
  { href: '/admin/publicaciones', texto: 'Publicaciones', icono: 'subir', pendiente: { clave: 'publicaciones', texto: 'por revisar' } },
  { href: '/admin/requisitos', texto: 'Requisitos', icono: 'checklist' },
  { href: '/admin/configuracion', texto: 'Configuración', icono: 'configuracion', incluye: ['/admin/catalogo', '/admin/sitio'] },
];

const enRuta = (ruta: string, href: string) => ruta === href || ruta.startsWith(`${href}/`);
const esActiva = (ruta: string, s: (typeof SECCIONES)[number]) =>
  s.exacta ? ruta === s.href : enRuta(ruta, s.href) || Boolean(s.incluye?.some((otra) => enRuta(ruta, otra)));

// El menú oculto se recuerda en este navegador (si no hay almacenamiento, arranca visible)
const CLAVE_OCULTO = 'panel_menu_oculto';
const leerOculto = () => {
  try {
    return localStorage.getItem(CLAVE_OCULTO) === '1';
  } catch {
    return false;
  }
};
const guardarOculto = (oculto: boolean) => {
  try {
    localStorage.setItem(CLAVE_OCULTO, oculto ? '1' : '0');
  } catch {
    // sin almacenamiento: no se recuerda
  }
};

function Logo() {
  return (
    <Link href="/admin" className="flex flex-col items-start gap-1.5 text-white">
      <LogoEmpresa className="h-12 w-auto" />
      <span className="text-[11px] text-white/60">Panel de administración</span>
    </Link>
  );
}

// Lo que hay para revisar en cada sección. Se vuelve a contar al cambiar de página, cada minuto, al volver a
// la pestaña y cuando una pantalla avisa que confirmó, rechazó o cerró algo.
export function usePendientes(ruta: string) {
  const [pendientes, setPendientes] = useState<PendientesPanel>({});

  useEffect(() => {
    let activo = true;
    const contar = () =>
      getPendientesPanel()
        .then((n) => activo && setPendientes(n))
        .catch(() => {
          // Sin conexión o sin permiso: el menú sigue sin números
        });
    contar();
    const intervalo = setInterval(contar, 60000);
    const alVolver = () => document.visibilityState === 'visible' && contar();
    const eventos = [EVENTO_PENDIENTES, EVENTO_RESERVAS, EVENTO_SOLICITUDES];
    eventos.forEach((e) => window.addEventListener(e, contar));
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      activo = false;
      clearInterval(intervalo);
      eventos.forEach((e) => window.removeEventListener(e, contar));
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [ruta]);

  return pendientes;
}

function Menu({ alElegir, alOcultar, pendientes }: { alElegir?: () => void; alOcultar?: () => void; pendientes: PendientesPanel }) {
  const ruta = usePathname() ?? '';
  const { user } = useAuth();
  const { pedirSalida, dialogoSalida } = useConfirmarSalida();
  const { theme, setTheme } = useTheme();
  const nombre = user ? `${user.nombre ?? ''} ${user.apellido ?? ''}`.trim() || user.email : '';

  return (
    // Logo y pie quedan fijos; si las secciones no entran, la lista del medio se scrollea
    <div className="flex h-full flex-col gap-4 bg-panel-menu py-5 text-white">
      <div className="flex items-start justify-between gap-2 px-5">
        <Logo />
        {alOcultar && (
          <button
            type="button"
            onClick={alOcultar}
            aria-label="Ocultar el menú"
            title="Ocultar el menú"
            className="-mr-2 rounded-md p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Icono nombre="atras" className="h-[18px] w-[18px]" />
          </button>
        )}
      </div>

      <nav
        aria-label="Secciones del panel"
        className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain px-3 [scrollbar-color:rgba(255,255,255,0.25)_transparent] [scrollbar-width:thin]"
      >
        {SECCIONES.map((seccion) => {
          const activa = esActiva(ruta, seccion);
          const cantidad = seccion.pendiente ? pendientes[seccion.pendiente.clave] ?? 0 : 0;
          return (
            <Link
              key={seccion.href}
              href={seccion.href}
              onClick={alElegir}
              aria-current={activa ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] transition-colors ${
                activa ? 'bg-white/12 font-medium text-white' : 'text-white/70 hover:bg-white/6 hover:text-white'
              }`}
            >
              <Icono nombre={seccion.icono} className={`h-[18px] w-[18px] ${activa ? 'text-white' : 'text-white/60'}`} />
              {seccion.texto}
              {cantidad > 0 ? (
                <span className="tabular ml-auto min-w-5 rounded-full bg-[var(--p-acento)] px-1.5 text-center text-[11.5px] font-semibold leading-5 text-white">
                  {cantidad}
                  <span className="sr-only"> {seccion.pendiente?.texto}</span>
                </span>
              ) : (
                activa && <span aria-hidden="true" className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--p-acento)]" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mx-3 flex shrink-0 flex-col gap-1 border-t border-white/10 pt-4">
        <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] text-white/70 hover:bg-white/6 hover:text-white">
          <Icono nombre="sitio" className="h-[18px] w-[18px] text-white/60" />
          Ver el sitio
        </Link>
        {/* Modo claro u oscuro: las dos opciones a la vista */}
        <div role="radiogroup" aria-label="Apariencia del panel" className="mx-1 my-1 grid grid-cols-2 gap-1 rounded-lg bg-white/6 p-1">
          {(
            [
              ['light', 'sol', 'Claro'],
              ['dark', 'luna', 'Oscuro'],
            ] as const
          ).map(([modo, icono, texto]) => (
            <button
              key={modo}
              type="button"
              role="radio"
              aria-checked={theme === modo}
              onClick={() => setTheme(modo)}
              className={`flex items-center justify-center gap-2 rounded-md py-1.5 text-[13px] transition-colors ${
                theme === modo ? 'bg-white/15 font-medium text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              <Icono nombre={icono} className="h-4 w-4" />
              {texto}
            </button>
          ))}
        </div>
        <div className="mt-1 flex items-center gap-1 rounded-lg">
          <Link href="/perfil" title="Ver y editar tus datos" className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/6">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/12 text-[12px] font-semibold uppercase">
            {(user?.nombre?.[0] ?? user?.email?.[0] ?? 'A') + (user?.apellido?.[0] ?? '')}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium">{nombre}</span>
            <span className="block text-[12px] text-white/55">Mi perfil</span>
          </span>
          </Link>
          <button type="button" onClick={pedirSalida} aria-label="Salir de la cuenta" title="Salir" className="rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white">
            <Icono nombre="salir" className="h-[18px] w-[18px]" />
          </button>
          {dialogoSalida}
        </div>
      </div>
    </div>
  );
}

// Marco común de todas las páginas del panel
export default function PanelMarco({ children }: { children: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  // El panel se arma solo en el navegador (antes se verifica la sesión), así que se puede leer al empezar
  const [oculto, setOculto] = useState(leerOculto);
  const cambiarOculto = (valor: boolean) => {
    setOculto(valor);
    guardarOculto(valor);
  };
  const ruta = usePathname();
  const pendientes = usePendientes(ruta ?? '');
  const totalPendientes = Object.values(pendientes).reduce<number>((suma, n) => suma + (n ?? 0), 0);
  const avisoPendientes = totalPendientes ? ` (${totalPendientes} ${totalPendientes === 1 ? 'cosa' : 'cosas'} para revisar)` : '';

  // El cajón del celular se cierra solo al cambiar de página o con Escape
  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false);
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [abierto]);

  const seccion = ruta === '/admin/catalogo' ? 'Orden del catálogo' : ruta === '/admin/sitio' ? 'Datos del sitio' : SECCIONES.find((s) => esActiva(ruta ?? '', s))?.texto ?? 'Panel';

  return (
    <div className={`panel min-h-dvh font-sans lg:grid ${oculto ? 'lg:grid-cols-1' : 'lg:grid-cols-[248px_1fr]'}`}>
      {!oculto && (
        <aside className="sticky top-0 hidden h-dvh lg:block">
          <Menu pendientes={pendientes} alOcultar={() => cambiarOculto(true)} />
        </aside>
      )}

      {/* Con el menú oculto queda un botón arriba a la izquierda para volver a mostrarlo */}
      {oculto && (
        <button
          type="button"
          onClick={() => cambiarOculto(false)}
          aria-label={`Mostrar el menú${avisoPendientes}`}
          title="Mostrar el menú"
          className="fixed left-4 top-4 z-40 hidden items-center gap-2 rounded-lg bg-panel-menu px-3 py-2.5 text-[13px] font-medium text-white shadow-lg transition-colors hover:brightness-125 lg:flex"
        >
          <Icono nombre="menu" className="h-[18px] w-[18px]" />
          Menú
          {totalPendientes > 0 && (
            <span aria-hidden="true" className="tabular min-w-5 rounded-full bg-[var(--p-acento)] px-1.5 text-center text-[11.5px] font-semibold leading-5">
              {totalPendientes}
            </span>
          )}
        </button>
      )}

      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-white/10 bg-panel-menu px-4 py-3 text-white lg:hidden">
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label={`Abrir menú${avisoPendientes}`}
          aria-expanded={abierto}
          className="relative rounded-md p-1.5 hover:bg-white/10"
        >
          <Icono nombre="menu" />
          {totalPendientes > 0 && <span aria-hidden="true" className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--p-acento)] ring-2 ring-panel-menu" />}
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
            <Menu alElegir={() => setAbierto(false)} pendientes={pendientes} />
          </div>
        </div>
      )}

      <main className={`min-w-0 px-4 py-6 sm:px-8 sm:py-8 lg:px-10 ${oculto ? 'lg:pt-20' : ''}`}>
        <div className="mx-auto w-full max-w-[1200px]">{children}</div>
      </main>
    </div>
  );
}

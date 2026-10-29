'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useConfirmarSalida } from '@/components/sitio/ConfirmarSalida';
import { getResumenPanel, type ItemPendiente } from '@/services/panel';
import { marcarBienvenidaVista } from '@/components/panel/bienvenida';
import LogoEmpresa from '@/components/sitio/LogoEmpresa';

const TABLILLAS = 8;
const HORA = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' });
const FECHA = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

const saludoSegunHora = (hora: number) => (hora < 6 ? 'Buenas noches' : hora < 13 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches');
const NOMBRES_GENERICOS = ['admin', 'administrador', 'administradora', 'administracion', 'administración', 'usuario'];
const nombrePropio = (nombre?: string) => {
  const limpio = nombre?.trim() ?? '';
  return limpio && !NOMBRES_GENERICOS.includes(limpio.toLowerCase()) ? limpio : '';
};

type Resumen = { items: ItemPendiente[] } | { error: true } | null;

// Cómo se muestra cada nivel de urgencia (el color siempre va con su texto, nunca solo)
const URGENCIA: Record<ItemPendiente['urgencia'], { texto: string; punto: string }> = {
  1: { texto: 'Para hoy', punto: 'bg-[#ff5a4b] shadow-[0_0_0_4px_rgba(255,90,75,0.18)]' },
  2: { texto: 'Esta semana', punto: 'bg-[#f2b84b]' },
  3: { texto: 'Cuando puedas', punto: 'bg-[#efe9df]/50' },
};
const MAXIMO_VISIBLE = 7;

// Frase de arriba de la lista: cuántas cosas hay y cuántas no pueden esperar
function fraseResumen(items: ItemPendiente[]) {
  const pendientes = items.filter((i) => i.clave !== 'visitas-hoy');
  const urgentes = pendientes.filter((i) => i.urgencia === 1).length;
  if (!items.length) return 'Todo al día: no hay nada pendiente.';
  if (!pendientes.length) return 'No hay nada pendiente de revisar.';
  const total = `${pendientes.length} ${pendientes.length === 1 ? 'tema pendiente' : 'temas pendientes'}`;
  return urgentes ? `Tenés ${total}; ${urgentes === 1 ? 'uno es para hoy' : `${urgentes} son para hoy`}.` : `Tenés ${total}, ninguno urgente.`;
}

// A dónde quería ir el administrador antes de la bienvenida (solo rutas internas)
function leerVolver() {
  if (typeof window === 'undefined') return null;
  const volver = new URLSearchParams(window.location.search).get('volver');
  return volver && volver.startsWith('/') && !volver.startsWith('//') && !volver.startsWith('/admin/bienvenida') ? volver : null;
}

export default function BienvenidaPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { pedirSalida, dialogoSalida } = useConfirmarSalida();
  const [ahora, setAhora] = useState(() => new Date());
  const [resumen, setResumen] = useState<Resumen>(null);
  const [volver] = useState(leerVolver);

  const opciones = useMemo(
    () => [
      { tecla: '1', href: volver?.startsWith('/admin') ? volver : '/admin', titulo: 'Entrar al panel', texto: 'Propiedades, visitas y contratos' },
      { tecla: '2', href: '/', titulo: 'Ver el sitio', texto: 'Como lo ven los clientes' },
      { tecla: '3', href: '/admin/propiedades/nueva', titulo: 'Cargar una propiedad', texto: 'Directo al formulario' },
    ],
    [volver]
  );

  // Queda registrado que en esta pestaña ya se vio: recargar no la repite
  useEffect(() => {
    marcarBienvenidaVista();
  }, []);

  // Reloj: se actualiza cada 20 segundos
  useEffect(() => {
    const intervalo = setInterval(() => setAhora(new Date()), 20000);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    let vigente = true;
    getResumenPanel()
      .then((items) => vigente && setResumen({ items }))
      .catch(() => vigente && setResumen({ error: true }));
    return () => {
      vigente = false;
    };
  }, []);

  // Atajos de teclado 1, 2 y 3 para elegir una opción
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select')) return;
      const opcion = opciones.find((o) => o.tecla === e.key);
      if (opcion) router.push(opcion.href);
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [router, opciones]);

  // Solo se saluda por nombre si es un nombre de verdad (no "Administrador" ni vacío)
  const nombre = nombrePropio(user?.nombre);
  const saludo = saludoSegunHora(ahora.getHours());

  return (
    <main className="relative isolate min-h-dvh overflow-hidden bg-[#071733] font-sans text-[#efe9df] selection:bg-[#d9382b] selection:text-white">
      {/* Fondo: foto con acercamiento lento, oscurecida para que el texto se lea */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        {/* eslint-disable-next-line @next/next/no-img-element -- imagen local decorativa */}
        <img src="/images/home-blue-hour.webp" alt="" className="bienvenida-foto h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#071733] via-[#071733]/85 to-[#071733]/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#071733] via-transparent to-[#071733]/60" />
      </div>
      {/* Persiana de entrada */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-30 flex flex-col">
        {Array.from({ length: TABLILLAS }, (_, i) => (
          <span key={i} className="bienvenida-tablilla flex-1 bg-[#071733]" style={{ animationDelay: `${0.15 + i * 0.06}s` }} />
        ))}
      </div>

      <div className="relative flex min-h-dvh flex-col px-5 py-6 sm:px-10 lg:px-16">
        <header className="calma-micro bienvenida-aparecer flex items-center justify-between gap-4" style={{ animationDelay: '0.9s' }}>
          <LogoEmpresa className="h-11 w-auto sm:hidden" prioridad />
          <LogoEmpresa version="linea" className="hidden h-11 w-auto sm:block" prioridad />
          <span className="flex items-center gap-3 text-[#efe9df]/75">
            <span className="calma-dot" aria-hidden="true" />
            <span className="hidden sm:inline">Villa Libertador San Martín</span>
            <time className="tabular-nums text-[#efe9df]" dateTime={ahora.toISOString()}>
              {HORA.format(ahora)}
            </time>
          </span>
        </header>

        {/* En pantallas anchas: saludo y accesos a la izquierda, lista de pendientes a la derecha */}
        <div className="grid flex-1 items-center gap-12 py-12 xl:grid-cols-[minmax(0,1fr)_minmax(0,36rem)] xl:gap-16">
          <div className="flex flex-col gap-10">
            <div className="flex flex-col gap-6">
              <p className="calma-micro bienvenida-aparecer m-0 text-[#efe9df]/65 first-letter:uppercase" style={{ animationDelay: '1s' }}>
                {FECHA.format(ahora)} · Acceso de administración
              </p>
              <h1 className="font-display m-0 text-[clamp(56px,10vw,150px)] font-normal xl:text-[clamp(64px,6.6vw,150px)] leading-[0.92] tracking-[-0.02em]">
                <span className="bienvenida-renglon">
                  <span style={{ animationDelay: '0.75s' }}>{nombre ? `${saludo},` : `${saludo}.`}</span>
                </span>
                {nombre && (
                  <span className="bienvenida-renglon">
                    <span style={{ animationDelay: '0.9s' }}>{nombre}.</span>
                  </span>
                )}
              </h1>
              <span aria-hidden="true" className="bienvenida-linea block h-px w-40 bg-[#d9382b]" style={{ animationDelay: '1.3s' }} />
            </div>

            <nav aria-label="¿Qué querés hacer?" className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
              {opciones.map((opcion, i) => (
                <Link
                  key={opcion.href}
                  href={opcion.href}
                  className={`bienvenida-aparecer group flex items-start justify-between gap-4 rounded-2xl border px-5 py-5 transition-colors duration-500 ${
                    i === 0
                      ? 'border-[#efe9df] bg-[#efe9df] text-[#071733] hover:bg-white'
                      : 'border-[#efe9df]/25 bg-[#071733]/40 backdrop-blur-sm hover:border-[#efe9df]/60 hover:bg-[#071733]/60'
                  }`}
                  style={{ animationDelay: `${2.4 + i * 0.12}s` }}
                >
                  <span className="flex flex-col gap-1">
                    <span className="font-display text-[26px] leading-none">{opcion.titulo}</span>
                    <span className={`text-[14px] ${i === 0 ? 'text-[#071733]/70' : 'text-[#efe9df]/65'}`}>{opcion.texto}</span>
                  </span>
                  <kbd
                    className={`hidden rounded-md border px-2 py-0.5 font-sans text-[12px] sm:inline-block ${
                      i === 0 ? 'border-[#071733]/25 text-[#071733]/70' : 'border-[#efe9df]/30 text-[#efe9df]/70'
                    }`}
                    title={`Tecla ${opcion.tecla}`}
                  >
                    {opcion.tecla}
                  </kbd>
                </Link>
              ))}
            </nav>
          </div>

          <section aria-live="polite" aria-label="Pendientes" className="flex min-h-28 flex-col gap-4 rounded-3xl border border-[#efe9df]/12 bg-[#071733]/55 p-6 backdrop-blur-md sm:p-8">
            {resumen === null && (
              <p className="bienvenida-aparecer m-0 text-[clamp(17px,1.6vw,20px)] text-[#efe9df]/60" style={{ animationDelay: '1.5s' }}>
                Preparando tu resumen del día…
              </p>
            )}
            {resumen && 'error' in resumen && (
              <p className="bienvenida-aparecer m-0 text-[clamp(17px,1.6vw,20px)] text-[#efe9df]/70">No pude traer el resumen del día, pero el panel está listo.</p>
            )}
            {resumen && 'items' in resumen && (
              <>
                <p className="bienvenida-aparecer m-0 text-[clamp(18px,1.7vw,22px)] leading-snug text-[#efe9df]/90" style={{ animationDelay: '1.5s' }}>
                  {fraseResumen(resumen.items)}
                </p>
                {resumen.items.length > 0 && (
                  <ol className="m-0 flex list-none flex-col p-0">
                    {resumen.items.slice(0, MAXIMO_VISIBLE).map((item, i) => {
                      const nivel = URGENCIA[item.urgencia];
                      return (
                        <li key={item.clave} className="bienvenida-aparecer border-t border-[#efe9df]/12 first:border-t-0" style={{ animationDelay: `${1.65 + i * 0.1}s` }}>
                          <Link href={item.href} className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-4 py-3">
                            <span aria-hidden="true" className={`mt-[7px] h-2.5 w-2.5 rounded-full ${nivel.punto}`} />
                            <span className="flex min-w-0 flex-col gap-0.5">
                              <span className="text-[16.5px] leading-snug text-[#efe9df] group-hover:underline group-hover:decoration-[#d9382b] group-hover:underline-offset-4">{item.titulo}</span>
                              {item.detalle && <span className="text-[14px] leading-snug text-[#efe9df]/60">{item.detalle}</span>}
                            </span>
                            <span className="calma-micro mt-1 whitespace-nowrap text-[10.5px] text-[#efe9df]/55">{nivel.texto}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                )}
                {resumen.items.length > MAXIMO_VISIBLE && (
                  <Link href="/admin" className="calma-micro calma-link self-start text-[11px]">
                    Y {resumen.items.length - MAXIMO_VISIBLE} más en el panel
                  </Link>
                )}
              </>
            )}
          </section>

        </div>

        <footer className="bienvenida-aparecer flex items-center justify-between gap-4 text-[13px] text-[#efe9df]/55" style={{ animationDelay: '2.9s' }}>
          {volver && !volver.startsWith('/admin') ? (
            <Link href={volver} className="calma-link calma-link-sutil text-[#efe9df]/70 hover:text-[#efe9df]">
              Seguir en la página que abriste
            </Link>
          ) : (
            <span className="hidden sm:inline">Elegí con un clic o con las teclas 1, 2 y 3.</span>
          )}
          <button type="button" onClick={pedirSalida} className="-my-[9px] inline-flex min-h-11 items-center calma-link calma-link-sutil text-[#efe9df]/70 hover:text-[#efe9df]">
            Cerrar sesión
          </button>
          {dialogoSalida}
        </footer>
      </div>
    </main>
  );
}

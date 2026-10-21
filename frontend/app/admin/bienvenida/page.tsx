'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getProperties, type ApiProperty } from '@/services/api';
import { getVisitas, type Visita } from '@/services/visitas';
import { getContratos, type Contrato } from '@/services/contratos';
import { fechaDeVisita } from '@/components/panel/estados';
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

type Resumen = { frases: string[] } | { error: true } | null;

// Arma el resumen del día en frases cortas, con lo que conviene saber al entrar
function armarResumen(visitas: Visita[], contratos: Contrato[], propiedades: ApiProperty[]): string[] {
  const hoy = new Date();
  const esHoy = (d: Date | null) => !!d && d.toDateString() === hoy.toDateString();
  const deHoy = visitas
    .filter((v) => (v.estado === 'pendiente' || v.estado === 'confirmada' || v.estado === 'reprogramada') && esHoy(fechaDeVisita(v.fecha, v.horario)))
    .sort((a, b) => (fechaDeVisita(a.fecha, a.horario)?.getTime() ?? 0) - (fechaDeVisita(b.fecha, b.horario)?.getTime() ?? 0));
  const hora = (v: Visita) => v.horario?.match(/\d{1,2}:\d{2}/)?.[0];

  const frases: string[] = [];
  if (deHoy.length === 1) {
    frases.push(`Hoy tenés una visita${hora(deHoy[0]) ? ` a las ${hora(deHoy[0])}` : ''} con ${deHoy[0].cliente?.nombre || 'un cliente'}.`);
  } else if (deHoy.length > 1) {
    frases.push(`Hoy tenés ${deHoy.length} visitas; la primera${hora(deHoy[0]) ? ` a las ${hora(deHoy[0])}` : ''}.`);
  } else {
    frases.push('Hoy no tenés visitas agendadas.');
  }

  const pendientes = visitas.filter((v) => v.estado === 'pendiente').length;
  frases.push(
    pendientes === 0
      ? 'Todas las visitas están respondidas.'
      : pendientes === 1
        ? 'Una visita espera tu confirmación.'
        : `${pendientes} visitas esperan tu confirmación.`
  );

  const porVencer = contratos.filter((c) => c.estado === 'por_vencer').length;
  if (porVencer) frases.push(porVencer === 1 ? 'Un contrato está por vencer.' : `${porVencer} contratos están por vencer.`);

  const disponibles = propiedades.filter((p) => !p.estado || p.estado === 'disponible').length;
  frases.push(disponibles === 1 ? 'Hay una propiedad disponible en el catálogo.' : `Hay ${disponibles} propiedades disponibles en el catálogo.`);
  return frases;
}

// A dónde quería ir el administrador antes de la bienvenida (solo rutas internas)
function leerVolver() {
  if (typeof window === 'undefined') return null;
  const volver = new URLSearchParams(window.location.search).get('volver');
  return volver && volver.startsWith('/') && !volver.startsWith('//') && !volver.startsWith('/admin/bienvenida') ? volver : null;
}

export default function BienvenidaPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
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
    Promise.allSettled([getVisitas(), getContratos(), getProperties()]).then(([v, c, p]) => {
      if (!vigente) return;
      if (v.status === 'rejected' && c.status === 'rejected' && p.status === 'rejected') {
        setResumen({ error: true });
        return;
      }
      setResumen({
        frases: armarResumen(
          v.status === 'fulfilled' ? v.value ?? [] : [],
          c.status === 'fulfilled' ? c.value ?? [] : [],
          p.status === 'fulfilled' ? p.value ?? [] : []
        ),
      });
    });
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

        <div className="flex flex-1 flex-col justify-center gap-10 py-14 lg:max-w-4xl">
          <div className="flex flex-col gap-6">
            <p className="calma-micro bienvenida-aparecer m-0 text-[#efe9df]/65 first-letter:uppercase" style={{ animationDelay: '1s' }}>
              {FECHA.format(ahora)} · Acceso de administración
            </p>
            <h1 className="font-display m-0 text-[clamp(56px,10vw,150px)] font-normal leading-[0.92] tracking-[-0.02em]">
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

          <div aria-live="polite" className="flex min-h-28 max-w-xl flex-col gap-2 text-[clamp(17px,1.6vw,20px)] leading-snug">
            {resumen === null && (
              <p className="bienvenida-aparecer m-0 text-[#efe9df]/60" style={{ animationDelay: '1.5s' }}>
                Preparando tu resumen del día…
              </p>
            )}
            {resumen && 'error' in resumen && (
              <p className="bienvenida-aparecer m-0 text-[#efe9df]/70">No pude traer el resumen del día, pero el panel está listo.</p>
            )}
            {resumen &&
              'frases' in resumen &&
              resumen.frases.map((frase, i) => (
                <p key={frase} className="bienvenida-aparecer m-0 text-[#efe9df]/85" style={{ animationDelay: `${1.5 + i * 0.35}s` }}>
                  {frase}
                </p>
              ))}
          </div>

          <nav aria-label="¿Qué querés hacer?" className="grid gap-3 sm:grid-cols-3">
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

        <footer className="bienvenida-aparecer flex items-center justify-between gap-4 text-[13px] text-[#efe9df]/55" style={{ animationDelay: '2.9s' }}>
          {volver && !volver.startsWith('/admin') ? (
            <Link href={volver} className="calma-link calma-link-sutil text-[#efe9df]/70 hover:text-[#efe9df]">
              Seguir en la página que abriste
            </Link>
          ) : (
            <span className="hidden sm:inline">Elegí con un clic o con las teclas 1, 2 y 3.</span>
          )}
          <button type="button" onClick={logout} className="calma-link calma-link-sutil text-[#efe9df]/70 hover:text-[#efe9df]">
            Cerrar sesión
          </button>
        </footer>
      </div>
    </main>
  );
}

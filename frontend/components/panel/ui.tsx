'use client';

import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Icono, { type NombreIcono } from './Icono';
import { MESES, SEMANA, celdasDelMes, diasDelMes, hoyIso, isoDe, mesSiguiente, sumarDias } from '@/components/calendario/fechas';

// ---------- Botones ----------
type Variante = 'principal' | 'secundario' | 'fantasma' | 'peligro' | 'acento';
type Tamano = 'sm' | 'md';

const VARIANTES: Record<Variante, string> = {
  principal: 'bg-panel-marca text-panel-marca-texto hover:opacity-90',
  acento: 'bg-panel-acento text-white hover:opacity-90',
  secundario: 'border border-panel-borde-fuerte bg-panel-superficie text-panel-texto hover:bg-panel-hundido',
  fantasma: 'text-panel-suave hover:bg-panel-hundido hover:text-panel-texto',
  peligro: 'border border-red-300 bg-panel-superficie text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40',
};
const TAMANOS: Record<Tamano, string> = {
  sm: 'h-8 gap-1.5 px-3 text-[13px]',
  md: 'h-10 gap-2 px-4 text-sm',
};

// Clases de botón, para usar también en <Link>
export const boton = (variante: Variante = 'secundario', tamano: Tamano = 'md') =>
  `inline-flex shrink-0 items-center justify-center rounded-lg font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTES[variante]} ${TAMANOS[tamano]}`;

type PropsBoton = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante;
  tamano?: Tamano;
  icono?: NombreIcono;
  cargando?: boolean;
};

export function Boton({ variante = 'secundario', tamano = 'md', icono, cargando, children, className = '', disabled, ...resto }: PropsBoton) {
  return (
    <button type="button" className={`${boton(variante, tamano)} ${className}`} disabled={disabled || cargando} aria-busy={cargando || undefined} {...resto}>
      {cargando ? (
        <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        icono && <Icono nombre={icono} className={tamano === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]'} />
      )}
      {children}
    </button>
  );
}

export function BotonLink({ href, variante = 'secundario', tamano = 'md', icono, children, className = '', ...resto }: { href: string; variante?: Variante; tamano?: Tamano; icono?: NombreIcono; children: React.ReactNode; className?: string } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  return (
    <Link href={href} className={`${boton(variante, tamano)} ${className}`} {...resto}>
      {icono && <Icono nombre={icono} className={tamano === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]'} />}
      {children}
    </Link>
  );
}

// ---------- Estructura ----------
export function Encabezado({ titulo, descripcion, acciones, volver }: { titulo: string; descripcion?: React.ReactNode; acciones?: React.ReactNode; volver?: { href: string; texto: string } }) {
  return (
    <header className="flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between">
      {/* flex-1: un texto largo usa el espacio que sobra y no empuja las acciones fuera de la pantalla */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {volver && (
          <Link href={volver.href} className="inline-flex items-center gap-1 self-start text-[13px] text-panel-suave hover:text-panel-texto">
            <Icono nombre="atras" className="h-4 w-4" />
            {volver.texto}
          </Link>
        )}
        <h1 className="font-display m-0 text-[34px] font-normal leading-tight tracking-[-0.01em] sm:text-[40px]">{titulo}</h1>
        {descripcion && <p className="m-0 max-w-2xl text-[15px] leading-relaxed text-panel-suave">{descripcion}</p>}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </header>
  );
}

export function Tarjeta({ titulo, descripcion, acciones, children, className = '', relleno = true }: { titulo?: React.ReactNode; descripcion?: React.ReactNode; acciones?: React.ReactNode; children?: React.ReactNode; className?: string; relleno?: boolean }) {
  return (
    <section className={`rounded-xl border border-panel-borde bg-panel-superficie ${className}`}>
      {(titulo || acciones) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-panel-borde px-5 py-4">
          <div className="min-w-0">
            {titulo && <h2 className="m-0 text-[15px] font-semibold">{titulo}</h2>}
            {descripcion && <p className="m-0 mt-0.5 text-[13px] text-panel-suave">{descripcion}</p>}
          </div>
          {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
        </div>
      )}
      <div className={relleno ? 'p-5' : ''}>{children}</div>
    </section>
  );
}

// ---------- Formularios ----------
export const entrada =
  'w-full rounded-lg border border-panel-borde-fuerte bg-panel-superficie px-3 text-sm text-panel-texto placeholder:text-panel-tenue transition-colors focus:border-panel-acento focus:outline-none focus:ring-2 focus:ring-panel-acento-suave disabled:cursor-not-allowed disabled:bg-panel-hundido disabled:text-panel-tenue aria-[invalid=true]:border-red-500';
export const control = `${entrada} h-10`;
export const areaTexto = `${entrada} min-h-24 py-2.5 leading-relaxed`;

export function Campo({ etiqueta, htmlFor, ayuda, error, children, className = '' }: { etiqueta: React.ReactNode; htmlFor?: string; ayuda?: React.ReactNode; error?: string | null; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-panel-suave">
        {etiqueta}
      </label>
      {children}
      {error ? (
        <p className="m-0 text-[12.5px] text-red-600 dark:text-red-400">{error}</p>
      ) : (
        ayuda && <p className="m-0 text-[12.5px] text-panel-tenue">{ayuda}</p>
      )}
    </div>
  );
}

// ---------- Estados ----------
export type Tono = 'neutro' | 'exito' | 'aviso' | 'peligro' | 'info' | 'acento';
const TONOS: Record<Tono, string> = {
  neutro: 'bg-panel-hundido text-panel-suave ring-panel-borde',
  exito: 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900',
  aviso: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900',
  peligro: 'bg-red-50 text-red-800 ring-red-200 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-900',
  info: 'bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-900',
  acento: 'bg-panel-acento-suave text-panel-acento ring-transparent',
};

export function Insignia({ tono = 'neutro', children, className = '' }: { tono?: Tono; children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-[12px] font-medium ring-1 ring-inset ${TONOS[tono]} ${className}`}>{children}</span>;
}

export function EstadoVacio({ icono = 'info', titulo, texto, accion }: { icono?: NombreIcono; titulo: string; texto?: React.ReactNode; accion?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-panel-hundido text-panel-suave">
        <Icono nombre={icono} />
      </span>
      <div className="flex max-w-sm flex-col gap-1">
        <p className="m-0 text-[15px] font-semibold">{titulo}</p>
        {texto && <p className="m-0 text-[13.5px] leading-relaxed text-panel-suave">{texto}</p>}
      </div>
      {accion}
    </div>
  );
}

export function Esqueleto({ className = 'h-4 w-full' }: { className?: string }) {
  return <span aria-hidden="true" className={`block animate-pulse rounded-md bg-panel-hundido motion-reduce:animate-none ${className}`} />;
}

// ---------- Error junto a un campo ----------
// El campo tiembla y un globo rojo con flecha dice el problema justo debajo, en vez de un aviso lejos de la
// acción. El globo va dentro de un contenedor `relative` junto al campo (`ancla`), y se corre si no entra en
// la pantalla; la flecha sigue apuntando al campo.
const SACUDIDA = [0, -5, 5, -4, 3, -1, 0].map((x) => ({ transform: `translateX(${x}px)` }));

export function sacudir(elemento: HTMLElement | null) {
  if (!elemento || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  elemento.animate(SACUDIDA, { duration: 340, easing: 'ease-in-out' });
}

// Bordes rojos para el campo con error (se suman a sus clases)
export const campoConError = 'border-red-500! ring-2 ring-red-500/70 dark:border-red-400! dark:ring-red-400/60';

export function GloboError({ id, ancla, children }: { id: string; ancla: React.RefObject<HTMLElement | null>; children: React.ReactNode }) {
  const globo = useRef<HTMLSpanElement>(null);
  const [desplazo, setDesplazo] = useState(0);

  useLayoutEffect(() => {
    if (!ancla.current || !globo.current) return;
    const r = ancla.current.getBoundingClientRect();
    const ancho = globo.current.offsetWidth;
    const izquierda = r.left + r.width / 2 - ancho / 2;
    const margen = 12;
    setDesplazo(Math.min(Math.max(izquierda, margen), window.innerWidth - margen - ancho) - izquierda);
  }, [ancla, children]);

  return (
    <span
      ref={globo}
      id={id}
      role="alert"
      style={{ marginLeft: desplazo }}
      className="absolute left-1/2 top-full z-30 mt-2.5 w-max max-w-[min(17rem,calc(100vw-24px))] -translate-x-1/2 rounded-lg bg-red-600 px-3 py-2 text-left text-[12.5px] font-medium leading-snug text-white shadow-[0_10px_28px_-8px_rgba(127,29,29,0.6)] dark:bg-red-500"
    >
      <span aria-hidden="true" style={{ marginLeft: -desplazo }} className="absolute -top-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 rounded-[2px] bg-red-600 dark:bg-red-500" />
      {children}
    </span>
  );
}

// ---------- Selector de fecha ----------
// En lugar del calendario del navegador (que no sigue el estilo del panel): un campo que abre un almanaque
// flotante, con sombra para que se despegue del fondo en los dos modos. Teclado: flechas mueven el día,
// RePág/AvPág el mes, Enter elige y Escape cierra. `marcados` pone un punto en los días que ya tienen algo;
// con `rangoDesde`, los días entre esa fecha y la apuntada se tiñen (para elegir el final de un rango).
const mesDe = (iso: string) => ({ anio: Number(iso.slice(0, 4)), mes: Number(iso.slice(5, 7)) - 1 });
// "mar 27 oct" (el año solo si no es el actual): entra entero en un campo angosto
const fechaCampo = (iso: string) =>
  new Date(`${iso}T12:00:00`)
    .toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', ...(iso.slice(0, 4) === hoyIso().slice(0, 4) ? {} : { year: 'numeric' }) })
    .replace(/[.,]/g, '');

export function SelectorFecha({
  id,
  valor,
  alCambiar,
  min,
  placeholder = 'Elegir fecha',
  invalido,
  describedBy,
  campoRef,
  marcados,
  rangoDesde,
}: {
  id: string;
  valor: string;
  alCambiar: (iso: string) => void;
  min?: string;
  placeholder?: string;
  invalido?: boolean;
  describedBy?: string;
  campoRef?: React.RefObject<HTMLButtonElement | null>;
  marcados?: (iso: string) => boolean;
  rangoDesde?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [foco, setFoco] = useState(valor || hoyIso());
  const [apuntado, setApuntado] = useState<string | null>(null);
  const caja = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const hoy = hoyIso();
  const vista = mesDe(foco);
  const permitido = (iso: string) => !min || iso >= min;

  const abrir = () => {
    const inicio = valor || (rangoDesde && permitido(rangoDesde) ? rangoDesde : min && min > hoy ? min : hoy);
    setFoco(inicio);
    setAbierto(true);
  };
  const cerrar = (devolverFoco = true) => {
    setAbierto(false);
    setApuntado(null);
    if (devolverFoco) campoRef?.current?.focus();
  };
  const elegir = (iso: string) => {
    if (!permitido(iso)) return;
    alCambiar(iso);
    cerrar();
  };
  const irA = (iso: string) => {
    if (permitido(iso)) setFoco(iso);
  };
  const otroMes = (salto: number) => {
    const m = mesSiguiente(vista, salto);
    return isoDe(m.anio, m.mes, Math.min(Number(foco.slice(8)), diasDelMes(m.anio, m.mes)));
  };

  // Clic afuera: se cierra sin elegir
  useEffect(() => {
    if (!abierto) return;
    const afuera = (e: MouseEvent) => {
      if (!caja.current?.contains(e.target as Node)) cerrar(false);
    };
    document.addEventListener('mousedown', afuera);
    return () => document.removeEventListener('mousedown', afuera);
  });

  // El día con foco recibe el foco del teclado al abrir y al moverse
  useEffect(() => {
    if (abierto) panel.current?.querySelector<HTMLButtonElement>(`[data-fecha="${foco}"]`)?.focus();
  }, [abierto, foco]);

  const tecla = (e: React.KeyboardEvent) => {
    const saltos: Record<string, () => string> = {
      ArrowLeft: () => sumarDias(foco, -1),
      ArrowRight: () => sumarDias(foco, 1),
      ArrowUp: () => sumarDias(foco, -7),
      ArrowDown: () => sumarDias(foco, 7),
      PageUp: () => otroMes(-1),
      PageDown: () => otroMes(1),
    };
    if (e.key in saltos) {
      e.preventDefault();
      irA(saltos[e.key]());
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      cerrar();
    }
  };

  // Tramo teñido al elegir el final de un rango: de `rangoDesde` al día apuntado (o al elegido)
  const finRango = apuntado ?? valor;
  const enRango = (iso: string) => Boolean(rangoDesde && finRango && rangoDesde <= iso && iso <= finRango);

  return (
    <div ref={caja} className="relative">
      <button
        ref={campoRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-describedby={describedBy}
        onClick={() => (abierto ? cerrar() : abrir())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !abierto) {
            e.preventDefault();
            abrir();
          }
        }}
        className={`${control} flex w-full items-center justify-between gap-2 text-left ${invalido ? campoConError : ''}`}
      >
        <span className={`truncate ${valor ? 'first-letter:uppercase' : 'text-panel-tenue'}`}>{valor ? fechaCampo(valor) : placeholder}</span>
        <Icono nombre="calendario" className="h-[18px] w-[18px] text-panel-tenue" />
      </button>

      {abierto && (
        <div
          ref={panel}
          role="dialog"
          aria-label="Elegir fecha"
          onKeyDown={tecla}
          className="absolute left-0 top-full z-40 mt-2 w-[18.5rem] rounded-xl bg-panel-superficie p-3 text-panel-texto opacity-100 shadow-[0_18px_44px_-12px_rgba(10,20,40,0.35),0_2px_6px_-2px_rgba(10,20,40,0.12)] ring-1 ring-panel-borde-fuerte transition-[opacity,translate] duration-150 starting:-translate-y-1 starting:opacity-0 motion-reduce:transition-none dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_0_32px_-6px_color-mix(in_srgb,var(--p-acento)_45%,transparent),0_24px_60px_-10px_rgba(0,0,0,0.9)]"
        >
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => setFoco(otroMes(-1))} aria-label="Mes anterior" className="flex h-8 w-8 items-center justify-center rounded-lg text-panel-suave transition-colors hover:bg-panel-hundido hover:text-panel-texto">
              <Icono nombre="atras" className="h-4 w-4" />
            </button>
            <p className="font-display m-0 text-[18px] leading-none" aria-live="polite">
              {MESES[vista.mes]} <span className="text-panel-tenue">{vista.anio}</span>
            </p>
            <button type="button" onClick={() => setFoco(otroMes(1))} aria-label="Mes siguiente" className="flex h-8 w-8 items-center justify-center rounded-lg text-panel-suave transition-colors hover:bg-panel-hundido hover:text-panel-texto">
              <Icono nombre="flecha" className="h-4 w-4" />
            </button>
          </div>
          <div aria-hidden="true" className="mb-1 grid grid-cols-7 text-center text-[11px] font-medium uppercase tracking-wide text-panel-tenue">
            {SEMANA.map((d) => (
              <span key={d} className="py-1">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5" onMouseLeave={() => setApuntado(null)}>
            {celdasDelMes(vista.anio, vista.mes).map((iso, i) => {
              if (!iso) return <span key={`h${i}`} />;
              const elegido = iso === valor;
              const libre = permitido(iso);
              const rango = enRango(iso);
              return (
                <button
                  key={iso}
                  type="button"
                  data-fecha={iso}
                  tabIndex={iso === foco ? 0 : -1}
                  disabled={!libre}
                  aria-pressed={elegido}
                  aria-label={`${new Date(`${iso}T12:00:00`).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}${iso === hoy ? ' (hoy)' : ''}${marcados?.(iso) ? ', ya tiene un cierre' : ''}`}
                  onClick={() => elegir(iso)}
                  onMouseEnter={() => libre && setApuntado(iso)}
                  onFocus={() => {
                    setFoco(iso);
                    setApuntado(iso);
                  }}
                  className={`tabular relative flex h-9 items-center justify-center rounded-lg text-[13.5px] transition-colors focus-visible:outline-2 focus-visible:outline-panel-acento ${
                    elegido
                      ? 'bg-panel-acento font-semibold text-white'
                      : !libre
                        ? 'cursor-not-allowed text-panel-tenue/50'
                        : rango
                          ? 'bg-panel-acento-suave text-panel-texto'
                          : 'text-panel-texto hover:bg-panel-hundido'
                  } ${iso === hoy && !elegido ? 'font-semibold ring-1 ring-inset ring-panel-acento' : ''}`}
                >
                  {Number(iso.slice(8))}
                  {marcados?.(iso) && <span aria-hidden="true" className={`absolute bottom-1 h-1 w-1 rounded-full ${elegido ? 'bg-white' : 'bg-amber-500'}`} />}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-panel-borde pt-2">
            <Boton
              variante="fantasma"
              tamano="sm"
              onClick={() => {
                alCambiar('');
                cerrar();
              }}
            >
              Borrar
            </Boton>
            {marcados && (
              <span className="flex items-center gap-1.5 text-[11.5px] text-panel-tenue">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Ya cerrado
              </span>
            )}
            <Boton variante="fantasma" tamano="sm" disabled={!permitido(hoy)} onClick={() => elegir(hoy)}>
              Hoy
            </Boton>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Interruptor (sí / no) ----------
// Llave chica con texto al lado ("Abre" / "No abre"). Verde = activo, para que no se confunda con el acento.
export function Interruptor({ activo, alCambiar, etiqueta, children }: { activo: boolean; alCambiar: (activo: boolean) => void; etiqueta: string; children?: React.ReactNode }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={etiqueta}
      onClick={() => alCambiar(!activo)}
      className="-ml-0.5 flex min-h-6 items-center gap-1.5 whitespace-nowrap rounded-full py-0.5 pl-0.5 pr-1.5 text-[12px] text-panel-suave transition-colors hover:text-panel-texto focus-visible:outline-2 focus-visible:outline-panel-acento"
    >
      <span className={`relative h-4 w-7 shrink-0 rounded-full transition-colors duration-150 ${activo ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-panel-borde-fuerte'}`}>
        <span
          className={`absolute left-0 top-0.5 h-3 w-3 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition-transform duration-150 motion-reduce:transition-none ${activo ? 'translate-x-3.5' : 'translate-x-0.5'}`}
        />
      </span>
      {children}
    </button>
  );
}

// ---------- Pestañas ----------
// Con el teclado: flechas izquierda/derecha, Inicio y Fin (solo la pestaña activa recibe Tab).
export function Pestanas({ etiqueta, pestanas, activa, alCambiar, className = '' }: { etiqueta: string; pestanas: { id: string; contenido: React.ReactNode; ariaLabel?: string }[]; activa: number; alCambiar: (indice: number) => void; className?: string }) {
  const lista = useRef<HTMLDivElement>(null);
  const ir = (indice: number) => {
    const destino = (indice + pestanas.length) % pestanas.length;
    alCambiar(destino);
    lista.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[destino]?.focus();
  };
  const tecla = (e: React.KeyboardEvent) => {
    const movidas: Record<string, number> = { ArrowRight: activa + 1, ArrowLeft: activa - 1, Home: 0, End: pestanas.length - 1 };
    if (e.key in movidas) {
      e.preventDefault();
      ir(movidas[e.key]);
    }
  };
  return (
    <div ref={lista} role="tablist" aria-label={etiqueta} onKeyDown={tecla} className={`border-b border-panel-borde ${className}`}>
      {pestanas.map((p, i) => (
        <button
          key={p.id}
          type="button"
          role="tab"
          aria-selected={i === activa}
          aria-label={p.ariaLabel}
          tabIndex={i === activa ? 0 : -1}
          onClick={() => alCambiar(i)}
          className={`relative flex flex-col items-center gap-0.5 pb-2.5 pt-1.5 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-panel-acento ${i === activa ? 'text-panel-texto' : 'text-panel-suave hover:bg-panel-hundido hover:text-panel-texto'}`}
        >
          {p.contenido}
          {i === activa && <span aria-hidden="true" className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-panel-acento" />}
        </button>
      ))}
    </div>
  );
}

export function Alerta({ tono = 'info', titulo, children, accion }: { tono?: 'info' | 'aviso' | 'peligro' | 'exito'; titulo?: string; children?: React.ReactNode; accion?: React.ReactNode }) {
  const icono: NombreIcono = tono === 'exito' ? 'check' : tono === 'info' ? 'info' : 'alerta';
  return (
    <div role={tono === 'peligro' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-lg px-4 py-3 text-[13.5px] ring-1 ring-inset ${TONOS[tono]}`}>
      <Icono nombre={icono} className="mt-0.5 h-[18px] w-[18px]" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {titulo && <p className="m-0 font-semibold">{titulo}</p>}
        {children && <div className="leading-relaxed">{children}</div>}
      </div>
      {accion}
    </div>
  );
}

// ---------- Avisos flotantes (confirmación de acciones) ----------
type DatosAviso = { texto: string; tono: 'exito' | 'peligro' | 'info' };

export function useAviso() {
  const [aviso, setAviso] = useState<DatosAviso | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mostrar = useCallback((texto: string, tono: DatosAviso['tono'] = 'exito') => {
    setAviso({ texto, tono });
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setAviso(null), tono === 'peligro' ? 6000 : 3500);
  }, []);

  useEffect(() => () => {
    if (temporizador.current) clearTimeout(temporizador.current);
  }, []);

  const elemento = aviso ? (
    <div role={aviso.tono === 'peligro' ? 'alert' : 'status'} className="fixed bottom-5 left-1/2 z-[60] w-[min(92vw,420px)] -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0">
      <div className="flex items-center gap-3 rounded-xl border border-panel-borde bg-panel-superficie px-4 py-3 text-sm shadow-[0_8px_28px_-6px_rgba(10,20,40,0.25)]">
        <span className={aviso.tono === 'exito' ? 'text-emerald-600 dark:text-emerald-400' : aviso.tono === 'peligro' ? 'text-red-600 dark:text-red-400' : 'text-panel-suave'}>
          <Icono nombre={aviso.tono === 'exito' ? 'check' : aviso.tono === 'peligro' ? 'alerta' : 'info'} />
        </span>
        <p className="m-0 flex-1">{aviso.texto}</p>
        <button type="button" onClick={() => setAviso(null)} aria-label="Cerrar aviso" className="rounded-md p-1 text-panel-tenue hover:bg-panel-hundido hover:text-panel-texto">
          <Icono nombre="cerrar" className="h-4 w-4" />
        </button>
      </div>
    </div>
  ) : null;

  return { mostrar, aviso: elemento };
}

// ---------- Confirmación antes de acciones que no se pueden deshacer ----------
export function useConfirmar() {
  const [pedido, setPedido] = useState<{ titulo: string; texto?: string; accion: string; resolver: (ok: boolean) => void } | null>(null);
  const dialogo = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (pedido && dialogo.current && !dialogo.current.open) dialogo.current.showModal();
  }, [pedido]);

  const confirmar = useCallback(
    (titulo: string, opciones: { texto?: string; accion?: string } = {}) =>
      new Promise<boolean>((resolver) => setPedido({ titulo, texto: opciones.texto, accion: opciones.accion ?? 'Confirmar', resolver })),
    []
  );

  const cerrar = (ok: boolean) => {
    pedido?.resolver(ok);
    dialogo.current?.close();
    setPedido(null);
  };

  const elemento = (
    <dialog
      ref={dialogo}
      onCancel={(e) => {
        e.preventDefault();
        cerrar(false);
      }}
      className="m-auto w-[min(92vw,420px)] rounded-xl border border-panel-borde bg-panel-superficie p-0 text-panel-texto shadow-2xl backdrop:bg-black/40"
    >
      {pedido && (
        <div className="flex flex-col gap-5 p-6">
          <div className="flex flex-col gap-1.5">
            <h2 className="m-0 text-[17px] font-semibold">{pedido.titulo}</h2>
            {pedido.texto && <p className="m-0 text-sm leading-relaxed text-panel-suave">{pedido.texto}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Boton onClick={() => cerrar(false)}>Cancelar</Boton>
            <Boton variante="peligro" onClick={() => cerrar(true)} autoFocus>
              {pedido.accion}
            </Boton>
          </div>
        </div>
      )}
    </dialog>
  );

  return { confirmar, dialogoConfirmar: elemento };
}

// ---------- Diálogo (ventana sobre la página) ----------
export function Dialogo({ abierto, alCerrar, titulo, descripcion, children, acciones, ancho = 'md' }: { abierto: boolean; alCerrar: () => void; titulo: string; descripcion?: React.ReactNode; children?: React.ReactNode; acciones?: React.ReactNode; ancho?: 'md' | 'lg' }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (abierto && !dialogo.open) dialogo.showModal();
    if (!abierto && dialogo.open) dialogo.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        alCerrar();
      }}
      onClick={(e) => {
        // Clic en el fondo oscuro: cierra
        if (e.target === e.currentTarget) alCerrar();
      }}
      className={`m-auto max-h-[90dvh] ${ancho === 'lg' ? 'w-[min(94vw,640px)]' : 'w-[min(94vw,460px)]'} overflow-hidden rounded-xl border border-panel-borde bg-panel-superficie p-0 text-panel-texto shadow-2xl backdrop:bg-black/45`}
    >
      {abierto && (
        <div className="flex max-h-[90dvh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-panel-borde px-6 py-4">
            <div className="flex flex-col gap-1">
              <h2 className="m-0 text-[17px] font-semibold">{titulo}</h2>
              {descripcion && <div className="text-sm text-panel-suave">{descripcion}</div>}
            </div>
            <button type="button" onClick={alCerrar} aria-label="Cerrar" className="-mr-2 rounded-md p-1.5 text-panel-tenue hover:bg-panel-hundido hover:text-panel-texto">
              <Icono nombre="cerrar" className="h-[18px] w-[18px]" />
            </button>
          </div>
          <div className="overflow-y-auto px-6 py-5">{children}</div>
          {acciones && <div className="flex flex-wrap justify-end gap-2 border-t border-panel-borde bg-panel-hundido/50 px-6 py-3">{acciones}</div>}
        </div>
      )}
    </dialog>
  );
}


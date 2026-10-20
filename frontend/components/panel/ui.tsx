'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import Icono, { type NombreIcono } from './Icono';

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
      <div className="flex min-w-0 flex-col gap-1.5">
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

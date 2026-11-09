'use client';

// «Cómo funciona»: recorrido guiado por la pantalla. Oscurece todo menos la parte que se explica, que queda a color,
// y al lado muestra un cartel con qué hace. Se avanza paso a paso y se puede saltear en cualquier momento.
//
// Cada pantalla marca sus partes con data-guia="nombre" y los pasos se escriben en guias.ts.
// Si una parte no está en pantalla (por ejemplo, una lista vacía), el paso se muestra igual, en el centro.
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icono from './Icono';
import { GUIAS, type ClaveGuia } from './guias';

type Caja = { top: number; left: number; width: number; height: number };

const MARGEN = 8; // aire entre la parte iluminada y su borde
const SEPARACION = 14; // entre la parte iluminada y el cartel
const BORDE_PANTALLA = 16;
const OSCURO = 'rgba(2, 6, 16, 0.78)'; // lo que no se explica queda oscuro

const buscar = (objetivo?: string) => {
  if (!objetivo || typeof document === 'undefined') return null;
  // La primera que se vea (hay partes que existen dos veces: una para compu y otra para celular)
  const candidatos = Array.from(document.querySelectorAll<HTMLElement>(`[data-guia="${objetivo}"]`));
  return candidatos.find((el) => el.getClientRects().length > 0 && el.getBoundingClientRect().width > 0) ?? null;
};

const medir = (el: HTMLElement | null): Caja | null => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  // Si es más alta que la pantalla, se ilumina solo lo que se ve
  const top = Math.max(r.top, BORDE_PANTALLA / 2);
  const bottom = Math.min(r.bottom, window.innerHeight - BORDE_PANTALLA / 2);
  return { top: top - MARGEN, left: r.left - MARGEN, width: r.width + MARGEN * 2, height: Math.max(0, bottom - top) + MARGEN * 2 };
};

// undefined = todavía no se midió (distinto de null: medido y sin parte para iluminar)
const iguales = (a: Caja | null | undefined, b: Caja | null | undefined) =>
  a === b || (!!a && !!b && Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5 && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5);

const sinMovimiento = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function Recorrido({ guia, alCerrar }: { guia: ClaveGuia; alCerrar: () => void }) {
  const { titulo, pasos } = GUIAS[guia];
  const id = useId();
  const [indice, setIndice] = useState(0);
  const [caja, setCaja] = useState<Caja | null>(null);
  const [alto, setAlto] = useState(200);
  const [ancho, setAncho] = useState(() => (typeof window === 'undefined' ? 1024 : window.innerWidth));
  const cartel = useRef<HTMLDivElement>(null);
  const siguiente = useRef<HTMLButtonElement>(null);
  const paso = pasos[indice];
  const ultimo = indice === pasos.length - 1;

  // Al cambiar de paso, lleva la parte al centro de la pantalla (si es muy alta, su principio arriba)
  useEffect(() => {
    const el = buscar(paso.objetivo);
    if (!el) return;
    const alta = el.getBoundingClientRect().height > window.innerHeight * 0.6;
    el.scrollIntoView({ block: alta ? 'start' : 'center', inline: 'nearest', behavior: sinMovimiento() ? 'auto' : 'smooth' });
  }, [paso.objetivo]);

  // Sigue a la parte mientras la pantalla se mueve (scroll, cambio de tamaño, contenido que carga)
  useEffect(() => {
    let cuadro = 0;
    let anterior: Caja | null | undefined = undefined;
    const seguir = () => {
      const nueva = medir(buscar(paso.objetivo));
      if (!iguales(nueva, anterior)) {
        anterior = nueva;
        setCaja(nueva);
      }
      setAncho(window.innerWidth);
      cuadro = requestAnimationFrame(seguir);
    };
    seguir();
    return () => cancelAnimationFrame(cuadro);
  }, [paso.objetivo]);

  // Alto real del cartel, para ubicarlo arriba o abajo de la parte iluminada
  useLayoutEffect(() => {
    if (cartel.current) setAlto(cartel.current.offsetHeight);
  }, [indice, ancho]);

  // Foco en el botón principal al abrir y en cada paso
  useEffect(() => {
    siguiente.current?.focus({ preventScroll: true });
  }, [indice]);

  const avanzar = useCallback(() => (ultimo ? alCerrar() : setIndice((i) => i + 1)), [ultimo, alCerrar]);
  const volver = useCallback(() => setIndice((i) => Math.max(0, i - 1)), []);

  // Teclado: Escape saltea, flechas y Enter avanzan o vuelven. Tab no sale del cartel.
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        alCerrar();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        avanzar();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        volver();
      } else if (e.key === 'Tab' && cartel.current) {
        const botones = Array.from(cartel.current.querySelectorAll<HTMLElement>('button'));
        const actual = botones.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        const destino = (actual + (e.shiftKey ? -1 : 1) + botones.length) % botones.length;
        botones[actual === -1 ? 0 : destino]?.focus();
      }
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [alCerrar, avanzar, volver]);

  // Dónde va el cartel: en celular, abajo de todo; en compu, debajo o arriba de la parte (o al centro si no hay)
  const enCelular = ancho < 640;
  const anchoCartel = Math.min(380, ancho - BORDE_PANTALLA * 2);
  let posicion: React.CSSProperties;
  if (enCelular) {
    posicion = { left: BORDE_PANTALLA, right: BORDE_PANTALLA, bottom: BORDE_PANTALLA };
  } else if (!caja) {
    posicion = { left: (ancho - anchoCartel) / 2, top: Math.max(BORDE_PANTALLA, (window.innerHeight - alto) / 2), width: anchoCartel };
  } else {
    // Prueba debajo, arriba, a la derecha y a la izquierda; si no entra en ningún lado (una lista que ocupa toda
    // la pantalla), va a la esquina de abajo a la derecha, donde tapa lo menos posible
    const altoPantalla = window.innerHeight;
    const alineadoX = Math.min(Math.max(BORDE_PANTALLA, caja.left), ancho - anchoCartel - BORDE_PANTALLA);
    const alineadoY = Math.min(Math.max(BORDE_PANTALLA, caja.top), altoPantalla - alto - BORDE_PANTALLA);
    const abajo = caja.top + caja.height + SEPARACION;
    const arriba = caja.top - SEPARACION - alto;
    const derecha = caja.left + caja.width + SEPARACION;
    const izquierda = caja.left - SEPARACION - anchoCartel;
    if (abajo + alto <= altoPantalla - BORDE_PANTALLA) posicion = { left: alineadoX, top: abajo, width: anchoCartel };
    else if (arriba >= BORDE_PANTALLA) posicion = { left: alineadoX, top: arriba, width: anchoCartel };
    else if (derecha + anchoCartel <= ancho - BORDE_PANTALLA) posicion = { left: derecha, top: alineadoY, width: anchoCartel };
    else if (izquierda >= BORDE_PANTALLA) posicion = { left: izquierda, top: alineadoY, width: anchoCartel };
    else posicion = { left: ancho - anchoCartel - BORDE_PANTALLA * 2, top: altoPantalla - alto - BORDE_PANTALLA * 2, width: anchoCartel };
  }

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-labelledby={`${id}-titulo`} aria-describedby={`${id}-texto`}>
      {/* Tapa la pantalla para que no se toque nada sin querer; la parte iluminada se ve pero no se usa */}
      <div className="absolute inset-0" aria-hidden="true" />

      {caja ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed rounded-xl transition-[top,left,width,height] duration-300 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none"
          // Borde blanco fino alrededor de la parte iluminada y, por fuera, todo oscuro
          style={{ ...caja, boxShadow: `0 0 0 2px rgba(255, 255, 255, 0.85), 0 0 0 9999px ${OSCURO}` }}
        />
      ) : (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0" style={{ background: OSCURO }} />
      )}

      <div
        ref={cartel}
        style={posicion}
        className="fixed flex flex-col gap-3 rounded-2xl border border-panel-borde bg-panel-superficie p-5 text-panel-texto shadow-[0_18px_48px_-12px_rgba(0,0,0,0.5)] transition-[top,left] duration-300 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-panel-acento">
            <Icono nombre="idea" className="h-3.5 w-3.5" />
            {titulo}
          </span>
          <span className="tabular text-[12px] text-panel-suave">
            {indice + 1} de {pasos.length}
          </span>
        </div>

        <div aria-live="polite" className="flex flex-col gap-1.5">
          <h2 id={`${id}-titulo`} className="m-0 text-[17px] font-semibold leading-snug">
            {paso.titulo}
          </h2>
          <p id={`${id}-texto`} className="m-0 text-[14px] leading-relaxed text-panel-suave">
            {paso.texto}
          </p>
        </div>

        {/* Un puntito por paso: se puede saltar directo a cualquiera */}
        <div className="flex items-center gap-1.5" aria-label="Pasos">
          {pasos.map((p, i) => (
            <button
              key={i}
              type="button"
              tabIndex={-1}
              onClick={() => setIndice(i)}
              aria-label={`Ir al paso ${i + 1}: ${p.titulo}`}
              aria-current={i === indice ? 'step' : undefined}
              className={`h-1.5 rounded-full transition-all duration-300 motion-reduce:transition-none ${i === indice ? 'w-5 bg-panel-acento' : 'w-1.5 bg-panel-borde-fuerte hover:bg-panel-suave'}`}
            />
          ))}
        </div>

        <div className="mt-1 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={alCerrar}
            className="-ml-2 min-h-11 rounded-md px-2 text-[13px] text-panel-suave underline-offset-4 hover:text-panel-texto hover:underline sm:min-h-9"
          >
            {ultimo ? 'Cerrar' : 'Saltear tutorial'}
          </button>
          <div className="flex items-center gap-2">
            {indice > 0 && (
              <button
                type="button"
                onClick={volver}
                className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-panel-borde px-3 text-[13.5px] font-medium hover:bg-panel-hundido sm:min-h-9"
              >
                <Icono nombre="atras" className="h-4 w-4" />
                Anterior
              </button>
            )}
            <button
              ref={siguiente}
              type="button"
              onClick={avanzar}
              className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-panel-marca px-4 text-[13.5px] font-medium text-panel-marca-texto hover:brightness-110 sm:min-h-9"
            >
              {ultimo ? '¡Listo!' : 'Siguiente'}
              {!ultimo && <Icono nombre="flecha" className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Botón «Cómo funciona» que abre el recorrido de la pantalla. Lo pone el Encabezado con guia="...".
export function BotonGuia({ guia }: { guia: ClaveGuia }) {
  const [abierto, setAbierto] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);
  // El recorrido va dentro del marco del panel (ahí están sus colores, claros u oscuros)
  const [destino, setDestino] = useState<Element | null>(null);

  const abrir = () => {
    setDestino(boton.current?.closest('.panel') ?? document.body);
    setAbierto(true);
  };
  const cerrar = useCallback(() => {
    setAbierto(false);
    boton.current?.focus({ preventScroll: true });
  }, []);

  return (
    <>
      <button
        ref={boton}
        type="button"
        onClick={abrir}
        aria-haspopup="dialog"
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-panel-borde bg-panel-superficie px-3.5 text-[13.5px] font-medium transition-colors hover:bg-panel-hundido sm:min-h-9"
      >
        <Icono nombre="idea" className="h-4 w-4" />
        Cómo funciona
      </button>
      {abierto && destino && createPortal(<Recorrido guia={guia} alCerrar={cerrar} />, destino)}
    </>
  );
}

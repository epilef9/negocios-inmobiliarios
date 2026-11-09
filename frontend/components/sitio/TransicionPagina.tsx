'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

declare global {
  interface Window {
    // Lo deja SmoothScroll para poder frenar el scroll con inercia mientras cambia la página
    __lenis?: { stop(): void; start(): void; scrollTo(destino: number, opciones?: { immediate?: boolean; force?: boolean }): void };
  }
}

// Cambio entre páginas con la misma persiana de la portada: al tocar un enlace las tablillas bajan una por una
// y tapan la página; en la nueva se abren desde abajo y la descubren. La barra de arriba queda siempre a la vista.

const TABLILLAS = 12;
// En el celular la persiana completa tardaba casi 2 segundos: ahí dura bastante menos
const rapido = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 640px), (pointer: coarse)').matches;
const ms = (normal: number) => (rapido() ? Math.round(normal * 0.5) : normal);
const CIERRE_MS = () => ms(800);
const APERTURA_MS = () => ms(1100);
const ESCALON_MS = () => ms(55);
const PAUSA_MS = () => ms(120);
const CURVA = 'cubic-bezier(0.87, 0, 0.13, 1)'; // como el expo.inOut de la portada

// Lo que pasa de una página a la otra: que se llegó con la persiana cerrada
let enCurso: { hora: number } | null = null;
let ocupado = false;

// Mientras dura el cambio no se puede scrollear
const bloquear = (e: Event) => {
  e.preventDefault();
  e.stopPropagation();
};
function bloquearScroll(activo: boolean) {
  const accion = activo ? window.addEventListener : window.removeEventListener;
  accion('wheel', bloquear, { capture: true, passive: false } as AddEventListenerOptions);
  accion('touchmove', bloquear, { capture: true, passive: false } as AddEventListenerOptions);
}

const tablillasDe = (persiana: HTMLElement) => Array.from(persiana.children) as HTMLElement[];

export default function TransicionPagina({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const caja = useRef<HTMLDivElement>(null);
  const persiana = useRef<HTMLDivElement>(null);

  // Entrada: si se llegó con la persiana cerrada, se abre tablilla por tablilla desde abajo
  useLayoutEffect(() => {
    const el = caja.current;
    const capa = persiana.current;
    if (!el || !capa) return;

    const llegada = enCurso && Date.now() - enCurso.hora < 6000 ? enCurso : null;
    enCurso = null;

    if (!llegada) {
      // Primera carga o botón "atrás" del navegador: aparece suave, sin persiana
      ocupado = false;
      const limpiar = (e: AnimationEvent) => {
        if (e.target === el) el.classList.remove('pagina-entra');
      };
      el.addEventListener('animationend', limpiar);
      return () => el.removeEventListener('animationend', limpiar);
    }

    ocupado = true;
    bloquearScroll(true);
    el.classList.remove('pagina-entra');
    capa.style.visibility = 'visible';

    const tablillas = tablillasDe(capa);
    const animaciones = tablillas.map((tablilla, i) =>
      tablilla.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(0)' }], {
        duration: APERTURA_MS(),
        delay: ms(150) + (tablillas.length - 1 - i) * ESCALON_MS(),
        easing: CURVA,
        fill: 'both',
      }),
    );
    // El contenido acompaña subiendo apenas mientras se abre
    animaciones.push(
      el.animate([{ transform: 'translateY(36px)' }, { transform: 'none' }], {
        duration: APERTURA_MS() + ms(700), delay: ms(150), easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards',
      }),
    );

    let vivo = true;
    let terminada = false;
    Promise.all(animaciones.map((a) => a.finished))
      .then(() => {
        if (!vivo) return;
        terminada = true;
        capa.style.visibility = '';
        animaciones.forEach((a) => a.cancel());
      })
      .catch(() => {})
      .finally(() => {
        if (!vivo) return;
        ocupado = false;
        bloquearScroll(false);
      });

    return () => {
      vivo = false;
      animaciones.forEach((a) => a.cancel());
      bloquearScroll(false);
      ocupado = false;
      if (!terminada) {
        // Se desmontó a mitad de camino (en desarrollo React monta dos veces): se deja todo como estaba
        // y se vuelve a guardar el cambio para que la próxima vez arranque de nuevo
        capa.style.visibility = '';
        enCurso = llegada;
      }
    };
  }, []);

  // Salida: se intercepta el clic antes que el Link de Next; el Link ve el evento cancelado y no navega solo
  useEffect(() => {
    let temporizador: ReturnType<typeof setTimeout> | undefined;

    const alHacerClic = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const enlace = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!enlace || (enlace.target && enlace.target !== '_self') || enlace.hasAttribute('download')) return;
      if (enlace.dataset.sinTransicion !== undefined) return;

      const destino = new URL(enlace.href, location.href);
      if (destino.origin !== location.origin) return;
      // Mismo lugar con otros filtros o un ancla: sin animación
      if (destino.pathname === location.pathname) return;

      const capa = persiana.current;
      if (!capa) return;

      e.preventDefault();
      if (ocupado) return;
      const ruta = destino.pathname + destino.search + destino.hash;
      router.prefetch(ruta);

      if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        router.push(ruta);
        return;
      }

      ocupado = true;
      window.__lenis?.stop();
      bloquearScroll(true);
      capa.style.visibility = 'visible';

      // Las tablillas bajan de a una, desde arriba, hasta tapar todo
      const tablillas = tablillasDe(capa);
      tablillas.forEach((tablilla, i) =>
        tablilla.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], {
          duration: CIERRE_MS(),
          delay: i * ESCALON_MS(),
          easing: CURVA,
          fill: 'both',
        }),
      );

      temporizador = setTimeout(() => {
        // Ya está todo tapado: se vuelve arriba de todo sin que se note y se cambia de página
        window.__lenis?.scrollTo(0, { immediate: true, force: true });
        window.scrollTo(0, 0);
        enCurso = { hora: Date.now() };
        bloquearScroll(false);
        router.push(ruta, { scroll: false });
      }, CIERRE_MS() + (tablillas.length - 1) * ESCALON_MS() + PAUSA_MS());
    };

    window.addEventListener('click', alHacerClic, true);
    return () => {
      window.removeEventListener('click', alHacerClic, true);
      if (temporizador) clearTimeout(temporizador);
    };
  }, [router]);

  return (
    <>
      {/* Persiana del cambio de página (la misma de la portada); la barra de arriba queda por encima */}
      <div ref={persiana} aria-hidden="true" className="transicion-persiana">
        {Array.from({ length: TABLILLAS }, (_, i) => (
          <span key={i} />
        ))}
      </div>
      <div ref={caja} className="pagina-entra">
        {children}
      </div>
    </>
  );
}

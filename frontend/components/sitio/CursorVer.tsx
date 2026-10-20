'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

// Círculo "Ver" que sigue al mouse sobre las propiedades. Solo con mouse, nunca en pantallas táctiles.
export default function CursorVer() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apto = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    if (!apto.matches) return;

    gsap.set(el, { xPercent: -50, yPercent: -50, scale: 0, autoAlpha: 0 });
    const xTo = gsap.quickTo(el, 'x', { duration: 0.55, ease: 'power3' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.55, ease: 'power3' });
    let activo = false;

    const mover = (evento: PointerEvent) => {
      xTo(evento.clientX);
      yTo(evento.clientY);
      const sobre = Boolean((evento.target as Element | null)?.closest?.('[data-cursor="ver"]'));
      if (sobre !== activo) {
        activo = sobre;
        gsap.to(el, { scale: sobre ? 1 : 0, autoAlpha: sobre ? 1 : 0, duration: 0.5, ease: 'power3.out' });
      }
    };

    window.addEventListener('pointermove', mover);
    return () => window.removeEventListener('pointermove', mover);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="calma-micro pointer-events-none invisible fixed left-0 top-0 z-[60] flex h-24 w-24 items-center justify-center rounded-full bg-[#efe9df] text-[#071733] opacity-0"
    >
      Ver
    </div>
  );
}

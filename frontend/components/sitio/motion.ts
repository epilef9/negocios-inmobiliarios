'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

let registrado = false;

export function registrarGsap() {
  if (registrado || typeof window === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger, SplitText);
  registrado = true;
}

export const SIN_MOVIMIENTO_REDUCIDO = '(prefers-reduced-motion: no-preference)';

// Anima lo que esté marcado con data-reveal dentro de `raiz`:
//  - "lineas": el texto entra renglón por renglón desde abajo
//  - "suave":  aparece subiendo apenas
//  - "imagen": se descubre como una cortina; si adentro hay [data-parallax], esa imagen se mueve con el scroll
export function animarRevelados(raiz: HTMLElement) {
  registrarGsap();
  const mm = gsap.matchMedia();

  mm.add(SIN_MOVIMIENTO_REDUCIDO, () => {
    raiz.querySelectorAll<HTMLElement>('[data-reveal="lineas"]').forEach((el) => {
      SplitText.create(el, {
        type: 'lines',
        // Solo se parte en renglones: el texto queda entero y se lee igual. Sin esto le pone aria-label al
        // elemento, que no está permitido en un <p>
        aria: 'none',
        mask: 'lines',
        autoSplit: true,
        onSplit(self) {
          gsap.set(el, { visibility: 'visible' });
          return gsap.from(self.lines, {
            yPercent: 110,
            duration: 1.2,
            ease: 'expo.out',
            stagger: 0.09,
            scrollTrigger: { trigger: el, start: 'top 85%', once: true },
          });
        },
      });
    });

    raiz.querySelectorAll<HTMLElement>('[data-reveal="suave"]').forEach((el) => {
      gsap.from(el, {
        autoAlpha: 0,
        y: 28,
        duration: 1.1,
        ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
    });

    raiz.querySelectorAll<HTMLElement>('[data-reveal="imagen"]').forEach((el) => {
      gsap.fromTo(
        el,
        { clipPath: 'inset(100% 0% 0% 0%)', visibility: 'visible' },
        {
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 1.6,
          ease: 'expo.inOut',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        }
      );
      const imagen = el.querySelector<HTMLElement>('[data-parallax]');
      if (imagen) {
        gsap.fromTo(
          imagen,
          { yPercent: -7, scale: 1.16 },
          { yPercent: 7, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } }
        );
      }
    });
  });

  return () => mm.revert();
}

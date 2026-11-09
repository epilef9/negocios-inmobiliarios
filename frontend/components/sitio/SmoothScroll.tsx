'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { registrarGsap } from './motion';

// Scroll con inercia (Lenis) sincronizado con las animaciones de GSAP
export default function SmoothScroll() {
  useEffect(() => {
    // Tema de la barra de scroll solo mientras se ve el Home
    document.documentElement.classList.add('home-calma');
    const quitarTema = () => document.documentElement.classList.remove('home-calma');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return quitarTema;
    registrarGsap();

    const lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    // El cambio de página lo usa para frenar la inercia mientras la tarjeta se va
    window.__lenis = lenis;

    // Cuando cambia el alto de la página (llegan las propiedades, cargan fuentes o fotos):
    //  - Lenis vuelve a medir hasta dónde se puede bajar. Si no, la rueda del mouse se frenaba a mitad
    //    del catálogo (solo se podía seguir con la barra de la derecha).
    //  - GSAP recalcula dónde arranca cada animación, para que ninguna quede sin dispararse.
    let espera: ReturnType<typeof setTimeout> | undefined;
    const remedir = () => {
      lenis.resize();
      clearTimeout(espera);
      espera = setTimeout(() => {
        ScrollTrigger.refresh();
        lenis.resize();
      }, 150);
    };
    const observador = new ResizeObserver(remedir);
    observador.observe(document.body);
    document.querySelectorAll('main').forEach((principal) => observador.observe(principal));
    window.addEventListener('load', remedir);
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (tiempo: number) => lenis.raf(tiempo * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      observador.disconnect();
      window.removeEventListener('load', remedir);
      clearTimeout(espera);
      lenis.destroy();
      if (window.__lenis === lenis) delete window.__lenis;
      quitarTema();
    };
  }, []);

  return null;
}

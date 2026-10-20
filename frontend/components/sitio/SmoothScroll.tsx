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

    // Cuando cambia el alto de la página (llegan las propiedades, cargan fuentes o fotos),
    // recalcular dónde arranca cada animación para que ninguna quede sin dispararse
    let espera: ReturnType<typeof setTimeout> | undefined;
    const observador = new ResizeObserver(() => {
      clearTimeout(espera);
      espera = setTimeout(() => ScrollTrigger.refresh(), 150);
    });
    observador.observe(document.body);

    const lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (tiempo: number) => lenis.raf(tiempo * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      observador.disconnect();
      clearTimeout(espera);
      lenis.destroy();
      quitarTema();
    };
  }, []);

  return null;
}

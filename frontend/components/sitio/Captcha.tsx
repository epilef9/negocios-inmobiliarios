'use client';

import { useEffect, useRef } from 'react';

// 304: verificación «no soy un robot» con Cloudflare Turnstile. Solo aparece si está la clave pública
// (NEXT_PUBLIC_TURNSTILE_SITE_KEY); sin ella no se muestra y el servidor tampoco la pide.
// Importante: la clave pública y la secreta (TURNSTILE_SECRET_KEY, en el backend) se configuran juntas.

type Turnstile = {
  render: (el: HTMLElement, opciones: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

export const CLAVE_CAPTCHA = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let cargando: Promise<void> | null = null;
const cargarScript = () => {
  if (window.turnstile) return Promise.resolve();
  cargando ??= new Promise<void>((listo, fallo) => {
    const s = document.createElement('script');
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => listo();
    s.onerror = () => {
      cargando = null;
      fallo(new Error('No se pudo cargar la verificación'));
    };
    document.head.appendChild(s);
  });
  return cargando;
};

export default function Captcha({ alResolver, reinicio = 0 }: { alResolver: (token: string) => void; reinicio?: number }) {
  const caja = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const callback = useRef(alResolver);
  useEffect(() => {
    callback.current = alResolver;
  }, [alResolver]);

  useEffect(() => {
    if (!CLAVE_CAPTCHA || !caja.current) return;
    let activo = true;
    cargarScript()
      .then(() => {
        if (!activo || !caja.current || !window.turnstile) return;
        widget.current = window.turnstile.render(caja.current, {
          sitekey: CLAVE_CAPTCHA,
          theme: 'dark',
          language: 'es',
          callback: (token: string) => callback.current(token),
          'expired-callback': () => callback.current(''),
          'error-callback': () => callback.current(''),
        });
      })
      .catch(() => {});
    return () => {
      activo = false;
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
      widget.current = null;
    };
  }, []);

  // Después de un envío fallido el token ya se usó: se pide uno nuevo
  useEffect(() => {
    if (reinicio && widget.current && window.turnstile) {
      window.turnstile.reset(widget.current);
      callback.current('');
    }
  }, [reinicio]);

  if (!CLAVE_CAPTCHA) return null;
  return <div ref={caja} className="min-h-[65px]" />;
}

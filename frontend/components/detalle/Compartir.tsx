'use client';

import { useState } from 'react';

// Compartir la propiedad: en el celular abre el menú del teléfono; si no, WhatsApp y copiar el link.
// La foto, el título y el precio que se ven al pegar el link salen de los metadatos de la página (servidor).
export default function Compartir({ titulo, resumen }: { titulo: string; resumen: string }) {
  const [copiado, setCopiado] = useState(false);
  const [abierto, setAbierto] = useState(false);

  const enlace = () => (typeof window !== 'undefined' ? window.location.href.split('#')[0] : '');

  const compartir = async () => {
    const url = enlace();
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: titulo, text: resumen, url });
        return;
      } catch (e) {
        // Si la persona cerró el menú no hay que hacer nada; si falló, se muestran las otras opciones
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }
    setAbierto((a) => !a);
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(enlace());
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      window.prompt('Copiá el link:', enlace());
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={compartir}
        aria-expanded={abierto}
        className="calma-micro flex items-center justify-center gap-2.5 rounded-full border border-[#efe9df]/40 px-6 py-4 text-[12px] transition-colors hover:border-[#efe9df]"
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 10V2M5 5l3-3 3 3M3 9v4h10V9" />
        </svg>
        Compartir
      </button>
      {abierto && (
        <div className="calma-aparecer flex flex-wrap justify-center gap-x-6 gap-y-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${titulo} · ${resumen}\n${enlace()}`)}`}
            target="_blank"
            rel="noreferrer"
            className="calma-micro calma-link text-[12px]"
          >
            Por WhatsApp
          </a>
          <button type="button" onClick={copiar} className="calma-micro calma-link cursor-pointer text-[12px]" aria-live="polite">
            {copiado ? 'Link copiado' : 'Copiar link'}
          </button>
        </div>
      )}
    </div>
  );
}

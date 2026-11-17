'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// Pregunta antes de salir de una página con un formulario a medio cargar (por ejemplo, publicar una propiedad),
// porque al irse se pierde lo cargado, fotos y documentos incluidos.
// Uso: const dialogoAlSalir = useAvisoAlSalir(hayDatosCargados);  →  {dialogoAlSalir} dentro de la página
// - Recargar o cerrar la pestaña: lo avisa el navegador con su propio cartel (no deja personalizarlo).
// - Enlaces del sitio (menú, logo, etc.): Next cambia de página sin recargar, así que se atajan los clics
//   y se muestra el diálogo con el estilo del sitio, igual al de cerrar sesión.

// La animación de cambio de página (TransicionPagina) ataja los clics antes que nadie: antes de navegar
// pregunta acá. Si hay un formulario a medio cargar, se abre el diálogo y la animación no arranca.
let retener: ((ruta: string) => void) | null = null;
export function salidaRetenida(ruta: string) {
  if (!retener) return false;
  retener(ruta);
  return true;
}

export function useAvisoAlSalir(activo: boolean) {
  const router = useRouter();
  const [destino, setDestino] = useState<string | null>(null);
  const dialogo = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!activo) return;

    const alDescargar = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    const alTocar = (e: MouseEvent) => {
      // Solo clics comunes: con Ctrl, Shift o la rueda se abre otra pestaña y no se pierde nada
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const enlace = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!enlace || (enlace.target && enlace.target !== '_self') || enlace.hasAttribute('download')) return;
      const url = new URL(enlace.href, location.href);
      // Enlaces a otros sitios recargan la página: de esos se encarga el aviso del navegador
      if (url.origin !== location.origin) return;
      // Un ancla dentro de la misma página no sale de ella
      if (url.pathname === location.pathname && url.search === location.search) return;
      e.preventDefault();
      e.stopPropagation();
      setDestino(url.pathname + url.search + url.hash);
    };

    retener = setDestino;
    window.addEventListener('beforeunload', alDescargar);
    // En captura: se ataja el clic antes de que el enlace de Next cambie de página
    // (cubre los enlaces que la animación deja pasar, por ejemplo los marcados sin transición)
    document.addEventListener('click', alTocar, true);
    return () => {
      retener = null;
      window.removeEventListener('beforeunload', alDescargar);
      document.removeEventListener('click', alTocar, true);
    };
  }, [activo]);

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (destino && !d.open) d.showModal();
    if (!destino && d.open) d.close();
  }, [destino]);

  const salir = () => {
    if (!destino) return;
    const ir = destino;
    setDestino(null);
    router.push(ir);
  };

  return (
    <dialog
      ref={dialogo}
      aria-labelledby="aviso-al-salir-titulo"
      onClose={() => setDestino(null)}
      onClick={(e) => e.target === e.currentTarget && setDestino(null)}
      className="m-auto w-[min(92vw,440px)] rounded-2xl text-left text-[15px] font-normal normal-case tracking-normal border border-[#efe9df]/15 bg-[#0b1f40] p-0 text-[#efe9df] shadow-2xl backdrop:bg-[#071733]/70 backdrop:backdrop-blur-sm"
    >
      <div className="flex flex-col gap-6 p-7">
        <div className="flex flex-col gap-2">
          <h2 id="aviso-al-salir-titulo" className="font-display m-0 text-[30px] font-normal leading-none">
            ¿Salir sin enviar la solicitud?
          </h2>
          <p className="m-0 text-[15px] leading-relaxed text-[#efe9df]/70">
            Si salís de esta página se pierde lo que cargaste en el formulario, incluidas las fotos y los documentos.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            autoFocus
            onClick={() => setDestino(null)}
            className="calma-micro rounded-full bg-[#efe9df] px-5 py-3 text-[12px] text-[#071733] transition-colors hover:bg-white"
          >
            Seguir cargando
          </button>
          <button
            type="button"
            onClick={salir}
            className="calma-micro rounded-full px-5 py-3 text-[12px] text-[#efe9df]/80 ring-1 ring-inset ring-[#efe9df]/30 transition-colors hover:text-[#efe9df] hover:ring-[#efe9df]/60"
          >
            Salir igual
          </button>
        </div>
      </div>
    </dialog>
  );
}

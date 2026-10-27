'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

// Páginas que solo tienen sentido con la sesión iniciada: al salir desde una de ellas se vuelve al inicio
const PRIVADAS = ['/perfil', '/reservas', '/visitas', '/solicitudes', '/mis-publicaciones', '/avisos', '/favoritos', '/admin', '/publicar'];
export const AVISO_SALIDA = 'sesion_cerrada';

// HU-32: antes de cerrar la sesión se pregunta, para que un toque sin querer no saque al usuario de su cuenta.
// Uso: const { pedirSalida, dialogoSalida } = useConfirmarSalida();  →  onClick={pedirSalida} y {dialogoSalida}
// Es un <dialog> nativo: atrapa el foco, se cierra con Esc y devuelve el foco al botón que lo abrió.
export function useConfirmarSalida() {
  const { logout } = useAuth();
  const router = useRouter();
  const ruta = usePathname() ?? '';
  const [abierto, setAbierto] = useState(false);
  const dialogo = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);

  const pedirSalida = useCallback(() => setAbierto(true), []);
  const confirmar = () => {
    setAbierto(false);
    // El inicio muestra «Cerraste sesión» un momento (ver AvisoSalida)
    try {
      sessionStorage.setItem(AVISO_SALIDA, '1');
    } catch {
      // sin almacenamiento: no se muestra el aviso
    }
    if (PRIVADAS.some((p) => ruta === p || ruta.startsWith(`${p}/`))) router.replace('/');
    logout();
  };

  const dialogoSalida = (
    <dialog
      ref={dialogo}
      aria-labelledby="confirmar-salida-titulo"
      onClose={() => setAbierto(false)}
      onClick={(e) => e.target === e.currentTarget && setAbierto(false)}
      className="m-auto w-[min(92vw,420px)] rounded-2xl text-left text-[15px] font-normal normal-case tracking-normal border border-[#efe9df]/15 bg-[#0b1f40] p-0 text-[#efe9df] shadow-2xl backdrop:bg-[#071733]/70 backdrop:backdrop-blur-sm"
    >
      <div className="flex flex-col gap-6 p-7">
        <div className="flex flex-col gap-2">
          <h2 id="confirmar-salida-titulo" className="font-display m-0 text-[30px] font-normal leading-none">
            ¿Cerrar sesión?
          </h2>
          <p className="m-0 text-[15px] leading-relaxed text-[#efe9df]/70">Para ver tus reservas, visitas y solicitudes vas a tener que ingresar de nuevo.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            autoFocus
            onClick={() => setAbierto(false)}
            className="calma-micro rounded-full px-5 py-3 text-[12px] text-[#efe9df]/80 ring-1 ring-inset ring-[#efe9df]/30 transition-colors hover:text-[#efe9df] hover:ring-[#efe9df]/60"
          >
            Seguir en mi cuenta
          </button>
          <button
            type="button"
            onClick={confirmar}
            className="calma-micro rounded-full bg-[#efe9df] px-5 py-3 text-[12px] text-[#071733] transition-colors hover:bg-white"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </dialog>
  );

  return { pedirSalida, dialogoSalida };
}

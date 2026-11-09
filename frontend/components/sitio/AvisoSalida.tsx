'use client';

import { useEffect, useState } from 'react';
import { AVISO_SALIDA } from './ConfirmarSalida';

// Aviso breve después de cerrar sesión, en vez de dejar a la persona en una página de la cuenta vacía
export default function AvisoSalida() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let marcado = false;
    try {
      marcado = sessionStorage.getItem(AVISO_SALIDA) === '1';
      sessionStorage.removeItem(AVISO_SALIDA);
    } catch {
      // sin almacenamiento
    }
    if (!marcado) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage solo existe en el navegador
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;
  return (
    <div role="status" className="calma-aparecer pointer-events-none fixed inset-x-0 top-36 z-[60] flex justify-center px-4">
      <p className="m-0 rounded-full border border-[#efe9df]/20 bg-[#0b1f40]/95 px-5 py-3 text-[14px] font-normal normal-case tracking-normal text-[#efe9df] shadow-2xl backdrop-blur">
        Cerraste sesión. ¡Hasta pronto!
      </p>
    </div>
  );
}

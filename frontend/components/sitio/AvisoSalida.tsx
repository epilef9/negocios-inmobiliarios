'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AVISO_INGRESO, AVISO_SALIDA, tomarAviso } from './avisosSesion';

// Aviso breve al cerrar sesión («Cerraste sesión») o al volver a ingresar («Hola de nuevo, Lucía»).
// «Cerraste sesión» solo se muestra si de verdad no hay sesión: si alguien salió desde el panel y entró con
// otra cuenta, el saludo reemplaza a la despedida.
export default function AvisoSalida() {
  const { user, isLoading } = useAuth();
  const [texto, setTexto] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    const ingreso = tomarAviso(AVISO_INGRESO);
    const salida = tomarAviso(AVISO_SALIDA);
    let mensaje: string | null = null;
    if (user && ingreso) mensaje = ingreso.nombre ? `¡Hola de nuevo, ${ingreso.nombre}!` : '¡Hola de nuevo!';
    else if (!user && salida) mensaje = 'Cerraste sesión. ¡Hasta pronto!';
    if (!mensaje) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage solo existe en el navegador
    setTexto(mensaje);
    const t = setTimeout(() => setTexto(null), 4000);
    return () => clearTimeout(t);
    // Se decide una vez, cuando se sabe si hay sesión
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  if (!texto) return null;
  return (
    <div role="status" className="calma-aparecer pointer-events-none fixed inset-x-0 top-36 z-[60] flex justify-center px-4">
      <p className="m-0 rounded-full border border-[#efe9df]/20 bg-[#0b1f40]/95 px-5 py-3 text-[14px] font-normal normal-case tracking-normal text-[#efe9df] shadow-2xl backdrop-blur">
        {texto}
      </p>
    </div>
  );
}

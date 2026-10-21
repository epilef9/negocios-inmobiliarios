'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import PantallaCuenta, { botonPrincipal } from '@/components/cuenta/PantallaCuenta';

// Destino del enlace del mail: confirma el email y deja la sesión iniciada
function Confirmacion() {
  const token = useSearchParams().get('token');
  const { verifyEmail } = useAuth();
  const [estado, setEstado] = useState<'verificando' | 'listo' | 'error'>(token ? 'verificando' : 'error');
  const [mensaje, setMensaje] = useState(token ? '' : 'Falta el enlace de verificación. Abrilo de nuevo desde el mail.');
  // El enlace se usa una sola vez: evita que el doble render de desarrollo lo gaste dos veces
  const usado = useRef(false);

  useEffect(() => {
    if (!token || usado.current) return;
    usado.current = true;
    verifyEmail(token)
      .then(() => setEstado('listo'))
      .catch((err) => {
        setMensaje(err instanceof Error ? err.message : 'No pudimos confirmar tu email.');
        setEstado('error');
      });
  }, [token, verifyEmail]);

  if (estado === 'verificando') {
    return (
      <p role="status" className="m-0 text-[17px] text-[#efe9df]/80">
        Confirmando tu email…
      </p>
    );
  }

  if (estado === 'listo') {
    return (
      <div role="status" className="flex flex-col gap-6 border-t border-[#efe9df]/20 pt-8">
        <p className="m-0 text-[17px] leading-relaxed">Listo, tu email quedó confirmado y ya ingresaste.</p>
        <Link href="/propiedades" className={`${botonPrincipal} w-auto self-start`}>
          Ver propiedades
        </Link>
      </div>
    );
  }

  return (
    <div role="alert" className="flex flex-col gap-6 border-t border-[#efe9df]/20 pt-8">
      <p className="m-0 text-[17px] leading-relaxed text-[#ff8a7d]">{mensaje}</p>
      <Link href="/login" className={`${botonPrincipal} w-auto self-start`}>
        Ir a ingresar
      </Link>
    </div>
  );
}

export default function VerificarEmailPage() {
  return (
    <PantallaCuenta titulo="Tu email." bajada="Un paso y tu cuenta queda activa.">
      <Suspense fallback={null}>
        <Confirmacion />
      </Suspense>
    </PantallaCuenta>
  );
}

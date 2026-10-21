'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { confirmarCambioEmail } from '@/services/auth';
import PantallaCuenta, { botonPrincipal } from '@/components/cuenta/PantallaCuenta';

// Destino del enlace que llega al email nuevo: lo confirma y deja la sesión iniciada con ese email
function Confirmacion() {
  const token = useSearchParams().get('token');
  const { actualizarUsuario } = useAuth();
  const [estado, setEstado] = useState<'confirmando' | 'listo' | 'error'>(token ? 'confirmando' : 'error');
  const [mensaje, setMensaje] = useState(token ? '' : 'Falta el enlace. Abrilo de nuevo desde el mail.');
  const [email, setEmail] = useState('');
  // El enlace se usa una sola vez: evita que el doble render de desarrollo lo gaste dos veces
  const usado = useRef(false);

  useEffect(() => {
    if (!token || usado.current) return;
    usado.current = true;
    confirmarCambioEmail(token)
      .then((respuesta) => {
        actualizarUsuario(respuesta.user);
        setEmail(respuesta.user.email);
        setEstado('listo');
      })
      .catch((err) => {
        setMensaje(err instanceof Error && !/fetch/i.test(err.message) ? err.message : 'No pudimos conectar con el servidor. Probá de nuevo en un momento.');
        setEstado('error');
      });
  }, [token, actualizarUsuario]);

  if (estado === 'confirmando') {
    return (
      <p role="status" className="m-0 text-[17px] text-[#efe9df]/80">
        Confirmando tu email nuevo…
      </p>
    );
  }

  if (estado === 'listo') {
    return (
      <div role="status" className="flex flex-col gap-6 border-t border-[#efe9df]/20 pt-8">
        <p className="m-0 text-[17px] leading-relaxed">
          Listo, desde ahora ingresás con <strong className="font-semibold">{email}</strong>. Cerramos las sesiones que tenías abiertas en otros dispositivos.
        </p>
        <Link href="/perfil" className={`${botonPrincipal} w-auto self-start`}>
          Ir a mi cuenta
        </Link>
      </div>
    );
  }

  return (
    <div role="alert" className="flex flex-col gap-6 border-t border-[#efe9df]/20 pt-8">
      <p className="m-0 text-[17px] leading-relaxed text-[#ff8a7d]">{mensaje}</p>
      <Link href="/perfil" className={`${botonPrincipal} w-auto self-start`}>
        Ir a mi cuenta
      </Link>
    </div>
  );
}

export default function ConfirmarEmailPage() {
  return (
    <PantallaCuenta titulo="Tu email nuevo." bajada="Confirmamos que esta casilla es tuya.">
      <Suspense fallback={null}>
        <Confirmacion />
      </Suspense>
    </PantallaCuenta>
  );
}

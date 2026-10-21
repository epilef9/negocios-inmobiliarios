'use client';

import { Suspense, useId, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { solicitarRestablecimiento } from '@/services/auth';
import PantallaCuenta, { EnlaceDeDesarrollo, botonPrincipal, control, etiqueta } from '@/components/cuenta/PantallaCuenta';

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Pedir el enlace para elegir una contraseña nueva. La respuesta es la misma exista o no la cuenta.
function FormularioOlvido() {
  const id = useId();
  const sugerido = useSearchParams().get('email') ?? '';
  const [email, setEmail] = useState(EMAIL_VALIDO.test(sugerido) ? sugerido : '');
  const [estado, setEstado] = useState<'editando' | 'enviando' | 'enviado'>('editando');
  const [error, setError] = useState('');
  const [enlaceDev, setEnlaceDev] = useState<string>();

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!EMAIL_VALIDO.test(email.trim())) {
      setError('Escribí el email con el que ingresás, por ejemplo nombre@email.com.');
      return;
    }
    setError('');
    setEstado('enviando');
    try {
      const respuesta = await solicitarRestablecimiento(email.trim());
      setEnlaceDev(respuesta.enlaceDev);
      setEstado('enviado');
    } catch (err) {
      setEstado('editando');
      setError(err instanceof Error && !/fetch/i.test(err.message) ? err.message : 'No pudimos conectar con el servidor. Probá de nuevo en un momento.');
    }
  };

  if (estado === 'enviado') {
    return (
      <div role="status" className="flex flex-col gap-6 border-t border-[#efe9df]/20 pt-8">
        <p className="m-0 text-[17px] leading-relaxed">
          Si hay una cuenta con <strong className="font-semibold">{email.trim()}</strong>, te llega un mail con un enlace para elegir la contraseña nueva. Vale 30 minutos.
        </p>
        <p className="m-0 text-[15px] text-[#efe9df]/70">¿No lo ves? Revisá la carpeta de spam o pedilo de nuevo en un minuto.</p>
        {enlaceDev && <EnlaceDeDesarrollo enlace={enlaceDev} para="elegir la contraseña nueva" accion="Elegir contraseña nueva" />}
        <Link href="/login" className="calma-link self-start text-[15px] text-[#efe9df]">
          Volver a ingresar
        </Link>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={enviar} className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-email`} className={etiqueta}>
          Email
        </label>
        <input
          id={`${id}-email`}
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError('');
          }}
          aria-invalid={Boolean(error)}
          placeholder="nombre@email.com"
          className={control}
        />
      </div>
      {error && (
        <p role="alert" className="m-0 text-[15px] leading-relaxed text-[#ff8a7d]">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-6">
        <button type="submit" disabled={estado === 'enviando'} className={botonPrincipal}>
          {estado === 'enviando' ? 'Enviando…' : 'Mandarme el enlace'}
        </button>
        <Link href="/login" className="calma-link self-start text-[15px] text-[#efe9df]/80">
          Me acordé, volver a ingresar
        </Link>
      </div>
    </form>
  );
}

export default function OlvideContrasenaPage() {
  return (
    <PantallaCuenta titulo="Tu contraseña." bajada="Te mandamos un enlace a tu email para que elijas una nueva.">
      <Suspense fallback={null}>
        <FormularioOlvido />
      </Suspense>
    </PantallaCuenta>
  );
}

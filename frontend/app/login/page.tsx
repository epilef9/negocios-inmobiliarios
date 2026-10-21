'use client';

import { Suspense, useId, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AuthRequestError } from '@/services/auth';
import PantallaCuenta, { BotonVerPassword, ReenviarVerificacion, YaIngresaste, botonPrincipal, control, destinoSeguro, etiqueta } from '@/components/cuenta/PantallaCuenta';

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function FormularioIngreso() {
  const id = useId();
  const router = useRouter();
  const volver = destinoSeguro(useSearchParams().get('volver'));
  const { user, isLoading, login, logout } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [sinVerificar, setSinVerificar] = useState(false);
  const [error, setError] = useState<{ texto: string; campo?: 'email' | 'password' } | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Recuperar la contraseña: se pide un enlace por mail (si ya escribió el email, va cargado)
  const recuperar = EMAIL_VALIDO.test(email.trim()) ? `/olvide-contrasena?email=${encodeURIComponent(email.trim())}` : '/olvide-contrasena';

  const ingresar = async (e: FormEvent) => {
    e.preventDefault();
    if (!EMAIL_VALIDO.test(email.trim())) {
      setError({ texto: 'Escribí un email válido, por ejemplo nombre@email.com.', campo: 'email' });
      return;
    }
    if (!password) {
      setError({ texto: 'Escribí tu contraseña.', campo: 'password' });
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      const usuario = await login({ email: email.trim(), password });
      router.push(volver ?? (usuario.role === 'admin' ? '/admin/bienvenida' : '/'));
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : '';
      if (err instanceof AuthRequestError && err.code === 'EMAIL_NO_VERIFICADO') {
        setSinVerificar(true);
        setError({ texto: 'Falta confirmar tu email. Te mandamos un enlace al registrarte; si no te llegó, pedilo de nuevo.' });
        setEnviando(false);
        return;
      }
      setSinVerificar(false);
      if (err instanceof AuthRequestError && (err.status === 429 || err.status >= 500)) {
        setError({ texto: mensaje });
        setEnviando(false);
        return;
      }
      setError({
        texto: /fetch|network|conectar/i.test(mensaje)
          ? 'No pudimos conectar con el servidor. Probá de nuevo en un momento.'
          : 'El email o la contraseña no coinciden. Revisalos e intentá de nuevo.',
      });
      setEnviando(false);
    }
  };

  if (!isLoading && user && !enviando) {
    return <YaIngresaste nombre={user.nombre || user.email} onSalir={logout} />;
  }

  return (
    <form noValidate onSubmit={ingresar} className="flex flex-col gap-8">
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
            setError(null);
          }}
          aria-invalid={error?.campo === 'email'}
          placeholder="nombre@email.com"
          className={control}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor={`${id}-password`} className={etiqueta}>
            Contraseña
          </label>
          <Link href={recuperar} className="calma-link calma-link-sutil text-[14px] text-[#efe9df]/70 hover:text-[#efe9df]">
            ¿La olvidaste?
          </Link>
        </div>
        <div className="relative">
          <input
            id={`${id}-password`}
            type={verPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            aria-invalid={error?.campo === 'password'}
            className={`${control} pr-12`}
          />
          <BotonVerPassword visible={verPassword} alCambiar={() => setVerPassword((v) => !v)} className="absolute bottom-1.5 right-0" />
        </div>
      </div>

      {error && (
        <p role="alert" className="m-0 text-[15px] leading-relaxed text-[#ff8a7d]">
          {error.texto}
        </p>
      )}
      {sinVerificar && <ReenviarVerificacion email={email.trim()} />}

      <div className="flex flex-col gap-6">
        <button type="submit" disabled={enviando} className={botonPrincipal}>
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
        <p className="m-0 text-[15px] text-[#efe9df]/70">
          ¿Todavía no tenés cuenta?{' '}
          <Link href={volver ? `/register?volver=${encodeURIComponent(volver)}` : '/register'} className="calma-link text-[#efe9df]">
            Creá tu cuenta
          </Link>
        </p>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <PantallaCuenta titulo="Hola de nuevo." bajada="Ingresá para ver tus favoritos y seguir donde dejaste.">
      <Suspense fallback={null}>
        <FormularioIngreso />
      </Suspense>
    </PantallaCuenta>
  );
}

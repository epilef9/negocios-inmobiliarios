'use client';

import { Suspense, useId, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import PantallaCuenta, { RevisaTuCorreo, YaIngresaste, botonPrincipal, control, destinoSeguro, etiqueta } from '@/components/cuenta/PantallaCuenta';

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MINIMO_PASSWORD = 8;

type Campo = 'nombre' | 'apellido' | 'telefono' | 'email' | 'password' | 'confirmPassword';
type Datos = Record<Campo, string>;

const VACIOS: Datos = { nombre: '', apellido: '', telefono: '', email: '', password: '', confirmPassword: '' };

// Revisa los datos antes de mandarlos; devuelve el primer problema con el campo a corregir
function revisar(datos: Datos): { texto: string; campo: Campo } | null {
  if (!datos.nombre.trim()) return { texto: 'Escribí tu nombre.', campo: 'nombre' };
  if (!datos.apellido.trim()) return { texto: 'Escribí tu apellido.', campo: 'apellido' };
  if (!EMAIL_VALIDO.test(datos.email.trim())) return { texto: 'Escribí un email válido, por ejemplo nombre@email.com.', campo: 'email' };
  if (datos.password.length < MINIMO_PASSWORD)
    return { texto: `La contraseña tiene que tener al menos ${MINIMO_PASSWORD} caracteres.`, campo: 'password' };
  if (datos.password !== datos.confirmPassword) return { texto: 'Las contraseñas no coinciden.', campo: 'confirmPassword' };
  return null;
}

function FormularioRegistro() {
  const id = useId();
  const volver = destinoSeguro(useSearchParams().get('volver'));
  const { user, isLoading, register, logout } = useAuth();

  const [datos, setDatos] = useState<Datos>(VACIOS);
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState<{ texto: string; campo?: Campo } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [pendiente, setPendiente] = useState<{ email: string; correoEnviado: boolean; enlaceDev?: string } | null>(null);

  const cambiar = (campo: Campo, valor: string) => {
    setDatos((anteriores) => ({ ...anteriores, [campo]: valor }));
    setError(null);
  };

  const crear = async (e: FormEvent) => {
    e.preventDefault();
    const problema = revisar(datos);
    if (problema) {
      setError(problema);
      document.getElementById(`${id}-${problema.campo}`)?.focus();
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      // La cuenta queda pendiente hasta confirmar el email que se manda al registrarse
      const resultado = await register({
        nombre: datos.nombre.trim(),
        apellido: datos.apellido.trim(),
        telefono: datos.telefono.trim(),
        email: datos.email.trim(),
        password: datos.password,
        confirmPassword: datos.confirmPassword,
      });
      setPendiente({ email: datos.email.trim(), correoEnviado: resultado.correoEnviado, enlaceDev: resultado.enlaceDev });
      setEnviando(false);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : '';
      if (/registrado|existe/i.test(mensaje)) {
        setError({ texto: 'Ya hay una cuenta con ese email. Probá ingresar con él.', campo: 'email' });
      } else if (/fetch|network|conectar/i.test(mensaje)) {
        setError({ texto: 'No pudimos conectar con el servidor. Probá de nuevo en un momento.' });
      } else {
        setError({ texto: mensaje || 'No pudimos crear la cuenta. Probá de nuevo.' });
      }
      setEnviando(false);
    }
  };

  if (pendiente) {
    return <RevisaTuCorreo email={pendiente.email} correoEnviado={pendiente.correoEnviado} enlaceDev={pendiente.enlaceDev} />;
  }

  if (!isLoading && user && !enviando) {
    return <YaIngresaste nombre={user.nombre || user.email} onSalir={logout} />;
  }

  const campo = (
    nombre: Campo,
    texto: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
    ayuda?: string,
  ) => (
    <div className="flex flex-col gap-2">
      <label htmlFor={`${id}-${nombre}`} className={etiqueta}>
        {texto}
      </label>
      <input
        id={`${id}-${nombre}`}
        value={datos[nombre]}
        onChange={(e) => cambiar(nombre, e.target.value)}
        aria-invalid={error?.campo === nombre}
        aria-describedby={ayuda ? `${id}-${nombre}-ayuda` : undefined}
        className={control}
        {...props}
      />
      {ayuda && (
        <p id={`${id}-${nombre}-ayuda`} className="m-0 text-[13px] text-[#efe9df]/55">
          {ayuda}
        </p>
      )}
    </div>
  );

  return (
    <form noValidate onSubmit={crear} className="flex flex-col gap-8">
      <div className="grid gap-8 sm:grid-cols-2 sm:gap-6">
        {campo('nombre', 'Nombre', { autoComplete: 'given-name' })}
        {campo('apellido', 'Apellido', { autoComplete: 'family-name' })}
      </div>
      {campo('email', 'Email', { type: 'email', autoComplete: 'email', inputMode: 'email', placeholder: 'nombre@email.com' })}
      {campo(
        'telefono',
        'Teléfono (opcional)',
        { type: 'tel', autoComplete: 'tel', inputMode: 'tel', placeholder: '343 444 4444' },
        'Lo usamos para confirmarte las visitas.',
      )}

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor={`${id}-password`} className={etiqueta}>
            Contraseña
          </label>
          <button
            type="button"
            onClick={() => setVerPassword((v) => !v)}
            aria-pressed={verPassword}
            className="calma-micro min-h-8 text-[#efe9df]/70 hover:text-[#efe9df]"
          >
            {verPassword ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
        <input
          id={`${id}-password`}
          type={verPassword ? 'text' : 'password'}
          autoComplete="new-password"
          value={datos.password}
          onChange={(e) => cambiar('password', e.target.value)}
          aria-invalid={error?.campo === 'password'}
          aria-describedby={`${id}-password-ayuda`}
          className={control}
        />
        <p id={`${id}-password-ayuda`} className="m-0 text-[13px] text-[#efe9df]/55">
          {datos.password.length >= MINIMO_PASSWORD
            ? 'Largo correcto.'
            : `Al menos ${MINIMO_PASSWORD} caracteres${datos.password ? ` (te faltan ${MINIMO_PASSWORD - datos.password.length})` : ''}.`}
        </p>
      </div>
      {campo('confirmPassword', 'Repetí la contraseña', { type: verPassword ? 'text' : 'password', autoComplete: 'new-password' })}

      {error && (
        <p role="alert" className="m-0 text-[15px] leading-relaxed text-[#ff8a7d]">
          {error.texto}
        </p>
      )}

      <div className="flex flex-col gap-6">
        <button type="submit" disabled={enviando} className={botonPrincipal}>
          {enviando ? 'Creando la cuenta…' : 'Crear cuenta'}
        </button>
        <p className="m-0 text-[15px] text-[#efe9df]/70">
          ¿Ya tenés cuenta?{' '}
          <Link href={volver ? `/login?volver=${encodeURIComponent(volver)}` : '/login'} className="calma-link text-[#efe9df]">
            Ingresá
          </Link>
        </p>
      </div>
    </form>
  );
}

export default function RegistroPage() {
  return (
    <PantallaCuenta titulo="Creá tu cuenta." bajada="Es gratis y te lleva un minuto. Te mandamos un mail para confirmar tu email y activar la cuenta.">
      <Suspense fallback={null}>
        <FormularioRegistro />
      </Suspense>
    </PantallaCuenta>
  );
}

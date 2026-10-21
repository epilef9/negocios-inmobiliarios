'use client';

import { Suspense, useId, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { restablecerPassword } from '@/services/auth';
import PantallaCuenta, { BotonVerPassword, botonPrincipal, control, etiqueta } from '@/components/cuenta/PantallaCuenta';

// Destino del enlace del mail: elegir la contraseña nueva. Al guardarla se cierran todas las sesiones.
function FormularioNueva() {
  const id = useId();
  const token = useSearchParams().get('token') ?? '';
  const { user, logout } = useAuth();
  const [password, setPassword] = useState('');
  const [repetir, setRepetir] = useState('');
  const [ver, setVer] = useState(false);
  const [error, setError] = useState<{ texto: string; campo?: 'password' | 'repetir'; enlace?: boolean } | null>(
    /^[a-f0-9]{64}$/.test(token) ? null : { texto: 'El enlace está incompleto. Abrilo de nuevo desde el mail o pedí uno nuevo.', enlace: true },
  );
  const [estado, setEstado] = useState<'editando' | 'guardando' | 'listo'>('editando');

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError({ texto: 'La contraseña tiene que tener al menos 8 caracteres.', campo: 'password' });
    if (password.length > 72) return setError({ texto: 'La contraseña puede tener hasta 72 caracteres.', campo: 'password' });
    if (password !== repetir) return setError({ texto: 'Las dos contraseñas no coinciden.', campo: 'repetir' });
    setError(null);
    setEstado('guardando');
    try {
      await restablecerPassword(token, password);
      // La sesión de este navegador (si había) también se cerró en el servidor
      if (user) logout();
      setEstado('listo');
    } catch (err) {
      setEstado('editando');
      const texto = err instanceof Error && !/fetch/i.test(err.message) ? err.message : 'No pudimos conectar con el servidor. Probá de nuevo en un momento.';
      setError({ texto, enlace: /enlace/i.test(texto) });
    }
  };

  if (estado === 'listo') {
    return (
      <div role="status" className="flex flex-col gap-6 border-t border-[#efe9df]/20 pt-8">
        <p className="m-0 text-[17px] leading-relaxed">Listo, tu contraseña cambió. Por seguridad cerramos las sesiones que tenías abiertas.</p>
        <Link href="/login" className={`${botonPrincipal} w-auto self-start`}>
          Ingresar con la nueva
        </Link>
      </div>
    );
  }

  const enlaceRoto = Boolean(error?.enlace);

  return (
    <form noValidate onSubmit={guardar} className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-nueva`} className={etiqueta}>
          Contraseña nueva
        </label>
        <div className="relative">
          <input
            id={`${id}-nueva`}
            type={ver ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            disabled={enlaceRoto}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            aria-invalid={error?.campo === 'password'}
            className={`${control} pr-12`}
          />
          <BotonVerPassword visible={ver} alCambiar={() => setVer((v) => !v)} className="absolute bottom-1.5 right-0" />
        </div>
        <span className="text-[13.5px] text-[#efe9df]/50">Mínimo 8 caracteres. Mejor si mezcla letras y números.</span>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-repetir`} className={etiqueta}>
          Repetila
        </label>
        <input
          id={`${id}-repetir`}
          type={ver ? 'text' : 'password'}
          autoComplete="new-password"
          value={repetir}
          disabled={enlaceRoto}
          onChange={(e) => {
            setRepetir(e.target.value);
            setError(null);
          }}
          aria-invalid={error?.campo === 'repetir'}
          className={control}
        />
      </div>
      {error && (
        <p role="alert" className="m-0 text-[15px] leading-relaxed text-[#ff8a7d]">
          {error.texto}
        </p>
      )}
      <div className="flex flex-col gap-6">
        {enlaceRoto ? (
          <Link href="/olvide-contrasena" className={`${botonPrincipal} w-auto self-start`}>
            Pedir un enlace nuevo
          </Link>
        ) : (
          <button type="submit" disabled={estado === 'guardando'} className={botonPrincipal}>
            {estado === 'guardando' ? 'Guardando…' : 'Guardar contraseña'}
          </button>
        )}
      </div>
    </form>
  );
}

export default function RestablecerContrasenaPage() {
  return (
    <PantallaCuenta titulo="Contraseña nueva." bajada="Elegí la contraseña con la que vas a ingresar desde ahora.">
      <Suspense fallback={null}>
        <FormularioNueva />
      </Suspense>
    </PantallaCuenta>
  );
}

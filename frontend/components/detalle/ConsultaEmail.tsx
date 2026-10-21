'use client';

import { useId, useState, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { enviarConsulta } from '@/services/contacto';

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const etiqueta = 'calma-micro text-[#efe9df]/70';
const control =
  'w-full rounded-xl border border-[#efe9df]/25 bg-[#0b2048] px-4 py-3 text-[16px] text-[#efe9df] placeholder:text-[#efe9df]/40 focus-visible:border-[#efe9df] focus-visible:outline-none aria-[invalid=true]:border-[#d9382b]';

// Consulta por email sobre una propiedad: la envía el servidor a la inmobiliaria y se responde al email de la persona
export default function ConsultaEmail({ titulo, mensajeInicial, deshabilitado }: { titulo: string; mensajeInicial: string; deshabilitado?: boolean }) {
  const id = useId();
  const { user } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [campoConError, setCampoConError] = useState<'nombre' | 'email' | 'mensaje' | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  // Se completan solos con los datos de la cuenta hasta que la persona los toca
  const nombreActual = nombre ?? (user ? `${user.nombre ?? ''} ${user.apellido ?? ''}`.trim() : '');
  const emailActual = email ?? user?.email ?? '';
  const mensajeActual = mensaje ?? mensajeInicial;

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const falla = !nombreActual.trim()
      ? ({ campo: 'nombre', texto: 'Escribí tu nombre.' } as const)
      : !EMAIL_VALIDO.test(emailActual.trim())
        ? ({ campo: 'email', texto: 'Escribí un email válido para poder responderte.' } as const)
        : !mensajeActual.trim()
          ? ({ campo: 'mensaje', texto: 'Escribí tu consulta.' } as const)
          : null;
    if (falla) {
      setCampoConError(falla.campo);
      setError(falla.texto);
      document.getElementById(`${id}-${falla.campo}`)?.focus();
      return;
    }
    setCampoConError(null);
    setError('');
    setEnviando(true);
    try {
      await enviarConsulta({
        nombre: nombreActual.trim(),
        email: emailActual.trim(),
        motivo: `Consulta por ${titulo}`.slice(0, 100),
        mensaje: mensajeActual.trim(),
      });
      setEnviado(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos enviar tu consulta. Probá de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  if (deshabilitado) return null;

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        aria-controls={`${id}-panel`}
        className="calma-micro flex items-center justify-center rounded-full border border-[#efe9df]/40 px-6 py-4 text-[12px] transition-colors hover:border-[#efe9df]"
      >
        Consultar por email
      </button>

      {abierto && (
        <div id={`${id}-panel`} className="rounded-2xl border border-[#efe9df]/20 p-5">
          {enviado ? (
            <div role="status" className="flex flex-col gap-3">
              <p className="m-0 text-[17px] font-semibold">Consulta enviada.</p>
              <p className="m-0 text-[15px] leading-relaxed text-[#efe9df]/80">
                Te respondemos a {emailActual.trim()} en horario de oficina.
              </p>
            </div>
          ) : (
            <form noValidate onSubmit={enviar} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor={`${id}-nombre`} className={etiqueta}>
                  Tu nombre
                </label>
                <input
                  id={`${id}-nombre`}
                  value={nombreActual}
                  onChange={(e) => setNombre(e.target.value)}
                  autoComplete="name"
                  aria-invalid={campoConError === 'nombre'}
                  className={control}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor={`${id}-email`} className={etiqueta}>
                  Tu email
                </label>
                <input
                  id={`${id}-email`}
                  type="email"
                  value={emailActual}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  inputMode="email"
                  placeholder="nombre@email.com"
                  aria-invalid={campoConError === 'email'}
                  className={control}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor={`${id}-mensaje`} className={etiqueta}>
                  Tu consulta
                </label>
                <textarea
                  id={`${id}-mensaje`}
                  rows={4}
                  value={mensajeActual}
                  onChange={(e) => setMensaje(e.target.value)}
                  aria-invalid={campoConError === 'mensaje'}
                  className={`${control} resize-y leading-relaxed`}
                />
              </div>
              {error && (
                <p role="alert" className="m-0 text-[14px] text-[#ff8a7d]">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={enviando}
                className="calma-micro flex items-center justify-center rounded-full bg-[#efe9df] px-6 py-4 text-[12px] text-[#071733] transition-colors hover:bg-white disabled:cursor-wait disabled:opacity-60"
              >
                {enviando ? 'Enviando…' : 'Enviar consulta'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

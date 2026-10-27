'use client';

import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import type { ApiProperty } from '@/services/api';
import { createVisita } from '@/services/visitas';
import CalendarioVisita from './CalendarioVisita';
import { useAuth } from '@/context/AuthContext';

export type AgendarVisitaHandle = { abrir: () => void };

// Los días y horarios libres los da el servidor (ver CalendarioVisita)

const campo = 'flex flex-col gap-2';
const etiqueta = 'calma-micro text-[#efe9df]/70';
const control =
  'w-full rounded-xl border border-[#efe9df]/25 bg-[#0b2048] px-4 py-3 text-[16px] text-[#efe9df] placeholder:text-[#efe9df]/40 focus-visible:border-[#efe9df] focus-visible:outline-none [color-scheme:dark] [&>option]:text-[#071733]';

type Props = { propiedad: ApiProperty; precio: string };

const AgendarVisita = forwardRef<AgendarVisitaHandle, Props>(function AgendarVisita({ propiedad, precio }, ref) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const { user } = useAuth();
  const [form, setForm] = useState({ nombre: '', telefono: '', email: '', fecha: '', horario: '', nota: '' });
  const [estado, setEstado] = useState<'editando' | 'enviando' | 'enviada'>('editando');
  const [error, setError] = useState('');
  // Cambia para que el calendario vuelva a consultar la agenda
  const [vueltaAgenda, setVueltaAgenda] = useState(0);

  useImperativeHandle(ref, () => ({
    abrir: () => {
      setEstado('editando');
      setError('');
      // Si hay sesión, completar con los datos de la cuenta
      if (user) {
        setForm((f) => ({
          ...f,
          nombre: f.nombre || `${user.nombre ?? ''} ${user.apellido ?? ''}`.trim(),
          email: f.email || user.email || '',
          telefono: f.telefono || user.telefono || '',
        }));
      }
      dialogo.current?.showModal();
    },
  }));

  const cambiar = (clave: keyof typeof form, valor: string) =>
    setForm((f) => ({ ...f, [clave]: valor, ...(clave === 'fecha' ? { horario: '' } : {}) }));
  const cerrar = () => dialogo.current?.close();

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!form.nombre.trim() || !form.telefono.trim() || !form.fecha || !form.horario) {
      setError('Completá tu nombre, un teléfono, el día y el horario.');
      return;
    }
    setEstado('enviando');
    setError('');
    const [a, m, d] = form.fecha.split('-');
    try {
      await createVisita({
        cliente: {
          nombre: form.nombre.trim(),
          telefono: form.telefono.trim(),
          email: form.email.trim(),
          iniciales: form.nombre.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || 'CL',
        },
        propiedad: {
          id: propiedad._id,
          titulo: propiedad.title,
          direccion: propiedad.direccionCompleta || propiedad.location,
          precio,
        },
        fecha: `${d}/${m}/${a}`,
        horario: `${form.horario} h`,
        estado: 'pendiente',
        notaAdicional: form.nota.trim(),
      });
      setEstado('enviada');
    } catch (e) {
      setEstado('editando');
      // Alguien se quedó con ese turno mientras se completaba el formulario: se vuelve a pedir la agenda
      // (sin ese turno) y hay que elegir otro
      if ((e as { code?: string }).code === 'HORARIO_NO_DISPONIBLE') {
        setForm((f) => ({ ...f, horario: '' }));
        setVueltaAgenda((n) => n + 1);
      }
      setError(e instanceof Error && e.message ? `No pudimos enviar el pedido: ${e.message}` : 'No pudimos enviar el pedido. Probá de nuevo.');
    }
  };

  const fechaLegible = form.fecha
    ? new Date(`${form.fecha}T12:00:00`).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
    : '';

  return (
    <dialog
      ref={dialogo}
      // data-lenis-prevent: la rueda del mouse mueve el contenido de la ventana, no la página de atrás
      data-lenis-prevent
      aria-labelledby="visita-titulo"
      className="m-auto w-[min(560px,calc(100vw-32px))] max-h-[calc(100dvh-32px)] overflow-y-auto overscroll-contain rounded-3xl border border-[#efe9df]/15 bg-[#071733] p-0 text-[#efe9df] shadow-[0_30px_80px_rgba(0,0,0,0.5)] backdrop:bg-[#020814]/75 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-6 px-6 pt-6 sm:px-8 sm:pt-8">
        <div className="flex flex-col gap-2">
          <h2 id="visita-titulo" className="font-display m-0 text-[34px] font-normal leading-none">
            {estado === 'enviada' ? 'Pedido enviado' : 'Agendar una visita'}
          </h2>
          <p className="m-0 text-[14px] text-[#efe9df]/70">{propiedad.title}</p>
        </div>
        <button
          type="button"
          onClick={cerrar}
          aria-label="Cerrar"
          className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[#efe9df]/10"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      {estado === 'enviada' ? (
        <div className="flex flex-col gap-6 px-6 pb-8 pt-6 sm:px-8">
          <p className="m-0 text-[16px] leading-relaxed">
            Pediste visitarla el <strong className="font-semibold">{fechaLegible}</strong> a las{' '}
            <strong className="font-semibold">{form.horario} h</strong>. Te vamos a confirmar el horario por teléfono o WhatsApp.
          </p>
          <button
            type="button"
            onClick={cerrar}
            className="calma-micro flex items-center justify-center gap-2.5 self-start rounded-full bg-[#efe9df] px-6 py-4 text-[12px] text-[#071733] transition-colors hover:bg-white"
          >
            Listo
          </button>
        </div>
      ) : (
        <form onSubmit={enviar} noValidate className="flex flex-col gap-5 px-6 pb-8 pt-6 sm:px-8">
          <label className={campo}>
            <span className={etiqueta}>Nombre y apellido</span>
            <input autoComplete="name" required value={form.nombre} onChange={(e) => cambiar('nombre', e.target.value)} className={control} />
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className={campo}>
              <span className={etiqueta}>Teléfono</span>
              <input type="tel" autoComplete="tel" required placeholder="343 555 1234" value={form.telefono} onChange={(e) => cambiar('telefono', e.target.value)} className={control} />
            </label>
            <label className={campo}>
              <span className={etiqueta}>Email (opcional)</span>
              <input type="email" autoComplete="email" value={form.email} onChange={(e) => cambiar('email', e.target.value)} className={control} />
            </label>
          </div>
          <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
            <legend className={`${etiqueta} mb-3`}>Día y horario</legend>
            <CalendarioVisita key={vueltaAgenda} fecha={form.fecha} horario={form.horario} onCambiar={(valor) => setForm((f) => ({ ...f, ...valor }))} />
          </fieldset>
          <label className={campo}>
            <span className={etiqueta}>Algo que quieras contarnos (opcional)</span>
            <textarea rows={3} value={form.nota} onChange={(e) => cambiar('nota', e.target.value)} className={`${control} resize-y`} placeholder="Por ejemplo: si es para vivir o para invertir, con cuántas personas vas o si querés mirar algo en particular, como el patio o la cochera." />
          </label>
          {error && (
            <p role="alert" className="m-0 text-[14px] text-[#ffb4ad]">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <button
              type="submit"
              disabled={estado === 'enviando'}
              className="calma-micro flex items-center gap-2.5 rounded-full bg-[#efe9df] px-6 py-4 text-[12px] text-[#071733] transition-colors hover:bg-white disabled:opacity-60"
            >
              <span className="calma-dot" aria-hidden="true" />
              {estado === 'enviando' ? 'Enviando…' : 'Pedir la visita'}
            </button>
            <span className="text-[13px] text-[#efe9df]/60">Te confirmamos el horario antes de ir.</span>
          </div>
        </form>
      )}
    </dialog>
  );
});

export default AgendarVisita;

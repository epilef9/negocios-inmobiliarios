'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fechaDeVisita } from '@/components/panel/estados';
import { cancelarVisita, getMisVisitas, type EstadoVisita, type Visita } from '@/services/visitas';

// Mi cuenta: las visitas que el cliente pidió con su cuenta (HU-34), con el estado, qué sigue y la opción
// de cancelar mientras no haya llegado el día. Mismo diseño que reservas y solicitudes.

const ESTADOS: Record<EstadoVisita, { texto: string; clase: string; queSigue: string }> = {
  pendiente: {
    texto: 'Por confirmar',
    clase: 'bg-[#efe9df]/10 text-[#efe9df] ring-1 ring-inset ring-[#efe9df]/45',
    queSigue: 'Recibimos tu pedido. La inmobiliaria te confirma el horario por teléfono o email.',
  },
  confirmada: { texto: 'Confirmada', clase: 'bg-[#efe9df] text-[#071733]', queSigue: 'Está confirmada. Te esperamos en la propiedad.' },
  reprogramada: {
    texto: 'Nuevo horario',
    clase: 'bg-[#efe9df] text-[#071733]',
    queSigue: 'La inmobiliaria la pasó a otro día u horario. Si no te queda bien, cancelala y pedí otra.',
  },
  rechazada: {
    texto: 'No disponible',
    clase: 'bg-[#d9382b]/25 text-[#ffc2bc] ring-1 ring-inset ring-[#d9382b]/60',
    queSigue: 'No se pudo hacer en ese horario.',
  },
  cancelada: { texto: 'Cancelada', clase: 'text-[#efe9df]/65 ring-1 ring-inset ring-[#efe9df]/20', queSigue: 'La cancelaste y el horario quedó libre.' },
};

const cuando = (v: Visita) => {
  const fecha = fechaDeVisita(v.fecha, v.horario);
  if (!fecha) return `${v.fecha} · ${v.horario}`;
  const dia = fecha.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} · ${v.horario.replace(/\s*h$/, '')} h`;
};

// Primero las que siguen en pie (la más próxima arriba), después el resto (lo más nuevo arriba)
const ordenar = (a: Visita, b: Visita) => {
  if (a.cancelable !== b.cancelable) return a.cancelable ? -1 : 1;
  const fa = fechaDeVisita(a.fecha, a.horario)?.getTime() ?? 0;
  const fb = fechaDeVisita(b.fecha, b.horario)?.getTime() ?? 0;
  return a.cancelable ? fa - fb : fb - fa;
};

export default function MisVisitas() {
  const [visitas, setVisitas] = useState<Visita[] | null>(null);
  const [error, setError] = useState('');
  const [aCancelar, setACancelar] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [errorCancelar, setErrorCancelar] = useState('');

  useEffect(() => {
    let activo = true;
    getMisVisitas()
      .then((lista) => activo && setVisitas(lista))
      .catch((e: Error) => activo && setError(e.message || 'No pudimos cargar tus visitas.'));
    return () => {
      activo = false;
    };
  }, []);

  const cancelar = async (v: Visita) => {
    setCancelando(true);
    setErrorCancelar('');
    try {
      const cancelada = await cancelarVisita(v.id);
      setVisitas((lista) => lista?.map((x) => (x.id === v.id ? { ...cancelada, cancelable: false } : x)) ?? null);
      setACancelar(null);
    } catch (e) {
      setErrorCancelar(e instanceof Error ? e.message : 'No pudimos cancelar la visita.');
    } finally {
      setCancelando(false);
    }
  };

  if (error) {
    return (
      <p role="alert" className="m-0 text-[15px] text-[#ff8b80]">
        {error}
      </p>
    );
  }
  if (!visitas) {
    return (
      <div aria-busy="true" aria-label="Cargando tus visitas" className="flex flex-col gap-4">
        <span className="calma-brillo h-24 w-full" />
        <span className="calma-brillo h-24 w-full" />
      </div>
    );
  }
  if (visitas.length === 0) {
    return (
      <div className="flex flex-col items-start gap-5">
        <p className="m-0 max-w-xl text-[15px] leading-relaxed text-[#efe9df]/65">
          Todavía no pediste ninguna visita. En la ficha de cada propiedad está el botón “Agendar una visita”; si lo pedís con tu cuenta iniciada, la seguís desde acá.
        </p>
        <Link href="/propiedades" className="calma-micro calma-link text-[#efe9df]">
          Ver propiedades
        </Link>
      </div>
    );
  }

  return (
    <section aria-label="Tus visitas">
      <ul className="m-0 flex list-none flex-col p-0">
        {[...visitas].sort(ordenar).map((v) => {
          const estado = ESTADOS[v.estado] ?? ESTADOS.pendiente;
          const pasada = !v.cancelable && (v.estado === 'confirmada' || v.estado === 'reprogramada' || v.estado === 'pendiente');
          return (
            <li key={v.id} className="flex flex-col gap-3 border-b border-[#efe9df]/12 py-7 first:pt-0">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div className="flex min-w-0 flex-col gap-1 [overflow-wrap:anywhere]">
                  {v.propiedad.id ? (
                    <Link href={`/propiedades/${v.propiedad.id}`} className="calma-link calma-link-sutil self-start text-[18px] text-[#efe9df]">
                      {v.propiedad.titulo}
                    </Link>
                  ) : (
                    <span className="text-[18px]">{v.propiedad.titulo}</span>
                  )}
                  <span className="tabular text-[14px] text-[#efe9df]/70">
                    {cuando(v)}
                    {v.propiedad.direccion ? ` · ${v.propiedad.direccion}` : ''}
                  </span>
                </div>
                <span className={`calma-micro inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-[11px] ${pasada ? ESTADOS.cancelada.clase : estado.clase}`}>
                  {pasada ? 'Ya pasó' : estado.texto}
                </span>
              </div>

              <p className="m-0 text-[15px] leading-relaxed text-[#efe9df]/80">{pasada ? 'Esta visita ya pasó.' : estado.queSigue}</p>
              {(v.estado === 'rechazada' || v.estado === 'reprogramada') && v.motivoRechazo && (
                <p className="m-0 whitespace-pre-wrap border-l border-[#efe9df]/30 pl-4 text-[15px] leading-relaxed text-[#efe9df]/75 [overflow-wrap:anywhere]">
                  {v.motivoRechazo}
                </p>
              )}

              {v.cancelable &&
                (aCancelar === v.id ? (
                  <div className="calma-aparecer flex flex-wrap items-center gap-x-5 gap-y-2">
                    <span className="text-[14px] text-[#efe9df]/80">¿Cancelar esta visita? El horario queda libre para otra persona.</span>
                    <button type="button" autoFocus disabled={cancelando} onClick={() => cancelar(v)} className="calma-micro calma-link cursor-pointer text-[#ffb4ad] disabled:cursor-wait disabled:opacity-60">
                      {cancelando ? 'Cancelando…' : 'Sí, cancelar'}
                    </button>
                    <button type="button" onClick={() => { setACancelar(null); setErrorCancelar(''); }} className="calma-micro calma-link calma-link-sutil cursor-pointer text-[#efe9df]/70">
                      No
                    </button>
                    {errorCancelar && (
                      <p role="alert" className="m-0 basis-full text-[14px] text-[#ffb4ad]">
                        {errorCancelar}
                      </p>
                    )}
                  </div>
                ) : (
                  <button type="button" onClick={() => setACancelar(v.id)} className="calma-micro calma-link calma-link-sutil cursor-pointer self-start text-[#efe9df]/70">
                    Cancelar visita
                  </button>
                ))}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

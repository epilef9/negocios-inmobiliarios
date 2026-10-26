'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fechaLarga } from '@/components/calendario/fechas';
import { cancelarReserva, fechaHoraArgentina, getMisReservas, idPropiedad, usd, type EstadoReserva, type Reserva } from '@/services/reservas';

// Mi cuenta: las reservas de estadías del cliente (HU-20), con el estado en color y qué sigue en cada caso.
// Una pendiente se puede cancelar; una vencida ofrece volver a elegir fechas en la misma propiedad.

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
const diaCorto = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });

// Colores dentro de la paleta Calma: crema lleno para lo confirmado, rojo para lo rechazado y contornos
// para lo que espera o ya no corre
const ESTADOS: Record<EstadoReserva, { texto: string; clase: string }> = {
  pendiente: { texto: 'Por confirmar', clase: 'bg-[#efe9df]/10 text-[#efe9df] ring-1 ring-inset ring-[#efe9df]/45' },
  confirmada: { texto: 'Confirmada', clase: 'bg-[#efe9df] text-[#071733]' },
  rechazada: { texto: 'Rechazada', clase: 'bg-[#d9382b]/25 text-[#ffc2bc] ring-1 ring-inset ring-[#d9382b]/60' },
  vencida: { texto: 'Vencida', clase: 'text-[#efe9df]/75 ring-1 ring-inset ring-[#efe9df]/25' },
  cancelada: { texto: 'Cancelada', clase: 'text-[#efe9df]/65 ring-1 ring-inset ring-[#efe9df]/20' },
};

function Icono({ estado }: { estado: EstadoReserva }) {
  const trazo = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5">
      {estado === 'confirmada' && <path d="M3.5 8.5l3 3 6-7" {...trazo} />}
      {estado === 'pendiente' && (
        <>
          <circle cx="8" cy="8" r="5.75" {...trazo} />
          <path d="M8 5v3.2l2 1.3" {...trazo} />
        </>
      )}
      {(estado === 'rechazada' || estado === 'cancelada') && <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" {...trazo} />}
      {estado === 'vencida' && (
        <>
          <circle cx="8" cy="8" r="5.75" {...trazo} />
          <path d="M4 12L12 4" {...trazo} />
        </>
      )}
    </svg>
  );
}

// Primero lo que está en juego: las pendientes (la que vence antes arriba) y las confirmadas por venir
// (la más próxima arriba); después el resto, lo más nuevo arriba
const grupo = (r: Reserva, hoy: string) => (r.estado === 'pendiente' ? 0 : r.estado === 'confirmada' && r.salida > hoy ? 1 : 2);
const comparar = (hoy: string) => (a: Reserva, b: Reserva) => {
  const g = grupo(a, hoy) - grupo(b, hoy);
  if (g) return g;
  if (grupo(a, hoy) === 0) return Date.parse(a.venceEn) - Date.parse(b.venceEn);
  if (grupo(a, hoy) === 1) return a.entrada.localeCompare(b.entrada);
  return Date.parse(b.createdAt) - Date.parse(a.createdAt);
};

export default function MisReservas({ id }: { id: string }) {
  const [reservas, setReservas] = useState<Reserva[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ahora, setAhora] = useState(0);
  const [aCancelar, setACancelar] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [errorCancelar, setErrorCancelar] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    getMisReservas()
      .then((lista) => {
        if (!activo) return;
        setReservas(lista);
        setAhora(Date.now());
      })
      .catch((e: Error) => activo && setError(e.message || 'No pudimos cargar tus reservas.'));
    return () => {
      activo = false;
    };
  }, []);

  const cancelar = async (reserva: Reserva) => {
    setCancelando(true);
    setErrorCancelar(null);
    try {
      const cancelada = await cancelarReserva(reserva.id);
      setReservas((lista) => lista?.map((r) => (r.id === reserva.id ? { ...cancelada, propiedad: r.propiedad } : r)) ?? null);
      setACancelar(null);
    } catch (e) {
      setErrorCancelar(e instanceof Error ? e.message : 'No pudimos cancelar la reserva.');
    } finally {
      setCancelando(false);
    }
  };

  // Fecha de hoy en Argentina ("AAAA-MM-DD"), como las de la reserva
  const hoy = ahora ? new Date(ahora).toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }) : '';
  // Si el plazo pasó con la página abierta, se muestra como vencida sin esperar a recargar
  const estadoReal = (r: Reserva): EstadoReserva => (r.estado === 'pendiente' && ahora && Date.parse(r.venceEn) <= ahora ? 'vencida' : r.estado);
  const lista = (reservas ?? [])
    .map((r) => ({ ...r, estado: estadoReal(r) }))
    .sort(comparar(hoy));

  return (
    <section id="reservas" aria-labelledby={`${id}-reservas-titulo`} className="scroll-mt-28 border-t border-[#efe9df]/15 pt-10">
      <h2 id={`${id}-reservas-titulo`} className="font-display m-0 text-[clamp(30px,3vw,42px)] font-normal leading-none">
        Tus reservas
      </h2>

      {error ? (
        <p role="alert" className="m-0 mt-8 text-[15px] text-[#ff8b80]">
          {error}
        </p>
      ) : !reservas ? (
        <div aria-busy="true" aria-label="Cargando tus reservas" className="mt-8 flex flex-col gap-4">
          <span className="calma-brillo h-24 w-full" />
          <span className="calma-brillo h-24 w-full" />
        </div>
      ) : lista.length === 0 ? (
        <div className="mt-6 flex flex-col items-start gap-5">
          <p className="m-0 max-w-xl text-[15px] leading-relaxed text-[#efe9df]/65">
            Todavía no reservaste ninguna estadía. Elegí fechas en la ficha de una propiedad de alquiler temporario y la seguís desde acá.
          </p>
          <Link href="/propiedades?operacion=temporario" className="calma-micro calma-link text-[#efe9df]">
            Ver alquileres temporarios
          </Link>
        </div>
      ) : (
        <ul className="m-0 mt-8 flex list-none flex-col p-0">
          {lista.map((r) => {
            const estado = ESTADOS[r.estado];
            const propiedadId = idPropiedad(r);
            const datosPropiedad = typeof r.propiedad === 'object' ? r.propiedad : null;
            const foto = datosPropiedad?.images?.[0];
            const titulo = datosPropiedad?.title || r.tituloPropiedad || 'Propiedad';
            const apagada = r.estado === 'cancelada' || r.estado === 'rechazada' || (r.estado === 'confirmada' && r.salida <= hoy);
            return (
              <li key={r.id} className="grid gap-x-6 gap-y-4 border-b border-[#efe9df]/12 py-7 first:pt-0 sm:grid-cols-[112px_minmax(0,1fr)]">
                <div className={`hidden aspect-[4/3] overflow-hidden rounded-xl bg-[#efe9df]/5 sm:block ${apagada ? 'opacity-60' : ''}`}>
                  {foto && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={foto} alt="" loading="lazy" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex min-w-0 flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <div className="flex min-w-0 flex-col gap-1">
                      {propiedadId && datosPropiedad ? (
                        <Link href={`/propiedades/${propiedadId}`} className="calma-link calma-link-sutil self-start text-[18px] text-[#efe9df]">
                          {titulo}
                        </Link>
                      ) : (
                        <span className="text-[18px]">{titulo}</span>
                      )}
                      <span className="tabular text-[14px] text-[#efe9df]/70">
                        {diaCorto(r.entrada)} → {diaCorto(r.salida)} · {plural(r.noches, 'noche', 'noches')} · {plural(r.huespedes, 'huésped', 'huéspedes')} · {usd(r.totalUSD)}
                      </span>
                    </div>
                    <span className={`calma-micro inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] ${estado.clase}`}>
                      <Icono estado={r.estado} />
                      {estado.texto}
                    </span>
                  </div>

                  {r.estado === 'pendiente' && (
                    <div className="flex flex-col gap-3">
                      <p className="m-0 text-[15px] leading-relaxed text-[#efe9df]/80">
                        Tu reserva se confirma antes del <span className="text-[#efe9df]">{fechaHoraArgentina(r.venceEn)}</span>. Hasta entonces las noches quedan guardadas para vos; si no llegamos a confirmarla, se liberan.
                      </p>
                      {aCancelar === r.id ? (
                        <div className="calma-aparecer flex flex-wrap items-center gap-x-5 gap-y-2">
                          <span className="text-[14px] text-[#efe9df]/80">¿Cancelar esta reserva? Las noches se liberan.</span>
                          {/* El foco pasa a la confirmación, que reemplaza al botón que se tocó */}
                          <button type="button" autoFocus disabled={cancelando} onClick={() => cancelar(r)} className="calma-micro calma-link cursor-pointer text-[#ffb4ad] disabled:cursor-wait disabled:opacity-60">
                            {cancelando ? 'Cancelando…' : 'Sí, cancelar'}
                          </button>
                          <button type="button" onClick={() => { setACancelar(null); setErrorCancelar(null); }} className="calma-micro calma-link calma-link-sutil cursor-pointer text-[#efe9df]/70">
                            No
                          </button>
                          {errorCancelar && (
                            <p role="alert" className="m-0 basis-full text-[14px] text-[#ffb4ad]">
                              {errorCancelar}
                            </p>
                          )}
                        </div>
                      ) : (
                        <button type="button" onClick={() => setACancelar(r.id)} className="calma-micro calma-link calma-link-sutil cursor-pointer self-start text-[#efe9df]/70">
                          Cancelar reserva
                        </button>
                      )}
                    </div>
                  )}

                  {r.estado === 'confirmada' && (
                    <p className="m-0 text-[15px] leading-relaxed text-[#efe9df]/80">
                      {r.salida <= hoy ? 'Estadía terminada.' : <>Está confirmada. Te esperamos el {fechaLarga(r.entrada)}.</>}
                    </p>
                  )}

                  {r.estado === 'rechazada' && (
                    <p className="m-0 text-[15px] leading-relaxed text-[#efe9df]/80">
                      La inmobiliaria no pudo confirmarla y las noches se liberaron.
                      {r.motivoRechazo && <span className="block text-[#efe9df]/65">Motivo: {r.motivoRechazo}</span>}
                    </p>
                  )}

                  {r.estado === 'vencida' && (
                    <div className="flex flex-col items-start gap-4">
                      <p className="m-0 text-[15px] leading-relaxed text-[#efe9df]/80">No llegamos a confirmarla a tiempo y las noches quedaron libres. Si todavía te interesa, elegí las fechas de nuevo.</p>
                      {propiedadId && datosPropiedad && (
                        <Link href={`/propiedades/${propiedadId}#reservar`} className="calma-micro flex items-center gap-2.5 rounded-full bg-[#efe9df] px-6 py-3.5 text-[12px] text-[#071733] transition-colors hover:bg-white">
                          <span className="calma-dot" aria-hidden="true" />
                          Volver a elegir fechas
                        </Link>
                      )}
                    </div>
                  )}

                  {r.estado === 'cancelada' && <p className="m-0 text-[15px] text-[#efe9df]/65">La cancelaste y las noches se liberaron.</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

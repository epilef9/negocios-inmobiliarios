'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import CalendarioEstadia from '@/components/detalle/CalendarioEstadia';
import { fechaLarga, nochesEntre, sumarDias } from '@/components/calendario/fechas';
import { useAuth } from '@/context/AuthContext';
import type { ApiProperty } from '@/services/api';
import type { DisponibilidadPublica } from '@/services/disponibilidad';
import { calcularTotal, crearReserva, fechaHoraArgentina, usd, type Reserva } from '@/services/reservas';

// Reserva de una estadía en alquiler temporario (HU-20): el cliente toca la entrada y la salida en el
// calendario de fechas libres, ve el detalle con el total y la envía. Queda pendiente hasta que la
// inmobiliaria la confirma; mientras tanto esas noches figuran "por confirmar" para todos.
// El servidor vuelve a validar todo (fechas, mínimo, huéspedes, choques): acá solo se guía al cliente.

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
// "jueves 12 de noviembre" con la primera en mayúscula, para empezar una línea
const capital = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);
// Lo que se guarda al ir a ingresar, para no perder las fechas elegidas
const clavePendiente = (id: string) => `reserva-en-curso:${id}`;

type Seleccion = { entrada: string | null; salida: string | null };

const botonPrincipal =
  'calma-micro flex w-full items-center justify-center gap-2.5 rounded-full bg-[#efe9df] px-6 py-4 text-[12px] text-[#071733] transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#efe9df] disabled:cursor-wait disabled:opacity-60';
const botonPaso =
  'flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-[#efe9df]/30 text-[20px] leading-none transition-colors hover:border-[#efe9df] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#efe9df] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-[#efe9df]/30';

export default function ReservarEstadia({ propiedad }: { propiedad: ApiProperty }) {
  const { user } = useAuth();
  const [datos, setDatos] = useState<DisponibilidadPublica | null>(null);
  const [version, setVersion] = useState(0);
  const [{ entrada, salida }, setSeleccion] = useState<Seleccion>({ entrada: null, salida: null });
  const [huespedes, setHuespedes] = useState(1);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviada, setEnviada] = useState<Reserva | null>(null);
  // Cuándo se eligieron las fechas: base para estimar hasta cuándo hay que esperar la confirmación
  const [elegidaEn, setElegidaEn] = useState(0);
  const raiz = useRef<HTMLDivElement>(null);
  const indicacion = useRef<HTMLDivElement>(null);
  const resumen = useRef<HTMLDivElement>(null);
  const exito = useRef<HTMLParagraphElement>(null);
  const primeraCarga = useRef(true);

  // En el celular el resumen queda debajo del calendario: al completar las fechas se lo trae a la vista
  // (solo lo justo, sin saltar si ya se ve). El foco va a donde quedó lo nuevo, para teclado y lector de pantalla.
  const despues = (accion: () => void) => setTimeout(accion, 60);
  const mostrarResumen = () =>
    despues(() => {
      const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      resumen.current?.scrollIntoView({ behavior: quieto ? 'auto' : 'smooth', block: 'nearest' });
    });
  const enfocar = (ref: React.RefObject<HTMLElement | null>) => despues(() => ref.current?.focus({ preventScroll: true }));

  const maximoHuespedes = propiedad.huespedesMaximos && propiedad.huespedesMaximos > 0 ? propiedad.huespedesMaximos : 20;
  const minimo = Math.max(1, datos?.minimoNoches ?? propiedad.minimoNoches ?? 1);
  const precioNoche = datos?.precioPorNocheUSD ?? propiedad.precioPorNocheUSD ?? 0;
  const esAdmin = user?.role === 'admin';

  // Al volver de ingresar se recuperan las fechas que había elegido (si siguen libres)
  const recuperarFechas = (d: DisponibilidadPublica) => {
    try {
      const guardado = sessionStorage.getItem(clavePendiente(propiedad._id));
      if (!guardado) return;
      sessionStorage.removeItem(clavePendiente(propiedad._id));
      const previo = JSON.parse(guardado) as Seleccion & { huespedes?: number };
      const { entrada: desde, salida: hasta } = previo;
      if (!desde || !hasta || desde <= d.hoy) return;
      if (d.ocupadas.some((r) => r.desde < hasta && desde < r.hasta)) return;
      setSeleccion({ entrada: desde, salida: hasta });
      setElegidaEn(Date.now());
      if (previo.huespedes) setHuespedes(previo.huespedes);
      return true;
    } catch {
      // Sin almacenamiento (modo privado): se eligen de nuevo
    }
    return false;
  };

  const alCargar = (d: DisponibilidadPublica) => {
    setDatos(d);
    if (!primeraCarga.current) return;
    primeraCarga.current = false;
    const recuperadas = recuperarFechas(d);
    // Con #reservar en la dirección (al volver de ingresar o desde Mi cuenta) se baja cuando el calendario ya
    // cargó, porque antes la página todavía no tiene su alto final. Si volvió de ingresar, directo al botón.
    if (window.location.hash === '#reservar') {
      if (recuperadas) despues(() => resumen.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      else requestAnimationFrame(() => raiz.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  };

  const manana = datos ? sumarDias(datos.hoy, 1) : '';
  const nocheTomada = (iso: string) => Boolean(datos?.ocupadas.some((r) => r.desde <= iso && iso < r.hasta));
  const libreEntre = (desde: string, hasta: string) => !datos?.ocupadas.some((r) => r.desde < hasta && desde < r.hasta);
  const puedeEntrar = (iso: string) => Boolean(datos) && iso >= manana && !nocheTomada(iso) && sumarDias(iso, 1) <= (datos?.hasta ?? '');
  const puedeSalir = (iso: string) => Boolean(entrada && iso > entrada && libreEntre(entrada, iso));
  // Esperando la salida, también se puede tocar otro día de entrada para empezar de nuevo
  const diaHabilitado = (iso: string) => (entrada && !salida ? puedeSalir(iso) || puedeEntrar(iso) : puedeEntrar(iso));

  const elegirEntrada = (iso: string) => {
    setSeleccion({ entrada: iso, salida: null });
    if (!libreEntre(iso, sumarDias(iso, minimo))) {
      setAviso(`Desde ese día no entran ${plural(minimo, 'noche', 'noches')} seguidas. Probá con otra entrada.`);
    }
  };

  const elegirDia = (iso: string) => {
    setAviso('');
    setError('');
    setEnviada(null);
    if (!entrada || salida || iso <= entrada) return elegirEntrada(iso);
    if (!libreEntre(entrada, iso)) {
      elegirEntrada(iso);
      setAviso('Había noches tomadas en el medio, así que empezamos de nuevo desde ese día.');
      return;
    }
    if (nochesEntre(entrada, iso) < minimo) {
      setAviso(`La estadía mínima es de ${plural(minimo, 'noche', 'noches')}: la salida puede ser desde el ${fechaLarga(sumarDias(entrada, minimo))}.`);
      return;
    }
    setSeleccion({ entrada, salida: iso });
    setElegidaEn(Date.now());
    mostrarResumen();
  };

  const empezarDeNuevo = () => {
    setSeleccion({ entrada: null, salida: null });
    setEnviada(null);
    setAviso('');
    setError('');
    enfocar(indicacion);
  };

  const noches = entrada && salida ? nochesEntre(entrada, salida) : 0;
  const cuentas = calcularTotal(noches, precioNoche, propiedad.costoLimpiezaUSD);
  // Mismo criterio que el servidor: el plazo, o las 12 del día de entrada si llega antes
  const plazo = datos?.plazoConfirmacionHoras ?? 48;
  const venceEstimado = entrada ? new Date(Math.min(elegidaEn + plazo * 3600000, Date.parse(`${entrada}T12:00:00-03:00`))).toISOString() : '';

  const enviar = async () => {
    if (!entrada || !salida) return;
    setEnviando(true);
    setError('');
    try {
      const reserva = await crearReserva({ propiedad: propiedad._id, entrada, salida, huespedes });
      setEnviada(reserva);
      setSeleccion({ entrada: null, salida: null });
      setVersion((v) => v + 1);
      enfocar(exito);
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'No se pudo enviar la reserva. Probá de nuevo.';
      setError(mensaje);
      // Si alguien las tomó recién, se actualiza el calendario para que se vea
      if (/ya no están libres/i.test(mensaje)) {
        setSeleccion({ entrada: null, salida: null });
        setVersion((v) => v + 1);
      }
    } finally {
      setEnviando(false);
    }
  };

  const guardarParaDespues = () => {
    try {
      sessionStorage.setItem(clavePendiente(propiedad._id), JSON.stringify({ entrada, salida, huespedes }));
    } catch {
      // Sin almacenamiento: al volver se eligen de nuevo
    }
  };

  const volverAca = `/propiedades/${propiedad._id}#reservar`;
  const paso = !entrada ? 'Tocá el día de entrada en el calendario.' : !salida ? `Entrada el ${fechaLarga(entrada)}. Ahora tocá el día de salida.` : null;

  return (
    <div ref={raiz} id="reservar" className="flex scroll-mt-28 flex-col gap-8">
      {/* Qué hacer ahora, arriba del calendario: en el celular el resumen queda lejos, abajo */}
      {!enviada && !(entrada && salida) && (
        <div ref={indicacion} tabIndex={-1} aria-live="polite" className="flex flex-col gap-1.5 border-l border-[#d9382b] pl-4 outline-none">
          {/* Alto de dos líneas fijo: si el texto cambia de largo, el calendario no se corre bajo el dedo */}
          <p className="m-0 min-h-[3.25em] text-[17px] leading-relaxed">{paso}</p>
          {aviso && <p className="m-0 text-[15px] leading-relaxed text-[#efe9df]/75">{aviso}</p>}
        </div>
      )}

      <CalendarioEstadia
        propiedadId={propiedad._id}
        alElegirDia={elegirDia}
        diaHabilitado={diaHabilitado}
        seleccion={{ entrada, salida }}
        version={version}
        alCargar={alCargar}
      />

      {(enviada || (entrada && salida) || error) && (
      <div ref={resumen} className="flex scroll-mb-6 flex-col gap-6 rounded-3xl border border-[#efe9df]/15 p-6 sm:p-8">
        {enviada ? (
          <div role="status" className="calma-aparecer flex flex-col items-start gap-4">
            <p ref={exito} tabIndex={-1} className="calma-micro m-0 flex items-center gap-2.5 text-[#efe9df]/70 outline-none">
              <span className="calma-dot" aria-hidden="true" />
              Reserva enviada
            </p>
            <p className="font-display m-0 text-[clamp(26px,2.6vw,34px)] leading-tight">
              Del {fechaLarga(enviada.entrada)} al {fechaLarga(enviada.salida)}.
            </p>
            <p className="m-0 max-w-[60ch] text-[16px] leading-relaxed text-[#efe9df]/80">
              Las noches quedan guardadas para vos mientras la inmobiliaria la revisa: te responde antes del{' '}
              <span className="text-[#efe9df]">{fechaHoraArgentina(enviada.venceEn)}</span>. Si no llega a confirmarla, las noches se liberan. Seguila desde Mi cuenta.
            </p>
            <div className="flex flex-wrap items-center gap-5 pt-1">
              <Link href="/perfil#reservas" className="calma-micro flex items-center gap-2.5 rounded-full bg-[#efe9df] px-6 py-4 text-[12px] text-[#071733] transition-colors hover:bg-white">
                <span className="calma-dot" aria-hidden="true" />
                Ver en Mi cuenta
              </Link>
              <button type="button" onClick={empezarDeNuevo} className="calma-micro calma-link cursor-pointer text-[#efe9df]/80">
                Reservar otras fechas
              </button>
            </div>
          </div>
        ) : (
          <>
            {entrada && salida && (
              <div className="calma-aparecer flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                <p className="font-display m-0 text-[clamp(26px,2.6vw,34px)] leading-tight">{plural(noches, 'noche', 'noches')}</p>
                <button type="button" onClick={empezarDeNuevo} className="calma-micro calma-link cursor-pointer text-[#efe9df]/70">
                  Cambiar fechas
                </button>
              </div>
            )}

            {entrada && salida && (
              <div className="calma-aparecer flex flex-col gap-6">
                <dl className="m-0 grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <dt className="calma-micro text-[#efe9df]/60">Entrada</dt>
                    <dd className="m-0 text-[16px]">
                      {capital(fechaLarga(entrada))}
                      {propiedad.checkInDesde && <span className="text-[#efe9df]/60"> · desde las {propiedad.checkInDesde}</span>}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1">
                    <dt className="calma-micro text-[#efe9df]/60">Salida</dt>
                    <dd className="m-0 text-[16px]">
                      {capital(fechaLarga(salida))}
                      {propiedad.checkOutHasta && <span className="text-[#efe9df]/60"> · hasta las {propiedad.checkOutHasta}</span>}
                    </dd>
                  </div>
                </dl>

                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#efe9df]/15 pt-5">
                  <div className="flex flex-col gap-0.5">
                    <span id="huespedes-titulo" className="text-[16px]">
                      Huéspedes
                    </span>
                    {propiedad.huespedesMaximos ? <span className="text-[13px] text-[#efe9df]/60">Hasta {plural(propiedad.huespedesMaximos, 'persona', 'personas')}</span> : null}
                  </div>
                  <div role="group" aria-labelledby="huespedes-titulo" className="flex items-center gap-4">
                    <button type="button" className={botonPaso} disabled={huespedes <= 1} onClick={() => setHuespedes((n) => Math.max(1, n - 1))} aria-label="Un huésped menos">
                      −
                    </button>
                    <output aria-live="polite" className="tabular w-6 text-center text-[20px]">
                      {huespedes}
                    </output>
                    <button type="button" className={botonPaso} disabled={huespedes >= maximoHuespedes} onClick={() => setHuespedes((n) => Math.min(maximoHuespedes, n + 1))} aria-label="Un huésped más">
                      +
                    </button>
                  </div>
                </div>

                <dl className="tabular m-0 flex flex-col gap-2.5 border-t border-[#efe9df]/15 pt-5 text-[16px]">
                  <div className="flex justify-between gap-4">
                    <dt className="text-[#efe9df]/75">
                      {plural(noches, 'noche', 'noches')} × {usd(precioNoche)}
                    </dt>
                    <dd className="m-0">{usd(cuentas.alojamiento)}</dd>
                  </div>
                  {cuentas.limpieza > 0 && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-[#efe9df]/75">Limpieza</dt>
                      <dd className="m-0">{usd(cuentas.limpieza)}</dd>
                    </div>
                  )}
                  <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-[#efe9df]/15 pt-4">
                    <dt>Total</dt>
                    <dd className="font-display m-0 text-[30px] leading-none">{usd(cuentas.total)}</dd>
                  </div>
                </dl>

                <p className="m-0 text-[14px] leading-relaxed text-[#efe9df]/65">
                  Es un pedido de reserva: la inmobiliaria te responde antes del {fechaHoraArgentina(venceEstimado)}. Hasta entonces nadie más puede tomar esas noches; si no llega a confirmarla, se liberan.
                </p>

                {error && (
                  <p role="alert" className="m-0 text-[15px] leading-relaxed text-[#ffb4ad]">
                    {error}
                  </p>
                )}

                {esAdmin ? (
                  <p className="m-0 text-[15px] text-[#efe9df]/75">
                    Con la cuenta de administrador las estadías se cargan desde{' '}
                    <Link href="/admin/disponibilidad" className="calma-link text-[#efe9df]">
                      el panel
                    </Link>
                    .
                  </p>
                ) : user ? (
                  <button type="button" onClick={enviar} disabled={enviando} className={botonPrincipal}>
                    <span className="calma-dot" aria-hidden="true" />
                    {enviando ? 'Enviando…' : 'Enviar reserva'}
                  </button>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Link href={`/login?volver=${encodeURIComponent(volverAca)}`} onClick={guardarParaDespues} className={botonPrincipal}>
                      <span className="calma-dot" aria-hidden="true" />
                      Ingresá para reservar
                    </Link>
                    <p className="m-0 text-center text-[14px] text-[#efe9df]/65">
                      ¿No tenés cuenta?{' '}
                      <Link href={`/register?volver=${encodeURIComponent(volverAca)}`} onClick={guardarParaDespues} className="calma-link text-[#efe9df]">
                        Creala en un minuto
                      </Link>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Un error que llega sin la estadía elegida (por ejemplo, alguien tomó esas noches recién) */}
            {error && !(entrada && salida) && (
              <p role="alert" className="m-0 text-[15px] leading-relaxed text-[#ffb4ad]">
                {error}
              </p>
            )}
          </>
        )}
      </div>
      )}
    </div>
  );
}

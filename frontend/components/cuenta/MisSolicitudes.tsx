"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { getMisSolicitudes, type EstadoSolicitud, type SolicitudResumen } from "@/services/solicitudes";

// Mi cuenta: las solicitudes de alquiler o compra del cliente (HU-24), con el mismo diseño que "Tus reservas":
// filas separadas por una línea, foto chica, estado en una pastilla y qué sigue en cada caso.

// Misma paleta que las reservas: crema lleno para lo aprobado, rojo para lo rechazado y contornos para el resto
const ESTADOS: Record<EstadoSolicitud, { texto: string; clase: string }> = {
  pendiente: { texto: "Pendiente", clase: "bg-[#efe9df]/10 text-[#efe9df] ring-1 ring-inset ring-[#efe9df]/45" },
  aprobada: { texto: "Aprobada", clase: "bg-[#efe9df] text-[#071733]" },
  rechazada: { texto: "Rechazada", clase: "bg-[#d9382b]/25 text-[#ffc2bc] ring-1 ring-inset ring-[#d9382b]/60" },
  vencida: { texto: "Vencida", clase: "text-[#efe9df]/75 ring-1 ring-inset ring-[#efe9df]/25" },
  cerrada: { texto: "Cerrada", clase: "text-[#efe9df]/65 ring-1 ring-inset ring-[#efe9df]/20" },
};

// Qué le pasa al cliente en cada estado, en una frase
const QUE_SIGUE: Record<EstadoSolicitud, string> = {
  pendiente: "Recibimos tu solicitud y la estamos revisando. Te avisamos por mail cuando haya novedades.",
  aprobada: "¡Tu solicitud fue aprobada! Nos vamos a comunicar para seguir con el trámite.",
  rechazada: "No pudimos aprobar tu solicitud. Si tenés dudas, escribinos.",
  vencida: "Venció el plazo sin respuesta. Escribinos si querés que la revisemos.",
  cerrada: "La propiedad ya no está disponible, así que la solicitud se cerró.",
};

const fechaCorta = (valor: string) =>
  new Date(valor).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" });
const fechaHora = (valor: string) =>
  new Date(valor).toLocaleString("es-AR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" });

// Los mensajes pueden traer palabras o links larguísimos: nunca se salen del renglón
const textoMensaje = "m-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-[15px] leading-relaxed";

function Icono({ estado }: { estado: EstadoSolicitud }) {
  const trazo = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5">
      {estado === "aprobada" && <path d="M3.5 8.5l3 3 6-7" {...trazo} />}
      {estado === "pendiente" && (
        <>
          <circle cx="8" cy="8" r="5.75" {...trazo} />
          <path d="M8 5v3.2l2 1.3" {...trazo} />
        </>
      )}
      {(estado === "rechazada" || estado === "cerrada") && <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" {...trazo} />}
      {estado === "vencida" && (
        <>
          <circle cx="8" cy="8" r="5.75" {...trazo} />
          <path d="M4 12L12 4" {...trazo} />
        </>
      )}
    </svg>
  );
}

// Seguimiento en tres pasos: el cliente ve con un tilde que su pedido llegó, aunque todavía esté pendiente
function Progreso({ estado, enviada }: { estado: EstadoSolicitud; enviada: string }) {
  const respondida = estado === "aprobada" || estado === "rechazada";
  const pasos = [
    { texto: "Enviada", detalle: fechaCorta(enviada), hecho: true },
    { texto: "En revisión", detalle: respondida ? "Revisada" : "Ahora", hecho: respondida, actual: !respondida },
    { texto: respondida ? (estado === "aprobada" ? "Aprobada" : "Rechazada") : "Respuesta", detalle: respondida ? "Listo" : "Te avisamos por mail", hecho: respondida },
  ];
  return (
    <ol aria-label="Seguimiento de la solicitud" className="m-0 grid list-none grid-cols-3 gap-2 p-0">
      {pasos.map((paso, i) => (
        <li key={paso.texto} className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#071733] ${
                paso.hecho ? "bg-[#efe9df]" : paso.actual ? "ring-1 ring-inset ring-[#efe9df]/70" : "ring-1 ring-inset ring-[#efe9df]/25"
              }`}
            >
              {paso.hecho ? (
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5">
                  <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : paso.actual ? (
                <span className="h-1.5 w-1.5 rounded-full bg-[#efe9df]" />
              ) : null}
            </span>
            {i < pasos.length - 1 && <span aria-hidden="true" className={`h-px flex-1 ${pasos[i + 1].hecho || pasos[i + 1].actual ? "bg-[#efe9df]/60" : "bg-[#efe9df]/20"}`} />}
          </div>
          <span className="flex min-w-0 flex-col">
            <span className={`text-[13.5px] ${paso.hecho || paso.actual ? "text-[#efe9df]" : "text-[#efe9df]/55"}`}>
              {paso.texto}
              <span className="sr-only">{paso.hecho ? " (hecho)" : paso.actual ? " (en curso)" : " (falta)"}</span>
            </span>
            <span className="text-[12px] text-[#efe9df]/50">{paso.detalle}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function Mensaje({ estado, comentario, fecha, destacado = false }: { estado?: string; comentario: string; fecha: string; destacado?: boolean }) {
  return (
    <div className={`min-w-0 border-l pl-4 ${destacado ? "border-[#efe9df]/45" : "border-[#efe9df]/20"}`}>
      <p className={`${textoMensaje} ${destacado ? "text-[#efe9df]" : "text-[#efe9df]/75"}`}>{comentario}</p>
      <p className="m-0 mt-1.5 text-[12.5px] text-[#efe9df]/50">
        {estado ? `${ESTADOS[estado as EstadoSolicitud]?.texto ?? estado} · ` : ""}
        <time dateTime={fecha}>{fechaHora(fecha)}</time>
      </p>
    </div>
  );
}

export function TarjetaSolicitud({ solicitud }: { solicitud: SolicitudResumen }) {
  const idHistorial = useId();
  const [historialAbierto, setHistorialAbierto] = useState(false);
  const estado = ESTADOS[solicitud.estado] ?? ESTADOS.pendiente;
  const queSigue = QUE_SIGUE[solicitud.estado] ?? "";
  // La API ya filtra los mensajes viejos y los datos internos; acá no se repiten las referencias a mensajes anteriores
  const mensajes = (solicitud.historialEstados || [])
    .filter((item) => item.comentario.trim() && item.comentarioReferenciaIndice === undefined)
    .slice()
    .sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));
  // El mensaje automático de cierre ya lo dice la frase del estado
  const ultimo = mensajes[0] && mensajes[0].comentario.trim() !== "La propiedad ya no está disponible" ? mensajes[0] : undefined;
  const anteriores = ultimo ? mensajes.slice(1) : [];
  const propiedad = solicitud.propiedad;
  const apagada = solicitud.estado === "vencida" || solicitud.estado === "cerrada" || solicitud.estado === "rechazada";
  const lugar = propiedad?.ciudad;

  return (
    <li className="grid gap-x-6 gap-y-4 border-b border-[#efe9df]/12 py-7 first:pt-0 sm:grid-cols-[112px_minmax(0,1fr)]">
      <div className={`hidden aspect-[4/3] overflow-hidden rounded-xl bg-[#efe9df]/5 sm:block ${apagada ? "opacity-60" : ""}`}>
        {propiedad?.imagen && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={propiedad.imagen} alt="" loading="lazy" className="h-full w-full object-cover" />
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 flex-col gap-1 [overflow-wrap:anywhere]">
            {propiedad?.titulo && propiedad.id ? (
              <Link href={`/propiedades/${propiedad.id}`} className="calma-link calma-link-sutil self-start text-[18px] text-[#efe9df]">
                {propiedad.titulo}
              </Link>
            ) : (
              <span className="text-[18px] text-[#efe9df]/75">Propiedad no disponible</span>
            )}
            <span className="text-[14px] text-[#efe9df]/70">
              {solicitud.operacion === "compra" ? "Compra" : "Alquiler"}
              {lugar ? ` · ${lugar}` : ""} · Enviada el <time dateTime={solicitud.createdAt}>{fechaCorta(solicitud.createdAt)}</time>
            </span>
          </div>
          <span className={`calma-micro inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] ${estado.clase}`}>
            <Icono estado={solicitud.estado} />
            {estado.texto}
          </span>
        </div>

        {(solicitud.estado === "pendiente" || solicitud.estado === "aprobada" || solicitud.estado === "rechazada") && (
          <div className="py-1">
            <Progreso estado={solicitud.estado} enviada={solicitud.createdAt} />
          </div>
        )}

        {queSigue && <p className="m-0 text-[15px] leading-relaxed text-[#efe9df]/80">{queSigue}</p>}

        {ultimo && (
          <div className="mt-1 flex min-w-0 flex-col gap-3">
            <p className="calma-micro m-0 text-[11px] text-[#efe9df]/55">Último mensaje del administrador</p>
            <Mensaje comentario={ultimo.comentario} fecha={ultimo.fecha} destacado />

            {anteriores.length > 0 && (
              <>
                <button
                  type="button"
                  aria-expanded={historialAbierto}
                  aria-controls={idHistorial}
                  onClick={() => setHistorialAbierto((abierto) => !abierto)}
                  className="calma-micro calma-link calma-link-sutil cursor-pointer self-start text-[11px] text-[#efe9df]/70"
                >
                  {historialAbierto ? "Ocultar mensajes anteriores" : `Ver mensajes anteriores (${anteriores.length})`}
                </button>
                <ol id={idHistorial} hidden={!historialAbierto} className="calma-aparecer m-0 flex list-none flex-col gap-4 p-0">
                  {anteriores.map((mensaje, indice) => (
                    <li key={`${mensaje.fecha}-${indice}`}>
                      <Mensaje estado={mensaje.estado} comentario={mensaje.comentario} fecha={mensaje.fecha} />
                    </li>
                  ))}
                </ol>
              </>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

export default function MisSolicitudes({ titulo = true }: { titulo?: boolean }) {
  const idTitulo = useId();
  const [solicitudes, setSolicitudes] = useState<SolicitudResumen[] | null>(null);
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;
    getMisSolicitudes()
      .then((lista) => {
        if (activo) setSolicitudes(lista);
      })
      .catch((fallo: Error) => {
        if (activo) setError(fallo.message || "No pudimos cargar tus solicitudes.");
      });
    return () => {
      activo = false;
    };
  }, [intento]);

  return (
    <section
      id="solicitudes"
      aria-labelledby={titulo ? idTitulo : undefined}
      aria-label={titulo ? undefined : "Mis solicitudes"}
      className={`min-w-0 scroll-mt-28 ${titulo ? "border-t border-[#efe9df]/15 pt-10" : ""}`}
    >
      {titulo && (
        <h2 id={idTitulo} className="font-display m-0 text-[clamp(30px,3vw,42px)] font-normal leading-none">
          Tus solicitudes
        </h2>
      )}

      {error ? (
        <div role="alert" className="mt-8 flex flex-col items-start gap-4">
          <p className="m-0 text-[15px] text-[#ff8b80]">{error}</p>
          <button
            type="button"
            onClick={() => {
              setError("");
              setSolicitudes(null);
              setIntento((n) => n + 1);
            }}
            className="calma-micro calma-link cursor-pointer text-[#efe9df]"
          >
            Reintentar
          </button>
        </div>
      ) : solicitudes === null ? (
        <div aria-busy="true" aria-label="Cargando tus solicitudes" className="mt-8 flex flex-col gap-4">
          <span className="calma-brillo h-24 w-full" />
          <span className="calma-brillo h-24 w-full" />
        </div>
      ) : solicitudes.length === 0 ? (
        <div className="mt-6 flex flex-col items-start gap-5">
          <p className="m-0 max-w-xl text-[15px] leading-relaxed text-[#efe9df]/65">
            Todavía no enviaste solicitudes de alquiler o compra. Desde la ficha de una propiedad podés pedir alquilarla o comprarla y la seguís desde acá.
          </p>
          <Link href="/propiedades" className="calma-micro calma-link text-[#efe9df]">
            Ver propiedades
          </Link>
        </div>
      ) : (
        <ul className="m-0 mt-8 flex list-none flex-col p-0">
          {solicitudes.map((solicitud) => (
            <TarjetaSolicitud key={solicitud.id} solicitud={solicitud} />
          ))}
        </ul>
      )}
    </section>
  );
}

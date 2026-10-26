"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { getMisSolicitudes, type EstadoSolicitud, type SolicitudResumen } from "@/services/solicitudes";

const ESTADOS: Record<EstadoSolicitud, { texto: string; clase: string }> = {
  pendiente: { texto: "Pendiente", clase: "bg-[#efe9df]/10 text-[#efe9df] ring-[#efe9df]/45" },
  aprobada: { texto: "Aprobada", clase: "bg-[#efe9df] text-[#071733] ring-[#efe9df]" },
  rechazada: { texto: "Rechazada", clase: "bg-[#d9382b]/25 text-[#ffc2bc] ring-[#d9382b]/60" },
  vencida: { texto: "Vencida", clase: "text-[#efe9df]/75 ring-[#efe9df]/25" },
  cerrada: { texto: "Cerrada", clase: "text-[#efe9df]/75 ring-[#efe9df]/25" },
};
const fecha = (valor: string) => new Date(valor).toLocaleString("es-AR", {
  day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  timeZone: "America/Argentina/Buenos_Aires",
});
const textoMensaje = "m-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-[15px] leading-relaxed text-[#efe9df]/80";

function ImagenPropiedad({ imagen, titulo }: { imagen?: string | null; titulo?: string | null }) {
  const [fallo, setFallo] = useState(false);
  return <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[#efe9df]/5">
    {imagen && !fallo ? <Image src={imagen} alt={`Foto de ${titulo || "la propiedad solicitada"}`} fill
      sizes="(min-width: 768px) 176px, calc(100vw - 80px)" className="object-cover" onError={() => setFallo(true)} />
      : <div className="flex h-full items-center justify-center p-4 text-center text-[13px] text-[#efe9df]/55">Imagen no disponible</div>}
  </div>;
}

export function TarjetaSolicitud({ solicitud }: { solicitud: SolicitudResumen }) {
  const [historialAbierto, setHistorialAbierto] = useState(false);
  const estado = ESTADOS[solicitud.estado];
  // La API ya filtra antigüedad y datos internos. No repetir las referencias a comentarios anteriores.
  const mensajes = (solicitud.historialEstados || []).filter((item) => item.comentario.trim() && item.comentarioReferenciaIndice === undefined)
    .slice().sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));
  const ultimo = mensajes[0];
  const propiedad = solicitud.propiedad;
  return <li className="grid min-w-0 gap-5 rounded-xl border border-[#efe9df]/20 p-5 sm:p-6 md:grid-cols-[11rem_minmax(0,1fr)]">
    <ImagenPropiedad key={propiedad?.imagen || "sin-imagen"} imagen={propiedad?.imagen} titulo={propiedad?.titulo} />
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
          <p className="calma-micro m-0 mb-2 text-[11px] text-[#efe9df]/55">Solicitud de {solicitud.operacion}</p>
          {propiedad?.titulo && propiedad.id
            ? <Link href={`/propiedades/${propiedad.id}`} className="calma-link calma-link-sutil text-[18px]">{propiedad.titulo}</Link>
            : <span className="text-[18px]">Propiedad no disponible</span>}
        </div>
        <span className={`calma-micro inline-flex shrink-0 rounded-full px-3 py-1.5 text-[11px] ring-1 ring-inset ${estado.clase}`}>{estado.texto}</span>
      </div>
      <p className="m-0 text-[13px] text-[#efe9df]/60">Enviada el <time dateTime={solicitud.createdAt}>{fecha(solicitud.createdAt)}</time></p>
      {solicitud.estado === "vencida" && <p className={textoMensaje}>Venció el plazo sin respuesta. Escribinos si querés que revisemos tu solicitud.</p>}
      {solicitud.estado === "cerrada" && <p className={textoMensaje}>La propiedad ya no está disponible.</p>}
      {ultimo && <div className="min-w-0 border-t border-[#efe9df]/15 pt-4">
        <p className="calma-micro m-0 mb-2 text-[11px] text-[#efe9df]/55">Último mensaje del administrador</p>
        <p className={textoMensaje}>{ultimo.comentario}</p>
        <time dateTime={ultimo.fecha} className="mt-2 block text-[12px] text-[#efe9df]/50">{fecha(ultimo.fecha)}</time>
        {mensajes.length > 1 && <>
          <button type="button" aria-expanded={historialAbierto} aria-controls={`mensajes-${solicitud.id}`}
            onClick={() => setHistorialAbierto((abierto) => !abierto)}
            className="calma-micro calma-link calma-link-sutil mt-4 cursor-pointer text-left text-[11px] text-[#efe9df]/75 focus-visible:outline-2 focus-visible:outline-offset-4">
            {historialAbierto ? "Ocultar mensajes anteriores" : `Ver mensajes anteriores (${mensajes.length - 1})`}
          </button>
          <ol id={`mensajes-${solicitud.id}`} hidden={!historialAbierto} className="m-0 mt-4 list-none space-y-4 border-l border-[#efe9df]/20 pl-4">
            {mensajes.map((mensaje, indice) => <li key={`${mensaje.fecha}-${indice}`} className="min-w-0">
              <p className="calma-micro m-0 mb-2 text-[11px] text-[#efe9df]/55">{ESTADOS[mensaje.estado as EstadoSolicitud]?.texto || mensaje.estado} · <time dateTime={mensaje.fecha}>{fecha(mensaje.fecha)}</time></p>
              <p className={textoMensaje}>{mensaje.comentario}</p>
            </li>)}
          </ol>
        </>}
      </div>}
    </div>
  </li>;
}

export default function MisSolicitudes({ titulo = true }: { titulo?: boolean }) {
  const [solicitudes, setSolicitudes] = useState<SolicitudResumen[] | null>(null);
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    let activo = true;
    getMisSolicitudes().then((lista) => { if (activo) setSolicitudes(lista); })
      .catch((fallo: Error) => { if (activo) setError(fallo.message); });
    return () => { activo = false; };
  }, [intento]);
  return <section id="solicitudes" aria-label="Mis solicitudes" className={`min-w-0 scroll-mt-28 ${titulo ? "border-t border-[#efe9df]/15 pt-10" : ""}`}>
    {titulo && <h2 className="font-display m-0 text-[clamp(30px,3vw,42px)] font-normal leading-none">Mis solicitudes</h2>}
    <div className={titulo ? "mt-8" : ""}>
      {error ? <div role="alert"><p className="text-[#ffb4ad]">{error}</p><button type="button" className="calma-micro calma-link" onClick={() => { setError(""); setIntento((n) => n + 1); }}>Reintentar</button></div>
        : solicitudes === null ? <p role="status" className="text-[15px] text-[#efe9df]/60">Cargando Mis solicitudes…</p>
        : !solicitudes.length ? <div className="flex flex-col items-start gap-5"><p className="m-0 max-w-xl text-[15px] leading-relaxed text-[#efe9df]/65">Todavía no enviaste solicitudes de alquiler o compra. Elegí una propiedad para empezar.</p><Link href="/propiedades" className="calma-micro calma-link">Ver propiedades</Link></div>
        : <ul className="m-0 flex list-none flex-col gap-4 p-0">{solicitudes.map((solicitud) => <TarjetaSolicitud key={solicitud.id} solicitud={solicitud} />)}</ul>}
    </div>
  </section>;
}

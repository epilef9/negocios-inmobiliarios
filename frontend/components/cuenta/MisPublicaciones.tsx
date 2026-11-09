"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMisSolicitudesPublicacion, type SolicitudPublicacion } from "@/services/solicitudesPublicacion";
import { getMisEstadisticas, type MisEstadisticas } from "@/services/estadisticas";
import EstadisticasPropiedad, { NumerosPropiedad } from "./EstadisticasPropiedad";

// Mi cuenta: las propiedades que el cliente pidió publicar (HU-08 / HU-37), con el mismo diseño que reservas
// y solicitudes: filas, estado en una pastilla y qué sigue en cada caso. Las publicadas muestran sus números
// (vistas, consultas, visitas, favoritos y solicitudes) para que el dueño sepa cómo le va.

const PERIODOS = [7, 30, 90];

const ESTADOS: Record<SolicitudPublicacion["estado"], { texto: string; clase: string; queSigue: string }> = {
  pendiente: {
    texto: "Pendiente",
    clase: "bg-[#efe9df]/10 text-[#efe9df] ring-1 ring-inset ring-[#efe9df]/45",
    queSigue: "Recibimos tu pedido y lo estamos revisando. Te avisamos cuando esté publicada.",
  },
  aprobada: { texto: "Publicada", clase: "bg-[#efe9df] text-[#071733]", queSigue: "Tu propiedad ya está en el catálogo." },
  rechazada: {
    texto: "No aprobada",
    clase: "bg-[#d9382b]/25 text-[#ffc2bc] ring-1 ring-inset ring-[#d9382b]/60",
    queSigue: "No pudimos publicarla. Si tenés dudas, escribinos.",
  },
};

const OPERACION: Record<SolicitudPublicacion["operacion"], string> = { venta: "Venta", alquiler: "Alquiler", temporario: "Alquiler temporario", ambas: "Venta y alquiler" };

const precio = (sol: SolicitudPublicacion) => {
  const monto = sol.precioPretendido?.monto;
  if (!monto) return null;
  const venta = `${sol.precioPretendido?.moneda === "ARS" ? "$" : "USD"} ${monto.toLocaleString("es-AR")}`;
  const alquiler = sol.operacion === "ambas" && sol.precioAlquiler?.monto ? `${sol.precioAlquiler.moneda === "USD" ? "USD" : "$"} ${sol.precioAlquiler.monto.toLocaleString("es-AR")}/mes` : "";
  return alquiler ? `${venta} · alquiler ${alquiler}` : venta;
};

export default function MisPublicaciones() {
  const [publicaciones, setPublicaciones] = useState<SolicitudPublicacion[] | null>(null);
  const [error, setError] = useState("");
  const [dias, setDias] = useState(30);
  const [estadisticas, setEstadisticas] = useState<MisEstadisticas | null>(null);

  useEffect(() => {
    let activo = true;
    getMisEstadisticas(dias)
      .then((e) => activo && setEstadisticas(e))
      .catch(() => activo && setEstadisticas(null));
    return () => {
      activo = false;
    };
  }, [dias]);

  useEffect(() => {
    let activo = true;
    getMisSolicitudesPublicacion()
      .then((lista) => activo && setPublicaciones(lista ?? []))
      .catch((e: Error) => activo && setError(e.message || "No pudimos cargar tus publicaciones."));
    return () => {
      activo = false;
    };
  }, []);

  const deLaPropiedad = (id?: string) => (id ? estadisticas?.propiedades.find((p) => p.id === id) : undefined);
  // Propiedades a su nombre que no vinieron de un pedido desde el sitio (las cargó la inmobiliaria)
  const idsPedidos = new Set((publicaciones ?? []).map((sol) => (sol.propiedadCreada && typeof sol.propiedadCreada === "object" ? sol.propiedadCreada._id : "")));
  const otras = (estadisticas?.propiedades ?? []).filter((p) => !idsPedidos.has(p.id));
  const hayNumeros = Boolean(estadisticas?.propiedades.length);

  return (
    <section aria-label="Tus publicaciones" className="flex flex-col gap-8">
      {hayNumeros && estadisticas && (
        <div className="flex flex-col gap-6 border-b border-[#efe9df]/12 pb-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display m-0 text-[clamp(28px,2.8vw,38px)] font-normal leading-none">Cómo les va a tus propiedades</h2>
            <div role="radiogroup" aria-label="Período" className="flex gap-1 rounded-full border border-[#efe9df]/20 p-1">
              {PERIODOS.map((p) => (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={dias === p}
                  onClick={() => setDias(p)}
                  className={`calma-micro rounded-full px-4 py-2 text-[11px] transition-colors duration-300 ${dias === p ? "bg-[#efe9df] text-[#071733]" : "text-[#efe9df]/70 hover:text-[#efe9df]"}`}
                >
                  {p} días
                </button>
              ))}
            </div>
          </div>
          <NumerosPropiedad totales={estadisticas.totales} />
          <p className="m-0 max-w-2xl text-[13.5px] leading-relaxed text-[#efe9df]/55">
            Contamos cuántas veces abrieron la ficha, tocaron WhatsApp, pidieron una visita, la guardaron en favoritos o mandaron una solicitud. Nunca quién.
          </p>
        </div>
      )}

      <div>
        <Link
          href="/publicar"
          className="calma-micro inline-flex items-center gap-2.5 rounded-full bg-[#efe9df] px-6 py-3.5 text-[12px] text-[#071733] transition-colors hover:bg-white"
        >
          <span className="calma-dot" aria-hidden="true" />
          Publicar una propiedad
        </Link>
      </div>

      {error ? (
        <p role="alert" className="m-0 text-[15px] text-[#ff8b80]">
          {error}
        </p>
      ) : !publicaciones ? (
        <div aria-busy="true" aria-label="Cargando tus publicaciones" className="flex flex-col gap-4">
          <span className="calma-brillo h-24 w-full" />
          <span className="calma-brillo h-24 w-full" />
        </div>
      ) : publicaciones.length === 0 ? (
        <p className="m-0 max-w-xl text-[15px] leading-relaxed text-[#efe9df]/65">
          Todavía no enviaste ninguna propiedad para publicar. Si sos dueño, podés pedirlo en pocos minutos.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {publicaciones.map((sol) => {
            const estado = ESTADOS[sol.estado] ?? ESTADOS.pendiente;
            const creada = sol.estado === "aprobada" && sol.propiedadCreada && typeof sol.propiedadCreada === "object" ? sol.propiedadCreada : null;
            const monto = precio(sol);
            return (
              <li key={sol._id} className="flex flex-col gap-3 border-b border-[#efe9df]/12 py-7 first:pt-0">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  <div className="flex min-w-0 flex-col gap-1 [overflow-wrap:anywhere]">
                    <span className="text-[18px] text-[#efe9df]">{sol.titulo || sol.direccion}</span>
                    <span className="text-[14px] text-[#efe9df]/70">
                      <span className="capitalize">{sol.tipoPropiedad}</span> · {OPERACION[sol.operacion] ?? sol.operacion} · {sol.ciudad || "Libertador San Martín"}
                      {monto ? ` · ${monto}` : ""}
                    </span>
                  </div>
                  <span className={`calma-micro inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-[11px] ${estado.clase}`}>{estado.texto}</span>
                </div>
                <p className="m-0 text-[15px] leading-relaxed text-[#efe9df]/80">{estado.queSigue}</p>
                {sol.estado === "rechazada" && sol.motivoRechazo && (
                  <p className="m-0 whitespace-pre-wrap border-l border-[#d9382b]/60 pl-4 text-[15px] leading-relaxed text-[#efe9df]/80 [overflow-wrap:anywhere]">
                    {sol.motivoRechazo}
                  </p>
                )}
                {creada && deLaPropiedad(creada._id) && <EstadisticasPropiedad datos={deLaPropiedad(creada._id)!} dias={dias} />}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-[#efe9df]/50">
                  <span>Enviada el {new Date(sol.createdAt).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}</span>
                  {creada && (
                    <Link href={`/propiedades/${creada._id}`} className="calma-micro calma-link text-[11px] text-[#efe9df]">
                      Ver en el catálogo
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {publicaciones && otras.length > 0 && (
        <div className="flex flex-col gap-6">
          <h2 className="font-display m-0 text-[clamp(26px,2.4vw,32px)] font-normal leading-none">Otras propiedades a tu nombre</h2>
          <ul className="m-0 flex list-none flex-col p-0">
            {otras.map((p) => (
              <li key={p.id} className="flex flex-col gap-3 border-b border-[#efe9df]/12 py-7 first:pt-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                  <span className="text-[18px] text-[#efe9df] [overflow-wrap:anywhere]">{p.titulo}</span>
                  <Link href={`/propiedades/${p.id}`} className="calma-micro calma-link text-[11px] text-[#efe9df]">
                    Ver en el catálogo
                  </Link>
                </div>
                <EstadisticasPropiedad datos={p} dias={dias} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

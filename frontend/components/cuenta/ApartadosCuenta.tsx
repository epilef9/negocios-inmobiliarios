"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFavoritos } from "@/components/sitio/favoritos";
import { getMisReservas } from "@/services/reservas";
import { getMisSolicitudes } from "@/services/solicitudes";
import { getMisSolicitudesPublicacion } from "@/services/solicitudesPublicacion";

// Mi cuenta: accesos a cada apartado, con un resumen de lo que hay adentro (cuántas cosas y qué espera respuesta).

type Resumen = { total: number; pendientes: number } | null;

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

function Apartado({ href, titulo, descripcion, resumen }: { href: string; titulo: string; descripcion: string; resumen: string | null }) {
  return (
    <li className="min-w-0">
      <Link
        href={href}
        className="group flex h-full items-start justify-between gap-6 border-t border-[#efe9df]/15 py-7 transition-colors duration-500 hover:border-[#efe9df]/60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#efe9df]"
      >
        <span className="flex min-w-0 flex-col gap-3">
          <span className="calma-micro min-h-[1em] text-[11px] text-[#efe9df]/55" aria-live="polite">
            {resumen ?? " "}
          </span>
          <span className="font-display text-[clamp(28px,2.6vw,36px)] leading-none text-[#efe9df]">{titulo}</span>
          <span className="max-w-sm text-[14.5px] leading-relaxed text-[#efe9df]/65">{descripcion}</span>
        </span>
        <span
          aria-hidden="true"
          className="mt-6 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#efe9df]/30 text-[18px] text-[#efe9df]/80 transition-all duration-500 group-hover:translate-x-1 group-hover:border-[#efe9df] group-hover:bg-[#efe9df] group-hover:text-[#071733]"
        >
          →
        </span>
      </Link>
    </li>
  );
}

export default function ApartadosCuenta() {
  const { favoritos } = useFavoritos();
  const [reservas, setReservas] = useState<Resumen>(null);
  const [solicitudes, setSolicitudes] = useState<Resumen>(null);
  const [publicaciones, setPublicaciones] = useState<Resumen>(null);

  useEffect(() => {
    let activo = true;
    // Cada resumen llega por su lado; si uno falla, ese apartado se muestra sin números
    getMisReservas()
      .then((l) => activo && setReservas({ total: l.length, pendientes: l.filter((r) => r.estado === "pendiente").length }))
      .catch(() => {});
    getMisSolicitudes()
      .then((l) => activo && setSolicitudes({ total: l.length, pendientes: l.filter((s) => s.estado === "pendiente").length }))
      .catch(() => {});
    getMisSolicitudesPublicacion()
      .then((l) => activo && setPublicaciones({ total: l.length, pendientes: l.filter((p) => p.estado === "pendiente").length }))
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, []);

  const texto = (r: Resumen, uno: string, varios: string, pendiente: string) => {
    if (!r) return null;
    if (!r.total) return "Sin novedades";
    return r.pendientes ? `${plural(r.total, uno, varios)} · ${r.pendientes} ${pendiente}` : plural(r.total, uno, varios);
  };

  return (
    <nav aria-label="Apartados de tu cuenta">
      <ul className="m-0 grid list-none gap-x-12 p-0 md:grid-cols-2">
        <Apartado
          href="/reservas"
          titulo="Tus reservas"
          descripcion="Estadías en alquiler temporario: qué falta confirmar y cuándo te esperamos."
          resumen={texto(reservas, "reserva", "reservas", "por confirmar")}
        />
        <Apartado
          href="/solicitudes"
          titulo="Tus solicitudes"
          descripcion="Tus pedidos para alquilar o comprar y los mensajes de la inmobiliaria."
          resumen={texto(solicitudes, "solicitud", "solicitudes", "pendiente" + (solicitudes && solicitudes.pendientes > 1 ? "s" : ""))}
        />
        <Apartado
          href="/mis-publicaciones"
          titulo="Tus publicaciones"
          descripcion="Las propiedades que nos pediste publicar y en qué estado están."
          resumen={texto(publicaciones, "propiedad", "propiedades", "en revisión")}
        />
        <Apartado
          href="/favoritos"
          titulo="Tus favoritos"
          descripcion="Las propiedades que guardaste para volver a mirarlas."
          resumen={favoritos.size ? plural(favoritos.size, "guardada", "guardadas") : "Ninguna guardada"}
        />
      </ul>
    </nav>
  );
}

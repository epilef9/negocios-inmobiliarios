"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import SitioBase from "@/components/sitio/SitioBase";
import { useAuth } from "@/context/AuthContext";
import type { User } from "@/services/auth";

// Marco común de los apartados de Mi cuenta (reservas, solicitudes, publicaciones): mismo encabezado,
// enlace para volver y control de sesión. El contenido se arma solo con una cuenta de cliente.
export default function ApartadoCuenta({
  ruta,
  titulo,
  descripcion,
  children,
}: {
  ruta: string;
  titulo: string;
  descripcion: string;
  children: (user: User) => ReactNode;
}) {
  const { user, isLoading } = useAuth();

  return (
    <SitioBase pieSimple>
      <header className="encabezado-color encabezado-azul px-5 pb-12 pt-32 sm:px-10 lg:pt-40">
        <Link href="/perfil" className="calma-micro calma-link calma-link-sutil text-[13px] text-[#efe9df]/70">
          ← Mi cuenta
        </Link>
        <h1 className="font-display m-0 mt-8 text-[clamp(56px,8vw,112px)] font-normal leading-[0.9] tracking-[-0.02em]">{titulo}</h1>
        <p className="m-0 mt-5 max-w-xl text-[16px] leading-relaxed text-[#efe9df]/70">{descripcion}</p>
      </header>

      <div className="w-full max-w-4xl px-5 pb-24 pt-6 sm:px-10">
        {isLoading ? (
          <div aria-busy="true" aria-label="Comprobando tu cuenta" className="flex flex-col gap-4">
            <span className="calma-brillo h-24 w-full" />
            <span className="calma-brillo h-24 w-full" />
          </div>
        ) : !user ? (
          <div className="flex flex-col items-start gap-6 border-y border-[#efe9df]/15 py-14">
            <p className="font-display m-0 max-w-2xl text-[clamp(28px,3vw,40px)] leading-tight">Ingresá para ver este apartado.</p>
            <Link
              href={`/login?volver=${encodeURIComponent(ruta)}`}
              className="calma-micro flex items-center gap-2.5 rounded-full bg-[#efe9df] px-6 py-4 text-[12px] text-[#071733] transition-colors hover:bg-white"
            >
              <span className="calma-dot" aria-hidden="true" />
              Ingresar
            </Link>
          </div>
        ) : user.role === "admin" ? (
          <p className="m-0 text-[15px] text-[#efe9df]/70">
            Este apartado es para cuentas de cliente. Lo que cargan los clientes se gestiona desde el{" "}
            <Link href="/admin" className="calma-link">
              panel de administración
            </Link>
            .
          </p>
        ) : (
          children(user)
        )}
      </div>
    </SitioBase>
  );
}

"use client";

import Link from "next/link";
import SitioBase from "@/components/sitio/SitioBase";
import MisSolicitudes from "@/components/cuenta/MisSolicitudes";
import { useAuth } from "@/context/AuthContext";

export default function SolicitudesPage() {
  const { user, isLoading } = useAuth();
  return <SitioBase pieSimple>
    <header className="encabezado-color encabezado-azul px-5 pb-12 pt-32 sm:px-10 lg:pt-40">
      <Link href="/perfil#solicitudes" className="calma-micro calma-link calma-link-sutil text-[13px] text-[#efe9df]/70">← Volver a Mi cuenta</Link>
      <h1 className="font-display m-0 mt-8 text-[clamp(56px,8vw,112px)] font-normal leading-[0.9] tracking-[-0.02em]">Mis solicitudes</h1>
      <p className="m-0 mt-5 max-w-xl text-[16px] leading-relaxed text-[#efe9df]/70">Consultá el estado de tus solicitudes de alquiler o compra y las novedades de la inmobiliaria.</p>
    </header>
    <div className="px-5 pb-24 pt-10 sm:px-10">
      {isLoading ? <p role="status">Comprobando tu cuenta…</p>
        : !user ? <Link href="/login?volver=/solicitudes" className="calma-micro calma-link">Ingresá para consultar Mis solicitudes</Link>
        : user.role === "admin" ? <p>Esta sección está disponible para cuentas de cliente.</p>
        : <MisSolicitudes key={user.id} titulo={false} />}
    </div>
  </SitioBase>;
}

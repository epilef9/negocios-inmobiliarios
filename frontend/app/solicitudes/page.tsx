"use client";

import ApartadoCuenta from "@/components/cuenta/ApartadoCuenta";
import MisSolicitudes from "@/components/cuenta/MisSolicitudes";

export default function SolicitudesPage() {
  return (
    <ApartadoCuenta
      ruta="/solicitudes"
      titulo="Tus solicitudes"
      descripcion="El estado de tus pedidos para alquilar o comprar y los mensajes de la inmobiliaria."
    >
      {(user) => <MisSolicitudes key={user.id} titulo={false} />}
    </ApartadoCuenta>
  );
}

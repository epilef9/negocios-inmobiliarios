"use client";

import ApartadoCuenta from "@/components/cuenta/ApartadoCuenta";
import MisPublicaciones from "@/components/cuenta/MisPublicaciones";

export default function MisPublicacionesPage() {
  return (
    <ApartadoCuenta
      ruta="/mis-publicaciones"
      titulo="Tus publicaciones"
      descripcion="Las propiedades que nos pediste publicar y en qué estado está cada una."
    >
      {(user) => <MisPublicaciones key={user.id} />}
    </ApartadoCuenta>
  );
}

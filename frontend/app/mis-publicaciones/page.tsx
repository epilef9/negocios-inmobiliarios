"use client";

import ApartadoCuenta from "@/components/cuenta/ApartadoCuenta";
import MisPublicaciones from "@/components/cuenta/MisPublicaciones";

export default function MisPublicacionesPage() {
  return (
    <ApartadoCuenta
      ruta="/mis-publicaciones"
      titulo="Tus publicaciones"
      descripcion="Las propiedades que nos pediste publicar, en qué estado está cada una y cuánta gente las vio."
    >
      {(user) => <MisPublicaciones key={user.id} />}
    </ApartadoCuenta>
  );
}

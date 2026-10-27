"use client";

import ApartadoCuenta from "@/components/cuenta/ApartadoCuenta";
import MisVisitas from "@/components/cuenta/MisVisitas";

export default function VisitasPage() {
  return (
    <ApartadoCuenta
      ruta="/visitas"
      titulo="Tus visitas"
      descripcion="Las visitas que pediste para conocer una propiedad: día, hora y si ya están confirmadas."
    >
      {(user) => <MisVisitas key={user.id} />}
    </ApartadoCuenta>
  );
}

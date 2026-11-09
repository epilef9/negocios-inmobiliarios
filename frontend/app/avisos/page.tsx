"use client";

import ApartadoCuenta from "@/components/cuenta/ApartadoCuenta";
import MisAvisos from "@/components/cuenta/MisAvisos";

export default function AvisosPage() {
  return (
    <ApartadoCuenta ruta="/avisos" titulo="Tus avisos" descripcion="Propiedades que esperás y búsquedas guardadas: te escribimos por mail cuando haya novedades.">
      {(user) => <MisAvisos key={user.id} />}
    </ApartadoCuenta>
  );
}

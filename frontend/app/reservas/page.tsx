"use client";

import { useId } from "react";
import ApartadoCuenta from "@/components/cuenta/ApartadoCuenta";
import MisReservas from "@/components/cuenta/MisReservas";

export default function ReservasPage() {
  const id = useId();
  return (
    <ApartadoCuenta
      ruta="/reservas"
      titulo="Tus reservas"
      descripcion="Tus estadías en alquiler temporario: qué falta confirmar y cuándo te esperamos."
    >
      {(user) => <MisReservas key={user.id} id={id} titulo={false} />}
    </ApartadoCuenta>
  );
}

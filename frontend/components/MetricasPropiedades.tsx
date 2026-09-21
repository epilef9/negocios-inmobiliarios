"use client";

import { useEffect, useState } from "react";
import { getProperties, type ApiProperty } from "@/services/api";

const metricDefinitions = [
  { key: "venta", label: "Propiedades en venta" },
  { key: "alquiler", label: "Alquileres disponibles" },
  { key: "temporario", label: "Alquileres temporarios" },
] as const;

// Solo se cuentan propiedades que siguen disponibles
const isAvailable = (property: ApiProperty) =>
  !property.estado || property.estado === "disponible";

export default function MetricasPropiedades() {
  const [properties, setProperties] = useState<ApiProperty[]>([]);

  // Obtener las propiedades para calcular las métricas
  useEffect(() => {
    getProperties().then(setProperties).catch(() => setProperties([]));
  }, []);

  return (
    <div className="grid gap-5 border-b border-[#dbe5f6] py-14 sm:grid-cols-3 lg:py-16">
      {metricDefinitions.map(({ key, label }) => {
        const count = properties.filter(
          (property) =>
            isAvailable(property) && property.categoria_operacion === key,
        ).length;

        return (
          <div key={key} className="border-l-2 border-red-500 pl-5">
            <p className="text-3xl font-bold text-[#071a52]">{count}</p>
            <p className="mt-1 text-sm text-slate-500">{label}</p>
          </div>
        );
      })}
    </div>
  );
}
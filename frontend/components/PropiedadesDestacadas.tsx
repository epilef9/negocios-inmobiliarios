"use client";

import { useEffect, useState } from "react";
import PropiedadCard from "@/components/PropiedadCard";
import { getProperties, type ApiProperty } from "@/services/api";

export default function PropiedadesDestacadas() {
  const [properties, setProperties] = useState<ApiProperty[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProperties()
      .then((data) => setProperties(data.slice(0, 3)))
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "No se pudieron cargar las propiedades.");
      });
  }, []);

  if (error) {
    return <p className="col-span-full rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">{error}</p>;
  }

  if (properties.length === 0) {
    return <p className="col-span-full rounded-xl border border-[#dbe5f6] bg-white p-6 text-center text-sm text-slate-500">Cargando propiedades...</p>;
  }

  return (
    <>
      {properties.map((property) => (
        <PropiedadCard key={property._id} property={property} />
      ))}
    </>
  );
}
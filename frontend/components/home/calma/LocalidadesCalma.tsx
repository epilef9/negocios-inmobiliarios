'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ApiProperty } from '@/services/api';
import { LOCALIDADES_RESPALDO, normalizar, obtenerLocalidades, obtenerPropiedades } from '@/components/sitio/datos';

export default function LocalidadesCalma() {
  const [localidades, setLocalidades] = useState<string[]>(LOCALIDADES_RESPALDO);
  const [propiedades, setPropiedades] = useState<ApiProperty[] | null>(null);

  useEffect(() => {
    obtenerLocalidades().then(setLocalidades);
    obtenerPropiedades().then(setPropiedades).catch(() => setPropiedades(null));
  }, []);

  const cantidad = (nombre: string) =>
    propiedades ? propiedades.filter((p) => normalizar(p.ciudad) === normalizar(nombre)).length : null;

  return (
    <section aria-label="Localidades" className="grid border-y border-[#efe9df]/15 md:grid-cols-3">
      {localidades.map((nombre, indice) => {
        const total = cantidad(nombre);
        const esOficina = normalizar(nombre).includes('libertador');
        return (
          <Link
            key={nombre}
            href={`/propiedades?ubicacion=${encodeURIComponent(nombre)}`}
            className={`group flex min-h-[200px] flex-col justify-between gap-10 px-5 py-8 transition-colors duration-700 hover:bg-[#0b2048] sm:px-10 ${
              indice > 0 ? 'border-t border-[#efe9df]/15 md:border-l md:border-t-0' : ''
            }`}
          >
            <span className="calma-micro flex items-center gap-2 text-[#efe9df]/70">
              {esOficina && (
                <>
                  <span className="calma-dot" aria-hidden="true" />
                  Nuestra oficina
                </>
              )}
            </span>
            <span className="flex flex-col gap-2.5">
              <span className="font-display text-[clamp(40px,4vw,56px)] leading-none">
                {nombre}
              </span>
              <span className="text-[15px] text-[#efe9df]/70">
                {total === null ? 'Ver propiedades' : `${total} ${total === 1 ? 'propiedad publicada' : 'propiedades publicadas'}`}
              </span>
            </span>
          </Link>
        );
      })}
    </section>
  );
}

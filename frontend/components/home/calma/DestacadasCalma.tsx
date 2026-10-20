'use client';

import { useEffect, useRef, useState } from 'react';
import type { ApiProperty } from '@/services/api';
import { animarRevelados } from '@/components/sitio/motion';
import { obtenerPropiedades } from '@/components/sitio/datos';
import { useDolarBlue } from '@/components/sitio/precio';
import TarjetaPropiedad from '@/components/sitio/TarjetaPropiedad';

export default function DestacadasCalma() {
  const ref = useRef<HTMLDivElement>(null);
  const blue = useDolarBlue();
  const [propiedades, setPropiedades] = useState<ApiProperty[]>([]);
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando');

  useEffect(() => {
    obtenerPropiedades()
      .then((datos) => {
        setPropiedades(datos.slice(0, 3));
        setEstado('listo');
      })
      .catch(() => setEstado('error'));
  }, []);

  useEffect(() => {
    if (estado !== 'listo' || !ref.current) return;
    return animarRevelados(ref.current);
  }, [estado]);

  if (estado === 'error') {
    return (
      <p className="max-w-xl text-[17px] leading-relaxed text-[#efe9df]/70">
        No pudimos cargar las propiedades. Probá de nuevo en unos minutos o mirá el catálogo completo.
      </p>
    );
  }

  if (estado === 'cargando') {
    return (
      <div aria-busy="true" aria-label="Cargando propiedades" className="grid gap-6 lg:grid-cols-12">
        <div className="calma-brillo h-[min(600px,70vw)] lg:col-span-7" />
        <div className="hidden flex-col gap-8 pt-16 lg:col-span-5 lg:flex">
          <div className="calma-brillo h-[260px]" />
          <div className="calma-brillo h-[260px]" />
        </div>
      </div>
    );
  }

  if (propiedades.length === 0) {
    return <p className="text-[17px] text-[#efe9df]/70">Todavía no hay propiedades publicadas.</p>;
  }

  const [principal, ...resto] = propiedades;

  return (
    <div ref={ref} className="grid gap-10 lg:grid-cols-12 lg:gap-6">
      <div className="lg:col-span-7">
        <TarjetaPropiedad propiedad={principal} blue={blue} tamano="grande" />
      </div>
      {resto.length > 0 && (
        <div className="flex flex-col gap-10 lg:col-span-5 lg:gap-8 lg:pt-16">
          {resto.map((propiedad) => (
            <TarjetaPropiedad key={propiedad._id} propiedad={propiedad} blue={blue} />
          ))}
        </div>
      )}
    </div>
  );
}

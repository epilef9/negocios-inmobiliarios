'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { ApiProperty } from '@/services/api';
import { animarRevelados } from './motion';
import { etiquetaOperacion, obtenerPropiedades, precioVisible } from './datos';

function Tarjeta({ propiedad, grande }: { propiedad: ApiProperty; grande?: boolean }) {
  const imagen = propiedad.images?.[0];
  const operacion = etiquetaOperacion[propiedad.categoria_operacion || ''] ?? 'Propiedad';
  const lugar = propiedad.ciudad || propiedad.location;

  return (
    <Link href={`/propiedades/${propiedad._id}`} data-cursor="ver" className="group flex flex-col gap-[18px]">
      <div
        data-reveal="imagen"
        data-motion-hide
        className={`relative overflow-hidden bg-[#0e2652] ${grande ? 'h-[min(600px,70vw)]' : 'h-[min(260px,60vw)]'}`}
      >
        {imagen ? (
          <div data-parallax className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element -- las imágenes vienen del backend con dominio variable */}
            <img
              src={imagen}
              alt={propiedad.title}
              className="h-full w-full object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05] motion-reduce:transition-none"
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-[13px] text-[#efe9df]/70">Sin foto todavía</div>
        )}
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <span className="flex flex-col gap-1.5">
          <span className="calma-micro text-[#efe9df]/70">
            {operacion}
            {lugar ? ` en ${lugar}` : ''}
          </span>
          <span className={`font-display ${grande ? 'text-[34px]' : 'text-[28px]'} leading-tight`}>{propiedad.title}</span>
        </span>
        <span className="text-[15px]">{precioVisible(propiedad)}</span>
      </div>
    </Link>
  );
}

export default function DestacadasCalma() {
  const ref = useRef<HTMLDivElement>(null);
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
        <Tarjeta propiedad={principal} grande />
      </div>
      {resto.length > 0 && (
        <div className="flex flex-col gap-10 lg:col-span-5 lg:gap-8 lg:pt-16">
          {resto.map((propiedad) => (
            <Tarjeta key={propiedad._id} propiedad={propiedad} />
          ))}
        </div>
      )}
    </div>
  );
}

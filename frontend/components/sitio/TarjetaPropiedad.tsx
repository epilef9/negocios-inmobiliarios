'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ApiProperty } from '@/services/api';
import { etiquetaOperacion } from './datos';
import { datosCortos, etiquetaEstado, precioDePropiedad } from './precio';
import BotonFavorito from './BotonFavorito';

type Props = {
  propiedad: ApiProperty;
  blue: number | null;
  tamano?: 'grande' | 'normal' | 'compacta';
  // Con revelado, la foto entra como una persiana al aparecer (requiere un contenedor <Revelar>)
  revelar?: boolean;
};

const ALTO = {
  grande: 'h-[min(600px,70vw)]',
  normal: 'h-[min(260px,60vw)]',
  compacta: 'aspect-[4/3]',
};

export default function TarjetaPropiedad({ propiedad, blue, tamano = 'normal', revelar = true }: Props) {
  const imagen = propiedad.images?.[0];
  const operacion = etiquetaOperacion[propiedad.categoria_operacion || ''] ?? 'Propiedad';
  const lugar = propiedad.ciudad || propiedad.location;
  const precio = precioDePropiedad(propiedad, blue);
  const estado = propiedad.estado && propiedad.estado !== 'disponible' ? etiquetaEstado[propiedad.estado] : null;
  const datos = datosCortos(propiedad);
  // Si la foto no carga (enlace roto), se muestra el mismo aviso que cuando no hay foto
  const [fotoRota, setFotoRota] = useState(false);
  const grande = tamano === 'grande';

  return (
    // El corazón va fuera del enlace: un botón no puede estar dentro de un <a>
    <div className="relative">
    <Link href={`/propiedades/${propiedad._id}`} data-cursor="ver" className="group flex flex-col gap-[18px]">
      <div
        data-reveal={revelar ? 'imagen' : undefined}
        data-motion-hide={revelar ? '' : undefined}
        className={`relative overflow-hidden bg-[#0e2652] ${ALTO[tamano]}`}
      >
        {imagen && !fotoRota ? (
          <div data-parallax={revelar ? '' : undefined} className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element -- las imágenes vienen del backend con dominio variable */}
            <img
              src={imagen}
              alt={propiedad.title}
              loading="lazy"
              onError={() => setFotoRota(true)}
              className="h-full w-full object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05] motion-reduce:transition-none"
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-[13px] text-[#efe9df]/70">Sin foto todavía</div>
        )}
        {estado && (
          <span className="calma-micro absolute left-4 top-4 rounded-full bg-[#efe9df] px-3 py-1.5 text-[#071733]">{estado}</span>
        )}
      </div>
      {/* En la tarjeta grande el precio va a la derecha; en las demás, debajo de los datos y alineado a la izquierda */}
      <div className={grande ? 'flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2' : 'flex flex-col gap-3'}>
        <span className="flex min-w-0 flex-col gap-1.5">
          <span className="calma-micro text-[#efe9df]/70">
            {operacion}
            {lugar ? ` en ${lugar}` : ''}
          </span>
          <span className={`font-display leading-tight ${grande ? 'text-[34px]' : 'text-[26px]'}`}>{propiedad.title}</span>
          {!grande && datos.length > 0 && (
            <span className="flex flex-wrap gap-x-3 text-[14px] text-[#efe9df]/70">
              {datos.map((dato) => (
                <span key={dato}>{dato}</span>
              ))}
            </span>
          )}
        </span>
        <span className={`flex flex-col items-start gap-0.5 ${grande ? 'sm:items-end' : ''}`}>
          <span className="text-[15px]">{precio.principal}</span>
          {precio.referencia && <span className="text-[13px] text-[#efe9df]/60">{precio.referencia}</span>}
        </span>
      </div>
    </Link>
    <BotonFavorito propiedadId={propiedad._id} titulo={propiedad.title} className="absolute right-4 top-4 z-10" />
    </div>
  );
}

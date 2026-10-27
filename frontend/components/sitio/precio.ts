'use client';

import { useEffect, useState } from 'react';
import { getDolarBlueQuote, type ApiProperty } from '@/services/api';

const formato = (valor: number) => Math.round(valor).toLocaleString('es-AR');

// Cotización del dólar blue de hoy (una sola consulta compartida). null mientras carga o si falla.
export function useDolarBlue() {
  const [venta, setVenta] = useState<number | null>(null);
  useEffect(() => {
    let activo = true;
    getDolarBlueQuote()
      .then((cotizacion) => activo && setVenta(cotizacion.venta))
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, []);
  return venta;
}

export type PrecioMostrado = {
  principal: string;
  referencia?: string;
  // Con descuento vigente (HU-12): el precio de antes, para mostrarlo tachado, y el porcentaje
  anterior?: string;
  descuento?: number;
};

// Porcentaje de descuento que corre hoy (0 si no hay o ya venció). La fecha "hasta" incluye ese día entero.
export function descuentoVigente(p: Pick<ApiProperty, 'descuento'>, ahora = new Date()): number {
  const d = p.descuento;
  if (!d || !(d.porcentaje > 0)) return 0;
  if (d.hasta) {
    const fin = new Date(d.hasta);
    fin.setUTCHours(23, 59, 59, 999);
    if (fin.getTime() < ahora.getTime()) return 0;
  }
  return Math.min(90, d.porcentaje);
}

// Precio principal en la moneda publicada y su equivalente con el blue del día (RF-18 / HU-17).
// Si la cotización no está disponible, se usa el valor guardado al publicar.
export function precioDePropiedad(p: ApiProperty, blue: number | null): PrecioMostrado {
  const operacion = p.categoria_operacion || p.operation || '';
  const sufijo = operacion === 'alquiler' ? ' por mes' : '';

  if (operacion === 'temporario' && p.precioPorNocheUSD) {
    const ars = blue ? p.precioPorNocheUSD * blue : undefined;
    return {
      principal: `USD ${formato(p.precioPorNocheUSD)} por noche`,
      referencia: ars ? `ARS ${formato(ars)} con el blue de hoy` : undefined,
    };
  }

  const descuento = descuentoVigente(p);
  const factor = 1 - descuento / 100;
  const conDescuento = (texto: string) => (descuento ? { anterior: texto, descuento } : {});

  if (p.moneda === 'ARS') {
    const pesos = p.priceARS ?? p.price;
    return { principal: `ARS ${formato(pesos * factor)}${sufijo}`, ...conDescuento(`ARS ${formato(pesos)}`) };
  }

  const ars = blue ? p.price * factor * blue : p.priceARS ? p.priceARS * factor : undefined;
  return {
    principal: `USD ${formato(p.price * factor)}${sufijo}`,
    referencia: ars ? `ARS ${formato(ars)}${blue ? ' con el blue de hoy' : ' aprox.'}` : undefined,
    ...conDescuento(`USD ${formato(p.price)}`),
  };
}

export const etiquetaTipo: Record<string, string> = {
  casa: 'Casa',
  departamento: 'Departamento',
  monoambiente: 'Departamento',
  local: 'Local',
  terreno: 'Terreno',
};

export const etiquetaEstado: Record<string, string> = {
  disponible: 'Disponible',
  reservado: 'Reservada',
  alquilado: 'Alquilada',
  vendido: 'Vendida',
};

// Datos cortos para la tarjeta: ambientes, baños y superficie
export function datosCortos(p: ApiProperty) {
  const datos: string[] = [];
  const ambientes = p.cantidad_ambientes ?? p.bedrooms;
  if (p.tipo_inmueble !== 'terreno' && ambientes) datos.push(`${ambientes} amb.`);
  if (p.tipo_inmueble !== 'terreno' && p.bathrooms) datos.push(`${p.bathrooms} ${p.bathrooms === 1 ? 'baño' : 'baños'}`);
  if (p.area) datos.push(`${p.area} m²`);
  return datos;
}

'use client';

import { useEffect, useState } from 'react';
import { getDolarBlueQuote, type ApiProperty, type Operacion } from '@/services/api';
import { operacionesDe, precioDe, principalDe, tieneOperacion } from './operaciones';

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

// Precio de una operación en la moneda publicada y su equivalente con el blue del día (RF-18 / HU-17).
// Sin operación (o si la propiedad no la tiene), el de la operación principal. Con venta y alquiler (HU-25)
// cada una tiene su precio. Si la cotización no está disponible, se usa el valor guardado al publicar.
export function precioDePropiedad(p: ApiProperty, blue: number | null, operacionPedida?: string): PrecioMostrado {
  const operacion: Operacion = operacionPedida && tieneOperacion(p, operacionPedida) ? (operacionPedida as Operacion) : principalDe(p);
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
  const precio = precioDe(p, operacion) ?? { price: p.price, moneda: p.moneda === 'ARS' ? 'ARS' : 'USD', priceARS: p.priceARS };

  if (precio.moneda === 'ARS') {
    const pesos = precio.priceARS ?? precio.price;
    return { principal: `ARS ${formato(pesos * factor)}${sufijo}`, ...conDescuento(`ARS ${formato(pesos)}`) };
  }

  const ars = blue ? precio.price * factor * blue : precio.priceARS ? precio.priceARS * factor : undefined;
  return {
    principal: `USD ${formato(precio.price * factor)}${sufijo}`,
    referencia: ars ? `ARS ${formato(ars)}${blue ? ' con el blue de hoy' : ' aprox.'}` : undefined,
    ...conDescuento(`USD ${formato(precio.price)}`),
  };
}

// HU-25: el precio de cada operación de la propiedad (una sola, o venta y alquiler)
export function preciosDePropiedad(p: ApiProperty, blue: number | null): (PrecioMostrado & { operacion: Operacion })[] {
  return operacionesDe(p).map((operacion) => ({ operacion, ...precioDePropiedad(p, blue, operacion) }));
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

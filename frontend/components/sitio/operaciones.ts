// HU-25 / RF-03: una propiedad puede estar en venta y en alquiler al mismo tiempo, cada una con su precio.
// El alquiler temporario va solo. Mismas reglas que backend/src/utils/operaciones.js; también entienden las
// propiedades cargadas antes del cambio (solo categoria_operacion y price).
import type { ApiProperty, Operacion, PrecioOperacion } from '@/services/api';

type ConOperaciones = Pick<ApiProperty, 'operaciones' | 'categoria_operacion' | 'precios' | 'price' | 'moneda' | 'priceARS' | 'estado' | 'vendida'> & {
  operation?: string;
  category?: string;
};

const TODAS: Operacion[] = ['venta', 'alquiler', 'temporario'];
// Mismos textos que etiquetaOperacion de datos.ts (este archivo no depende de código de cliente)
const ETIQUETA: Record<Operacion, string> = { venta: 'Venta', alquiler: 'Alquiler', temporario: 'Por días' };
const esOperacion = (v: unknown): v is Operacion => TODAS.includes(v as Operacion);

// Operaciones de la propiedad, en orden (venta antes que alquiler)
export function operacionesDe(p: Partial<ConOperaciones>): Operacion[] {
  const lista = (p.operaciones ?? []).filter(esOperacion);
  if (lista.includes('temporario')) return ['temporario'];
  if (lista.length) return (['venta', 'alquiler'] as Operacion[]).filter((o) => lista.includes(o));
  const vieja = p.categoria_operacion || p.operation || p.category;
  return esOperacion(vieja) ? [vieja] : [];
}

export const principalDe = (p: Partial<ConOperaciones>): Operacion => operacionesDe(p)[0] ?? 'venta';

export const tieneOperacion = (p: Partial<ConOperaciones>, operacion: string) => operacionesDe(p).includes(operacion as Operacion);

// Precio de una operación, o null si no lo tiene
export function precioDe(p: Partial<ConOperaciones>, operacion: Operacion): Required<Pick<PrecioOperacion, 'price' | 'moneda'>> & PrecioOperacion | null {
  const guardado = operacion === 'venta' || operacion === 'alquiler' ? p.precios?.[operacion] : undefined;
  if (guardado && typeof guardado.price === 'number') return { ...guardado, price: guardado.price, moneda: guardado.moneda === 'ARS' ? 'ARS' : 'USD' };
  if (principalDe(p) === operacion && typeof p.price === 'number') return { price: p.price, moneda: p.moneda === 'ARS' ? 'ARS' : 'USD', priceARS: p.priceARS };
  return null;
}

// Precio en dólares de la operación (para ordenar y filtrar). Sin operación, el de la principal.
export function precioEnDolares(p: Partial<ConOperaciones>, operacion?: string): number | undefined {
  const o = operacion && tieneOperacion(p, operacion) ? (operacion as Operacion) : principalDe(p);
  return o === 'temporario' ? p.price : precioDe(p, o)?.price;
}

// Operaciones que siguen abiertas según el estado de la propiedad entera: reservada, vendida o alquilada cierra todo,
// salvo la venta con inquilino adentro (HU-28): alquilada y en venta, se puede seguir vendiendo.
export function operacionesAbiertas(p: Partial<ConOperaciones>): Operacion[] {
  const operaciones = operacionesDe(p);
  const estado = p.estado || 'disponible';
  if (estado === 'disponible') return operaciones;
  if (estado === 'alquilado' && operaciones.includes('venta') && !p.vendida) return ['venta'];
  return [];
}

// «Venta», «Alquiler», «Venta y alquiler» o «Por días»
export function etiquetaOperaciones(p: Partial<ConOperaciones>, vacia = 'Propiedad'): string {
  const lista = operacionesDe(p);
  if (!lista.length) return vacia;
  if (lista.length === 2) return 'Venta y alquiler';
  return ETIQUETA[lista[0]];
}

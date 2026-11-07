// Consultas que hace el servidor de Next (metadatos para compartir, sitemap). No usar desde el navegador.
import type { ApiProperty, Operacion } from './api';
import { operacionesDe, precioDe } from '@/components/sitio/operaciones';

// Dirección pública del sitio, para los links absolutos que leen Google y WhatsApp
export const urlSitio = () =>
  (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'http://localhost:3000'
  ).replace(/\/$/, '');

// La API vista desde el servidor: en Vercel es el mismo dominio (/api); en local, el backend en :4000
const apiServidor = () => {
  const publica = process.env.NEXT_PUBLIC_API_URL;
  if (publica && /^https?:\/\//.test(publica)) return publica.replace(/\/$/, '');
  return process.env.NODE_ENV === 'production' ? `${urlSitio()}/api` : 'http://localhost:4000/api';
};

async function leer<T>(ruta: string, segundos = 300): Promise<T | null> {
  try {
    const respuesta = await fetch(`${apiServidor()}${ruta}`, { next: { revalidate: segundos }, signal: AbortSignal.timeout(5000) });
    if (!respuesta.ok) return null;
    const cuerpo = (await respuesta.json()) as { data?: T };
    return cuerpo.data ?? null;
  } catch {
    return null;
  }
}

export const propiedadEnServidor = (id: string) => (/^[a-f\d]{24}$/i.test(id) ? leer<ApiProperty>(`/properties/${id}`) : Promise.resolve(null));
export const propiedadesEnServidor = () => leer<ApiProperty[]>('/properties', 600);

// Texto corto para buscadores y vistas previas: "Venta · Casa · 3 amb. · 120 m² · USD 95.000"
// Con venta y alquiler (HU-25): "Venta y alquiler · Casa · … · USD 95.000 · ARS 650.000 por mes"
export function resumenPropiedad(p: ApiProperty) {
  const operaciones = operacionesDe(p).length ? operacionesDe(p) : ['venta' as const];
  const operacion = operaciones.length === 2 ? 'Venta y alquiler' : operaciones[0] === 'alquiler' ? 'Alquiler' : operaciones[0] === 'temporario' ? 'Alquiler por días' : 'Venta';
  const TIPOS: Record<string, string> = { casa: 'Casa', departamento: 'Departamento', monoambiente: 'Monoambiente', local: 'Local', terreno: 'Terreno' };
  const tipo = TIPOS[p.tipoInmueble || ''] ?? '';
  const textoPrecio = (o: Operacion) => {
    if (o === 'temporario' && p.precioPorNocheUSD) return `USD ${Math.round(p.precioPorNocheUSD).toLocaleString('es-AR')} por noche`;
    const precio = precioDe(p, o) ?? { precio: p.precio, moneda: p.moneda === 'ARS' ? 'ARS' : 'USD', precioARS: p.precioARS };
    const sufijo = o === 'alquiler' ? ' por mes' : '';
    return precio.moneda === 'ARS'
      ? `ARS ${Math.round(precio.precioARS ?? precio.precio).toLocaleString('es-AR')}${sufijo}`
      : `USD ${Math.round(precio.precio).toLocaleString('es-AR')}${sufijo}`;
  };
  const partes = [
    operacion,
    tipo,
    p.tipoInmueble !== 'terreno' && p.ambientes ? `${p.ambientes} amb.` : '',
    p.area ? `${p.area} m²` : '',
    ...operaciones.map(textoPrecio),
    p.ciudad || '',
  ].filter(Boolean);
  return partes.join(' · ');
}

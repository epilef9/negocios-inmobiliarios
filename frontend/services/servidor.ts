// Consultas que hace el servidor de Next (metadatos para compartir, sitemap). No usar desde el navegador.
import type { ApiProperty } from './api';

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
export function resumenPropiedad(p: ApiProperty) {
  const operacion = p.categoria_operacion === 'alquiler' ? 'Alquiler' : p.categoria_operacion === 'temporario' ? 'Alquiler por días' : 'Venta';
  const TIPOS: Record<string, string> = { casa: 'Casa', departamento: 'Departamento', monoambiente: 'Monoambiente', local: 'Local', terreno: 'Terreno' };
  const tipo = TIPOS[p.tipo_inmueble || ''] ?? '';
  const precio =
    p.categoria_operacion === 'temporario' && p.precioPorNocheUSD
      ? `USD ${Math.round(p.precioPorNocheUSD).toLocaleString('es-AR')} por noche`
      : p.moneda === 'ARS'
        ? `ARS ${Math.round(p.priceARS ?? p.price).toLocaleString('es-AR')}${p.categoria_operacion === 'alquiler' ? ' por mes' : ''}`
        : `USD ${Math.round(p.price).toLocaleString('es-AR')}${p.categoria_operacion === 'alquiler' ? ' por mes' : ''}`;
  const partes = [
    operacion,
    tipo,
    p.tipo_inmueble !== 'terreno' && p.cantidad_ambientes ? `${p.cantidad_ambientes} amb.` : '',
    p.area ? `${p.area} m²` : '',
    precio,
    p.ciudad || '',
  ].filter(Boolean);
  return partes.join(' · ');
}

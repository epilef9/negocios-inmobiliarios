// Páginas por localidad y operación para buscadores (por ejemplo /inmuebles/alquileres-en-crespo).
// Cada una tiene su propio texto y muestra las propiedades de esa localidad.

export type OperacionSeo = { slug: string; categoria: 'venta' | 'alquiler' | 'temporario'; titulo: string };
export type LocalidadSeo = { slug: string; nombre: string; coincide: string; texto: string; operaciones: OperacionSeo[] };

const OPERACIONES: OperacionSeo[] = [
  { slug: 'alquileres', categoria: 'alquiler', titulo: 'Alquileres' },
  { slug: 'venta', categoria: 'venta', titulo: 'Propiedades en venta' },
  { slug: 'alquiler-temporario', categoria: 'temporario', titulo: 'Alquiler por días' },
];

export const LOCALIDADES_SEO: LocalidadSeo[] = [
  {
    slug: 'libertador-san-martin',
    nombre: 'Villa Libertador San Martín',
    coincide: 'libertador',
    texto:
      'Libertador San Martín es una ciudad tranquila y arbolada, a pocas cuadras de la Universidad Adventista del Plata y del Sanatorio Adventista. Muchas familias, estudiantes y profesionales de la salud buscan casa o departamento acá: te ayudamos a encontrar el que te queda cerca de lo que necesitás.',
    operaciones: OPERACIONES,
  },
  {
    slug: 'crespo',
    nombre: 'Crespo',
    coincide: 'crespo',
    texto:
      'Crespo combina la vida de pueblo con todos los servicios de una ciudad: comercios, escuelas y salida rápida a Paraná por la ruta 12. Mostramos casas, departamentos y terrenos verificados por la inmobiliaria.',
    operaciones: OPERACIONES,
  },
  {
    slug: 'diamante',
    nombre: 'Diamante',
    coincide: 'diamante',
    texto:
      'Diamante, sobre las barrancas del Paraná, es ideal para vivir cerca del río o pasar unos días de descanso. Encontrá alquileres, propiedades en venta y alojamientos por días.',
    operaciones: OPERACIONES,
  },
];

// "/inmuebles/alquileres-en-crespo" → localidad y operación
export function paginaSeo(slug: string) {
  for (const localidad of LOCALIDADES_SEO) {
    for (const operacion of localidad.operaciones) {
      if (`${operacion.slug}-en-${localidad.slug}` === slug) return { localidad, operacion };
    }
  }
  return null;
}

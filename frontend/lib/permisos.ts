// Permisos del panel en la pantalla. Es solo para mostrar u ocultar: el control de verdad lo hace el backend en cada ruta.
// Las claves coinciden con backend/src/utils/permisos.js.

type ConRol = { rol?: string; permisos?: string[] } | null | undefined;

export const SECCIONES_CON_PERMISO = [
  'propiedades', 'estadisticas', 'visitas', 'horario', 'reservas', 'disponibilidad', 'senas',
  'solicitudes', 'clientes', 'contratos', 'cobros', 'publicaciones', 'requisitos',
] as const;
export type Seccion = (typeof SECCIONES_CON_PERMISO)[number];

// Cómo se llama cada sección en la pantalla de empleados (mismos nombres que el menú del panel)
export const ETIQUETAS_SECCION: Record<Seccion, string> = {
  propiedades: 'Propiedades', estadisticas: 'Estadísticas', visitas: 'Visitas', horario: 'Horario de visitas',
  reservas: 'Reservas', disponibilidad: 'Disponibilidad', senas: 'Reservas con seña', solicitudes: 'Solicitudes',
  clientes: 'Clientes', contratos: 'Contratos', cobros: 'Cobros', publicaciones: 'Publicaciones', requisitos: 'Requisitos',
};

export const esAdmin = (user: ConRol) => user?.rol === 'admin';
// Personal del panel: administrador o empleado
export const esPersonal = (user: ConRol) => user?.rol === 'admin' || user?.rol === 'empleado';

export const puedeVer = (user: ConRol, seccion: Seccion) =>
  esAdmin(user) || (user?.rol === 'empleado' && Array.isArray(user.permisos) && user.permisos.includes(seccion));

// De qué sección es una ruta del panel. Inicio (/admin) y la bienvenida las ve todo el personal;
// Configuración, Datos del sitio, Catálogo, Empleados y Actividad son solo del administrador.
export const seccionDeRuta = (ruta: string): Seccion | 'solo-admin' | null => {
  const parte = ruta.replace(/^\/admin\/?/, '').split('/')[0];
  if (!parte || parte === 'bienvenida') return null;
  return (SECCIONES_CON_PERMISO as readonly string[]).includes(parte) ? (parte as Seccion) : 'solo-admin';
};

export const puedeEntrarARuta = (user: ConRol, ruta: string) => {
  const seccion = seccionDeRuta(ruta);
  if (seccion === null) return esPersonal(user);
  if (seccion === 'solo-admin') return esAdmin(user);
  return puedeVer(user, seccion);
};

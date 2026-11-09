// Permisos del panel por sección. El administrador tiene todos; el empleado, solo los que el admin le marcó.
// Cada ruta del backend controla el permiso (middleware requirePermiso): ocultar el menú no alcanza.
// Las claves coinciden con las secciones del menú del panel. Configuración, Datos del sitio, Catálogo,
// Empleados y Actividad son solo del administrador y no figuran acá.

const SECCIONES = [
    { clave: 'propiedades', etiqueta: 'Propiedades' },
    { clave: 'estadisticas', etiqueta: 'Estadísticas' },
    { clave: 'visitas', etiqueta: 'Visitas' },
    { clave: 'horario', etiqueta: 'Horario de visitas' },
    { clave: 'reservas', etiqueta: 'Reservas por días' },
    { clave: 'disponibilidad', etiqueta: 'Disponibilidad' },
    { clave: 'senas', etiqueta: 'Reservas con seña' },
    { clave: 'solicitudes', etiqueta: 'Solicitudes' },
    { clave: 'clientes', etiqueta: 'Clientes' },
    { clave: 'contratos', etiqueta: 'Contratos' },
    { clave: 'cobros', etiqueta: 'Cobros' },
    { clave: 'publicaciones', etiqueta: 'Publicaciones' },
    { clave: 'requisitos', etiqueta: 'Requisitos' },
];

const CLAVES = SECCIONES.map((s) => s.clave);

// Permisos que se dan a un empleado nuevo si el admin no marca ninguno: ninguno (ve solo el Inicio)
const PERMISOS_POR_DEFECTO = [];

const esAdmin = (user) => Boolean(user) && user.rol === 'admin';
const esEmpleado = (user) => Boolean(user) && user.rol === 'empleado' && user.activo !== false;
// Personal del panel: administrador o empleado activo
const esPersonal = (user) => esAdmin(user) || esEmpleado(user);

const tienePermiso = (user, seccion) => {
    if (esAdmin(user)) return true;
    return esEmpleado(user) && Array.isArray(user.permisos) && user.permisos.includes(seccion);
};

// Deja solo claves válidas y sin repetir
const limpiarPermisos = (lista) => {
    if (!Array.isArray(lista)) return [];
    return [...new Set(lista.filter((p) => typeof p === 'string' && CLAVES.includes(p)))];
};

module.exports = { SECCIONES, CLAVES, PERMISOS_POR_DEFECTO, esAdmin, esEmpleado, esPersonal, tienePermiso, limpiarPermisos };

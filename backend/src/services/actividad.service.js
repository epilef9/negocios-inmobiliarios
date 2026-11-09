const Actividad = require('../models/actividad.model');

// De qué sección del panel es cada tipo de registro (para saber quién puede verlo). 'empleado' es solo del administrador.
const SECCION_DE = { visita: 'visitas', reserva: 'reservas', sena: 'senas', solicitud: 'solicitudes', propiedad: 'propiedades', publicacion: 'publicaciones' };

const nombreDe = (user) => `${user.nombre || ''} ${user.apellido || ''}`.trim() || user.email || 'Sin nombre';

// Guarda un registro. Nunca hace fallar la acción que se está registrando: si no se puede guardar, solo avisa en el log.
const registrar = async (user, { entidad, entidadId = null, accion, detalle = '' }) => {
    if (!user || !accion) return null;
    try {
        return await Actividad.create({
            usuario: user._id,
            usuarioNombre: nombreDe(user),
            usuarioRol: user.rol,
            accion,
            entidad,
            entidadId: entidadId ? String(entidadId) : null,
            detalle: String(detalle || '').slice(0, 300),
        });
    } catch (error) {
        console.error('[actividad] No se pudo registrar:', error.message);
        return null;
    }
};

const formatear = (a) => ({
    id: String(a._id),
    accion: a.accion,
    entidad: a.entidad,
    entidadId: a.entidadId,
    detalle: a.detalle || '',
    por: a.usuarioNombre || 'Sin nombre',
    rol: a.usuarioRol || '',
    fecha: a.createdAt,
});

const deUnaEntidad = async (entidad, entidadId, limite = 50) =>
    (await Actividad.find({ entidad, entidadId: String(entidadId) }).sort({ createdAt: -1 }).limit(limite).lean()).map(formatear);

const recientes = async ({ limite = 100, entidad } = {}) =>
    (await Actividad.find(entidad ? { entidad } : {}).sort({ createdAt: -1 }).limit(Math.min(limite, 300)).lean()).map(formatear);

module.exports = { SECCION_DE, registrar, deUnaEntidad, recientes, formatear };

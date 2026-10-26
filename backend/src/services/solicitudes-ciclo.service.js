const Solicitud = require('../models/solicitud.model');
const User = require('../models/user.model');
const email = require('./email.service');
const { urlFrontend } = require('../config/env');

const DIAS_VENCIMIENTO_SOLICITUD = 60;
const DIAS_VISIBILIDAD_COMENTARIOS = 90;
const MAXIMO_COMENTARIO = 500;
const DIA = 86400000;
const MENSAJE_CIERRE = 'La propiedad ya no está disponible';

const mensajesCliente = (solicitud, ahora = new Date()) => (solicitud.historialEstados || [])
    .filter((cambio) => cambio.comentario?.trim() && !Number.isInteger(cambio.comentarioReferenciaIndice)
        && new Date(cambio.fecha).getTime() >= ahora.getTime() - DIAS_VISIBILIDAD_COMENTARIOS * DIA)
    .map(({ estado, comentario, fecha }) => ({ estado, comentario, fecha }))
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

const cambioAutomatico = (solicitud, propiedad, ahora = new Date()) => {
    if (solicitud.estado !== 'pendiente') return null;
    if (['vendido', 'alquilado'].includes(propiedad?.estado)) {
        return { estado: 'cerrada', comentario: MENSAJE_CIERRE, fecha: ahora };
    }
    const inicio = new Date(solicitud.reactivadaAt || solicitud.createdAt).getTime();
    const respondida = (solicitud.historialEstados || []).some((cambio) =>
        cambio.comentario?.trim() && !cambio.automatico && new Date(cambio.fecha).getTime() > inicio);
    if (!respondida && Number.isFinite(inicio) && ahora.getTime() >= inicio + DIAS_VENCIMIENTO_SOLICITUD * DIA) {
        return { estado: 'vencida', comentario: '', fecha: new Date(inicio + DIAS_VENCIMIENTO_SOLICITUD * DIA) };
    }
    return null;
};

// Se espera el envío también en Vercel. Un fallo del proveedor no revierte el cambio guardado.
const avisarCambio = async (solicitud) => {
    try {
        const usuario = await User.findById(solicitud.usuario).select('email nombre').lean();
        if (!usuario?.email) return;
        const ultimo = [...(solicitud.historialEstados || [])].reverse().find((item) => item.comentario?.trim());
        await email.avisarEstadoSolicitud({ para: usuario.email, nombre: usuario.nombre,
            estado: solicitud.estado, mensaje: ultimo?.comentario || solicitud.comentarioEstado || '',
            enlace: `${urlFrontend()}/solicitudes` });
    } catch (error) {
        console.error('[solicitudes] Estado guardado; no se pudo enviar el aviso por mail:', error.name);
    }
};

const sincronizarSolicitud = async (solicitud, propiedad, ahora = new Date()) => {
    const cambio = cambioAutomatico(solicitud, propiedad, ahora);
    if (!cambio) return solicitud;
    // El historial y la fecha actúan como control optimista: una respuesta concurrente gana al vencimiento.
    const filtro = { _id: solicitud._id, estado: 'pendiente',
        historialEstados: solicitud.historialEstados || [] };
    if (solicitud.updatedAt) filtro.updatedAt = solicitud.updatedAt;
    const actualizada = await Solicitud.findOneAndUpdate(filtro, {
        $set: { estado: cambio.estado, ...(cambio.comentario ? { comentarioEstado: cambio.comentario } : {}) },
        $push: { historialEstados: { ...cambio, automatico: true } },
    }, { new: true, runValidators: true }).select('+datosCifrados').lean();
    if (actualizada) {
        await avisarCambio(actualizada);
        return { ...actualizada, propiedad: solicitud.propiedad };
    }
    return await Solicitud.findById(solicitud._id).select('+datosCifrados').lean() || solicitud;
};

const cerrarPorPropiedad = async (propiedad) => {
    if (!propiedad || !['vendido', 'alquilado'].includes(propiedad.estado)) return;
    const pendientes = await Solicitud.find({ propiedad: propiedad._id, estado: 'pendiente' }).lean();
    for (const solicitud of pendientes) await sincronizarSolicitud(solicitud, propiedad);
};

module.exports = { DIAS_VENCIMIENTO_SOLICITUD, DIAS_VISIBILIDAD_COMENTARIOS, MAXIMO_COMENTARIO,
    mensajesCliente, cambioAutomatico, sincronizarSolicitud, cerrarPorPropiedad, avisarCambio };

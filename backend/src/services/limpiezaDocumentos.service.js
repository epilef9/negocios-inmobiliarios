const mongoose = require('mongoose');
const Solicitud = require('../models/solicitud.model');
const SolicitudNotificacion = require('../models/solicitud-notificacion.model');
const Contrato = require('../models/contrato.model');

// Solicitudes ya resueltas (rechazadas, vencidas o cerradas): a los 90 días se borran enteras, con su documentación,
// en vez de quedar archivadas. Si una solicitud se usó para un contrato, se borran solo los archivos y queda el
// registro (el contrato la referencia).
// Plazo de conservación de la documentación de solicitudes ya resueltas.
// Tiene que coincidir con lo que dice la Política de privacidad (sección «Cuánto tiempo los guardamos»).
const DIAS_CONSERVACION = 90;
const ESTADOS_CERRADOS = ['rechazada', 'vencida', 'cerrada'];
const DIA = 86400000;
const LOTE = 50;

// Cuándo quedó la solicitud en su estado actual (el último cambio a ese estado; si no hay historial, su última modificación)
const fechaDeCierre = (solicitud) => {
    const cambios = (solicitud.historialEstados || []).filter((c) => c.estado === solicitud.estado);
    const fechas = cambios.map((c) => new Date(c.fecha).getTime()).filter(Number.isFinite);
    if (fechas.length) return new Date(Math.max(...fechas));
    return new Date(solicitud.updatedAt || solicitud.createdAt);
};

const cumplioPlazo = (solicitud, ahora = new Date()) =>
    ESTADOS_CERRADOS.includes(solicitud.estado)
    && ahora.getTime() - fechaDeCierre(solicitud).getTime() >= DIAS_CONSERVACION * DIA;

// Documentos para borrar (solicitudes que quedan porque las usa un contrato)
const corresponde = (solicitud, ahora = new Date()) =>
    cumplioPlazo(solicitud, ahora) && Array.isArray(solicitud.documentos) && solicitud.documentos.length > 0;

// Borra de GridFS los archivos de UNA solicitud y la deja sin documentos, con la fecha de borrado.
// Solo toca archivos cuyo metadata.solicitud es esa solicitud. Es repetible: si se corta a la mitad,
// la próxima corrida termina el trabajo.
const borrarDocumentosDe = async (solicitud, ahora = new Date()) => {
    const db = mongoose.connection.db;
    const ids = [...new Set(solicitud.documentos.map((d) => String(d.archivoId)))]
        .filter((id) => mongoose.isValidObjectId(id))
        .map((id) => new mongoose.Types.ObjectId(id));
    const propios = ids.length
        ? await db.collection('documentosSolicitudes.files')
            .find({ _id: { $in: ids }, 'metadata.solicitud': String(solicitud._id) }, { projection: { _id: 1 } }).toArray()
        : [];
    const idsPropios = propios.map((a) => a._id);
    if (idsPropios.length) {
        await db.collection('documentosSolicitudes.chunks').deleteMany({ files_id: { $in: idsPropios } });
        await db.collection('documentosSolicitudes.files').deleteMany({ _id: { $in: idsPropios } });
    }
    await Solicitud.updateOne({ _id: solicitud._id }, { $set: { documentos: [], documentosBorradosEn: ahora } });
    return idsPropios.length;
};

// Borra una solicitud entera: primero sus archivos, después el aviso del panel y la solicitud.
// Si se corta a la mitad, la próxima corrida la vuelve a encontrar y termina.
const borrarSolicitud = async (solicitud, ahora = new Date()) => {
    const archivos = Array.isArray(solicitud.documentos) && solicitud.documentos.length ? await borrarDocumentosDe(solicitud, ahora) : 0;
    await SolicitudNotificacion.deleteMany({ solicitud: solicitud._id });
    await Solicitud.deleteOne({ _id: solicitud._id });
    return archivos;
};

// Lo que corre el cron diario. Devuelve cuántas solicitudes se borraron, a cuántas se les borró solo la
// documentación (las que usa un contrato) y cuántos archivos se borraron.
const ejecutar = async (ahora = new Date()) => {
    const limite = new Date(ahora.getTime() - DIAS_CONSERVACION * DIA);
    // Las que usa un contrato no se borran enteras
    const conContrato = (await Contrato.distinct('solicitud', { solicitud: { $ne: null } })).map(String);
    const resultado = { solicitudes: 0, borradas: 0, archivos: 0, errores: 0 };

    // 1) Solicitudes sin contrato: se borran enteras. Primer filtro en la base; el plazo exacto se confirma en cumplioPlazo()
    const paraBorrar = await Solicitud.find({
        estado: { $in: ESTADOS_CERRADOS },
        updatedAt: { $lte: limite },
        _id: { $nin: conContrato.filter((id) => mongoose.isValidObjectId(id)).map((id) => new mongoose.Types.ObjectId(id)) },
    }).select('estado documentos historialEstados createdAt updatedAt').limit(LOTE);
    for (const solicitud of paraBorrar) {
        if (!cumplioPlazo(solicitud, ahora)) continue;
        try {
            resultado.archivos += await borrarSolicitud(solicitud, ahora);
            resultado.borradas += 1;
        } catch (error) {
            resultado.errores += 1;
            console.error('No se pudo borrar una solicitud vieja:', error.message);
        }
    }

    // 2) Solicitudes que usa un contrato: solo se borran los archivos
    const candidatas = await Solicitud.find({
        estado: { $in: ESTADOS_CERRADOS },
        'documentos.0': { $exists: true },
        updatedAt: { $lte: limite },
    }).select('estado documentos historialEstados createdAt updatedAt').limit(LOTE);
    for (const solicitud of candidatas) {
        if (!corresponde(solicitud, ahora)) continue;
        try {
            resultado.archivos += await borrarDocumentosDe(solicitud, ahora);
            resultado.solicitudes += 1;
        } catch (error) {
            resultado.errores += 1;
            console.error('No se pudo borrar la documentación de una solicitud vieja:', error.message);
        }
    }
    return resultado;
};

module.exports = { DIAS_CONSERVACION, ESTADOS_CERRADOS, fechaDeCierre, cumplioPlazo, corresponde, borrarDocumentosDe, borrarSolicitud, ejecutar };

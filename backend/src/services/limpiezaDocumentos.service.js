const mongoose = require('mongoose');
const Solicitud = require('../models/solicitud.model');

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

const corresponde = (solicitud, ahora = new Date()) =>
    ESTADOS_CERRADOS.includes(solicitud.estado)
    && Array.isArray(solicitud.documentos) && solicitud.documentos.length > 0
    && ahora.getTime() - fechaDeCierre(solicitud).getTime() >= DIAS_CONSERVACION * DIA;

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

// Lo que corre el cron diario. Devuelve cuántas solicitudes se limpiaron y cuántos archivos se borraron.
const ejecutar = async (ahora = new Date()) => {
    const limite = new Date(ahora.getTime() - DIAS_CONSERVACION * DIA);
    // Primer filtro en la base (estado y modificación anterior al límite); el plazo exacto se confirma en corresponde()
    const candidatas = await Solicitud.find({
        estado: { $in: ESTADOS_CERRADOS },
        'documentos.0': { $exists: true },
        updatedAt: { $lte: limite },
    }).select('estado documentos historialEstados createdAt updatedAt').limit(LOTE);

    const resultado = { solicitudes: 0, archivos: 0, errores: 0 };
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

module.exports = { DIAS_CONSERVACION, ESTADOS_CERRADOS, fechaDeCierre, corresponde, borrarDocumentosDe, ejecutar };

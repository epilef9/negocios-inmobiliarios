const crypto = require('node:crypto');
const mongoose = require('mongoose');
const Solicitud = require('../models/solicitud.model');
const SolicitudNotificacion = require('../models/solicitud-notificacion.model');
const Property = require('../models/property.model');
const { cifrar, descifrar, obtenerClave } = require('../utils/cifrado-solicitudes');

const TIPOS_DOCUMENTO = {
    dniTitularFrente: 'DNI del titular (frente)',
    dniTitularDorso: 'DNI del titular (dorso)',
    cuilTitular: 'Constancia de CUIL/CUIT',
    recibosIngresos: 'Recibos de sueldo',
    constanciaIngresos: 'Constancia de ingresos',
    domicilio: 'Comprobante de domicilio',
    dniCotitularFrente: 'DNI del cotitular (frente)',
    dniCotitularDorso: 'DNI del cotitular (dorso)',
    escrituraGarantia: 'Escritura de la garantía',
    reciboGarante: 'Recibo de sueldo del garante',
    documentacionCaucion: 'Documentación del seguro de caución',
};

const bucketDocumentos = () => {
    if (!mongoose.connection.db) throw new Error('La base de datos no está conectada.');
    return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'documentosSolicitudes' });
};

const subirBuffer = (bucket, buffer, filename, metadata) =>
    new Promise((resolve, reject) => {
        const stream = bucket.openUploadStream(filename, { metadata, contentType: 'application/octet-stream' });
        stream.once('error', async (error) => {
            try {
                await bucket.delete(stream.id);
            } catch (errorBorrado) {
                console.error('[solicitudes] No se pudo limpiar una carga incompleta:', errorBorrado);
            }
            reject(error);
        });
        stream.once('finish', () => resolve(stream.id));
        stream.end(buffer);
    });

const borrarArchivos = async (bucket, ids) => {
    const resultados = await Promise.allSettled(ids.map((id) => bucket.delete(id)));
    resultados.forEach((resultado) => {
        if (resultado.status === 'rejected') console.error('[solicitudes] No se pudo limpiar un archivo temporal:', resultado.reason);
    });
};

const leerBuffer = (stream) =>
    new Promise((resolve, reject) => {
        const partes = [];
        stream.on('data', (parte) => partes.push(parte));
        stream.once('error', reject);
        stream.once('end', () => resolve(Buffer.concat(partes)));
    });

const cifrarDocumentos = async (solicitud, archivos) => {
    const bucket = bucketDocumentos();
    const ids = [];
    const documentos = [];

    try {
        for (const [tipo, lista] of Object.entries(archivos)) {
            for (const archivo of lista) {
                const fileId = await subirBuffer(
                    bucket,
                    cifrar(archivo.buffer),
                    `${solicitud._id}-${crypto.randomUUID()}`,
                    { solicitud: String(solicitud._id), tipo }
                );
                ids.push(fileId);
                documentos.push({
                    tipo,
                    fileId,
                    tamano: archivo.size,
                    mimeType: archivo.mimetype === 'image/jpg' ? 'image/jpeg' : archivo.mimetype,
                });
            }
        }
        return { bucket, ids, documentos };
    } catch (error) {
        await borrarArchivos(bucket, ids);
        throw error;
    }
};

const asegurarPropiedadSolicitable = async (propiedadId, operacion) => {
    const propiedad = await Property.findById(propiedadId)
        .select('title location ciudad price priceARS moneda categoria_operacion operacionesSolicitud permitirSolicitudes estado')
        .lean();
    if (!propiedad) {
        const error = new Error('La propiedad ya no está publicada.');
        error.statusCode = 404;
        throw error;
    }

    const disponibles = Array.isArray(propiedad.operacionesSolicitud) && propiedad.operacionesSolicitud.length
        ? propiedad.operacionesSolicitud
        : [propiedad.categoria_operacion];
    if (propiedad.permitirSolicitudes === false || propiedad.categoria_operacion === 'temporario' || !disponibles.includes(operacion === 'compra' ? 'venta' : 'alquiler')) {
        const error = new Error('Esta propiedad no admite solicitudes para esa operación.');
        error.statusCode = 409;
        throw error;
    }
    if (propiedad.estado && propiedad.estado !== 'disponible') {
        const error = new Error('Esta propiedad ya no está disponible para nuevas solicitudes.');
        error.statusCode = 409;
        throw error;
    }
    return propiedad;
};

const descripcionSolicitud = (operacion) => (operacion === 'alquiler' ? 'alquiler' : 'compra');

const crear = async ({ usuario, propiedadId, operacion, datos, archivos, claveIdempotencia }) => {
    const existente = await Solicitud.findOne({ usuario, claveIdempotencia });
    if (existente) return { solicitud: existente, repetida: true };

    const propiedad = await asegurarPropiedadSolicitable(propiedadId, operacion);
    obtenerClave();
    const solicitud = new Solicitud({
        usuario,
        propiedad: propiedadId,
        operacion,
        datosCifrados: cifrar(Buffer.from(JSON.stringify(datos), 'utf8')).toString('base64'),
        claveIdempotencia,
    });
    const { bucket, ids, documentos } = await cifrarDocumentos(solicitud, archivos);
    solicitud.documentos = documentos;

    try {
        await solicitud.save();
        await SolicitudNotificacion.create({
            solicitud: solicitud._id,
            mensaje: `Nueva solicitud de ${descripcionSolicitud(operacion)} para ${propiedad.title}.`,
        });
        return { solicitud, repetida: false };
    } catch (error) {
        await borrarArchivos(bucket, ids);
        if (error.code === 11000) {
            const repetida = await Solicitud.findOne({ usuario, claveIdempotencia });
            if (repetida) return { solicitud: repetida, repetida: true };
        }
        if (solicitud.isNew === false) {
            await Solicitud.deleteOne({ _id: solicitud._id }).catch((errorBorrado) => {
                console.error('[solicitudes] No se pudo revertir la solicitud incompleta:', errorBorrado);
            });
        }
        throw error;
    }
};

const infoPublica = (solicitud) => ({
    id: String(solicitud._id),
    operacion: solicitud.operacion,
    estado: solicitud.estado,
    createdAt: solicitud.createdAt,
    updatedAt: solicitud.updatedAt,
    propiedad: solicitud.propiedad && {
        id: String(solicitud.propiedad._id),
        titulo: solicitud.propiedad.title,
        ciudad: solicitud.propiedad.ciudad || solicitud.propiedad.location,
    },
});

const leerDatos = (solicitud) => JSON.parse(descifrar(Buffer.from(solicitud.datosCifrados, 'base64')).toString('utf8'));

const listarMias = async (usuario) => {
    const solicitudes = await Solicitud.find({ usuario })
        .populate('propiedad', 'title ciudad location')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
    return solicitudes.map(infoPublica);
};

const listarAdmin = async () => {
    const solicitudes = await Solicitud.find()
        .select('+datosCifrados')
        .populate('propiedad', 'title ciudad location price priceARS moneda')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
    return solicitudes.map((solicitud) => ({
        ...infoPublica(solicitud),
        datosPersonales: leerDatos(solicitud),
        documentos: solicitud.documentos.map(({ tipo, tamano, mimeType }) => ({ tipo, nombre: TIPOS_DOCUMENTO[tipo], tamano, mimeType })),
    }));
};

const obtenerPorId = async (id, usuario, esAdmin) => {
    const consulta = Solicitud.findById(id).select('+datosCifrados').populate('propiedad', 'title ciudad location price priceARS moneda');
    if (!esAdmin) consulta.where({ usuario });
    const solicitud = await consulta.lean();
    if (!solicitud) return null;
    return {
        ...infoPublica(solicitud),
        datosPersonales: leerDatos(solicitud),
        documentos: solicitud.documentos.map(({ tipo, fileId, tamano, mimeType }) => ({
            tipo,
            nombre: TIPOS_DOCUMENTO[tipo] || 'Documento',
            tamano,
            mimeType,
            url: `/api/solicitudes/${solicitud._id}/documentos/${encodeURIComponent(tipo)}`,
        })),
    };
};

const listarNotificacionesAdmin = async () => {
    const notificaciones = await SolicitudNotificacion.find()
        .populate({
            path: 'solicitud',
            select: 'operacion estado createdAt propiedad',
            populate: { path: 'propiedad', select: 'title' },
        })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();
    return notificaciones
        .filter((notificacion) => notificacion.solicitud && notificacion.solicitud.estado === 'pendiente' && !notificacion.leida)
        .map((notificacion) => ({
            id: String(notificacion._id),
            mensaje: notificacion.mensaje,
            leida: notificacion.leida,
            createdAt: notificacion.createdAt,
            solicitudId: String(notificacion.solicitud._id),
            estado: notificacion.solicitud.estado,
            operacion: notificacion.solicitud.operacion,
            propiedad: notificacion.solicitud.propiedad?.title || 'Propiedad',
        }));
};

const obtenerDocumento = async (solicitudId, usuario, esAdmin, tipo) => {
    const query = Solicitud.findById(solicitudId);
    if (!esAdmin) query.where({ usuario });
    const solicitud = await query.lean();
    if (!solicitud) return null;

    const documento = solicitud.documentos.find((item) => item.tipo === tipo);
    if (!documento) return null;

    const bucket = bucketDocumentos();
    const file = await bucket.find({ _id: documento.fileId }).next();
    if (!file || file.metadata?.solicitud !== String(solicitud._id)) return null;
    const contenido = descifrar(await leerBuffer(bucket.openDownloadStream(documento.fileId)));
    return { contenido, mimeType: documento.mimeType, nombre: TIPOS_DOCUMENTO[tipo] || 'Documento' };
};

module.exports = {
    crear,
    listarMias,
    listarAdmin,
    obtenerPorId,
    listarNotificacionesAdmin,
    obtenerDocumento,
    // Los datos personales se descifran solo en los servicios que los necesitan (panel/contratos)
    leerDatos,
};

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

const camposPropiedadAdmin = 'title ciudad location price priceARS moneda tipo_inmueble estado images categoria_operacion direccionCompleta';

const infoPublica = (solicitud) => {
    const propiedadPoblada = solicitud.propiedad && typeof solicitud.propiedad === 'object' && solicitud.propiedad.title !== undefined
        ? solicitud.propiedad
        : null;
    const propiedadId = propiedadPoblada?._id || solicitud.propiedad;
    return ({
    id: String(solicitud._id),
    operacion: solicitud.operacion,
    estado: solicitud.estado,
    comentarioEstado: solicitud.comentarioEstado || '',
    archivada: solicitud.archivada === true,
    archivadaAt: solicitud.archivadaAt || null,
    historialEstados: Array.isArray(solicitud.historialEstados)
        ? solicitud.historialEstados.map(({ estado, comentario, comentarioReferenciaIndice, fecha }) => ({
            estado,
            comentario,
            ...(Number.isInteger(comentarioReferenciaIndice) ? { comentarioReferenciaIndice } : {}),
            fecha,
        }))
        : [],
    createdAt: solicitud.createdAt,
    updatedAt: solicitud.updatedAt,
    propiedad: propiedadId && {
        id: String(propiedadId),
        disponible: Boolean(propiedadPoblada),
        titulo: propiedadPoblada?.title || null,
        ciudad: propiedadPoblada?.ciudad || propiedadPoblada?.location || null,
        localidad: propiedadPoblada?.ciudad || propiedadPoblada?.location || null,
        direccion: propiedadPoblada?.direccionCompleta || propiedadPoblada?.location || null,
        tipoInmueble: propiedadPoblada?.tipo_inmueble || null,
        estadoPropiedad: propiedadPoblada?.estado || null,
        tipoOperacion: propiedadPoblada?.categoria_operacion || null,
        precio: propiedadPoblada?.price ?? null,
        moneda: propiedadPoblada?.moneda || null,
        imagen: Array.isArray(propiedadPoblada?.images) && propiedadPoblada.images.length ? propiedadPoblada.images[0] : null,
    },
    });
};

const infoDocumentos = (solicitudId, documentos) => (Array.isArray(documentos) ? documentos : []).map(({ tipo, tamano, mimeType }) => ({
    tipo,
    nombre: TIPOS_DOCUMENTO[tipo] || 'Documento',
    tamano,
    mimeType,
    url: `/solicitudes/${solicitudId}/documentos/${encodeURIComponent(tipo)}`,
}));

const leerDatos = (solicitud) => JSON.parse(descifrar(Buffer.from(solicitud.datosCifrados, 'base64')).toString('utf8'));

const serializarSolicitudAdmin = (solicitud) => {
    const informacion = {
        ...infoPublica(solicitud),
        documentos: infoDocumentos(solicitud._id, solicitud.documentos),
    };

    try {
        return {
            ...informacion,
            datosPersonales: leerDatos(solicitud),
            cliente: solicitud.usuario ? { id: String(solicitud.usuario) } : null,
            problemaDescifrado: false,
        };
    } catch {
        console.warn('[solicitudes] No se pudieron descifrar los datos de una solicitud administrativa.');
        return {
            ...informacion,
            datosPersonales: null,
            documentos: [],
            cliente: null,
            problemaDescifrado: true,
        };
    }
};

const listarMias = async (usuario) => {
    const solicitudes = await Solicitud.find({ usuario })
        .populate('propiedad', 'title ciudad location images')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
    return solicitudes.map(infoPublica);
};

const listarAdmin = async () => {
    const solicitudes = await Solicitud.find()
        .select('+datosCifrados')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
    const propiedadIds = [...new Set(
        solicitudes
            .map((solicitud) => solicitud.propiedad)
            .filter((id) => mongoose.isValidObjectId(id))
            .map(String)
    )];
    const propiedades = propiedadIds.length
        ? await Property.find({ _id: { $in: propiedadIds } }).select(camposPropiedadAdmin).lean()
        : [];
    const propiedadesPorId = new Map(propiedades.map((propiedad) => [String(propiedad._id), propiedad]));
    return solicitudes.map((solicitud) => ({
        ...serializarSolicitudAdmin({
            ...solicitud,
            propiedad: propiedadesPorId.get(String(solicitud.propiedad)) || solicitud.propiedad,
        }),
    }));
};

const obtenerPorId = async (id, usuario, esAdmin) => {
    const consulta = Solicitud.findById(id).select('+datosCifrados');
    if (!esAdmin) consulta.where({ usuario });
    let solicitud = await consulta.lean();
    if (!solicitud) return null;
    const propiedad = mongoose.isValidObjectId(solicitud.propiedad)
        ? await Property.findById(solicitud.propiedad).select(camposPropiedadAdmin).lean()
        : null;
    solicitud = { ...solicitud, propiedad: propiedad || solicitud.propiedad };
    if (esAdmin) return serializarSolicitudAdmin(solicitud);
    return {
        ...infoPublica(solicitud),
        datosPersonales: leerDatos(solicitud),
        documentos: infoDocumentos(solicitud._id, solicitud.documentos),
    };
};

const actualizarEstado = async ({ id, estado, comentario, reutilizarComentario = false, administradoPor }) => {
    const solicitud = await Solicitud.findById(id).select('+datosCifrados').lean();
    if (!solicitud) {
        const error = new Error('No encontramos esa solicitud.');
        error.statusCode = 404;
        throw error;
    }

    try {
        leerDatos(solicitud);
    } catch {
        const error = new Error('No se puede modificar el estado hasta resolver el problema técnico de descifrado.');
        error.statusCode = 409;
        throw error;
    }

    const historial = Array.isArray(solicitud.historialEstados) ? solicitud.historialEstados : [];
    let filtro = { _id: id, estado: solicitud.estado, datosCifrados: solicitud.datosCifrados };
    let cambios;
    if (reutilizarComentario) {
        let comentarioReferenciaIndice = -1;
        for (let indice = historial.length - 1; indice >= 0; indice--) {
            if (historial[indice].comentario?.trim()) {
                comentarioReferenciaIndice = indice;
                break;
            }
        }
        if (comentarioReferenciaIndice < 0 || !['pendiente', 'rechazada'].includes(estado)) {
            const error = new Error('No hay un comentario guardado disponible para asociar al cambio de estado.');
            error.statusCode = 400;
            throw error;
        }
        const comentarioReferencia = historial[comentarioReferenciaIndice].comentario.trim();
        filtro = {
            ...filtro,
            [`historialEstados.${comentarioReferenciaIndice}.comentario`]: comentarioReferencia,
        };
        cambios = {
            $set: { estado, comentarioEstado: comentarioReferencia },
            $push: {
                historialEstados: {
                    estado,
                    comentario: '',
                    comentarioReferenciaIndice,
                    administradoPor,
                    fecha: new Date(),
                },
            },
        };
    } else {
        cambios = {
            $set: { estado, comentarioEstado: comentario },
            $push: { historialEstados: { estado, comentario, administradoPor, fecha: new Date() } },
        };
    }

    const actualizada = await Solicitud.findOneAndUpdate(
        filtro,
        cambios,
        { new: true, runValidators: true }
    ).select('+datosCifrados').lean();
    if (!actualizada) {
        const error = new Error('La solicitud cambió mientras se actualizaba. Recargá e intentá nuevamente.');
        error.statusCode = 409;
        throw error;
    }

    const propiedad = mongoose.isValidObjectId(actualizada.propiedad)
        ? await Property.findById(actualizada.propiedad).select(camposPropiedadAdmin).lean()
        : null;
    return serializarSolicitudAdmin({
        ...actualizada,
        propiedad: propiedad || actualizada.propiedad,
    });
};

const agregarComentario = async ({ id, comentario, administradoPor }) => {
    const solicitud = await Solicitud.findById(id).select('+datosCifrados').lean();
    if (!solicitud) {
        const error = new Error('No encontramos esa solicitud.');
        error.statusCode = 404;
        throw error;
    }

    try {
        leerDatos(solicitud);
    } catch {
        const error = new Error('No se puede agregar un comentario hasta resolver el problema técnico de descifrado.');
        error.statusCode = 409;
        throw error;
    }

    const actualizada = await Solicitud.findOneAndUpdate(
        { _id: id, estado: solicitud.estado, datosCifrados: solicitud.datosCifrados },
        {
            $set: { comentarioEstado: comentario },
            $push: { historialEstados: { estado: solicitud.estado, comentario, administradoPor, fecha: new Date() } },
        },
        { new: true, runValidators: true }
    ).select('+datosCifrados').lean();
    if (!actualizada) {
        const error = new Error('La solicitud cambió mientras se guardaba el comentario. Recargá e intentá nuevamente.');
        error.statusCode = 409;
        throw error;
    }

    const propiedad = mongoose.isValidObjectId(actualizada.propiedad)
        ? await Property.findById(actualizada.propiedad).select(camposPropiedadAdmin).lean()
        : null;
    return serializarSolicitudAdmin({
        ...actualizada,
        propiedad: propiedad || actualizada.propiedad,
    });
};

const actualizarArchivado = async ({ id, archivada, administradoPor }) => {
    const cambios = archivada
        ? {
            $set: {
                archivada: true,
                archivadaAt: new Date(),
                archivadaPor: administradoPor,
            },
        }
        : {
            $set: { archivada: false },
            $unset: { archivadaAt: 1, archivadaPor: 1 },
        };
    const solicitud = await Solicitud.findByIdAndUpdate(id, cambios, { new: true, runValidators: true }).lean();
    if (!solicitud) {
        const error = new Error('No encontramos esa solicitud.');
        error.statusCode = 404;
        throw error;
    }
    return {
        id: String(solicitud._id),
        archivada: solicitud.archivada === true,
        archivadaAt: solicitud.archivadaAt || null,
    };
};

const eliminarDefinitivamente = async (id) => mongoose.connection.transaction(async (session) => {
    const solicitud = await Solicitud.findById(id).session(session).lean();
    if (!solicitud) {
        const error = new Error('No encontramos esa solicitud.');
        error.statusCode = 404;
        throw error;
    }

    const idsDocumentos = [...new Map(
        (Array.isArray(solicitud.documentos) ? solicitud.documentos : [])
            .map(({ fileId }) => [String(fileId), fileId])
    ).values()];
    if (idsDocumentos.some((fileId) => !mongoose.isValidObjectId(fileId))) {
        const error = new Error('No se pudo verificar de forma segura la documentación asociada; no se eliminó la solicitud.');
        error.statusCode = 409;
        throw error;
    }

    if (idsDocumentos.length) {
        const documentoCompartido = await Solicitud.exists({
            _id: { $ne: solicitud._id },
            'documentos.fileId': { $in: idsDocumentos },
        }).session(session);
        if (documentoCompartido) {
            const error = new Error('Un documento está asociado a otra solicitud; no se eliminó ningún dato.');
            error.statusCode = 409;
            throw error;
        }

        const db = mongoose.connection.db;
        const archivosCollection = db.collection('documentosSolicitudes.files');
        const fragmentosCollection = db.collection('documentosSolicitudes.chunks');
        const archivos = await archivosCollection.find({ _id: { $in: idsDocumentos } }, { session }).toArray();
        const idsVerificados = new Set(
            archivos
                .filter((archivo) => archivo.metadata?.solicitud === String(solicitud._id))
                .map((archivo) => String(archivo._id))
        );
        if (idsVerificados.size !== idsDocumentos.length) {
            const error = new Error('No se pudo verificar la propiedad de todos los documentos; no se eliminó ningún dato.');
            error.statusCode = 409;
            throw error;
        }

        await fragmentosCollection.deleteMany({ files_id: { $in: idsDocumentos } }, { session });
        const borrados = await archivosCollection.deleteMany({ _id: { $in: idsDocumentos } }, { session });
        if (borrados.deletedCount !== idsDocumentos.length) {
            throw new Error('No se pudieron eliminar todos los documentos asociados.');
        }
    }

    const borrado = await Solicitud.deleteOne({ _id: solicitud._id }, { session });
    if (borrado.deletedCount !== 1) {
        const error = new Error('La solicitud cambió durante la eliminación; no se completó la operación.');
        error.statusCode = 409;
        throw error;
    }
    await SolicitudNotificacion.deleteMany({ solicitud: solicitud._id }, { session });
});

const listarNotificacionesAdmin = async () => {
    const notificaciones = await SolicitudNotificacion.find()
        .populate({
            path: 'solicitud',
            select: 'operacion estado createdAt propiedad archivada',
            populate: { path: 'propiedad', select: 'title' },
        })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();
    return notificaciones
        .filter((notificacion) => notificacion.solicitud && notificacion.solicitud.estado === 'pendiente' && !notificacion.solicitud.archivada && !notificacion.leida)
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

    const documento = (Array.isArray(solicitud.documentos) ? solicitud.documentos : []).find((item) => item.tipo === tipo);
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
    actualizarEstado,
    agregarComentario,
    actualizarArchivado,
    eliminarDefinitivamente,
    listarNotificacionesAdmin,
    obtenerDocumento,
    // Los datos personales se descifran solo en los servicios que los necesitan (panel/contratos)
    leerDatos,
};

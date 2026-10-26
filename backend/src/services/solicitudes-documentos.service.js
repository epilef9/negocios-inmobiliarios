const mongoose = require('mongoose');
const { cifrar, obtenerClave } = require('../utils/cifrado-solicitudes');

const MAXIMO_ARCHIVO = 4 * 1024 * 1024;
const TIPOS = ['dniTitularFrente', 'dniTitularDorso', 'cuilTitular', 'recibosIngresos', 'constanciaIngresos',
    'domicilio', 'dniCotitularFrente', 'dniCotitularDorso', 'escrituraGarantia', 'reciboGarante', 'documentacionCaucion'];
const errorHttp = (mensaje) => Object.assign(new Error(mensaje), { statusCode: 400 });
const bucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'documentosSolicitudes' });
const archivos = () => mongoose.connection.db.collection('documentosSolicitudes.files');
const validarLote = (clave) => typeof clave === 'string' && /^[\da-f-]{36}$/i.test(clave);

const guardar = async ({ archivo, usuario, tipo, clave }) => {
    if (!TIPOS.includes(tipo) || !validarLote(clave) || !archivo || archivo.size > MAXIMO_ARCHIVO) {
        throw errorHttp('Revisá el tipo de documento, el envío y el tamaño máximo de 4 MB.');
    }
    obtenerClave();
    const metadata = { usuario: String(usuario), tipo, clave, tamano: archivo.size,
        mimeType: archivo.mimetype === 'image/jpg' ? 'image/jpeg' : archivo.mimetype,
        temporalHasta: new Date(Date.now() + 24 * 60 * 60 * 1000) };
    const destino = bucket().openUploadStream(new mongoose.Types.ObjectId().toString(), { metadata, contentType: 'application/octet-stream' });
    try {
        await new Promise((resolve, reject) => {
            destino.once('error', reject);
            destino.once('finish', resolve);
            destino.end(cifrar(archivo.buffer));
        });
    } catch (error) {
        await bucket().delete(destino.id).catch(() => {});
        throw error;
    }
    return { id: String(destino.id), tipo };
};

// Los tamaños y formatos salen de GridFS, nunca del JSON enviado por el navegador.
const resolver = async (referencias, usuario, clave) => {
    if (!Array.isArray(referencias) || referencias.length < 1 || referencias.length > 12 || !validarLote(clave)) {
        throw errorHttp('Revisá los documentos adjuntos.');
    }
    const ids = referencias.map((ref) => ref?.id);
    if (ids.some((id) => typeof id !== 'string' || !/^[a-f\d]{24}$/i.test(id)) || new Set(ids).size !== ids.length) {
        throw errorHttp('Hay documentos inválidos o repetidos.');
    }
    const encontrados = await archivos().find({ _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) } }).toArray();
    const porId = new Map(encontrados.map((archivo) => [String(archivo._id), archivo]));
    const resultado = {};
    for (const ref of referencias) {
        const archivo = porId.get(ref.id);
        const meta = archivo?.metadata;
        if (!meta || meta.usuario !== String(usuario) || meta.clave !== clave || meta.tipo !== ref.tipo || !TIPOS.includes(ref.tipo)
            || (!meta.solicitud && new Date(meta.temporalHasta).getTime() <= Date.now())) {
            throw errorHttp('Un documento no pertenece a este envío o venció. Volvé a adjuntarlo.');
        }
        (resultado[ref.tipo] ||= []).push({ fileId: archivo._id, size: meta.tamano, mimetype: meta.mimeType });
        if (resultado[ref.tipo].length > (ref.tipo === 'recibosIngresos' ? 3 : 1)) throw errorHttp('Hay demasiados documentos de un mismo tipo.');
    }
    return resultado;
};

// La asociación es exclusiva y atómica con la creación de la solicitud.
const vincular = async (documentos, solicitud, session) => {
    for (const documento of documentos) {
        const resultado = await archivos().updateOne({ _id: documento.fileId,
            'metadata.usuario': String(solicitud.usuario), 'metadata.clave': solicitud.claveIdempotencia,
            'metadata.tipo': documento.tipo, 'metadata.solicitud': { $exists: false },
            'metadata.temporalHasta': { $gt: new Date() },
        }, { $set: { 'metadata.solicitud': String(solicitud._id) }, $unset: { 'metadata.temporalHasta': '' } }, { session });
        if (resultado.modifiedCount !== 1) throw errorHttp('Un documento ya se usó o venció. Volvé a adjuntarlo.');
    }
};

// Limpieza oportunista, sin cron: el claim del archivo y la limpieza compiten en la misma transacción.
const limpiarTemporales = async () => {
    const vencidos = await archivos().find({ 'metadata.temporalHasta': { $lte: new Date() },
        'metadata.solicitud': { $exists: false } }).limit(20).toArray();
    for (const archivo of vencidos) {
        await mongoose.connection.transaction(async (session) => {
            const eliminado = await archivos().deleteOne({ _id: archivo._id,
                'metadata.temporalHasta': { $lte: new Date() }, 'metadata.solicitud': { $exists: false } }, { session });
            if (eliminado.deletedCount) await mongoose.connection.db.collection('documentosSolicitudes.chunks').deleteMany({ files_id: archivo._id }, { session });
        });
    }
};

module.exports = { MAXIMO_ARCHIVO, guardar, resolver, vincular, limpiarTemporales };

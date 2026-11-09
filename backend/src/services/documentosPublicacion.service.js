// Documentos de las solicitudes de publicación (DNI, escritura, impuestos, planos, reglamento).
// Igual que los de las solicitudes de alquiler o compra: se guardan CIFRADOS en MongoDB (GridFS),
// nunca en una carpeta pública ni en el disco del servidor (en Vercel ese disco se borra).
// En la solicitud queda solo la referencia "privado:<id>".

const mongoose = require('mongoose');
const { cifrar, descifrar, obtenerClave } = require('../utils/cifrado-solicitudes');

const BUCKET = 'documentosPublicaciones';
const EXTENSION = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MIME_PERMITIDOS = Object.keys(EXTENSION);
const REFERENCIA = /^privado:([a-f\d]{24})$/i;

const errorHttp = (mensaje, statusCode) => Object.assign(new Error(mensaje), { statusCode });

const bucket = () => {
    if (!mongoose.connection.db) throw new Error('La base de datos no está conectada.');
    return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: BUCKET });
};

// Revisa que el contenido sea de verdad lo que dice ser (no un archivo disfrazado)
const firmaValida = (buffer, mime) => {
    if (mime === 'application/pdf') return buffer.subarray(0, 5).toString() === '%PDF-';
    if (mime === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (mime === 'image/jpeg') return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (mime === 'image/webp') return buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP';
    return false;
};

const subirBuffer = (buffer, metadata) => new Promise((resolve, reject) => {
    const destino = bucket().openUploadStream(`${metadata.usuario}-${Date.now()}`, { metadata, contentType: 'application/octet-stream' });
    destino.once('error', reject);
    destino.once('finish', () => resolve(destino.id));
    destino.end(buffer);
});

const leerBuffer = (origen) => new Promise((resolve, reject) => {
    const partes = [];
    origen.on('data', (parte) => partes.push(parte));
    origen.once('error', reject);
    origen.once('end', () => resolve(Buffer.concat(partes)));
});

const idDeReferencia = (referencia) => {
    const encontrado = REFERENCIA.exec(String(referencia || ''));
    return encontrado ? encontrado[1].toLowerCase() : null;
};

const documentosPublicacion = {
    MIME_PERMITIDOS,

    // Cifra y guarda los archivos subidos; devuelve una referencia "privado:<id>" por archivo
    guardar: async (archivos, usuarioId) => {
        obtenerClave();
        const guardados = [];
        try {
            for (const archivo of archivos) {
                const mime = archivo.mimetype === 'image/jpg' ? 'image/jpeg' : archivo.mimetype;
                if (!MIME_PERMITIDOS.includes(mime) || !firmaValida(archivo.buffer, mime)) {
                    throw errorHttp(`"${archivo.originalname}" debe ser un PDF, JPG, PNG o WEBP válido.`, 415);
                }
                guardados.push(await subirBuffer(cifrar(archivo.buffer), { usuario: String(usuarioId), mimeType: mime, tamano: archivo.size }));
            }
            return guardados.map((id) => `privado:${id}`);
        } catch (error) {
            await Promise.allSettled(guardados.map((id) => bucket().delete(id)));
            throw error;
        }
    },

    // true si todas las referencias existen y las subió ese usuario
    sonDelUsuario: async (referencias, usuarioId) => {
        const ids = referencias.map(idDeReferencia);
        if (ids.some((id) => !id)) return false;
        const unicos = [...new Set(ids)];
        const archivos = await bucket().find({ _id: { $in: unicos.map((id) => new mongoose.Types.ObjectId(id)) } }).toArray();
        return archivos.length === unicos.length && archivos.every((archivo) => archivo.metadata?.usuario === String(usuarioId));
    },

    idDeReferencia,

    // Devuelve el documento descifrado, o null si no existe
    leer: async (id) => {
        if (!/^[a-f\d]{24}$/i.test(String(id))) return null;
        const _id = new mongoose.Types.ObjectId(id);
        const archivo = await bucket().find({ _id }).next();
        if (!archivo) return null;
        const contenido = descifrar(await leerBuffer(bucket().openDownloadStream(_id)));
        const mimeType = archivo.metadata?.mimeType || 'application/octet-stream';
        return { contenido, mimeType, extension: EXTENSION[mimeType] || 'bin', usuario: archivo.metadata?.usuario };
    },
};

module.exports = documentosPublicacion;

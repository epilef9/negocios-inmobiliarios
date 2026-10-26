// Documentos de las solicitudes de publicación: se guardan cifrados y solo los ve el admin o quien los subió.
// No usa una base real: GridFS se reemplaza por un almacén en memoria.
// Correr solo este archivo: node --test tests/documentos-publicacion.test.js
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { Writable, Readable } = require('node:stream');
const mongoose = require('mongoose');

process.env.SOLICITUDES_ENCRYPTION_KEY = 'a'.repeat(64);

// ---- GridFS en memoria
const almacen = new Map();
class BucketFalso {
    openUploadStream(_nombre, { metadata }) {
        const id = new mongoose.Types.ObjectId();
        const partes = [];
        const destino = new Writable({
            write(parte, _codificacion, listo) { partes.push(parte); listo(); },
            final(listo) { almacen.set(String(id), { _id: id, metadata, datos: Buffer.concat(partes) }); listo(); },
        });
        destino.id = id;
        return destino;
    }
    find(filtro) {
        const ids = filtro._id.$in ? filtro._id.$in.map(String) : [String(filtro._id)];
        const encontrados = ids.map((id) => almacen.get(id)).filter(Boolean);
        return { toArray: async () => encontrados, next: async () => encontrados[0] || null };
    }
    openDownloadStream(id) { return Readable.from([almacen.get(String(id)).datos]); }
    async delete(id) { almacen.delete(String(id)); }
}
Object.defineProperty(mongoose.mongo, 'GridFSBucket', { value: BucketFalso, configurable: true });
Object.defineProperty(mongoose.connection, 'db', { value: {}, configurable: true });

// La búsqueda de la solicitud dueña del documento también se reemplaza
const SolicitudPublicacion = require('../src/models/solicitudPublicacion.model');
let solicitudes = [];
SolicitudPublicacion.findOne = (consulta) => ({
    select: async () => solicitudes.find((s) => consulta.$or.some((c) => Object.entries(c).some(([campo, valor]) => s.documentos[campo.split('.')[1]] === valor))) || null,
});

const documentos = require('../src/services/documentosPublicacion.service');
const servicio = require('../src/services/solicitudPublicacion.service');

const PDF = Buffer.from('%PDF-1.4 contenido de prueba');
const archivo = (buffer, mimetype = 'application/pdf') => ({ buffer, mimetype, originalname: 'doc', size: buffer.length });
const CLIENTE = new mongoose.Types.ObjectId();
const OTRO = new mongoose.Types.ObjectId();

beforeEach(() => { almacen.clear(); solicitudes = []; });

test('se guarda cifrado y se recupera igual', async () => {
    const [referencia] = await documentos.guardar([archivo(PDF)], CLIENTE);
    assert.match(referencia, /^privado:[a-f\d]{24}$/);
    const guardado = almacen.get(referencia.slice(8)).datos;
    assert.equal(guardado.includes(PDF), false, 'el archivo guardado no puede estar en texto plano');
    const leido = await documentos.leer(referencia.slice(8));
    assert.deepEqual(leido.contenido, PDF);
    assert.equal(leido.mimeType, 'application/pdf');
});

test('rechaza un archivo disfrazado (dice PDF y no lo es)', async () => {
    await assert.rejects(documentos.guardar([archivo(Buffer.from('<script>'))], CLIENTE), { statusCode: 415 });
    assert.equal(almacen.size, 0);
});

test('solo acepta referencias subidas por el mismo usuario', async () => {
    const [propia] = await documentos.guardar([archivo(PDF)], CLIENTE);
    assert.equal(await documentos.sonDelUsuario([propia], CLIENTE), true);
    assert.equal(await documentos.sonDelUsuario([propia], OTRO), false);
    assert.equal(await documentos.sonDelUsuario(['documento-viejo.pdf'], CLIENTE), false);
});

test('descarga: el dueño y el admin sí, otro usuario no', async () => {
    const [referencia] = await documentos.guardar([archivo(PDF)], CLIENTE);
    const id = referencia.slice(8);
    solicitudes.push({ cliente: CLIENTE, documentos: { dni: referencia } });
    assert.deepEqual((await servicio.obtenerDocumento(id, { _id: CLIENTE, role: 'cliente' })).contenido, PDF);
    assert.deepEqual((await servicio.obtenerDocumento(id, { _id: OTRO, role: 'admin' })).contenido, PDF);
    await assert.rejects(servicio.obtenerDocumento(id, { _id: OTRO, role: 'cliente' }), { statusCode: 403 });
    await assert.rejects(servicio.obtenerDocumento('../../.env', { _id: CLIENTE, role: 'cliente' }), { statusCode: 404 });
});

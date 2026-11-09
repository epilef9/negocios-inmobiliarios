// Borrado automático de solicitudes viejas y su documentación (90 días).
// Las pruebas de la regla no usan base de datos. La prueba con GridFS corre solo contra una base de PRUEBA:
//   MONGODB_URI_TEST=mongodb://localhost:27017/inmobiliaria_test node --test tests/limpieza-documentos.test.js
// Sin MONGODB_URI_TEST esa prueba se salta.
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { uriDePrueba } = require('./base-de-prueba');
const limpieza = require('../src/services/limpiezaDocumentos.service');
const Solicitud = require('../src/models/solicitud.model');
const SolicitudNotificacion = require('../src/models/solicitud-notificacion.model');
const Contrato = require('../src/models/contrato.model');

const DIA = 86400000;
const ahora = new Date('2026-11-09T12:00:00Z');
const haceDias = (n) => new Date(ahora.getTime() - n * DIA);
const solicitud = (extra = {}) => ({
    estado: 'rechazada',
    documentos: [{ tipo: 'dniTitularFrente', archivoId: new mongoose.Types.ObjectId() }],
    historialEstados: [{ estado: 'rechazada', fecha: haceDias(91) }],
    createdAt: haceDias(200),
    ...extra,
});

describe('Limpieza de documentos: regla de los 90 días', () => {
    it('borra rechazadas, vencidas y cerradas con más de 90 días', () => {
        for (const estado of ['rechazada', 'vencida', 'cerrada']) {
            assert.equal(limpieza.corresponde(solicitud({ estado, historialEstados: [{ estado, fecha: haceDias(91) }] }), ahora), true);
        }
    });

    it('no toca las de menos de 90 días', () => {
        assert.equal(limpieza.corresponde(solicitud({ historialEstados: [{ estado: 'rechazada', fecha: haceDias(89) }] }), ahora), false);
    });

    it('el día 90 exacto ya corresponde', () => {
        assert.equal(limpieza.corresponde(solicitud({ historialEstados: [{ estado: 'rechazada', fecha: haceDias(90) }] }), ahora), true);
    });

    it('nunca toca pendientes ni aprobadas, por viejas que sean', () => {
        for (const estado of ['pendiente', 'aprobada']) {
            assert.equal(limpieza.corresponde(solicitud({ estado, historialEstados: [{ estado, fecha: haceDias(500) }] }), ahora), false);
        }
    });

    it('cuenta desde el último cambio al estado actual', () => {
        const s = solicitud({ historialEstados: [
            { estado: 'rechazada', fecha: haceDias(200) },
            { estado: 'pendiente', fecha: haceDias(100) },
            { estado: 'rechazada', fecha: haceDias(10) },
        ] });
        assert.equal(limpieza.corresponde(s, ahora), false);
    });

    it('sin documentos no hay nada que borrar', () => {
        assert.equal(limpieza.corresponde(solicitud({ documentos: [] }), ahora), false);
    });
});

describe('Limpieza de solicitudes: qué se borra entero (sin base de datos)', () => {
    // Modelos reemplazados por versiones en memoria: solicitudes sin archivos, así no hace falta GridFS
    let filas;
    let notificaciones;
    const originales = { find: Solicitud.find, deleteOne: Solicitud.deleteOne, distinct: Contrato.distinct, notif: SolicitudNotificacion.deleteMany };
    const consulta = (resultado) => { const q = { select: () => q, limit: () => resultado() }; return q; };
    const cumple = (fila, filtro) => {
        if (filtro.estado?.$in && !filtro.estado.$in.includes(fila.estado)) return false;
        if (filtro.updatedAt?.$lte && !(fila.updatedAt <= filtro.updatedAt.$lte)) return false;
        if (filtro._id?.$nin && filtro._id.$nin.some((id) => String(id) === String(fila._id))) return false;
        if (filtro['documentos.0'] && !(fila.documentos || []).length) return false;
        return true;
    };
    before(() => {
        Solicitud.find = (filtro) => consulta(async () => filas.filter((f) => cumple(f, filtro)));
        Solicitud.deleteOne = async ({ _id }) => { filas = filas.filter((f) => String(f._id) !== String(_id)); };
        SolicitudNotificacion.deleteMany = async ({ solicitud }) => { notificaciones = notificaciones.filter((n) => String(n) !== String(solicitud)); };
    });
    after(() => {
        Solicitud.find = originales.find;
        Solicitud.deleteOne = originales.deleteOne;
        Contrato.distinct = originales.distinct;
        SolicitudNotificacion.deleteMany = originales.notif;
    });
    const fila = (estado, dias) => ({ _id: new mongoose.Types.ObjectId(), estado, documentos: [], historialEstados: [{ estado, fecha: haceDias(dias) }], createdAt: haceDias(dias + 5), updatedAt: haceDias(dias) });

    it('borra las cerradas viejas y su aviso; deja pendientes, aprobadas, recientes y las que usa un contrato', async () => {
        const vieja = fila('vencida', 100);
        const reciente = fila('rechazada', 30);
        const pendiente = fila('pendiente', 300);
        const aprobada = fila('aprobada', 300);
        const deContrato = fila('cerrada', 300);
        filas = [vieja, reciente, pendiente, aprobada, deContrato];
        notificaciones = [vieja._id, reciente._id];
        Contrato.distinct = async () => [deContrato._id];

        const resultado = await limpieza.ejecutar(ahora);
        assert.equal(resultado.borradas, 1);
        assert.deepEqual(filas.map((f) => f._id), [reciente._id, pendiente._id, aprobada._id, deContrato._id]);
        assert.deepEqual(notificaciones, [reciente._id]);
    });
});

describe('Limpieza de documentos: GridFS en base de prueba', { skip: !process.env.MONGODB_URI_TEST && 'falta MONGODB_URI_TEST' }, () => {
    const creadas = [];
    let bucket;

    const subirArchivo = async (solicitudId) => {
        const destino = bucket.openUploadStream('doc', { metadata: { solicitud: String(solicitudId) } });
        await new Promise((resolve, reject) => { destino.once('error', reject); destino.once('finish', resolve); destino.end(Buffer.from('contenido-cifrado')); });
        return destino.id;
    };
    const crear = async ({ estado, dias, conArchivo = true }) => {
        const _id = new mongoose.Types.ObjectId();
        const archivoId = conArchivo ? await subirArchivo(_id) : new mongoose.Types.ObjectId();
        await Solicitud.collection.insertOne({
            _id, estado, usuario: new mongoose.Types.ObjectId(), propiedad: new mongoose.Types.ObjectId(), operacion: 'alquiler',
            datosCifrados: 'x', claveIdempotencia: `prueba-${_id}`,
            documentos: [{ tipo: 'dniTitularFrente', archivoId, tamano: 10, tipoMime: 'application/pdf' }],
            historialEstados: [{ estado, fecha: haceDias(dias) }],
            createdAt: haceDias(dias + 5), updatedAt: haceDias(dias),
        });
        creadas.push(_id);
        return { _id, archivoId };
    };
    const existeArchivo = async (id) => (await mongoose.connection.db.collection('documentosSolicitudes.files').countDocuments({ _id: id })) === 1;
    const existenFragmentos = async (id) => (await mongoose.connection.db.collection('documentosSolicitudes.chunks').countDocuments({ files_id: id })) > 0;

    before(async () => {
        await mongoose.connect(uriDePrueba());
        bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'documentosSolicitudes' });
    });
    after(async () => {
        // Solo limpia lo que creó este test
        for (const id of creadas) {
            const archivos = await mongoose.connection.db.collection('documentosSolicitudes.files').find({ 'metadata.solicitud': String(id) }).toArray();
            for (const a of archivos) await bucket.delete(a._id).catch(() => {});
        }
        await Solicitud.collection.deleteMany({ _id: { $in: creadas } });
        await mongoose.connection.close();
    });

    it('borra entera la solicitud vieja con sus archivos, y no toca la nueva ni la pendiente', async () => {
        const vieja = await crear({ estado: 'rechazada', dias: 120 });
        const nueva = await crear({ estado: 'rechazada', dias: 10 });
        const pendiente = await crear({ estado: 'pendiente', dias: 400 });

        const resultado = await limpieza.ejecutar(new Date());
        assert.ok(resultado.borradas >= 1);

        assert.equal(await existeArchivo(vieja.archivoId), false);
        assert.equal(await existenFragmentos(vieja.archivoId), false);
        assert.equal(await Solicitud.collection.findOne({ _id: vieja._id }), null);

        assert.equal(await existeArchivo(nueva.archivoId), true);
        assert.equal(await existenFragmentos(nueva.archivoId), true);
        assert.equal((await Solicitud.collection.findOne({ _id: nueva._id })).documentos.length, 1);

        assert.equal(await existeArchivo(pendiente.archivoId), true);
    });

    it('si la usa un contrato, borra solo los archivos y deja el registro', async () => {
        const conContrato = await crear({ estado: 'cerrada', dias: 120 });
        const contratoId = new mongoose.Types.ObjectId();
        await Contrato.collection.insertOne({ _id: contratoId, solicitud: conContrato._id });
        try {
            await limpieza.ejecutar(new Date());
            assert.equal(await existeArchivo(conContrato.archivoId), false);
            const despues = await Solicitud.collection.findOne({ _id: conContrato._id });
            assert.deepEqual(despues.documentos, []);
            assert.ok(despues.documentosBorradosEn instanceof Date);
        } finally {
            await Contrato.collection.deleteOne({ _id: contratoId });
        }
    });

    it('correrla dos veces no falla ni borra de más', async () => {
        const vieja = await crear({ estado: 'cerrada', dias: 200 });
        await limpieza.ejecutar(new Date());
        const segunda = await limpieza.ejecutar(new Date());
        assert.equal(segunda.errores, 0);
        assert.equal(await existeArchivo(vieja.archivoId), false);
    });
});

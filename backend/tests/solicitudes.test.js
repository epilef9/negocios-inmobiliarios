const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const { validarSolicitud } = require('../src/validators/solicitud.validator');
const { cifrar, descifrar, obtenerClave } = require('../src/utils/cifrado-solicitudes');
const Solicitud = require('../src/models/solicitud.model');
const Property = require('../src/models/property.model');
const SolicitudNotificacion = require('../src/models/solicitud-notificacion.model');
const solicitudesService = require('../src/services/solicitudes.service');
const solicitudesController = require('../src/controllers/solicitudes.controller');
const authMiddleware = require('../src/middlewares/auth.middleware');
const solicitudesRouter = require('../src/routes/solicitudes.routes');

const titular = {
    nombre: 'Ana',
    apellido: 'Pérez',
    dni: '30123456',
    cuil: '27301234568',
    fechaNacimiento: '1990-04-12',
    email: 'ana@example.com',
    telefono: '+54 343 555 1234',
    domicilio: 'San Martín 123',
    localidad: 'Paraná',
    provincia: 'Entre Ríos',
    ocupacion: 'Docente',
    ingresosMensuales: '850000',
    referencias: '',
};

const archivosComunes = {
    dniTitularFrente: [{}],
    dniTitularDorso: [{}],
    cuilTitular: [{}],
    recibosIngresos: [{}, {}, {}],
    domicilio: [{}],
};

test('valida los campos y documentos comunes de una solicitud de compra', () => {
    const errores = validarSolicitud({
        datos: { titular, incluyeCotitular: false, ingresosTipo: 'recibos' },
        archivos: archivosComunes,
        operacion: 'compra',
    });
    assert.deepEqual(errores, []);
});

test('requiere una sola modalidad válida de garantía para alquiler', () => {
    const errores = validarSolicitud({
        datos: { titular, incluyeCotitular: false, ingresosTipo: 'recibos', garantia: { tipo: '' } },
        archivos: archivosComunes,
        operacion: 'alquiler',
    });
    assert.ok(errores.some((error) => error.includes('Elegí una garantía')));
});

test('requiere DNI y datos del cotitular cuando se declara uno', () => {
    const errores = validarSolicitud({
        datos: { titular, incluyeCotitular: true, cotitular: {}, ingresosTipo: 'recibos' },
        archivos: archivosComunes,
        operacion: 'compra',
    });
    assert.ok(errores.some((error) => error.includes('Cotitular:')));
    assert.ok(errores.some((error) => error.includes('DNI del cotitular')));
});

test('cifra y descifra datos y documentos con AES-256-GCM', () => {
    process.env.SOLICITUDES_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    const original = Buffer.from('contenido sensible de prueba');
    const cifrado = cifrar(original);
    assert.notDeepEqual(cifrado, original);
    assert.deepEqual(descifrar(cifrado), original);
});

test('rechaza una clave de cifrado ausente o con formato inválido', () => {
    const anterior = process.env.SOLICITUDES_ENCRYPTION_KEY;
    delete process.env.SOLICITUDES_ENCRYPTION_KEY;
    assert.throws(obtenerClave, /SOLICITUDES_ENCRYPTION_KEY/);
    if (anterior !== undefined) process.env.SOLICITUDES_ENCRYPTION_KEY = anterior;
});

test('lista solicitudes válidas y conserva las que no pueden descifrarse sin exponer datos', async () => {
    process.env.SOLICITUDES_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    const datosValidos = Buffer.from(JSON.stringify({ titular: { nombre: 'Ana', apellido: 'Pérez' } }), 'utf8');
    const cifradoValido = cifrar(datosValidos).toString('base64');
    const cifradoAlterado = Buffer.from(cifradoValido, 'base64');
    cifradoAlterado[cifradoAlterado.length - 1] ^= 1;

    const solicitudes = [
        {
            _id: 'solicitud-valida',
            usuario: 'usuario-valido',
            propiedad: '507f1f77bcf86cd799439011',
            operacion: 'alquiler',
            estado: 'pendiente',
            createdAt: new Date('2026-10-01T12:00:00.000Z'),
            datosCifrados: cifradoValido,
            documentos: [],
        },
        {
            _id: 'solicitud-con-error',
            usuario: 'usuario-con-error',
            propiedad: '507f1f77bcf86cd799439012',
            operacion: 'compra',
            estado: 'aprobada',
            createdAt: new Date('2026-10-02T12:00:00.000Z'),
            datosCifrados: cifradoAlterado.toString('base64'),
            documentos: [],
        },
    ];

    const originalFind = Solicitud.find;
    const originalPropertyFind = Property.find;
    const originalWarn = console.warn;
    const advertencias = [];
    Solicitud.find = () => {
        const consulta = {
            select() { return this; },
            populate() { return this; },
            sort() { return this; },
            limit() { return this; },
            lean() { return Promise.resolve(solicitudes); },
        };
        return consulta;
    };
    Property.find = () => ({
        select() { return this; },
        lean() {
            return Promise.resolve([{
                _id: '507f1f77bcf86cd799439011',
                title: 'Casa válida',
                location: 'Paraná',
                ciudad: 'Paraná',
                direccionCompleta: 'Calle 1',
                tipo_inmueble: 'casa',
                price: 120000,
                moneda: 'USD',
                images: ['https://images.example/casa.jpg'],
                categoria_operacion: 'venta',
                estado: 'disponible',
            }]);
        },
    });
    console.warn = (...args) => advertencias.push(args.join(' '));

    try {
        const lista = await solicitudesService.listarAdmin();
        assert.equal(lista.length, 2);
        assert.deepEqual(lista[0].datosPersonales, { titular: { nombre: 'Ana', apellido: 'Pérez' } });
        assert.equal(lista[0].problemaDescifrado, false);
        assert.equal(lista[0].estado, 'pendiente');
        assert.equal(lista[0].propiedad.disponible, true);
        assert.equal(lista[0].propiedad.titulo, 'Casa válida');
        assert.equal(lista[0].propiedad.direccion, 'Calle 1');
        assert.equal(lista[0].propiedad.imagen, 'https://images.example/casa.jpg');
        assert.equal(lista[1].problemaDescifrado, true);
        assert.equal(lista[1].datosPersonales, null);
        assert.deepEqual(lista[1].documentos, []);
        assert.equal(lista[1].id, 'solicitud-con-error');
        assert.equal(lista[1].estado, 'aprobada');
        assert.equal(lista[1].propiedad.disponible, false);
        assert.equal(lista[1].propiedad.id, '507f1f77bcf86cd799439012');
        assert.equal(JSON.stringify(lista[1]).includes(cifradoAlterado.toString('base64')), false);
        assert.equal(advertencias.length, 1);
        assert.equal(advertencias[0].includes(cifradoAlterado.toString('base64')), false);
        assert.equal(advertencias[0].includes('Ana'), false);
    } finally {
        Solicitud.find = originalFind;
        Property.find = originalPropertyFind;
        console.warn = originalWarn;
    }
});

test('actualiza el estado y conserva el comentario e historial sin tocar la propiedad', async () => {
    process.env.SOLICITUDES_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    const cifrado = cifrar(Buffer.from(JSON.stringify({ titular: { nombre: 'Ana' } }), 'utf8')).toString('base64');
    const solicitud = {
        _id: 'solicitud-valida',
        usuario: 'usuario-valido',
        propiedad: 'propiedad-valida',
        operacion: 'alquiler',
        estado: 'pendiente',
        datosCifrados: cifrado,
        documentos: [{
            tipo: 'dniTitularFrente',
            fileId: '507f1f77bcf86cd799439013',
            tamano: 1234,
            mimeType: 'image/jpeg',
        }],
        createdAt: new Date('2026-10-01T12:00:00.000Z'),
    };
    const actualizada = {
        ...solicitud,
        datosCifrados: undefined,
        estado: 'rechazada',
        comentarioEstado: 'Falta documentación complementaria.',
        historialEstados: [{
            estado: 'rechazada',
            comentario: 'Falta documentación complementaria.',
            administradoPor: 'admin-1',
            fecha: new Date('2026-10-02T12:00:00.000Z'),
        }],
    };
    const originalFindById = Solicitud.findById;
    const originalFindOneAndUpdate = Solicitud.findOneAndUpdate;
    const originalPropertyFindById = Property.findById;
    let filtroActualizacion;
    let cambiosAplicados;
    let camposSeleccionados;

    Solicitud.findById = () => ({
        select() { return this; },
        lean() { return Promise.resolve(solicitud); },
    });
    Solicitud.findOneAndUpdate = (filtro, cambios) => {
        filtroActualizacion = filtro;
        cambiosAplicados = cambios;
        return {
            select(campos) {
                camposSeleccionados = campos;
                return this;
            },
            lean: () => Promise.resolve({ ...actualizada, datosCifrados: cifrado }),
        };
    };
    Property.findById = () => ({
        select() { return this; },
        lean() { return Promise.resolve(null); },
    });

    try {
        const resultado = await solicitudesService.actualizarEstado({
            id: solicitud._id,
            estado: 'rechazada',
            comentario: actualizada.comentarioEstado,
            administradoPor: 'admin-1',
        });
        assert.equal(resultado.estado, 'rechazada');
        assert.equal(resultado.comentarioEstado, actualizada.comentarioEstado);
        assert.equal(resultado.historialEstados.length, 1);
        assert.deepEqual(resultado.datosPersonales, { titular: { nombre: 'Ana' } });
        assert.equal(resultado.problemaDescifrado, false);
        assert.equal(resultado.documentos.length, 1);
        assert.equal(resultado.documentos[0].url, `/solicitudes/${solicitud._id}/documentos/dniTitularFrente`);
        assert.equal(camposSeleccionados, '+datosCifrados');
        assert.equal(cambiosAplicados.$set.estado, 'rechazada');
        assert.equal(cambiosAplicados.$set.comentarioEstado, actualizada.comentarioEstado);
        assert.equal(cambiosAplicados.$push.historialEstados.administradoPor, 'admin-1');
        assert.equal(String(filtroActualizacion.datosCifrados), cifrado);
        assert.equal(resultado.propiedad.disponible, false);
    } finally {
        Solicitud.findById = originalFindById;
        Solicitud.findOneAndUpdate = originalFindOneAndUpdate;
        Property.findById = originalPropertyFindById;
    }
});

test('bloquea cambios de estado si los datos personales no autentican', async () => {
    process.env.SOLICITUDES_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    const corrupted = cifrar(Buffer.from('datos de prueba')).toString('base64');
    const damaged = Buffer.from(corrupted, 'base64');
    damaged[damaged.length - 1] ^= 1;
    const originalFindById = Solicitud.findById;
    const originalFindOneAndUpdate = Solicitud.findOneAndUpdate;
    let intentoActualizar = false;
    Solicitud.findById = () => ({
        select() { return this; },
        lean() { return Promise.resolve({ _id: 'solicitud-con-error', estado: 'pendiente', datosCifrados: damaged.toString('base64') }); },
    });
    Solicitud.findOneAndUpdate = () => {
        intentoActualizar = true;
        throw new Error('No debe persistir estados si falla el descifrado.');
    };
    try {
        await assert.rejects(
            solicitudesService.actualizarEstado({ id: 'solicitud-con-error', estado: 'aprobada', comentario: '', administradoPor: 'admin-1' }),
            { statusCode: 409 }
        );
        assert.equal(intentoActualizar, false);
    } finally {
        Solicitud.findById = originalFindById;
        Solicitud.findOneAndUpdate = originalFindOneAndUpdate;
    }
});

test('archiva y restaura una solicitud sin cambiar estado, comentario ni historial', async () => {
    const originalFindByIdAndUpdate = Solicitud.findByIdAndUpdate;
    const cambios = [];
    Solicitud.findByIdAndUpdate = (_id, update) => {
        cambios.push(update);
        const solicitud = {
            _id: '507f1f77bcf86cd799439011',
            archivada: update.$set.archivada,
            archivadaAt: update.$set.archivadaAt || null,
        };
        return { lean: () => Promise.resolve(solicitud) };
    };

    try {
        const archivada = await solicitudesService.actualizarArchivado({
            id: '507f1f77bcf86cd799439011',
            archivada: true,
            administradoPor: '507f1f77bcf86cd799439012',
        });
        assert.equal(archivada.archivada, true);
        assert.equal(cambios[0].$set.archivadaPor, '507f1f77bcf86cd799439012');
        assert.ok(cambios[0].$set.archivadaAt instanceof Date);

        const restaurada = await solicitudesService.actualizarArchivado({
            id: '507f1f77bcf86cd799439011',
            archivada: false,
            administradoPor: '507f1f77bcf86cd799439012',
        });
        assert.equal(restaurada.archivada, false);
        assert.deepEqual(cambios[1].$unset, { archivadaAt: 1, archivadaPor: 1 });
        assert.equal(cambios[1].$set.archivada, false);
    } finally {
        Solicitud.findByIdAndUpdate = originalFindByIdAndUpdate;
    }
});

test('protege el archivado y la eliminación con autenticación y rol administrador', () => {
    assert.ok(solicitudesRouter.stack.some((layer) => layer.handle === authMiddleware));
    for (const [path, method] of [['/:id/archivo', 'patch'], ['/:id', 'delete']]) {
        const ruta = solicitudesRouter.stack.find((layer) => layer.route?.path === path && layer.route.methods[method]);
        assert.ok(ruta, `Debe existir ${method.toUpperCase()} ${path}`);
        assert.ok(ruta.route.stack.some((layer) => layer.handle === authMiddleware.requireAdmin));
    }
});

test('elimina en una transacción solo la solicitud y los documentos exclusivos verificados', async () => {
    const solicitudId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
    const fileId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439013');
    const solicitud = {
        _id: solicitudId,
        documentos: [{ fileId }],
    };
    const operaciones = [];
    const originalTransaction = mongoose.connection.transaction;
    const originalDb = mongoose.connection.db;
    const originales = {
        findById: Solicitud.findById,
        exists: Solicitud.exists,
        deleteOne: Solicitud.deleteOne,
        deleteManyNotificaciones: SolicitudNotificacion.deleteMany,
    };

    mongoose.connection.transaction = (callback) => callback({ id: 'transaction-test' });
    mongoose.connection.db = {
        collection(nombre) {
            if (nombre === 'documentosSolicitudes.files') {
                return {
                    find(filtro, opciones) {
                        operaciones.push({ operacion: 'buscar-archivo', filtro, opciones });
                        return {
                            toArray: async () => [{ _id: fileId, metadata: { solicitud: String(solicitudId) } }],
                        };
                    },
                    deleteMany: async (filtro, opciones) => {
                        operaciones.push({ operacion: 'borrar-archivo', filtro, opciones });
                        return { deletedCount: 1 };
                    },
                };
            }
            return {
                deleteMany: async (filtro, opciones) => {
                    operaciones.push({ operacion: 'borrar-fragmentos', filtro, opciones });
                    return { deletedCount: 1 };
                },
            };
        },
    };
    Solicitud.findById = (id) => ({
        session(session) {
            assert.equal(String(id), String(solicitudId));
            assert.equal(session.id, 'transaction-test');
            return this;
        },
        lean: async () => solicitud,
    });
    Solicitud.exists = (filtro) => ({
        session(session) {
            operaciones.push({ operacion: 'verificar-compartido', filtro, session });
            return Promise.resolve(null);
        },
    });
    Solicitud.deleteOne = async (filtro, opciones) => {
        operaciones.push({ operacion: 'borrar-solicitud', filtro, opciones });
        return { deletedCount: 1 };
    };
    SolicitudNotificacion.deleteMany = async (filtro, opciones) => {
        operaciones.push({ operacion: 'borrar-notificacion', filtro, opciones });
        return { deletedCount: 1 };
    };

    try {
        await solicitudesService.eliminarDefinitivamente(String(solicitudId));
        assert.deepEqual(operaciones.map(({ operacion }) => operacion), [
            'verificar-compartido',
            'buscar-archivo',
            'borrar-fragmentos',
            'borrar-archivo',
            'borrar-solicitud',
            'borrar-notificacion',
        ]);
        const borradoArchivo = operaciones.find(({ operacion }) => operacion === 'borrar-archivo');
        assert.deepEqual(borradoArchivo.filtro, { _id: { $in: [fileId] } });
        const borradoSolicitud = operaciones.find(({ operacion }) => operacion === 'borrar-solicitud');
        assert.deepEqual(borradoSolicitud.filtro, { _id: solicitudId });
        assert.equal(borradoSolicitud.opciones.session.id, 'transaction-test');
    } finally {
        mongoose.connection.transaction = originalTransaction;
        mongoose.connection.db = originalDb;
        Solicitud.findById = originales.findById;
        Solicitud.exists = originales.exists;
        Solicitud.deleteOne = originales.deleteOne;
        SolicitudNotificacion.deleteMany = originales.deleteManyNotificaciones;
    }
});

test('no elimina solicitud ni archivos cuando la propiedad de un documento GridFS no coincide', async () => {
    const solicitudId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
    const fileId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439013');
    const originalTransaction = mongoose.connection.transaction;
    const originalDb = mongoose.connection.db;
    const originalFindById = Solicitud.findById;
    const originalExists = Solicitud.exists;
    const originalDeleteOne = Solicitud.deleteOne;
    let intentosDeBorrado = 0;

    mongoose.connection.transaction = (callback) => callback({});
    mongoose.connection.db = {
        collection(nombre) {
            if (nombre === 'documentosSolicitudes.files') {
                return {
                    find: () => ({
                        toArray: async () => [{ _id: fileId, metadata: { solicitud: 'otra-solicitud' } }],
                    }),
                };
            }
            return {
                deleteMany: async () => {
                    intentosDeBorrado++;
                    return { deletedCount: 1 };
                },
            };
        },
    };
    Solicitud.findById = () => ({
        session() { return this; },
        lean: async () => ({ _id: solicitudId, documentos: [{ fileId }] }),
    });
    Solicitud.exists = () => ({ session: async () => null });
    Solicitud.deleteOne = async () => {
        intentosDeBorrado++;
        return { deletedCount: 1 };
    };

    try {
        await assert.rejects(
            solicitudesService.eliminarDefinitivamente(String(solicitudId)),
            { statusCode: 409 }
        );
        assert.equal(intentosDeBorrado, 0);
    } finally {
        mongoose.connection.transaction = originalTransaction;
        mongoose.connection.db = originalDb;
        Solicitud.findById = originalFindById;
        Solicitud.exists = originalExists;
        Solicitud.deleteOne = originalDeleteOne;
    }
});

test('no elimina archivos compartidos por más de una solicitud', async () => {
    const solicitudId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
    const fileId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439013');
    const originalTransaction = mongoose.connection.transaction;
    const originalDb = mongoose.connection.db;
    const originalFindById = Solicitud.findById;
    const originalExists = Solicitud.exists;
    const originalDeleteOne = Solicitud.deleteOne;
    let seAccedioAGridFs = false;
    let seEliminoSolicitud = false;

    mongoose.connection.transaction = (callback) => callback({});
    mongoose.connection.db = {
        collection() {
            seAccedioAGridFs = true;
            throw new Error('No se deben tocar archivos compartidos.');
        },
    };
    Solicitud.findById = () => ({
        session() { return this; },
        lean: async () => ({ _id: solicitudId, documentos: [{ fileId }] }),
    });
    Solicitud.exists = () => ({ session: async () => ({ _id: 'otra-solicitud' }) });
    Solicitud.deleteOne = async () => {
        seEliminoSolicitud = true;
        return { deletedCount: 1 };
    };

    try {
        await assert.rejects(
            solicitudesService.eliminarDefinitivamente(String(solicitudId)),
            { statusCode: 409 }
        );
        assert.equal(seAccedioAGridFs, false);
        assert.equal(seEliminoSolicitud, false);
    } finally {
        mongoose.connection.transaction = originalTransaction;
        mongoose.connection.db = originalDb;
        Solicitud.findById = originalFindById;
        Solicitud.exists = originalExists;
        Solicitud.deleteOne = originalDeleteOne;
    }
});

test('requiere comentario para dejar pendiente o rechazar mediante el endpoint', async () => {
    const estados = ['pendiente', 'rechazada'];
    const originalActualizarEstado = solicitudesService.actualizarEstado;
    let invocaciones = 0;
    solicitudesService.actualizarEstado = async () => {
        invocaciones++;
        return {};
    };
    try {
        for (const estado of estados) {
            const respuesta = {
                codigo: null,
                cuerpo: null,
                status(codigo) { this.codigo = codigo; return this; },
                json(cuerpo) { this.cuerpo = cuerpo; return this; },
            };
            await solicitudesController.actualizarEstado({
                params: { id: '507f1f77bcf86cd799439011' },
                body: { estado, comentario: '   ' },
                user: { _id: '507f1f77bcf86cd799439012' },
            }, respuesta);
            assert.equal(respuesta.codigo, 400);
            assert.match(respuesta.cuerpo.message, /comentario/i);
        }
        assert.equal(invocaciones, 0);
    } finally {
        solicitudesService.actualizarEstado = originalActualizarEstado;
    }
});

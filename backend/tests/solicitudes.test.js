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

test('vence exactamente a los 60 días sin respuesta; las resueltas no vencen', () => {
    const createdAt = new Date('2026-01-01T12:00:00Z');
    const limite = new Date(createdAt.getTime() + ciclo.DIAS_VENCIMIENTO_SOLICITUD * 86400000);
    const pendiente = { estado: 'pendiente', createdAt, historialEstados: [] };
    assert.equal(ciclo.cambioAutomatico(pendiente, {}, new Date(limite.getTime() - 1)), null);
    assert.equal(ciclo.cambioAutomatico(pendiente, {}, limite).estado, 'vencida');
    for (const estado of ['aprobada', 'rechazada', 'cerrada', 'vencida']) {
        assert.equal(ciclo.cambioAutomatico({ ...pendiente, estado }, {}, limite), null);
    }
    assert.equal(ciclo.cambioAutomatico({ ...pendiente, historialEstados: [{ comentario: 'En revisión', fecha: new Date('2026-01-02') }] }, {}, limite), null);
    assert.equal(ciclo.cambioAutomatico({ ...pendiente, reactivadaEn: limite }, {}, limite), null);
});

test('vendido y alquilado cierran pendientes, incluso si también vencerían', () => {
    for (const estado of ['vendido', 'alquilado']) {
        const cambio = ciclo.cambioAutomatico({ estado: 'pendiente', createdAt: new Date('2020-01-01') }, { estado });
        assert.equal(cambio.estado, 'cerrada');
        assert.equal(cambio.comentario, 'La propiedad ya no está disponible');
        assert.equal(ciclo.cambioAutomatico({ estado: 'aprobada' }, { estado }), null);
    }
});

test('cliente: oculta mensajes de más de 90 días, referencias duplicadas y datos internos', () => {
    const ahora = new Date();
    const reciente = new Date(ahora.getTime() - 86400000);
    const solicitud = { _id: 'id', estado: 'pendiente', datosCifrados: 'secreto', archivadaPor: 'admin',
        comentarioEstado: 'mensaje viejo', historialEstados: [
            { estado: 'pendiente', comentario: 'mensaje viejo', fecha: new Date(ahora.getTime() - 91 * 86400000), administradoPor: 'admin' },
            { estado: 'pendiente', comentario: 'mensaje actual', fecha: reciente, administradoPor: 'admin' },
            { estado: 'rechazada', comentario: '', comentarioReferenciaIndice: 1, fecha: ahora, administradoPor: 'admin' },
        ] };
    const resultado = solicitudesService.infoCliente(solicitud);
    assert.equal(resultado.comentarioEstado, 'mensaje actual');
    assert.equal(resultado.comentarioFecha, reciente);
    assert.equal(resultado.historialEstados.length, 1);
    assert.equal(JSON.stringify(resultado).includes('administradoPor'), false);
    assert.equal(JSON.stringify(resultado).includes('datosCifrados'), false);
    assert.equal(JSON.stringify(resultado).includes('archivadaPor'), false);
    assert.equal(solicitud.historialEstados.length, 3, 'el panel conserva todo el historial');
    assert.equal(solicitudesService.infoCliente({ ...solicitud, historialEstados: [solicitud.historialEstados[0]] }).comentarioEstado, '');
    assert.deepEqual(solicitudesService.infoCliente({
        ...solicitud,
        estado: 'falta_documentacion',
        documentosSolicitados: ['dniTitularFrente'],
    }).documentosSolicitados, ['dniTitularFrente']);
    assert.deepEqual(solicitudesService.infoCliente({
        ...solicitud,
        estado: 'pendiente',
        documentosSolicitados: ['dniTitularFrente'],
    }).documentosSolicitados, []);
});

test('las acciones administrativas limitan comentarios a 250 caracteres y el historial conserva 500', async () => {
    const id = new mongoose.Types.ObjectId().toString();
    const largo = 'https://ejemplo.com/' + 'a'.repeat(230);
    assert.equal(largo.length, 250);
    const datos = { usuario: id, propiedad: id, operacion: 'compra', datosCifrados: 'cifrado', claveIdempotencia: crypto.randomUUID(), comentarioEstado: largo,
        historialEstados: [{ estado: 'pendiente', comentario: largo, administradoPor: id }] };
    assert.equal(new Solicitud(datos).validateSync(), undefined);
    assert.ok(new Solicitud({ ...datos, comentarioEstado: 'a'.repeat(501) }).validateSync().errors.comentarioEstado);
    assert.ok(new Solicitud({ ...datos, historialEstados: [{ estado: 'pendiente', comentario: 'a'.repeat(501) }] }).validateSync());
    const respuestaAccion = { status(n) { this.codigo = n; return this; }, json(body) { this.body = body; return this; } };
    await solicitudesController.actualizarEstado({ params: { id }, body: { estado: 'pendiente', comentario: 'a'.repeat(251) } }, respuestaAccion);
    assert.equal(respuestaAccion.codigo, 400);
    assert.match(respuestaAccion.body.message, /250/);
    const respuestaComentario = { status(n) { this.codigo = n; return this; }, json(body) { this.body = body; return this; } };
    await solicitudesController.agregarComentario({ params: { id }, body: { comentario: 'a'.repeat(501) } }, respuestaComentario);
    assert.equal(respuestaComentario.codigo, 400);
    assert.match(respuestaComentario.body.message, /500/);
    await assert.rejects(solicitudesService.agregarComentario({ comentario: 'a'.repeat(501) }), /500/);
});

test('sincronizar guarda cierre una sola vez y envía un aviso, sin base real', async (t) => {
    const solicitud = { _id: 'prueba', usuario: 'usuario', estado: 'pendiente', createdAt: new Date(), historialEstados: [], propiedad: 'propiedad' };
    let guardada;
    t.mock.method(Solicitud, 'findOneAndUpdate', (filtro, cambios) => {
        assert.equal(filtro.estado, 'pendiente');
        guardada = { ...solicitud, ...cambios.$set, historialEstados: [cambios.$push.historialEstados] };
        return { select() { return this; }, lean: async () => guardada };
    });
    const antes = emailService.avisarEstadoSolicitud.mock.callCount();
    const cerrada = await ciclo.sincronizarSolicitud(solicitud, { estado: 'vendido' });
    assert.equal(cerrada.estado, 'cerrada');
    assert.equal(cerrada.historialEstados[0].automatico, true);
    await ciclo.sincronizarSolicitud(cerrada, { estado: 'vendido' });
    assert.equal(emailService.avisarEstadoSolicitud.mock.callCount(), antes + 1);
    assert.equal(emailService.avisarEstadoSolicitud.mock.calls.at(-1).arguments[0].mensaje, 'La propiedad ya no está disponible');
});

test('no se crean solicitudes sobre propiedades vendidas ni alquiladas', async (t) => {
    t.mock.method(Solicitud, 'findOne', async () => null);
    const casos = [
        [{ estado: 'vendido', categoriaOperacion: 'venta' }, 'compra'],
        [{ estado: 'alquilado', categoriaOperacion: 'alquiler' }, 'alquiler'],
        [{ estado: 'reservado', operaciones: ['venta', 'alquiler'] }, 'compra'],
        // Se vendió y después el comprador la alquiló: la venta no se reabre
        [{ estado: 'alquilado', operaciones: ['venta', 'alquiler'], vendida: true }, 'compra'],
        // En venta y alquiler, ya alquilada: la de alquiler se cierra
        [{ estado: 'alquilado', operaciones: ['venta', 'alquiler'] }, 'alquiler'],
    ];
    for (const [propiedad, operacion] of casos) {
        const consulta = t.mock.method(Property, 'findById', () => ({ select() { return this; }, lean: async () => ({ titulo: 'Casa', ...propiedad }) }));
        await assert.rejects(solicitudesService.crear({ usuario: 'prueba', propiedadId: 'prueba', operacion }), (error) => error.statusCode === 409);
        consulta.mock.restore();
    }
});

test('HU-25: solicitudes según las operaciones de la propiedad', async (t) => {
    t.mock.method(Solicitud, 'findOne', async () => null);
    const consulta = t.mock.method(Property, 'findById', () => ({ select() { return this; }, lean: async () => ({ titulo: 'Casa', estado: 'disponible', operaciones: ['alquiler'] }) }));
    await assert.rejects(solicitudesService.crear({ usuario: 'prueba', propiedadId: 'prueba', operacion: 'compra' }), (error) => error.statusCode === 409 && /no admite/.test(error.message));
    consulta.mock.restore();
    const temporario = t.mock.method(Property, 'findById', () => ({ select() { return this; }, lean: async () => ({ titulo: 'Cabaña', estado: 'disponible', operaciones: ['temporario'] }) }));
    await assert.rejects(solicitudesService.crear({ usuario: 'prueba', propiedadId: 'prueba', operacion: 'alquiler' }), (error) => error.statusCode === 409);
    temporario.mock.restore();
});

test('HU-28: venta con inquilino adentro sigue abierta para compra y cierra solo las de alquiler', async () => {
    const propiedad = { estado: 'alquilado', operaciones: ['venta', 'alquiler'] };
    assert.equal(ciclo.cambioAutomatico({ estado: 'pendiente', operacion: 'compra', createdAt: new Date() }, propiedad), null);
    assert.equal(ciclo.cambioAutomatico({ estado: 'pendiente', operacion: 'alquiler', createdAt: new Date() }, propiedad).estado, 'cerrada');
    assert.equal(ciclo.cambioAutomatico({ estado: 'pendiente', operacion: 'compra', createdAt: new Date() }, { ...propiedad, vendida: true }).estado, 'cerrada');
});

test('el servicio de propiedades dispara el cierre al guardar vendido', async (t) => {
    const repositorio = require('../src/repositories/properties.repository');
    const servicio = require('../src/services/properties.service');
    const propiedad = { _id: 'prueba', estado: 'vendido' };
    t.mock.method(repositorio, 'updateProperty', async () => propiedad);
    const cierre = t.mock.method(ciclo, 'cerrarPorPropiedad', async () => {});
    await servicio.updateProperty('prueba', { estado: 'vendido' });
    assert.deepEqual(cierre.mock.calls[0].arguments, [propiedad]);
});

test('documentos individuales: valida propietario, lote, tipo, duplicados y vencimiento', async () => {
    const servicio = require('../src/services/solicitudes-documentos.service');
    const id = new mongoose.Types.ObjectId();
    const clave = crypto.randomUUID();
    const originalDb = mongoose.connection.db;
    let metadata = { usuario: 'cliente', tipo: 'dniTitularFrente', clave, tamano: 12, mimeType: 'application/pdf', temporalHasta: new Date(Date.now() + 60000) };
    mongoose.connection.db = { collection: () => ({ find: () => ({ toArray: async () => [{ _id: id, metadata }] }) }) };
    const refs = [{ id: String(id), tipo: 'dniTitularFrente' }];
    try {
        const archivos = await servicio.resolver(refs, 'cliente', clave);
        assert.equal(archivos.dniTitularFrente[0].size, 12);
        await assert.rejects(servicio.resolver(refs, 'otro-cliente', clave), /no pertenece/);
        await assert.rejects(servicio.resolver(refs, 'cliente', crypto.randomUUID()), /no pertenece/);
        await assert.rejects(servicio.resolver([{ ...refs[0], tipo: 'domicilio' }], 'cliente', clave), /no pertenece/);
        await assert.rejects(servicio.resolver([...refs, ...refs], 'cliente', clave), /repetidos/);
        metadata = { ...metadata, temporalHasta: new Date(0) };
        await assert.rejects(servicio.resolver(refs, 'cliente', clave), /venció/);
    } finally { mongoose.connection.db = originalDb; }
});

test('documentos individuales: no permite asociar un archivo ya reclamado', async () => {
    const servicio = require('../src/services/solicitudes-documentos.service');
    const originalDb = mongoose.connection.db;
    mongoose.connection.db = { collection: () => ({ updateOne: async () => ({ modifiedCount: 0 }) }) };
    try {
        await assert.rejects(servicio.vincular([{ archivoId: new mongoose.Types.ObjectId(), tipo: 'domicilio' }], { _id: 's', usuario: 'u', claveIdempotencia: 'c' }, {}), /ya se usó/);
    } finally { mongoose.connection.db = originalDb; }
});

test('documentos individuales: cifra al guardar y aplica límites separados para PDF e imágenes', async () => {
    const { EventEmitter } = require('node:events');
    const servicio = require('../src/services/solicitudes-documentos.service');
    const anteriorClave = process.env.SOLICITUDES_ENCRYPTION_KEY;
    const originalDb = mongoose.connection.db;
    const originalBucket = Object.getOwnPropertyDescriptor(mongoose.mongo, 'GridFSBucket');
    const clave = crypto.randomBytes(32).toString('hex');
    const archivoId = new mongoose.Types.ObjectId();
    const contenido = Buffer.from('%PDF-1.7 documento de prueba');
    let cifrado;
    let metadataGuardada;
    process.env.SOLICITUDES_ENCRYPTION_KEY = clave;
    mongoose.connection.db = {};
    Object.defineProperty(mongoose.mongo, 'GridFSBucket', { configurable: true, writable: true, value: class {
        openUploadStream(_nombre, opciones) {
            metadataGuardada = opciones.metadata;
            const stream = new EventEmitter();
            stream.id = archivoId;
            stream.end = (bytes) => {
                cifrado = Buffer.from(bytes);
                queueMicrotask(() => stream.emit('finish'));
            };
            return stream;
        }
        delete = async () => {};
    } });
    try {
        const resultado = await servicio.guardar({
            archivo: { buffer: contenido, size: contenido.length, mimetype: 'application/pdf' },
            usuario: 'cliente',
            tipo: 'dniTitularFrente',
            clave: crypto.randomUUID(),
        });
        assert.equal(resultado.id, String(archivoId));
        assert.notDeepEqual(cifrado, contenido);
        assert.deepEqual(descifrar(cifrado), contenido);
        assert.equal(metadataGuardada.usuario, 'cliente');
        assert.equal(metadataGuardada.tipo, 'dniTitularFrente');
        assert.equal(servicio.MAXIMO_PDF, 4 * 1024 * 1024);
        assert.equal(servicio.MAXIMO_IMAGEN, 20 * 1024 * 1024);
        await assert.rejects(servicio.guardar({
            archivo: { buffer: Buffer.alloc(1), size: servicio.MAXIMO_PDF + 1, mimetype: 'application/pdf' },
            usuario: 'cliente', tipo: 'dniTitularFrente', clave: crypto.randomUUID(),
        }), /PDF de hasta 4 MB/);
        await assert.rejects(servicio.guardar({
            archivo: { buffer: Buffer.alloc(1), size: servicio.MAXIMO_IMAGEN + 1, mimetype: 'image/png' },
            usuario: 'cliente', tipo: 'dniTitularFrente', clave: crypto.randomUUID(),
        }), /imagen JPG\/PNG de hasta 20 MB/);
    } finally {
        mongoose.connection.db = originalDb;
        Object.defineProperty(mongoose.mongo, 'GridFSBucket', originalBucket);
        if (anteriorClave === undefined) delete process.env.SOLICITUDES_ENCRYPTION_KEY;
        else process.env.SOLICITUDES_ENCRYPTION_KEY = anteriorClave;
    }
});

test('el controlador no almacena archivos con firma distinta del formato declarado', async () => {
    const documentosService = require('../src/services/solicitudes-documentos.service');
    const originalGuardar = documentosService.guardar;
    let guardados = 0;
    documentosService.guardar = async () => { guardados++; };
    const respuesta = {
        codigo: null,
        cuerpo: null,
        status(codigo) { this.codigo = codigo; return this; },
        json(cuerpo) { this.cuerpo = cuerpo; return this; },
    };
    try {
        await solicitudesController.subirDocumento({
            file: { originalname: 'archivo.png', mimetype: 'image/png', buffer: Buffer.from('no es un PNG'), size: 12 },
            params: { tipo: 'dniTitularFrente' },
            user: { _id: 'cliente' },
            get: () => crypto.randomUUID(),
        }, respuesta);
        assert.equal(respuesta.codigo, 400);
        assert.match(respuesta.cuerpo.message, /no coincide/);
        assert.equal(guardados, 0);
    } finally {
        documentosService.guardar = originalGuardar;
    }
});

// Ninguna prueba envía correos ni consulta usuarios reales.
const ciclo = require('../src/services/solicitudes-ciclo.service');
const User = require('../src/models/user.model');
const emailService = require('../src/services/email.service');
const { mock, after } = require('node:test');
mock.method(User, 'findById', () => ({ select() { return this; }, lean: async () => ({ email: 'cliente@example.com', nombre: 'Ana' }) }));
mock.method(emailService, 'avisarEstadoSolicitud', async () => ({ enviado: true }));
after(() => mock.restoreAll());

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
            createdAt: new Date(),
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
                titulo: 'Casa válida',
                ubicacion: 'Paraná',
                ciudad: 'Paraná',
                direccionCompleta: 'Calle 1',
                tipoInmueble: 'casa',
                precio: 120000,
                moneda: 'USD',
                fotos: ['https://images.example/casa.jpg'],
                categoriaOperacion: 'venta',
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
            archivoId: '507f1f77bcf86cd799439013',
            tamano: 1234,
            tipoMime: 'image/jpeg',
        }],
        createdAt: new Date(),
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

test('el cliente corrige solo los archivos solicitados en una transacción y vuelve a pendiente', async (t) => {
    process.env.SOLICITUDES_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    const id = new mongoose.Types.ObjectId();
    const usuario = new mongoose.Types.ObjectId();
    const propiedadId = new mongoose.Types.ObjectId();
    const clave = crypto.randomUUID();
    const datosCifrados = cifrar(Buffer.from(JSON.stringify({
        titular: { nombre: 'Ana' },
        incluyeCotitular: false,
        ingresosTipo: 'recibos',
        garantia: { tipo: 'caucion' },
    }))).toString('base64');
    const solicitud = {
        _id: id,
        usuario,
        propiedad: propiedadId,
        operacion: 'alquiler',
        estado: 'falta_documentacion',
        datosCifrados,
        documentosSolicitados: ['dniTitularFrente', 'recibosIngresos:1', 'documentacionCaucion'],
        documentosSolicitadosEn: new Date(),
        documentos: [
            { tipo: 'dniTitularFrente', archivoId: new mongoose.Types.ObjectId(), tamano: 100, tipoMime: 'image/jpeg' },
            { tipo: 'dniTitularDorso', archivoId: new mongoose.Types.ObjectId(), tamano: 101, tipoMime: 'image/jpeg' },
            { tipo: 'cuilTitular', archivoId: new mongoose.Types.ObjectId(), tamano: 102, tipoMime: 'application/pdf' },
            { tipo: 'recibosIngresos', archivoId: new mongoose.Types.ObjectId(), tamano: 103, tipoMime: 'application/pdf' },
            { tipo: 'recibosIngresos', archivoId: new mongoose.Types.ObjectId(), tamano: 104, tipoMime: 'application/pdf' },
            { tipo: 'recibosIngresos', archivoId: new mongoose.Types.ObjectId(), tamano: 105, tipoMime: 'application/pdf' },
            { tipo: 'domicilio', archivoId: new mongoose.Types.ObjectId(), tamano: 106, tipoMime: 'application/pdf' },
        ],
        historialEstados: [{ estado: 'falta_documentacion', comentario: 'Corregí los documentos marcados.', fecha: new Date() }],
        updatedAt: new Date(),
    };
    const idsNuevos = {
        dniTitularFrente: new mongoose.Types.ObjectId(),
        recibosIngresos: new mongoose.Types.ObjectId(),
        documentacionCaucion: new mongoose.Types.ObjectId(),
    };
    const referencias = [
        { id: String(idsNuevos.dniTitularFrente), tipo: 'dniTitularFrente' },
        { id: String(idsNuevos.recibosIngresos), tipo: 'recibosIngresos', indice: 1 },
        { id: String(idsNuevos.documentacionCaucion), tipo: 'documentacionCaucion' },
    ];
    const servicioDocumentos = require('../src/services/solicitudes-documentos.service');
    const originalTransaction = mongoose.connection.transaction;
    let cambiosGuardados;
    let notificacionGuardada;
    const session = { transaction: true };
    mongoose.connection.transaction = (callback) => callback(session);
    t.mock.method(Solicitud, 'findOne', (filtro) => {
        const resultado = filtro.ultimaCorreccionIdempotencia ? null : solicitud;
        return {
            select() { return this; },
            session(actual) { assert.equal(actual, session); return this; },
            lean: async () => resultado,
        };
    });
    t.mock.method(Solicitud, 'findOneAndUpdate', (filtro, cambios, opciones) => {
        assert.equal(filtro.estado, 'falta_documentacion');
        assert.deepEqual(filtro.documentosSolicitados, solicitud.documentosSolicitados);
        assert.equal(opciones.session, session);
        cambiosGuardados = cambios;
        return {
            select() { return this; },
            lean: async () => ({
                ...solicitud,
                ...cambios.$set,
                historialEstados: [...solicitud.historialEstados, cambios.$push.historialEstados],
            }),
        };
    });
    t.mock.method(SolicitudNotificacion, 'findOneAndUpdate', async (filtro, cambios, opciones) => {
        notificacionGuardada = { filtro, cambios, opciones };
    });
    t.mock.method(Property, 'findById', () => ({
        select() { return this; },
        lean: async () => ({ _id: propiedadId, titulo: 'Departamento de prueba' }),
    }));
    t.mock.method(servicioDocumentos, 'resolver', async () => ({
        dniTitularFrente: [{ fileId: idsNuevos.dniTitularFrente, size: 201, mimetype: 'image/jpeg' }],
        recibosIngresos: [{ fileId: idsNuevos.recibosIngresos, size: 202, mimetype: 'application/pdf' }],
        documentacionCaucion: [{ fileId: idsNuevos.documentacionCaucion, size: 203, mimetype: 'application/pdf' }],
    }));
    const vincular = t.mock.method(servicioDocumentos, 'vincular', async (_documentos, asociacion, actualSession) => {
        assert.equal(asociacion.claveIdempotencia, clave);
        assert.equal(String(asociacion._id), String(id));
        assert.equal(actualSession, session);
    });
    t.mock.method(ciclo, 'avisarCambio', async () => ({ estado: 'simulada' }));

    try {
        const resultado = await solicitudesService.corregirDocumentacion({ id, usuario, referencias, claveIdempotencia: clave });
        const documentos = cambiosGuardados.$set.documentos;
        assert.equal(resultado.solicitud.estado, 'pendiente');
        assert.deepEqual(resultado.solicitud.documentosSolicitados, []);
        assert.equal(resultado.repetida, false);
        assert.equal(String(documentos.find((doc) => doc.tipo === 'dniTitularFrente').archivoId), String(idsNuevos.dniTitularFrente));
        assert.equal(String(documentos.filter((doc) => doc.tipo === 'recibosIngresos')[0].archivoId), String(solicitud.documentos[3].archivoId));
        assert.equal(String(documentos.filter((doc) => doc.tipo === 'recibosIngresos')[1].archivoId), String(idsNuevos.recibosIngresos));
        assert.equal(String(documentos.filter((doc) => doc.tipo === 'recibosIngresos')[2].archivoId), String(solicitud.documentos[5].archivoId));
        assert.equal(String(documentos.find((doc) => doc.tipo === 'domicilio').archivoId), String(solicitud.documentos[6].archivoId));
        assert.equal(String(documentos.find((doc) => doc.tipo === 'documentacionCaucion').archivoId), String(idsNuevos.documentacionCaucion));
        assert.equal(cambiosGuardados.$set.ultimaCorreccionIdempotencia, clave);
        assert.equal(cambiosGuardados.$push.historialEstados.tipoEvento, 'documentacion_presentada');
        assert.equal(notificacionGuardada.cambios.$set.leida, false);
        assert.equal(notificacionGuardada.opciones.session, session);
        assert.equal(vincular.mock.callCount(), 1);
        assert.equal(resultado.solicitud.propiedad.titulo, 'Departamento de prueba');
    } finally {
        mongoose.connection.transaction = originalTransaction;
    }
});

test('rechaza envíos incompletos y correcciones de solicitudes ajenas sin actualizar referencias', async (t) => {
    const servicioDocumentos = require('../src/services/solicitudes-documentos.service');
    const usuario = new mongoose.Types.ObjectId();
    const id = new mongoose.Types.ObjectId();
    const referencia = { id: String(new mongoose.Types.ObjectId()), tipo: 'dniTitularFrente' };
    const solicitudPropia = {
        _id: id,
        usuario,
        estado: 'falta_documentacion',
        documentosSolicitados: ['dniTitularFrente', 'documentacionCaucion'],
        documentos: [{ tipo: 'dniTitularFrente', archivoId: new mongoose.Types.ObjectId() }],
    };
    const originalTransaction = mongoose.connection.transaction;
    let solicitudConsultada = solicitudPropia;
    let actualizaciones = 0;
    let vinculaciones = 0;
    mongoose.connection.transaction = (callback) => callback({ transaction: true });
    t.mock.method(Solicitud, 'findOne', (filtro) => ({
        select() { return this; },
        session() { return this; },
        lean: async () => filtro.ultimaCorreccionIdempotencia ? null : solicitudConsultada,
    }));
    t.mock.method(Solicitud, 'findOneAndUpdate', async () => {
        actualizaciones++;
        return null;
    });
    t.mock.method(servicioDocumentos, 'resolver', async () => ({
        dniTitularFrente: [{ fileId: new mongoose.Types.ObjectId(), size: 12, mimetype: 'image/jpeg' }],
    }));
    t.mock.method(servicioDocumentos, 'vincular', async () => { vinculaciones++; });
    try {
        await assert.rejects(solicitudesService.corregirDocumentacion({
            id, usuario, referencias: [referencia], claveIdempotencia: crypto.randomUUID(),
        }), { statusCode: 400 });
        assert.equal(actualizaciones, 0);
        assert.equal(vinculaciones, 0);

        solicitudConsultada = null;
        await assert.rejects(solicitudesService.corregirDocumentacion({
            id, usuario: new mongoose.Types.ObjectId(), referencias: [referencia], claveIdempotencia: crypto.randomUUID(),
        }), { statusCode: 404 });
        assert.equal(actualizaciones, 0);
        assert.equal(vinculaciones, 0);
    } finally {
        mongoose.connection.transaction = originalTransaction;
    }
});

test('un fallo al vincular archivos no cambia el estado ni crea una notificación', async (t) => {
    process.env.SOLICITUDES_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    const servicioDocumentos = require('../src/services/solicitudes-documentos.service');
    const id = new mongoose.Types.ObjectId();
    const usuario = new mongoose.Types.ObjectId();
    const clave = crypto.randomUUID();
    const solicitud = {
        _id: id,
        usuario,
        propiedad: new mongoose.Types.ObjectId(),
        operacion: 'compra',
        estado: 'falta_documentacion',
        datosCifrados: cifrar(Buffer.from(JSON.stringify({ titular: { nombre: 'Ana' }, ingresosTipo: 'constancia' }))).toString('base64'),
        documentosSolicitados: ['dniTitularFrente'],
        documentos: [{ tipo: 'dniTitularFrente', archivoId: new mongoose.Types.ObjectId(), tamano: 10, tipoMime: 'image/jpeg' }],
        historialEstados: [],
        updatedAt: new Date(),
    };
    const originalTransaction = mongoose.connection.transaction;
    let guardados = 0;
    let notificaciones = 0;
    mongoose.connection.transaction = (callback) => callback({});
    t.mock.method(Solicitud, 'findOne', (filtro) => ({
        select() { return this; },
        session() { return this; },
        lean: async () => filtro.ultimaCorreccionIdempotencia ? null : solicitud,
    }));
    t.mock.method(Solicitud, 'findOneAndUpdate', async () => {
        guardados++;
        return solicitud;
    });
    t.mock.method(SolicitudNotificacion, 'findOneAndUpdate', async () => { notificaciones++; });
    t.mock.method(servicioDocumentos, 'resolver', async () => ({
        dniTitularFrente: [{ fileId: new mongoose.Types.ObjectId(), size: 15, mimetype: 'image/jpeg' }],
    }));
    t.mock.method(servicioDocumentos, 'vincular', async () => {
        throw new Error('GridFS no pudo asociar el archivo');
    });
    try {
        await assert.rejects(solicitudesService.corregirDocumentacion({
            id,
            usuario,
            referencias: [{ id: String(new mongoose.Types.ObjectId()), tipo: 'dniTitularFrente' }],
            claveIdempotencia: clave,
        }), /GridFS no pudo asociar/);
        assert.equal(guardados, 0);
        assert.equal(notificaciones, 0);
        assert.equal(solicitud.estado, 'falta_documentacion');
    } finally {
        mongoose.connection.transaction = originalTransaction;
    }
});

test('una repetición idempotente no vuelve a subir, vincular ni notificar documentos', async (t) => {
    const servicioDocumentos = require('../src/services/solicitudes-documentos.service');
    const usuario = new mongoose.Types.ObjectId();
    const id = new mongoose.Types.ObjectId();
    const clave = crypto.randomUUID();
    const solicitud = {
        _id: id,
        usuario,
        estado: 'pendiente',
        ultimaCorreccionIdempotencia: clave,
        documentosSolicitados: [],
        historialEstados: [],
    };
    t.mock.method(Solicitud, 'findOne', (filtro) => ({
        select() { return this; },
        lean: async () => filtro.ultimaCorreccionIdempotencia === clave ? solicitud : null,
    }));
    const resolver = t.mock.method(servicioDocumentos, 'resolver', async () => {
        throw new Error('No debe volver a validar archivos reclamados.');
    });
    const resultado = await solicitudesService.corregirDocumentacion({
        id,
        usuario,
        referencias: [{ id: String(new mongoose.Types.ObjectId()), tipo: 'dniTitularFrente' }],
        claveIdempotencia: clave,
    });
    assert.equal(resultado.repetida, true);
    assert.equal(resultado.solicitud.estado, 'pendiente');
    assert.equal(resolver.mock.callCount(), 0);
});

test('el panel administra y descarga el recibo reemplazado usando su índice, sin caché pública', async (t) => {
    const { Readable } = require('node:stream');
    process.env.SOLICITUDES_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    const id = new mongoose.Types.ObjectId();
    const usuario = new mongoose.Types.ObjectId();
    const propiedadId = new mongoose.Types.ObjectId();
    const archivos = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
    const datosCifrados = cifrar(Buffer.from(JSON.stringify({ titular: { nombre: 'Ana' } }))).toString('base64');
    const solicitud = {
        _id: id,
        usuario,
        propiedad: propiedadId,
        operacion: 'alquiler',
        estado: 'pendiente',
        datosCifrados,
        documentos: archivos.map((archivoId) => ({ tipo: 'recibosIngresos', archivoId, tamano: 80, tipoMime: 'application/pdf' })),
        documentosSolicitados: [],
        historialEstados: [],
        createdAt: new Date(),
    };
    const contenidoCorregido = Buffer.from('%PDF-1.7 recibo actualizado');
    const archivoCifrado = cifrar(contenidoCorregido);
    const originalDb = mongoose.connection.db;
    const originalBucket = Object.getOwnPropertyDescriptor(mongoose.mongo, 'GridFSBucket');
    const originalFindById = Solicitud.findById;
    const originalPropertyFindById = Property.findById;
    let archivoConsultado;
    mongoose.connection.db = {};
    Object.defineProperty(mongoose.mongo, 'GridFSBucket', { configurable: true, writable: true, value: class {
        find(filtro) {
            archivoConsultado = filtro._id;
            return { next: async () => ({ metadata: { solicitud: String(id) } }) };
        }
        openDownloadStream(archivoId) {
            archivoConsultado = archivoId;
            return Readable.from([archivoCifrado]);
        }
    } });
    Solicitud.findById = () => ({
        select() { return this; },
        lean: async () => solicitud,
    });
    Property.findById = () => ({
        select() { return this; },
        lean: async () => ({ _id: propiedadId, titulo: 'Departamento de prueba', ciudad: 'Paraná', estado: 'disponible' }),
    });
    try {
        const detalle = await solicitudesService.obtenerPorId(id, usuario, true);
        assert.deepEqual(detalle.documentos.map((doc) => doc.url), [
            `/solicitudes/${id}/documentos/recibosIngresos%3A0`,
            `/solicitudes/${id}/documentos/recibosIngresos%3A1`,
            `/solicitudes/${id}/documentos/recibosIngresos%3A2`,
        ]);
        assert.match(detalle.documentos[1].nombre, /2 de 3/);
        const documento = await solicitudesService.obtenerDocumento(id, usuario, true, 'recibosIngresos:1');
        assert.equal(String(archivoConsultado), String(archivos[1]));
        assert.deepEqual(documento.contenido, contenidoCorregido);
        assert.match(documento.nombre, /2 de 3/);
    } finally {
        mongoose.connection.db = originalDb;
        Object.defineProperty(mongoose.mongo, 'GridFSBucket', originalBucket);
        Solicitud.findById = originalFindById;
        Property.findById = originalPropertyFindById;
    }
});

test('guarda y recupera documentos solicitados, valida alternativas y registra una sola acción', async (t) => {
    process.env.SOLICITUDES_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    const id = new mongoose.Types.ObjectId();
    const usuarioId = new mongoose.Types.ObjectId();
    const propiedadId = new mongoose.Types.ObjectId();
    const cifrado = cifrar(Buffer.from(JSON.stringify({
        titular: { nombre: 'Ana' },
        incluyeCotitular: false,
        ingresosTipo: 'recibos',
        garantia: { tipo: 'caucion' },
    }), 'utf8')).toString('base64');
    const documentos = [
        { tipo: 'dniTitularFrente', archivoId: new mongoose.Types.ObjectId(), tamano: 100, tipoMime: 'image/jpeg' },
        { tipo: 'dniTitularDorso', archivoId: new mongoose.Types.ObjectId(), tamano: 100, tipoMime: 'image/jpeg' },
        { tipo: 'cuilTitular', archivoId: new mongoose.Types.ObjectId(), tamano: 100, tipoMime: 'application/pdf' },
        { tipo: 'domicilio', archivoId: new mongoose.Types.ObjectId(), tamano: 100, tipoMime: 'application/pdf' },
        ...[0, 1, 2].map(() => ({ tipo: 'recibosIngresos', archivoId: new mongoose.Types.ObjectId(), tamano: 100, tipoMime: 'application/pdf' })),
    ];
    const solicitud = {
        _id: id,
        usuario: usuarioId,
        propiedad: propiedadId,
        operacion: 'alquiler',
        estado: 'pendiente',
        datosCifrados: cifrado,
        documentos,
        historialEstados: [],
        createdAt: new Date(),
    };
    const propiedad = {
        _id: propiedadId,
        titulo: 'Casa en Paraná',
        ciudad: 'Paraná',
        estado: 'disponible',
        categoriaOperacion: 'alquiler',
        operaciones: ['alquiler'],
    };
    const seleccionados = ['recibosIngresos:1', 'documentacionCaucion'];
    let guardada = solicitud;
    let actualizacion;
    t.mock.method(Solicitud, 'findById', () => ({
        select() { return this; },
        lean: async () => guardada,
    }));
    t.mock.method(Solicitud, 'findOneAndUpdate', (filtro, cambios) => {
        actualizacion = { filtro, cambios };
        guardada = {
            ...guardada,
            ...cambios.$set,
            historialEstados: [...guardada.historialEstados, cambios.$push.historialEstados],
        };
        return { select() { return this; }, lean: async () => guardada };
    });
    t.mock.method(Property, 'findById', () => ({
        select() { return this; },
        lean: async () => propiedad,
    }));

    await assert.rejects(solicitudesService.actualizarEstado({
        id: String(id),
        estado: 'falta_documentacion',
        comentario: 'Documento no permitido',
        documentosSolicitados: ['constanciaIngresos'],
        administradoPor: usuarioId,
    }), { statusCode: 400 });
    const resultado = await solicitudesService.actualizarEstado({
        id: String(id),
        estado: 'falta_documentacion',
        comentario: 'Reemplazá el segundo recibo y adjuntá la póliza.',
        documentosSolicitados: seleccionados,
        administradoPor: usuarioId,
    });
    assert.equal(actualizacion.filtro.estado, 'pendiente');
    assert.equal(actualizacion.cambios.$set.estado, 'falta_documentacion');
    assert.deepEqual(actualizacion.cambios.$set.documentosSolicitados, seleccionados);
    assert.equal(String(actualizacion.cambios.$set.documentosSolicitadosPor), String(usuarioId));
    assert.ok(actualizacion.cambios.$set.documentosSolicitadosEn instanceof Date);
    assert.equal(actualizacion.cambios.$push.historialEstados.comentario, 'Reemplazá el segundo recibo y adjuntá la póliza.');
    assert.equal(guardada.historialEstados.length, 1);
    assert.equal(resultado.estado, 'falta_documentacion');
    assert.deepEqual(resultado.documentosSolicitados, seleccionados);
    assert.equal(resultado.historialEstados.length, 1);
    assert.equal(resultado.notificacion.estado, 'enviada');
    const correo = emailService.avisarEstadoSolicitud.mock.calls.at(-1).arguments[0];
    assert.equal(correo.estado, 'Falta documentación');
    assert.equal(correo.propiedad, 'Casa en Paraná');
    assert.deepEqual(correo.documentosSolicitados, ['Recibos de sueldo (2 de 3)', 'Documentación del seguro de caución']);

    const recuperada = await solicitudesService.obtenerPorId(String(id), String(usuarioId), true);
    assert.deepEqual(recuperada.documentosSolicitados, seleccionados);
    assert.equal(recuperada.documentosSolicitadosPor, String(usuarioId));
});

test('mantener pendiente guarda comentario sin crear pedido vacío y bloquea otra acción tras procesar', async (t) => {
    process.env.SOLICITUDES_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    const id = new mongoose.Types.ObjectId();
    const usuarioId = new mongoose.Types.ObjectId();
    const propiedadId = new mongoose.Types.ObjectId();
    const cifrado = cifrar(Buffer.from(JSON.stringify({ titular: { nombre: 'Ana' }, ingresosTipo: 'constancia' }), 'utf8')).toString('base64');
    const solicitud = {
        _id: id, usuario: usuarioId, propiedad: propiedadId, operacion: 'compra', estado: 'pendiente',
        datosCifrados: cifrado, documentos: [], historialEstados: [], createdAt: new Date(),
    };
    const propiedad = { _id: propiedadId, titulo: 'Casa', estado: 'disponible', operaciones: ['venta'] };
    let guardada = solicitud;
    let cambios;
    t.mock.method(Solicitud, 'findById', () => ({ select() { return this; }, lean: async () => guardada }));
    t.mock.method(Solicitud, 'findOneAndUpdate', (_filtro, actualizacion) => {
        cambios = actualizacion;
        guardada = { ...guardada, ...actualizacion.$set, historialEstados: [...guardada.historialEstados, actualizacion.$push.historialEstados] };
        return { select() { return this; }, lean: async () => guardada };
    });
    t.mock.method(Property, 'findById', () => ({ select() { return this; }, lean: async () => propiedad }));

    const resultado = await solicitudesService.actualizarEstado({
        id: String(id), estado: 'pendiente', comentario: 'Seguimos revisando la documentación.', administradoPor: usuarioId,
    });
    assert.equal(cambios.$set.estado, 'pendiente');
    assert.deepEqual(cambios.$set.documentosSolicitados, []);
    assert.equal(cambios.$set.documentosSolicitadosEn, null);
    assert.equal(cambios.$push.historialEstados.comentario, 'Seguimos revisando la documentación.');
    assert.equal(guardada.historialEstados.length, 1);
    assert.equal(resultado.notificacion.estado, 'enviada');
    const aprobada = await solicitudesService.actualizarEstado({
        id: String(id), estado: 'aprobada', comentario: '', administradoPor: usuarioId,
    });
    assert.equal(aprobada.estado, 'aprobada');
    assert.equal(guardada.historialEstados.length, 2);
    await assert.rejects(
        solicitudesService.actualizarEstado({ id: String(id), estado: 'rechazada', comentario: 'No corresponde.', administradoPor: usuarioId }),
        { statusCode: 409 },
    );
    await assert.rejects(
        solicitudesService.actualizarEstado({ id: String(id), estado: 'aprobada', comentario: '', administradoPor: usuarioId }),
        { statusCode: 409 },
    );
    await assert.rejects(
        solicitudesService.actualizarEstado({ id: String(id), estado: 'pendiente', comentario: 'x'.repeat(251), administradoPor: usuarioId }),
        { statusCode: 400 },
    );
    await assert.rejects(
        solicitudesService.actualizarEstado({ id: String(id), estado: 'rechazada', comentario: '   ', administradoPor: usuarioId }),
        { statusCode: 400 },
    );
});

test('reutiliza el último comentario al cambiar estado sin duplicarlo en el historial', async () => {
    process.env.SOLICITUDES_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    const cifrado = cifrar(Buffer.from(JSON.stringify({ titular: { nombre: 'Ana' } }), 'utf8')).toString('base64');
    const historialAnterior = [
        { estado: 'pendiente', comentario: 'Falta un documento.', administradoPor: 'admin-1', fecha: new Date('2026-10-01T12:00:00Z') },
        { estado: 'rechazada', comentario: 'Documento ilegible.', administradoPor: 'admin-2', fecha: new Date('2026-10-02T12:00:00Z') },
    ];
    const solicitud = {
        _id: 'solicitud-valida',
        propiedad: 'propiedad-de-prueba',
        operacion: 'alquiler',
        estado: 'pendiente',
        comentarioEstado: 'Documento ilegible.',
        historialEstados: historialAnterior,
        datosCifrados: cifrado,
        documentos: [],
    };
    const solicitudActualizada = {
        ...solicitud,
        estado: 'pendiente',
        historialEstados: [
            ...historialAnterior,
            {
                estado: 'pendiente',
                comentario: '',
                comentarioReferenciaIndice: 1,
                administradoPor: 'admin-3',
                fecha: new Date('2026-10-03T12:00:00Z'),
            },
        ],
    };
    const originales = {
        findById: Solicitud.findById,
        findOneAndUpdate: Solicitud.findOneAndUpdate,
        findByIdProperty: Property.findById,
    };
    let filtroActualizacion;
    let cambiosAplicados;

    Solicitud.findById = () => ({
        select: () => ({ lean: async () => solicitud }),
    });
    Solicitud.findOneAndUpdate = (filtro, cambios) => {
        filtroActualizacion = filtro;
        cambiosAplicados = cambios;
        return {
            select: () => ({ lean: async () => ({ ...solicitudActualizada, datosCifrados: cifrado }) }),
        };
    };
    Property.findById = () => ({
        select() { return this; },
        lean: async () => ({ titulo: 'Casa', estado: 'disponible', categoriaOperacion: 'alquiler' }),
    });

    try {
        const resultado = await solicitudesService.actualizarEstado({
            id: solicitud._id,
            estado: 'pendiente',
            comentario: '',
            reutilizarComentario: true,
            administradoPor: 'admin-3',
        });
        assert.equal(resultado.estado, 'pendiente');
        assert.equal(resultado.comentarioEstado, 'Documento ilegible.');
        assert.equal(resultado.historialEstados.length, 3);
        assert.equal(resultado.historialEstados[2].comentario, '');
        assert.equal(resultado.historialEstados[2].comentarioReferenciaIndice, 1);
        assert.deepEqual(filtroActualizacion.historialEstados, historialAnterior);
        assert.equal(cambiosAplicados.$set.estado, 'pendiente');
        assert.equal(cambiosAplicados.$set.comentarioEstado, 'Documento ilegible.');
        assert.equal(cambiosAplicados.$push.historialEstados.comentario, '');
        assert.equal(cambiosAplicados.$push.historialEstados.comentarioReferenciaIndice, 1);
    } finally {
        Solicitud.findById = originales.findById;
        Solicitud.findOneAndUpdate = originales.findOneAndUpdate;
        Property.findById = originales.findByIdProperty;
    }
});

test('agrega un comentario al historial sin cambiar estado ni sobrescribir comentarios previos', async () => {
    process.env.SOLICITUDES_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    const cifrado = cifrar(Buffer.from(JSON.stringify({ titular: { nombre: 'Ana' } }), 'utf8')).toString('base64');
    const historialAnterior = [
        { estado: 'pendiente', comentario: 'Falta un documento.', administradoPor: 'admin-1', fecha: new Date('2026-10-01T12:00:00Z') },
        { estado: 'rechazada', comentario: 'Documento ilegible.', administradoPor: 'admin-2', fecha: new Date('2026-10-02T12:00:00Z') },
    ];
    const solicitud = {
        _id: 'solicitud-valida',
        propiedad: 'propiedad-no-encontrada',
        estado: 'rechazada',
        comentarioEstado: 'Documento ilegible.',
        historialEstados: historialAnterior,
        datosCifrados: cifrado,
        documentos: [],
    };
    const nuevaFecha = new Date('2026-10-03T12:00:00Z');
    const solicitudActualizada = {
        ...solicitud,
        comentarioEstado: 'Se recibió una nueva observación.',
        historialEstados: [
            ...historialAnterior,
            { estado: 'rechazada', comentario: 'Se recibió una nueva observación.', administradoPor: 'admin-3', fecha: nuevaFecha },
        ],
    };
    const originales = {
        findById: Solicitud.findById,
        findOneAndUpdate: Solicitud.findOneAndUpdate,
        findByIdProperty: Property.findById,
    };
    let cambiosAplicados;
    let filtroActualizacion;

    Solicitud.findById = () => ({
        select: () => ({
            lean: async () => solicitud,
        }),
    });
    Solicitud.findOneAndUpdate = (filtro, cambios) => {
        filtroActualizacion = filtro;
        cambiosAplicados = cambios;
        return {
            select: () => ({
                lean: async () => ({ ...solicitudActualizada, datosCifrados: cifrado }),
            }),
        };
    };
    Property.findById = () => ({
        select() { return this; },
        lean: async () => null,
    });
    try {
        const resultado = await solicitudesService.agregarComentario({
            id: solicitud._id,
            comentario: 'Se recibió una nueva observación.',
            administradoPor: 'admin-3',
        });
        assert.equal(resultado.estado, 'rechazada');
        assert.equal(resultado.comentarioEstado, 'Se recibió una nueva observación.');
        assert.equal(resultado.historialEstados.length, 3);
        assert.deepEqual(
            resultado.historialEstados.slice(0, 2).map(({ estado, comentario, fecha }) => ({ estado, comentario, fecha })),
            historialAnterior.map(({ estado, comentario, fecha }) => ({ estado, comentario, fecha }))
        );
        assert.equal(resultado.historialEstados[2].comentario, 'Se recibió una nueva observación.');
        assert.equal(resultado.historialEstados[2].estado, 'rechazada');
        assert.deepEqual(cambiosAplicados.$set, { comentarioEstado: 'Se recibió una nueva observación.' });
        assert.equal(cambiosAplicados.$push.historialEstados.estado, 'rechazada');
        assert.equal(cambiosAplicados.$push.historialEstados.administradoPor, 'admin-3');
        assert.equal(String(filtroActualizacion.datosCifrados), cifrado);
        assert.equal('estado' in cambiosAplicados.$set, false);
    } finally {
        Solicitud.findById = originales.findById;
        Solicitud.findOneAndUpdate = originales.findOneAndUpdate;
        Property.findById = originales.findByIdProperty;
    }
});

test('bloquea comentarios nuevos cuando los datos cifrados no se pueden validar', async () => {
    process.env.SOLICITUDES_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    const datos = cifrar(Buffer.from('datos de prueba')).toString('base64');
    const danados = Buffer.from(datos, 'base64');
    danados[danados.length - 1] ^= 1;
    const originalFindById = Solicitud.findById;
    const originalFindOneAndUpdate = Solicitud.findOneAndUpdate;
    let intentoActualizar = false;

    Solicitud.findById = () => ({
        select: () => ({
            lean: async () => ({
                _id: 'solicitud-con-error',
                estado: 'pendiente',
                datosCifrados: danados.toString('base64'),
            }),
        }),
    });
    Solicitud.findOneAndUpdate = () => {
        intentoActualizar = true;
        throw new Error('No debe guardar el comentario en una solicitud que no autentica.');
    };

    try {
        await assert.rejects(
            solicitudesService.agregarComentario({
                id: 'solicitud-con-error',
                comentario: 'Observación',
                administradoPor: 'admin-1',
            }),
            { statusCode: 409 }
        );
        assert.equal(intentoActualizar, false);
    } finally {
        Solicitud.findById = originalFindById;
        Solicitud.findOneAndUpdate = originalFindOneAndUpdate;
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
            archivadaEn: update.$set.archivadaEn || null,
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
        assert.ok(cambios[0].$set.archivadaEn instanceof Date);

        const restaurada = await solicitudesService.actualizarArchivado({
            id: '507f1f77bcf86cd799439011',
            archivada: false,
            administradoPor: '507f1f77bcf86cd799439012',
        });
        assert.equal(restaurada.archivada, false);
        assert.deepEqual(cambios[1].$unset, { archivadaEn: 1, archivadaPor: 1 });
        assert.equal(cambios[1].$set.archivada, false);
    } finally {
        Solicitud.findByIdAndUpdate = originalFindByIdAndUpdate;
    }
});

test('protege las acciones administrativas con permiso de la sección y la corrección documental con el cliente', async () => {
    assert.ok(solicitudesRouter.stack.some((layer) => layer.handle === authMiddleware));
    for (const [path, method] of [['/:id/archivo', 'patch'], ['/:id', 'delete'], ['/:id/comentarios', 'post']]) {
        const ruta = solicitudesRouter.stack.find((layer) => layer.route?.path === path && layer.route.methods[method]);
        assert.ok(ruta, `Debe existir ${method.toUpperCase()} ${path}`);
        // Un cliente (sin permiso de la sección Solicitudes) queda afuera con 403 antes de llegar al controlador
        let codigo = null;
        let llegoAlControlador = false;
        const res = { status(c) { codigo = c; return this; }, json() { return this; } };
        const capas = ruta.route.stack.map((layer) => layer.handle);
        for (const capa of capas.slice(0, -1)) {
            let siguio = false;
            await capa({ user: { rol: 'cliente' }, headers: {}, params: {}, body: {} }, res, () => { siguio = true; });
            if (!siguio) break;
            if (capa === capas[capas.length - 2]) llegoAlControlador = true;
        }
        assert.equal(codigo, 403, `${method.toUpperCase()} ${path} tiene que dar 403 a un cliente`);
        assert.equal(llegoAlControlador, false);
    }
    const correccion = solicitudesRouter.stack.find((layer) => layer.route?.path === '/:id/documentacion' && layer.route.methods.post);
    assert.ok(correccion, 'Debe existir POST /:id/documentacion');
    assert.ok(correccion.route.stack.some((layer) => layer.handle === authMiddleware.requireClient));
});

test('el controlador valida las referencias y vincula la corrección con el cliente autenticado', async () => {
    const originalCorregir = solicitudesService.corregirDocumentacion;
    let argumentos;
    solicitudesService.corregirDocumentacion = async (entrada) => {
        argumentos = entrada;
        return { solicitud: { id: entrada.id, estado: 'pendiente' }, repetida: false };
    };
    const ejecutar = async (documentos) => {
        const respuesta = {
            codigo: null,
            cuerpo: null,
            status(codigo) { this.codigo = codigo; return this; },
            json(cuerpo) { this.cuerpo = cuerpo; return this; },
        };
        await solicitudesController.corregirDocumentacion({
            params: { id: '507f1f77bcf86cd799439011' },
            body: { documentos },
            user: { _id: 'cliente-autenticado' },
            get: () => '507f1f77-bcf8-46cd-8994-399439011234',
        }, respuesta);
        return respuesta;
    };
    try {
        assert.equal((await ejecutar([{ id: 123, tipo: 'dniTitularFrente' }])).codigo, 400);
        assert.equal(argumentos, undefined);
        const respuesta = await ejecutar([{ id: '507f1f77bcf86cd799439012', tipo: 'dniTitularFrente' }]);
        assert.equal(respuesta.codigo, 200);
        assert.equal(argumentos.usuario, 'cliente-autenticado');
        assert.equal(argumentos.claveIdempotencia, '507f1f77-bcf8-46cd-8994-399439011234');
        assert.deepEqual(argumentos.referencias, [{ id: '507f1f77bcf86cd799439012', tipo: 'dniTitularFrente' }]);
    } finally {
        solicitudesService.corregirDocumentacion = originalCorregir;
    }
});

test('el endpoint de comentario valida texto obligatorio y solo invoca el servicio con datos válidos', async () => {
    const originalAgregarComentario = solicitudesService.agregarComentario;
    let llamadasServicio = 0;
    let argumentosServicio;
    solicitudesService.agregarComentario = async (argumentos) => {
        llamadasServicio++;
        argumentosServicio = argumentos;
        return { id: argumentos.id, estado: 'pendiente', historialEstados: [] };
    };

    const ejecutar = async (comentario) => {
        const respuesta = {
            codigo: null,
            cuerpo: null,
            status(codigo) { this.codigo = codigo; return this; },
            json(cuerpo) { this.cuerpo = cuerpo; return this; },
        };
        await solicitudesController.agregarComentario({
            params: { id: '507f1f77bcf86cd799439011' },
            body: { comentario },
            user: { _id: '507f1f77bcf86cd799439012' },
        }, respuesta);
        return respuesta;
    };

    try {
        assert.equal((await ejecutar('  ')).codigo, 400);
        assert.equal(llamadasServicio, 0);
        assert.equal((await ejecutar('x'.repeat(1001))).codigo, 400);
        assert.equal(llamadasServicio, 0);
        const correcta = await ejecutar('  Observación adicional  ');
        assert.equal(correcta.codigo, 200);
        assert.equal(argumentosServicio.comentario, 'Observación adicional');
        assert.equal(argumentosServicio.administradoPor, '507f1f77bcf86cd799439012');
        assert.equal(llamadasServicio, 1);
    } finally {
        solicitudesService.agregarComentario = originalAgregarComentario;
    }
});

test('elimina en una transacción solo la solicitud y los documentos exclusivos verificados', async () => {
    const solicitudId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
    const archivoId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439013');
    const solicitud = {
        _id: solicitudId,
        documentos: [{ archivoId }],
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
                            toArray: async () => [{ _id: archivoId, metadata: { solicitud: String(solicitudId) } }],
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
        assert.deepEqual(borradoArchivo.filtro, { _id: { $in: [archivoId] } });
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
    const archivoId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439013');
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
                        toArray: async () => [{ _id: archivoId, metadata: { solicitud: 'otra-solicitud' } }],
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
        lean: async () => ({ _id: solicitudId, documentos: [{ archivoId }] }),
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
    const archivoId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439013');
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
        lean: async () => ({ _id: solicitudId, documentos: [{ archivoId }] }),
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

test('requiere un comentario para mantener pendiente o rechazar; solo permite asociar uno anterior al estado pendiente', async () => {
    const estados = ['pendiente', 'rechazada'];
    const originalActualizarEstado = solicitudesService.actualizarEstado;
    let invocaciones = 0;
    let argumentosServicio;
    solicitudesService.actualizarEstado = async (argumentos) => {
        invocaciones++;
        argumentosServicio = argumentos;
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

        const respuestaReutilizada = {
            codigo: null,
            cuerpo: null,
            status(codigo) { this.codigo = codigo; return this; },
            json(cuerpo) { this.cuerpo = cuerpo; return this; },
        };
        await solicitudesController.actualizarEstado({
            params: { id: '507f1f77bcf86cd799439011' },
            body: { estado: 'pendiente', comentario: '', reutilizarComentario: true },
            user: { _id: '507f1f77bcf86cd799439012' },
        }, respuestaReutilizada);
        assert.equal(respuestaReutilizada.codigo, 200);
        assert.equal(argumentosServicio.reutilizarComentario, true);
        assert.equal(argumentosServicio.comentario, '');
        assert.equal(invocaciones, 1);
    } finally {
        solicitudesService.actualizarEstado = originalActualizarEstado;
    }
});

test('el controlador valida pedido documental y pasa los identificadores al servicio protegido por rol admin', async () => {
    const originalActualizarEstado = solicitudesService.actualizarEstado;
    let argumentosServicio;
    solicitudesService.actualizarEstado = async (argumentos) => {
        argumentosServicio = argumentos;
        return { id: argumentos.id, estado: argumentos.estado, documentosSolicitados: argumentos.documentosSolicitados };
    };
    const respuesta = () => ({
        codigo: null,
        cuerpo: null,
        status(codigo) { this.codigo = codigo; return this; },
        json(cuerpo) { this.cuerpo = cuerpo; return this; },
    });
    try {
        const req = {
            params: { id: '507f1f77bcf86cd799439011' },
            body: {
                estado: 'falta_documentacion',
                comentario: 'Adjuntá el segundo recibo.',
                documentosSolicitados: ['recibosIngresos:1'],
            },
            user: { _id: '507f1f77bcf86cd799439012', rol: 'admin' },
        };
        const res = respuesta();
        await solicitudesController.actualizarEstado(req, res);
        assert.equal(res.codigo, 200);
        assert.equal(argumentosServicio.estado, 'falta_documentacion');
        assert.deepEqual(argumentosServicio.documentosSolicitados, ['recibosIngresos:1']);
        assert.equal(argumentosServicio.comentario, 'Adjuntá el segundo recibo.');
        assert.equal(argumentosServicio.administradoPor, req.user._id);

        const invalida = respuesta();
        await solicitudesController.actualizarEstado({
            ...req,
            body: { ...req.body, documentosSolicitados: [{ id: 'recibosIngresos:1' }] },
        }, invalida);
        assert.equal(invalida.codigo, 400);

        const sinDocumentos = respuesta();
        await solicitudesController.actualizarEstado({
            ...req,
            body: { estado: 'falta_documentacion', comentario: 'Falta documentación.' },
        }, sinDocumentos);
        assert.equal(sinDocumentos.codigo, 400);

        const excedido = respuesta();
        await solicitudesController.actualizarEstado({
            ...req,
            body: { estado: 'rechazada', comentario: 'x'.repeat(251) },
        }, excedido);
        assert.equal(excedido.codigo, 400);
        assert.match(excedido.cuerpo.message, /250/);
    } finally {
        solicitudesService.actualizarEstado = originalActualizarEstado;
    }
});

test('el fallo del correo se informa sin revertir ni rechazar el cambio guardado', async (t) => {
    t.mock.method(emailService, 'avisarEstadoSolicitud', async () => { throw new Error('proveedor no disponible'); });
    const resultado = await ciclo.avisarCambio({
        usuario: 'usuario',
        propiedad: 'propiedad',
        estado: 'rechazada',
        comentarioEstado: 'No cumple los requisitos.',
        historialEstados: [{ comentario: 'No cumple los requisitos.' }],
    });
    assert.deepEqual(resultado, { estado: 'fallida' });
});

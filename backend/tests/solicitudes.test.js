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
    assert.equal(ciclo.cambioAutomatico({ ...pendiente, reactivadaAt: limite }, {}, limite), null);
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
});

test('controller y modelo rechazan 501 caracteres y aceptan 500, incluidos links largos', async () => {
    const id = new mongoose.Types.ObjectId().toString();
    const largo = 'https://ejemplo.com/' + 'a'.repeat(480);
    assert.equal(largo.length, 500);
    const datos = { usuario: id, propiedad: id, operacion: 'compra', datosCifrados: 'cifrado', claveIdempotencia: crypto.randomUUID(), comentarioEstado: largo,
        historialEstados: [{ estado: 'pendiente', comentario: largo, administradoPor: id }] };
    assert.equal(new Solicitud(datos).validateSync(), undefined);
    assert.ok(new Solicitud({ ...datos, comentarioEstado: largo + 'a' }).validateSync().errors.comentarioEstado);
    assert.ok(new Solicitud({ ...datos, historialEstados: [{ estado: 'pendiente', comentario: 'a'.repeat(501) }] }).validateSync());
    for (const controlador of [solicitudesController.agregarComentario, solicitudesController.actualizarEstado]) {
        const res = { status(n) { this.codigo = n; return this; }, json(body) { this.body = body; return this; } };
        await controlador({ params: { id }, body: { estado: 'pendiente', comentario: 'a'.repeat(501) } }, res);
        assert.equal(res.codigo, 400);
        assert.match(res.body.message, /500/);
    }
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
    for (const estado of ['vendido', 'alquilado']) {
        const consulta = t.mock.method(Property, 'findById', () => ({ select() { return this; }, lean: async () => ({ title: 'Casa', estado, categoria_operacion: 'venta' }) }));
        await assert.rejects(solicitudesService.crear({ usuario: 'prueba', propiedadId: 'prueba', operacion: 'compra' }), (error) => error.statusCode === 409);
        consulta.mock.restore();
    }
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
        await assert.rejects(servicio.vincular([{ fileId: new mongoose.Types.ObjectId(), tipo: 'domicilio' }], { _id: 's', usuario: 'u', claveIdempotencia: 'c' }, {}), /ya se usó/);
    } finally { mongoose.connection.db = originalDb; }
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
        estado: 'rechazada',
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
        lean: async () => ({ title: 'Casa', estado: 'disponible', categoria_operacion: 'alquiler' }),
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
        assert.equal(filtroActualizacion['historialEstados.1.comentario'], 'Documento ilegible.');
        assert.deepEqual(cambiosAplicados.$set, { estado: 'pendiente', comentarioEstado: 'Documento ilegible.' });
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
    for (const [path, method] of [['/:id/archivo', 'patch'], ['/:id', 'delete'], ['/:id/comentarios', 'post']]) {
        const ruta = solicitudesRouter.stack.find((layer) => layer.route?.path === path && layer.route.methods[method]);
        assert.ok(ruta, `Debe existir ${method.toUpperCase()} ${path}`);
        assert.ok(ruta.route.stack.some((layer) => layer.handle === authMiddleware.requireAdmin));
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

test('requiere comentario nuevo o reutilizar uno guardado para pendiente o rechazo', async () => {
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
            body: { estado: 'rechazada', comentario: '', reutilizarComentario: true },
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

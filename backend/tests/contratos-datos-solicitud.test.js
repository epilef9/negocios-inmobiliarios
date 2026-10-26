// Ruta administrativa que devuelve los datos de una solicitud para precargar un contrato.
// No usa base de datos: se reemplazan el middleware de sesión y el servicio por dobles de prueba.
// Correr solo este archivo: node --test tests/contratos-datos-solicitud.test.js
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const authPath = require.resolve('../src/middlewares/auth.middleware');
const servicePath = require.resolve('../src/services/contratos.service');

const ID_VALIDO = '000000000000000000000001';

const authStub = (req, res, next) => {
    const rol = req.get('x-test-role');
    if (!rol) return res.status(401).json({ message: 'No token provided' });
    req.user = { _id: '000000000000000000000099', role: rol };
    next();
};
authStub.requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador.' });
    }
    next();
};
require.cache[authPath] = { id: authPath, filename: authPath, loaded: true, exports: authStub };

const DATOS = {
    solicitud: { id: ID_VALIDO, operacion: 'alquiler', estado: 'aprobada', usuarioId: '000000000000000000000010' },
    titular: { nombre: 'Ana', apellido: 'Pérez', dni: '30123456', cuil: '27301234568', domicilio: 'San Martín 123', localidad: 'Paraná', provincia: 'Entre Ríos', telefono: '+54 343 555 1234', email: 'ana@example.com' },
    cotitular: null,
    garantia: { tipo: 'caucion', localidadPropiedad: '', garante: null },
    propiedad: { id: '000000000000000000000020', titulo: 'Casa centro', direccion: 'San Martín 123', ciudad: 'Paraná', tipoInmueble: 'casa', operacion: 'alquiler', precio: 500000, moneda: 'ARS' },
    propietario: { usuarioId: '000000000000000000000030', nombre: 'Dueño', apellido: 'Propietario', dni: '20111222', domicilio: '', telefono: '343 444 5555', email: 'dueno@example.com' },
    publicacionId: '000000000000000000000040',
    origenPropietario: 'publicacion',
};

require.cache[servicePath] = {
    id: servicePath,
    filename: servicePath,
    loaded: true,
    exports: {
        datosDesdeSolicitud: async (id) => (id === ID_VALIDO ? DATOS : null),
        listarSolicitudesParaContrato: async () => [{
            id: ID_VALIDO,
            estado: 'aprobada',
            operacion: 'alquiler',
            createdAt: '2026-10-20T12:00:00.000Z',
            titular: { nombre: 'Ana', apellido: 'Pérez' },
            propiedad: { id: DATOS.propiedad.id, titulo: 'Casa centro', ciudad: 'Paraná' },
        }],
    },
};

const app = express();
app.use(express.json());
app.use('/api/contratos', require('../src/routes/contratos.routes'));

let server;
let base;

before(async () => {
    server = app.listen(0);
    await new Promise((resolver) => server.once('listening', resolver));
    base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    if (server) {
        server.closeAllConnections?.();
        await new Promise((resolver) => server.close(resolver));
    }
});

const pedir = (ruta, rol) => fetch(`${base}${ruta}`, { headers: rol ? { 'x-test-role': rol } : {} });

test('un admin recibe los datos descifrados de la solicitud', async () => {
    const respuesta = await pedir(`/api/contratos/datos-de-solicitud/${ID_VALIDO}`, 'admin');
    assert.equal(respuesta.status, 200);

    const { data } = await respuesta.json();
    assert.equal(data.solicitud.operacion, 'alquiler');
    assert.equal(data.titular.nombre, 'Ana');
    assert.equal(data.titular.dni, '30123456');
    assert.equal(data.titular.cuil, '27301234568');
    assert.equal(data.propiedad.titulo, 'Casa centro');
    assert.equal(data.propietario.nombre, 'Dueño');
    assert.equal(data.publicacionId, '000000000000000000000040');
});

test('un usuario que no es admin recibe 403', async () => {
    const respuesta = await pedir(`/api/contratos/datos-de-solicitud/${ID_VALIDO}`, 'cliente');
    assert.equal(respuesta.status, 403);
});

test('sin sesión recibe 401', async () => {
    const respuesta = await pedir(`/api/contratos/datos-de-solicitud/${ID_VALIDO}`);
    assert.equal(respuesta.status, 401);
});

test('un id inválido devuelve 400', async () => {
    const respuesta = await pedir('/api/contratos/datos-de-solicitud/no-es-un-id', 'admin');
    assert.equal(respuesta.status, 400);
    const { message } = await respuesta.json();
    assert.match(message, /id/i);
});

test('una solicitud inexistente devuelve 404', async () => {
    const respuesta = await pedir('/api/contratos/datos-de-solicitud/000000000000000000000002', 'admin');
    assert.equal(respuesta.status, 404);
});

test('el selector de solicitudes responde solo al admin', async () => {
    const respuesta = await pedir('/api/contratos/solicitudes', 'admin');
    assert.equal(respuesta.status, 200);
    const { data } = await respuesta.json();
    assert.equal(data.length, 1);
    assert.equal(data[0].titular.nombre, 'Ana');
});

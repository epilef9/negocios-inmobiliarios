const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { validarSolicitud } = require('../src/validators/solicitud.validator');
const { cifrar, descifrar, obtenerClave } = require('../src/utils/cifrado-solicitudes');

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

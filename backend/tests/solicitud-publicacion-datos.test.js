// Datos de una solicitud de publicación nueva: tipos, operaciones, localidad, expensas y documentos.
// No usa base de datos: el usuario, los documentos y el guardado se reemplazan en memoria.
// Correr solo este archivo: node --test tests/solicitud-publicacion-datos.test.js
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const User = require('../src/models/user.model');
const SolicitudPublicacion = require('../src/models/solicitudPublicacion.model');
const documentosPublicacion = require('../src/services/documentosPublicacion.service');
const servicio = require('../src/services/solicitudPublicacion.service');

const CLIENTE = new mongoose.Types.ObjectId();
const REQUISITOS = ['pub-escritura', 'pub-planos', 'pub-impuestos', 'pub-reglamento', 'pub-datos', 'pub-desc', 'pub-fotos', 'pub-precio', 'pub-condiciones', 'pub-autorizacion', 'pub-disponibilidad'];
const ref = () => `privado:${new mongoose.Types.ObjectId()}`;

let guardadas = [];
let referenciasRevisadas = [];
User.findById = async () => ({ _id: CLIENTE, nombre: 'Ana', email: 'ana@example.com', checklistRequisitos: REQUISITOS });
documentosPublicacion.sonDelUsuario = async (referencias) => { referenciasRevisadas = referencias; return true; };
SolicitudPublicacion.prototype.save = async function guardar() { guardadas.push(this); return this; };

const base = () => ({
    tipoPropiedad: 'casa',
    operacion: 'venta',
    direccion: 'San Martín 123',
    ciudad: 'Crespo',
    expensas: 'no',
    precioPretendido: { monto: 85000, moneda: 'USD' },
    fotos: ['https://example.com/foto.jpg'],
    documentos: { dni: ref(), escritura: ref(), impuestos: ref() },
});

const rechaza = (datos, mensaje) => assert.rejects(servicio.crear(CLIENTE, datos), (error) => error.statusCode === 400 && mensaje.test(error.message));

beforeEach(() => { guardadas = []; referenciasRevisadas = []; });

test('acepta una solicitud sin planos ni reglamento', async () => {
    const solicitud = await servicio.crear(CLIENTE, base());
    assert.equal(guardadas.length, 1);
    assert.equal(solicitud.ciudad, 'Crespo');
    assert.equal(solicitud.provincia, 'Entre Ríos');
    assert.equal(solicitud.documentos.planos, undefined);
    assert.equal(referenciasRevisadas.length, 3);
});

test('si vienen planos y reglamento también se revisan y se guardan', async () => {
    const datos = base();
    datos.documentos.planos = ref();
    datos.documentos.reglamento = ref();
    const solicitud = await servicio.crear(CLIENTE, datos);
    assert.equal(referenciasRevisadas.length, 5);
    assert.equal(solicitud.documentos.reglamento, datos.documentos.reglamento);
});

test('faltan documentos obligatorios', () => {
    const datos = base();
    delete datos.documentos.escritura;
    return rechaza(datos, /DNI, la escritura y los impuestos/);
});

test('solo se aceptan casa, departamento, terreno o local', () => rechaza({ ...base(), tipoPropiedad: 'cochera' }, /tipo de propiedad/));

test('operación desconocida', () => rechaza({ ...base(), operacion: 'permuta' }, /venta, alquiler/));

test('localidad fuera de las que trabaja la inmobiliaria', () => rechaza({ ...base(), ciudad: 'Paraná' }, /Solo publicamos/));

test('la provincia siempre es Entre Ríos aunque manden otra', async () => {
    const solicitud = await servicio.crear(CLIENTE, { ...base(), provincia: 'Córdoba' });
    assert.equal(solicitud.provincia, 'Entre Ríos');
});

test('hay que indicar si paga expensas', () => rechaza({ ...base(), expensas: '' }, /expensas/));

test('si carga un monto de expensas, queda que sí paga', async () => {
    const solicitud = await servicio.crear(CLIENTE, { ...base(), expensas: 'no', montoExpensas: 15000 });
    assert.equal(solicitud.expensas, 'si');
    assert.equal(solicitud.montoExpensas, 15000);
});

test('si no paga expensas el monto queda en cero', async () => {
    const solicitud = await servicio.crear(CLIENTE, { ...base(), expensas: 'no', montoExpensas: 0 });
    assert.equal(solicitud.expensas, 'no');
    assert.equal(solicitud.montoExpensas, 0);
});

test('un terreno se guarda sin ambientes ni baños', async () => {
    const solicitud = await servicio.crear(CLIENTE, { ...base(), tipoPropiedad: 'terreno', ambientes: 3, banos: 2 });
    assert.equal(solicitud.ambientes, 0);
    assert.equal(solicitud.banos, 0);
});

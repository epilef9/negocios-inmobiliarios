// Ejemplos para presentar el sitio (npm run ejemplos): cada documento que se agregaría cumple el esquema de su
// modelo y los montos salen bien. No usa base de datos.
// Correr solo este archivo:  node --test tests/ejemplos.test.js
process.env.SOLICITUDES_ENCRYPTION_KEY = process.env.SOLICITUDES_ENCRYPTION_KEY || 'b'.repeat(64);
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const User = require('../src/models/user.model');
const Property = require('../src/models/property.model');
const { normalizarOperaciones } = require('../src/services/properties.service');
const { tipoDeArchivo } = require('../src/services/pagos.service');
const e = require('../src/ejemplos');

const personas = Object.fromEntries(Object.entries(e.PERSONAS).map(([k, p]) => [k, new User({ ...p, contrasena: 'x'.repeat(20), rol: 'cliente' })]));
const admin = new User({ nombre: 'Araceli', apellido: 'Balbuena', email: 'admin@demo.test', contrasena: 'x'.repeat(20), rol: 'admin' });
const venta = new Property({ titulo: 'Casa en venta', precio: 90000, moneda: 'USD', categoriaOperacion: 'venta', ubicacion: 'Mitre 1' }).toObject();
const alquiler = new Property({ titulo: 'Depto en alquiler', precio: 300, moneda: 'ARS', precioARS: 420000, categoriaOperacion: 'alquiler', ubicacion: 'San Martín 2' }).toObject();
const temporario = new Property({ ...normalizarOperaciones(e.cabanaDeMuestra()) }).toObject();
const ctx = { personas, admin, venta, alquiler, temporario };

const validar = async (docs) => {
    for (const d of docs) await assert.doesNotReject(d.validate(), `${d.constructor.modelName} no cumple el esquema`);
};

describe('Ejemplos para presentar', () => {
    it('la cabaña de muestra es de alquiler temporario y tiene precio por noche', async () => {
        await validar([new Property(normalizarOperaciones(e.cabanaDeMuestra()))]);
        assert.deepEqual(temporario.operaciones, ['temporario']);
        assert.ok(temporario.precioPorNocheUSD > 0);
    });

    it('visitas, reserva con seña, solicitudes, contratos y estadísticas cumplen sus esquemas', async () => {
        await validar(e.armarVisitas(ctx));
        await validar([e.armarSena(ctx)]);
        await validar(e.armarSolicitudes(ctx));
        await validar(e.armarContratos(ctx, 2));
        await validar(e.armarEstadisticas([venta, alquiler]));
    });

    it('cada reserva por días toma sus noches en el calendario', async () => {
        const { reservas, noches } = e.armarReservas(ctx);
        await validar([...reservas, ...noches]);
        assert.equal(reservas.length, 3);
        reservas.forEach((r, i) => {
            assert.equal(String(noches[i].reserva), String(r._id));
            assert.equal(noches[i].tipo, r.estado === 'pendiente' ? 'reserva' : 'ocupada');
            assert.equal(r.totalUSD, r.precioPorNocheUSD * r.noches + r.limpiezaUSD);
        });
    });

    it('los pagos de estadías: seña del 30 % para revisar y acreditados, con un PDF de comprobante válido', async () => {
        const { reservas } = e.armarReservas(ctx);
        const pagos = e.armarPagos(reservas);
        await validar(pagos);
        assert.deepEqual(pagos.map((p) => [p.tipo, p.estado]), [['sena', 'en_revision'], ['sena', 'aprobado'], ['total', 'aprobado']]);
        assert.equal(pagos[0].montoUSD, Math.round(reservas[0].totalUSD * 30) / 100);
        assert.equal(pagos[0].montoARS, Math.round(pagos[0].montoUSD * 1400));
        assert.equal(tipoDeArchivo(pagos[0].comprobante.datos), 'application/pdf');
        assert.match(pagos[0].comprobante.datos.toString('latin1'), /startxref\n\d+\n%%EOF\n$/);
    });

    it('el registro de actividad usa al administrador real', async () => {
        const visita = e.armarVisitas(ctx)[0];
        const [accion] = e.armarActividad(admin, [['Confirmó la visita', 'visita', visita, 1, 'Casa']]);
        await validar([accion]);
        assert.equal(String(accion.usuario), String(admin._id));
    });

    it('las personas de los ejemplos usan un dominio que no recibe mails', () => {
        Object.values(e.PERSONAS).forEach((p) => assert.match(p.email, /@demo\.test$/));
    });

    it('la publicación del dueño es de venta y alquiler, con fotos', () => {
        assert.equal(e.PUBLICACION_DUENO.operacion, 'ambas');
        assert.ok(e.PUBLICACION_DUENO.precioAlquiler.monto > 0);
        assert.ok(e.PUBLICACION_DUENO.fotos.length >= 3);
    });
});

process.on('exit', () => mongoose.disconnect().catch(() => {}));

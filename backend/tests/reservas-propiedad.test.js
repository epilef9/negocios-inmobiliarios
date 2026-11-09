// HU-13: reglas de las reservas con seña (venta y alquiler). No usa base de datos.
// Correr solo este archivo:  node --test tests/reservas-propiedad.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { revisarDatos, estaVencida, DIAS_MAXIMOS } = require('../src/services/reservasPropiedad.service');

const ahora = new Date('2026-11-10T12:00:00Z');
const base = {
    propiedad: '64b7f0c2a1b2c3d4e5f60718',
    cliente: { nombre: 'Lucía Paz', email: 'lucia@example.com' },
    sena: { monto: 2000, moneda: 'USD' },
    fechaLimite: '2026-11-25T23:59:00Z',
};

describe('Reservas con seña: datos', () => {
    it('acepta una reserva completa y limpia los textos', () => {
        const { datos, error } = revisarDatos({ ...base, cliente: { ...base.cliente, nombre: '  Lucía\nPaz ' }, notas: 'x'.repeat(2000) }, ahora);
        assert.equal(error, undefined);
        assert.equal(datos.cliente.nombre, 'Lucía Paz');
        assert.equal(datos.notas.length, 1000);
        assert.equal(datos.sena.moneda, 'USD');
    });

    it('pide propiedad, nombre, un contacto y una seña mayor a cero', () => {
        assert.match(revisarDatos({ ...base, propiedad: 'abc' }, ahora).error, /propiedad/);
        assert.match(revisarDatos({ ...base, cliente: { email: 'a@b.co' } }, ahora).error, /nombre/);
        assert.match(revisarDatos({ ...base, cliente: { nombre: 'Ana' } }, ahora).error, /email o un teléfono/);
        assert.match(revisarDatos({ ...base, sena: { monto: 0 } }, ahora).error, /mayor a cero/);
    });

    it('la fecha límite tiene que ser futura y no muy lejana', () => {
        assert.match(revisarDatos({ ...base, fechaLimite: '2026-11-01' }, ahora).error, /futura/);
        const lejos = new Date(ahora.getTime() + (DIAS_MAXIMOS + 1) * 86400000).toISOString();
        assert.match(revisarDatos({ ...base, fechaLimite: lejos }, ahora).error, /como mucho/);
    });
});

describe('Reservas con seña: vencimiento', () => {
    it('vence solo una activa con la fecha límite pasada', () => {
        assert.equal(estaVencida({ estado: 'activa', fechaLimite: '2026-11-09T00:00:00Z' }, ahora), true);
        assert.equal(estaVencida({ estado: 'activa', fechaLimite: '2026-11-11T00:00:00Z' }, ahora), false);
        assert.equal(estaVencida({ estado: 'concretada', fechaLimite: '2026-11-09T00:00:00Z' }, ahora), false);
    });
});

// HU-12: forma de descuento y financiación que acepta el validador de propiedades
const { validateProperty } = require('../src/validators/property.validator');
const probar = (body) => {
    let resultado = 'ok';
    validateProperty({ method: 'PUT', body }, { status: () => ({ json: (j) => (resultado = j.errors.join(' | ')) }) }, () => {});
    return resultado;
};

describe('Descuentos y financiación', () => {
    it('acepta un descuento y un plan válidos', () => {
        assert.equal(probar({ descuento: { porcentaje: 10, hasta: '2026-12-31', motivo: 'Fin de año' } }), 'ok');
        assert.equal(probar({ financiacion: { disponible: true, anticipoPorcentaje: 40, cuotas: 24, tasa: 'Sin interés', detalle: '' } }), 'ok');
        assert.equal(probar({ descuento: { porcentaje: 0, hasta: null, motivo: '' }, financiacion: { disponible: false } }), 'ok');
    });

    it('rechaza porcentajes fuera de rango, campos extra y planes sin cuotas', () => {
        assert.match(probar({ descuento: { porcentaje: 95 } }), /entre 0 y 90/);
        assert.match(probar({ descuento: { porcentaje: 10, $where: 'x' } }), /formato/);
        assert.match(probar({ financiacion: { disponible: true, cuotas: 0 } }), /cuántas cuotas/);
        assert.match(probar({ financiacion: { disponible: true, cuotas: 2.5 } }), /entero/);
    });

    it('la ubicación, si se cambia, tiene que quedar dentro de Entre Ríos', () => {
        assert.equal(probar({ latitud: '-32.07', longitud: '-60.46' }), 'ok');
        assert.match(probar({ latitud: '-34.6', longitud: '-58.4' }), /Entre Ríos/);
        assert.match(probar({ latitud: '', longitud: '' }), /obligatoria/);
    });
});

// HU-25 / HU-28: reservar una propiedad que está en venta y en alquiler
describe('Reservas con seña: operaciones', () => {
    const Property = require('../src/models/property.model');
    const ReservaPropiedad = require('../src/models/reservaPropiedad.model');
    const servicio = require('../src/services/reservasPropiedad.service');
    const futuro = new Date(Date.now() + 5 * 86400000).toISOString();
    const pedido = { ...base, fechaLimite: futuro };

    const preparar = (t, propiedad) => {
        t.mock.method(ReservaPropiedad, 'find', () => ({ select: () => ({ lean: async () => [] }) }));
        t.mock.method(Property, 'findById', () => ({ select: () => ({ lean: async () => ({ _id: base.propiedad, titulo: 'Casa', ...propiedad }) }) }));
        const toma = t.mock.method(Property, 'findOneAndUpdate', async () => ({ _id: base.propiedad }));
        const alta = t.mock.method(ReservaPropiedad, 'create', async (d) => d);
        return { toma, alta };
    };

    it('con venta y alquiler pide elegir la operación', async (t) => {
        preparar(t, { estado: 'disponible', operaciones: ['venta', 'alquiler'] });
        const r = await servicio.crear(pedido);
        assert.equal(r.status, 400);
        assert.match(r.error, /venta o por el alquiler/);
    });

    it('reserva la operación elegida y cierra la propiedad entera', async (t) => {
        const { toma, alta } = preparar(t, { estado: 'disponible', operaciones: ['venta', 'alquiler'] });
        const r = await servicio.crear({ ...pedido, operacion: 'alquiler' });
        assert.equal(r.reserva.operacion, 'alquiler');
        assert.equal(r.reserva.estadoAnterior, 'disponible');
        assert.equal(toma.mock.calls[0].arguments[1].$set.estado, 'reservado');
        assert.equal(alta.mock.callCount(), 1);
    });

    it('con una sola operación la toma sola', async (t) => {
        preparar(t, { estado: 'disponible', categoriaOperacion: 'alquiler' });
        const r = await servicio.crear(pedido);
        assert.equal(r.reserva.operacion, 'alquiler');
    });

    it('venta con inquilino adentro: se puede reservar la venta y recuerda que estaba alquilada', async (t) => {
        const { toma } = preparar(t, { estado: 'alquilado', operaciones: ['venta', 'alquiler'] });
        const r = await servicio.crear({ ...pedido, operacion: 'venta' });
        assert.equal(r.reserva.estadoAnterior, 'alquilado');
        assert.equal(toma.mock.calls[0].arguments[0].estado, 'alquilado');
    });

    it('alquilada: el alquiler ya no se puede reservar', async (t) => {
        preparar(t, { estado: 'alquilado', operaciones: ['venta', 'alquiler'] });
        const r = await servicio.crear({ ...pedido, operacion: 'alquiler' });
        assert.equal(r.status, 409);
    });

    it('rechaza una operación inválida', () => {
        assert.match(revisarDatos({ ...base, operacion: 'permuta' }, ahora).error, /venta o alquiler/);
    });
});

// HU-25 / RF-03: validador de operaciones y precios
describe('Operaciones y precios de la propiedad', () => {
    const crear = (body) => {
        let resultado = 'ok';
        validateProperty({ method: 'POST', body: { titulo: 'Casa', ubicacion: 'X', dormitorios: 1, banos: 1, area: 50, latitud: '-32.07', longitud: '-60.46', ...body } }, { status: () => ({ json: (j) => (resultado = j.errors.join(' | ')) }) }, () => {});
        return resultado;
    };
    const venta = { moneda: 'USD', precio: 90000 };
    const alquiler = { moneda: 'ARS', precioARS: 450000 };

    it('acepta venta y alquiler, cada una con su precio', () => {
        assert.equal(crear({ operaciones: ['venta', 'alquiler'], precios: { venta, alquiler } }), 'ok');
        assert.equal(crear({ operaciones: ['alquiler'], precios: { alquiler } }), 'ok');
    });

    it('pide el precio de cada operación elegida', () => {
        assert.match(crear({ operaciones: ['venta', 'alquiler'], precios: { venta } }), /precio de alquiler/);
        assert.match(crear({ operaciones: ['venta'], precios: { venta: { moneda: 'USD', precio: 0 } } }), /precio de venta/);
    });

    it('el temporario no se combina', () => {
        assert.match(crear({ operaciones: ['temporario', 'venta'], precios: { venta }, precio: 40 }), /no se combina/);
        assert.equal(crear({ operaciones: ['temporario'], precio: 40 }), 'ok');
    });

    it('rechaza operaciones repetidas, vacías o desconocidas y precios sin operaciones', () => {
        assert.match(crear({ operaciones: [], precio: 1 }), /al menos una operación/);
        assert.match(crear({ operaciones: ['venta', 'venta'], precios: { venta } }), /al menos una operación/);
        assert.match(crear({ operaciones: ['permuta'] }), /al menos una operación/);
        assert.match(probar({ precios: { venta } }), /junto con las operaciones/);
        assert.match(crear({ operaciones: ['venta'], precios: { venta: { ...venta, $gt: 1 } } }), /formato/);
    });

    it('sigue aceptando el formato viejo (una categoría y un precio)', () => {
        assert.equal(crear({ categoriaOperacion: 'venta', precio: 1000 }), 'ok');
        assert.match(crear({ categoriaOperacion: 'venta' }), /precio es obligatorio/);
    });
});

describe('Operaciones: normalización y migración', () => {
    const { normalizarOperaciones } = require('../src/services/properties.service');
    const { cambiosPara } = require('../src/migrar-operaciones');
    const { operacionesAbiertas, precioDe } = require('../src/utils/operaciones');

    it('guarda cada precio en dólares y copia la principal (venta)', () => {
        const d = normalizarOperaciones({ operaciones: ['alquiler', 'venta'], precios: { venta: { moneda: 'USD', precio: 90000 }, alquiler: { moneda: 'ARS', precioARS: 500000 } }, cotizacionDolar: 1000 });
        assert.deepEqual(d.operaciones, ['venta', 'alquiler']);
        assert.equal(d.categoriaOperacion, 'venta');
        assert.equal(d.precio, 90000);
        assert.deepEqual(d.precios.alquiler, { precio: 500, moneda: 'ARS', precioARS: 500000 });
    });

    it('un cambio solo de estado no toca operaciones ni precios', () => {
        assert.deepEqual(normalizarOperaciones({ estado: 'vendido' }), { estado: 'vendido' });
    });

    it('migra una propiedad vieja y avisa si aceptaba solicitudes de otra operación', () => {
        const { cambios, falta } = cambiosPara({ categoriaOperacion: 'venta', precio: 1, moneda: 'USD', precioARS: 1400, operacionesSolicitud: ['venta', 'alquiler'] });
        assert.deepEqual(cambios.operaciones, ['venta']);
        assert.equal(cambios['precios.venta'].precioARS, 1400);
        assert.equal(falta, 'alquiler');
    });

    it('operaciones abiertas según el estado de la propiedad entera', () => {
        assert.deepEqual(operacionesAbiertas({ estado: 'disponible', operaciones: ['venta', 'alquiler'] }), ['venta', 'alquiler']);
        assert.deepEqual(operacionesAbiertas({ estado: 'reservado', operaciones: ['venta', 'alquiler'] }), []);
        assert.deepEqual(operacionesAbiertas({ estado: 'alquilado', operaciones: ['venta', 'alquiler'] }), ['venta']);
        assert.deepEqual(operacionesAbiertas({ estado: 'alquilado', operaciones: ['venta'], vendida: true }), []);
        assert.deepEqual(operacionesAbiertas({ estado: 'vendido', categoriaOperacion: 'venta' }), []);
    });

    it('lee el precio de las propiedades viejas', () => {
        assert.equal(precioDe({ categoriaOperacion: 'alquiler', precio: 300, moneda: 'USD' }, 'alquiler').precio, 300);
        assert.equal(precioDe({ categoriaOperacion: 'alquiler', precio: 300 }, 'venta'), null);
    });
});

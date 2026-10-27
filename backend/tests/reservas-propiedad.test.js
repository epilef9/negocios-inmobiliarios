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

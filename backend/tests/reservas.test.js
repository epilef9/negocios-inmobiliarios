// Reglas de reservas de alquiler temporario (HU-20): vencimiento, total y validación del pedido. No usa base de datos.
// Correr solo este archivo:  node --test tests/reservas.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { calcularVencimiento, calcularTotal, validarPedido } = require('../src/services/reservas.service');

describe('Reservas: vencimiento', () => {
    // 22/10/2026 10:00 en Argentina = 13:00 UTC
    const enviada = new Date('2026-10-22T13:00:00Z');

    it('vence a las 48 horas si la entrada es más adelante', () => {
        assert.equal(calcularVencimiento('2026-11-10', enviada, 48).toISOString(), '2026-10-24T13:00:00.000Z');
    });

    it('vence a las 12:00 (Argentina) del día de entrada si eso es antes', () => {
        // Entrada mañana: las 12:00 del 23 son las 15:00 UTC, antes que las 48 horas
        assert.equal(calcularVencimiento('2026-10-23', enviada, 48).toISOString(), '2026-10-23T15:00:00.000Z');
    });

    it('con entrada en dos días gana el mediodía si llega antes que las 48 horas', () => {
        // 24/10 12:00 Argentina = 15:00 UTC; 48 h desde el envío = 24/10 13:00 UTC, que es antes
        assert.equal(calcularVencimiento('2026-10-24', enviada, 48).toISOString(), '2026-10-24T13:00:00.000Z');
        assert.equal(calcularVencimiento('2026-10-24', new Date('2026-10-22T16:00:00Z'), 48).toISOString(), '2026-10-24T15:00:00.000Z');
    });

    it('respeta el plazo configurado', () => {
        assert.equal(calcularVencimiento('2026-12-01', enviada, 24).toISOString(), '2026-10-23T13:00:00.000Z');
    });
});

describe('Reservas: total', () => {
    it('suma las noches y la limpieza una sola vez', () => {
        assert.deepEqual(calcularTotal({ noches: 3, precioPorNocheUSD: 80, costoLimpiezaUSD: 25 }), { alojamientoUSD: 240, limpiezaUSD: 25, totalUSD: 265 });
    });

    it('sin costo de limpieza la línea queda en 0', () => {
        assert.deepEqual(calcularTotal({ noches: 2, precioPorNocheUSD: 50 }), { alojamientoUSD: 100, limpiezaUSD: 0, totalUSD: 100 });
        assert.equal(calcularTotal({ noches: 2, precioPorNocheUSD: 50, costoLimpiezaUSD: 0 }).limpiezaUSD, 0);
    });

    it('redondea a centavos', () => {
        assert.equal(calcularTotal({ noches: 3, precioPorNocheUSD: 33.333 }).totalUSD, 100);
    });
});

describe('Reservas: validación del pedido', () => {
    const hoy = '2026-10-22';
    const propiedad = { precioPorNocheUSD: 80, minimoNoches: 3, huespedesMaximos: 4 };
    const pedido = { entrada: '2026-11-10', salida: '2026-11-13', huespedes: 2 };

    it('acepta un pedido válido', () => {
        assert.equal(validarPedido(pedido, propiedad, hoy), null);
    });

    it('rechaza fechas mal escritas o que no existen', () => {
        assert.ok(validarPedido({ ...pedido, entrada: '10/11/2026' }, propiedad, hoy));
        assert.ok(validarPedido({ ...pedido, salida: '2026-11-31' }, propiedad, hoy));
        assert.ok(validarPedido({ ...pedido, entrada: { $gt: '' } }, propiedad, hoy));
    });

    it('rechaza salida igual o anterior a la entrada', () => {
        assert.ok(validarPedido({ ...pedido, salida: '2026-11-10' }, propiedad, hoy));
    });

    it('la entrada tiene que ser desde mañana', () => {
        assert.match(validarPedido({ ...pedido, entrada: hoy, salida: '2026-10-26' }, propiedad, hoy), /mañana/);
        assert.equal(validarPedido({ ...pedido, entrada: '2026-10-23', salida: '2026-10-26' }, propiedad, hoy), null);
    });

    it('no deja reservar más allá de un año', () => {
        assert.ok(validarPedido({ ...pedido, entrada: '2027-10-20', salida: '2027-10-24' }, propiedad, hoy));
    });

    it('respeta la estadía mínima', () => {
        assert.match(validarPedido({ ...pedido, salida: '2026-11-12' }, propiedad, hoy), /mínima es de 3 noches/);
        assert.equal(validarPedido({ ...pedido, salida: '2026-11-11' }, { ...propiedad, minimoNoches: 0 }, hoy), null);
    });

    it('respeta la cantidad de huéspedes', () => {
        assert.match(validarPedido({ ...pedido, huespedes: 5 }, propiedad, hoy), /hasta 4 huéspedes/);
        assert.ok(validarPedido({ ...pedido, huespedes: 0 }, propiedad, hoy));
        assert.ok(validarPedido({ ...pedido, huespedes: 1.5 }, propiedad, hoy));
        assert.equal(validarPedido({ ...pedido, huespedes: 9 }, { ...propiedad, huespedesMaximos: 0 }, hoy), null);
    });

    it('no deja reservar una propiedad sin precio por noche', () => {
        assert.ok(validarPedido(pedido, { ...propiedad, precioPorNocheUSD: 0 }, hoy));
        assert.ok(validarPedido(pedido, { ...propiedad, precioPorNocheUSD: undefined }, hoy));
    });
});

// HU-41: reglas de los pagos (monto, firma de Mercado Pago, comprobantes). No usa base de datos ni red.
// Correr solo este archivo:  node --test tests/pagos.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { montoDe, firmaValida, estadoDesdeMP, tipoDeArchivo } = require('../src/services/pagos.service');

describe('Pagos: monto', () => {
    it('el monto en pesos sale del total en dólares de la reserva, redondeado', () => {
        assert.equal(montoDe(250, 1385.5), 346375);
        assert.equal(montoDe(99.99, 1400), 139986);
    });
});

describe('Pagos: notificaciones de Mercado Pago', () => {
    const secreto = 'clave-de-prueba';
    const firmar = (dataId, requestId, ts) => `ts=${ts},v1=${crypto.createHmac('sha256', secreto).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest('hex')}`;

    it('acepta una firma correcta y rechaza una alterada', () => {
        const firma = firmar('123456', 'req-1', '1700000000');
        assert.equal(firmaValida({ firma, requestId: 'req-1', dataId: '123456', secreto }), true);
        assert.equal(firmaValida({ firma, requestId: 'req-1', dataId: '999999', secreto }), false);
        assert.equal(firmaValida({ firma: 'ts=1,v1=abc', requestId: 'req-1', dataId: '123456', secreto }), false);
        assert.equal(firmaValida({ firma: '', requestId: 'req-1', dataId: '123456', secreto }), false);
    });

    it('traduce los estados de Mercado Pago', () => {
        assert.equal(estadoDesdeMP('approved'), 'aprobado');
        assert.equal(estadoDesdeMP('in_process'), 'pendiente');
        assert.equal(estadoDesdeMP('rejected'), 'rechazado');
        assert.equal(estadoDesdeMP('refunded'), 'cancelado');
        assert.equal(estadoDesdeMP('algo-nuevo'), 'pendiente');
    });
});

describe('Pagos: comprobantes', () => {
    it('reconoce el tipo real por los primeros bytes', () => {
        assert.equal(tipoDeArchivo(Buffer.from('%PDF-1.7 resto del archivo')), 'application/pdf');
        assert.equal(tipoDeArchivo(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(20)])), 'image/jpeg');
        assert.equal(tipoDeArchivo(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(20)])), 'image/png');
        assert.equal(tipoDeArchivo(Buffer.from('RIFF0000WEBPVP8 ')), 'image/webp');
        assert.equal(tipoDeArchivo(Buffer.from('<html><script>alert(1)</script>')), null);
    });
});

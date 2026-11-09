// HU-41: reglas de los pagos (seña, total y saldo, firma de Mercado Pago, comprobantes). No usa base de datos ni red.
// Correr solo este archivo:  node --test tests/pagos.test.js
const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const Reserva = require('../src/models/reserva.model');
const emailService = require('../src/services/email.service');
const { montoDe, firmaValida, estadoDesdeMP, tipoDeArchivo, opcionesDeMonto, aplicarPagoMP } = require('../src/services/pagos.service');

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

describe('Pagos de estadías: seña, total o saldo', () => {
    const reserva = { totalUSD: 450 };

    it('sin pagos, ofrece la seña (con el porcentaje del panel) o el total', () => {
        assert.deepEqual(opcionesDeMonto(reserva, { pagadoUSD: 0, restanteUSD: 450 }, 30), [
            { tipo: 'sena', montoUSD: 135 },
            { tipo: 'total', montoUSD: 450 },
        ]);
    });

    it('con la seña en 0 % o 100 %, solo se paga el total', () => {
        assert.deepEqual(opcionesDeMonto(reserva, { pagadoUSD: 0, restanteUSD: 450 }, 0), [{ tipo: 'total', montoUSD: 450 }]);
        assert.deepEqual(opcionesDeMonto(reserva, { pagadoUSD: 0, restanteUSD: 450 }, 100), [{ tipo: 'total', montoUSD: 450 }]);
    });

    it('con la seña pagada, queda solo el saldo', () => {
        assert.deepEqual(opcionesDeMonto(reserva, { pagadoUSD: 135, restanteUSD: 315 }, 30), [{ tipo: 'saldo', montoUSD: 315 }]);
    });

    it('la seña se redondea a centavos', () => {
        assert.equal(opcionesDeMonto({ totalUSD: 99.99 }, { pagadoUSD: 0, restanteUSD: 99.99 }, 33)[0].montoUSD, 33);
    });
});

describe('Pagos de estadías: lo que informa Mercado Pago', () => {
    const originales = { findById: Reserva.findById, avisar: emailService.avisarInmobiliaria };
    after(() => {
        Reserva.findById = originales.findById;
        emailService.avisarInmobiliaria = originales.avisar;
    });
    const pagoDePrueba = (extra = {}) => ({ _id: 'p1', reserva: 'r1', metodo: 'mercadopago', tipo: 'sena', estado: 'pendiente', montoARS: 189000, montoUSD: 135, async save() { this.guardado = true; }, ...extra });

    it('si el importe acreditado es menor al calculado, el pago queda rechazado', async () => {
        const pago = await aplicarPagoMP(pagoDePrueba(), { id: 55, status: 'approved', currency_id: 'ARS', transaction_amount: 1000 });
        assert.equal(pago.estado, 'rechazado');
        assert.equal(pago.mpPago, '55');
        assert.match(pago.nota, /no coincide/);
    });

    it('con el comprobante subido, sigue en revisión mientras Mercado Pago diga «pendiente»', async () => {
        const pago = await aplicarPagoMP(pagoDePrueba({ estado: 'en_revision' }), { id: 56, status: 'in_process', currency_id: 'ARS', transaction_amount: 189000 });
        assert.equal(pago.estado, 'en_revision');
    });

    it('aprobado: guarda la fecha y avisa a la inmobiliaria (la reserva confirmada no se toca)', async () => {
        Reserva.findById = () => ({ lean: async () => ({ _id: 'r1', estado: 'confirmada', tituloPropiedad: 'Cabaña del arroyo', cliente: { nombre: 'Lucía' }, entrada: '2026-12-01', salida: '2026-12-04' }) });
        let aviso = null;
        emailService.avisarInmobiliaria = async (datos) => { aviso = datos; };
        const pago = await aplicarPagoMP(pagoDePrueba(), { id: 57, status: 'approved', currency_id: 'ARS', transaction_amount: 189000 });
        assert.equal(pago.estado, 'aprobado');
        assert.ok(pago.aprobadoEn instanceof Date);
        assert.match(aviso.intro, /la seña/);
        assert.match(aviso.enlace, /\/admin\/cobros\?tipo=estadias$/);
    });

    it('un pago aprobado no vuelve a pendiente', async () => {
        const pago = await aplicarPagoMP(pagoDePrueba({ estado: 'aprobado', aprobadoEn: new Date() }), { id: 58, status: 'in_process', currency_id: 'ARS', transaction_amount: 189000 });
        assert.equal(pago.estado, 'aprobado');
    });
});

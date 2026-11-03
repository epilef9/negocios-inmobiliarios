// Enlaces de los mails de una visita (gestionar, confirmar asistencia). No usa base de datos: las consultas a
// Mongo se reemplazan por datos falsos.
// Correr solo este archivo:  node --test tests/tokens-visita.test.js
const { describe, it, mock, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const TokenVisita = require('../src/models/tokenVisita.model');
const Visita = require('../src/models/visita.model');
const tokensVisita = require('../src/services/tokensVisita.service');
const visitasService = require('../src/services/visitas.service');

const hashDe = (token) => crypto.createHash('sha256').update(token).digest('hex');
const TOKEN = 'ab'.repeat(32);
const FUTURA = { _id: 'v1', fecha: '05/11/2099', horario: '10:30 h', estado: 'pendiente', cliente: { nombre: 'Ana' }, propiedad: { titulo: 'Casa' } };

// Simula la base: el registro del token (o null) y la visita a la que apunta
const simularBase = ({ registro = null, visita = FUTURA } = {}) => {
    const findOne = mock.method(TokenVisita, 'findOne', () => ({ lean: async () => registro }));
    mock.method(Visita, 'findById', async () => visita);
    return { findOne };
};

afterEach(() => mock.restoreAll());

describe('Tokens de visita: vencimiento', () => {
    it('vence cuando empieza la visita, en hora de Argentina', () => {
        const esperado = '2026-11-05T13:30:00.000Z';
        assert.equal(tokensVisita.inicioDeVisita({ fecha: '05/11/2026', horario: '10:30 h' }).toISOString(), esperado);
        assert.equal(tokensVisita.inicioDeVisita({ fecha: '2026-11-05', horario: '10:30' }).toISOString(), esperado);
    });

    it('sin una fecha u horario que se entiendan no hay vencimiento', () => {
        assert.equal(tokensVisita.inicioDeVisita({ fecha: 'mañana', horario: '10:30' }), null);
        assert.equal(tokensVisita.inicioDeVisita({ fecha: '05/11/2026', horario: 'a la tarde' }), null);
    });
});

describe('Tokens de visita: emitir', () => {
    it('no emite enlace para una visita que ya pasó', async () => {
        const crear = mock.method(TokenVisita, 'create', async () => {});
        mock.method(TokenVisita, 'deleteMany', async () => {});
        assert.equal(await tokensVisita.emitir({ ...FUTURA, fecha: '05/11/2020' }, 'gestion'), null);
        assert.equal(crear.mock.callCount(), 0);
    });

    it('guarda solo el hash: el token del mail no queda en la base', async () => {
        const crear = mock.method(TokenVisita, 'create', async () => {});
        const anular = mock.method(TokenVisita, 'deleteMany', async () => {});
        const token = await tokensVisita.emitir(FUTURA, 'gestion');
        assert.match(token, /^[a-f0-9]{64}$/);
        const guardado = crear.mock.calls[0].arguments[0];
        assert.equal(guardado.hash, hashDe(token));
        assert.ok(!JSON.stringify(guardado).includes(token));
        assert.equal(guardado.estadoAlEmitir, 'pendiente');
        // Los enlaces anteriores del mismo propósito se anulan
        assert.deepEqual(anular.mock.calls[0].arguments[0], { visita: 'v1', proposito: 'gestion' });
    });
});

describe('Tokens de visita: validar', () => {
    it('rechaza tokens mal formados sin consultar la base', async () => {
        const { findOne } = simularBase();
        for (const token of ['', 'abc', 'zz'.repeat(32), TOKEN.toUpperCase(), 123, null, { $gt: '' }]) {
            assert.equal(await tokensVisita.validar(token, 'gestion'), null, String(token));
        }
        assert.equal(findOne.mock.callCount(), 0);
    });

    it('acepta un token vigente y busca por su hash', async () => {
        const { findOne } = simularBase({ registro: { _id: 't1', visita: 'v1', estadoAlEmitir: 'pendiente' } });
        const valido = await tokensVisita.validar(TOKEN, 'gestion');
        assert.equal(valido.visita, FUTURA);
        assert.equal(findOne.mock.calls[0].arguments[0].hash, hashDe(TOKEN));
    });

    it('se anula si la visita cambió de estado', async () => {
        simularBase({ registro: { _id: 't1', visita: 'v1', estadoAlEmitir: 'pendiente' }, visita: { ...FUTURA, estado: 'confirmada' } });
        assert.equal(await tokensVisita.validar(TOKEN, 'gestion'), null);
    });
});

describe('Tokens de visita: un solo uso', () => {
    it('consumir gana una sola vez', async () => {
        let usado = false;
        mock.method(TokenVisita, 'updateOne', async () => {
            const gano = !usado;
            usado = true;
            return { modifiedCount: gano ? 1 : 0 };
        });
        assert.equal(await tokensVisita.consumir({ _id: 't1' }), true);
        assert.equal(await tokensVisita.consumir({ _id: 't1' }), false);
    });
});

describe('Gestionar la visita: enlaces que no sirven', () => {
    it('inexistente, mal formado o anulado responden igual (no se revela si el token existe)', async () => {
        simularBase({ registro: null });
        const inexistente = await visitasService.verPorToken(TOKEN);
        const malFormado = await visitasService.verPorToken('cualquiera');
        mock.restoreAll();
        simularBase({ registro: { _id: 't1', visita: 'v1', estadoAlEmitir: 'pendiente' }, visita: { ...FUTURA, estado: 'cancelada' } });
        const anulado = await visitasService.verPorToken(TOKEN);
        for (const respuesta of [malFormado, anulado]) assert.deepEqual(respuesta, inexistente);
        assert.equal(inexistente.status, 404);
    });

    it('un enlace vigente muestra la visita sin teléfono ni email', async () => {
        const visita = { ...FUTURA, cliente: { nombre: 'Ana Pérez', telefono: '1155550000', email: 'ana@example.com' } };
        simularBase({ registro: { _id: 't1', visita: 'v1', estadoAlEmitir: 'pendiente' }, visita });
        const { visita: vista } = await visitasService.verPorToken(TOKEN);
        assert.equal(vista.nombre, 'Ana');
        assert.equal(vista.fecha, '2099-11-05');
        assert.equal(vista.horario, '10:30');
        assert.ok(!JSON.stringify(vista).includes('1155550000') && !JSON.stringify(vista).includes('ana@example.com'));
    });
});
